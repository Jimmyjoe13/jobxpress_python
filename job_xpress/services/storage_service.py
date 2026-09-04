"""
Service de stockage objet (MinIO / S3-compatible) pour avatars et CV.

Remplace Supabase Storage (migration VPS 2026-09). Buckets PRIVES :
aucune URL publique directe -> presigned URLs a duree limitee (fix audit P1-2).

Format stocke en base : simple cle d'objet ("avatars/<uid>/<fichier>",
"cvs/<uid>/<fichier>"). Legacy : les anciennes URLs supabase commencees par
http sont renvoyees telles quelles (mortes apres decom, a nettoyer).
"""

from typing import Optional

from core.config import settings
from core.logging_config import get_logger

logger = get_logger()

try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import ClientError
    _BOTO_OK = True
except ImportError:  # dependance optionnelle hors VPS
    _BOTO_OK = False

BUCKET_AVATARS = "avatars"
BUCKET_CVS = "cvs"
PRESIGN_TTL_SECONDS = 3600  # 1h : le frontend recharge le profil souvent

# Signatures binaires (fix audit P2 : le content_type declare par le client
# n'a AUCUNE valeur de securite, on verifie les magic bytes)
_MAGIC = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "image/webp": [b"RIFF"],  # + controle 'WEBP' a l'offset 8 ci-dessous
    "application/pdf": [b"%PDF-"],
    "application/zip": [b"PK\x03\x04"],        # .docx = zip ooxml
    "application/vnd.ms-office": [b"\xd0\xcf\x11\xe0"],  # .doc = OLE2
}


def sniff_content_type(content: bytes) -> Optional[str]:
    """Detecte le type reel du contenu par signatures binaires."""
    if len(content) < 12:
        return None
    for mime, sigs in _MAGIC.items():
        for sig in sigs:
            if content.startswith(sig):
                if mime == "image/webp" and content[8:12] != b"WEBP":
                    continue
                return mime
    return None


class StorageService:
    """Client S3/MinIO paresseux + helpers metier."""

    def __init__(self):
        self._client = None
        self._init_error: Optional[str] = None

    # ---------- infrastructure ----------

    @property
    def is_configured(self) -> bool:
        return bool(
            _BOTO_OK and settings.S3_ENDPOINT and settings.S3_ACCESS_KEY
            and settings.S3_SECRET_KEY
        )

    def _get_client(self):
        if self._client is None:
            if not self.is_configured:
                raise RuntimeError("S3 non configure (S3_ENDPOINT/ACCESS/SECRET)")
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                config=BotoConfig(signature_version="s3v4",
                                   connect_timeout=5, read_timeout=30),
            )
            self._ensure_buckets()
        return self._client

    def _ensure_buckets(self):
        for bucket in (BUCKET_AVATARS, BUCKET_CVS):
            try:
                self._client.head_bucket(Bucket=bucket)
            except ClientError:
                self._client.create_bucket(Bucket=bucket)
                logger.info(f"🪣 bucket cree : {bucket}")

    # ---------- API metier ----------

    def upload(self, bucket: str, key: str, data: bytes,
               content_type: Optional[str] = None) -> bool:
        """Upload objet prive. Retourne False si S3 indisponible (degrade)."""
        try:
            self._get_client().put_object(
                Bucket=bucket, Key=key, Body=data,
                ContentType=content_type or "application/octet-stream",
            )
            return True
        except Exception as e:
            logger.error(f"❌ upload S3 {bucket}/{key}: {e}")
            return False

    def presigned_url(self, bucket_or_key: str, key: Optional[str] = None) -> Optional[str]:
        """
        URL signee GET (TTL 1h). Accepte :
        - presigned_url(bucket, key)
        - presigned_url(value) : value = cle 'bucket/key' ou URL legacy -> renvoyee telle quelle.
        """
        if key is None:
            value = bucket_or_key
            if not value:
                return None
            if value.startswith(("http://", "https://")):
                return value  # legacy supabase / url deja absolue
            parts = value.split("/", 1)
            if len(parts) != 2:
                return None
            bucket, key = parts
        else:
            bucket = bucket_or_key
        try:
            return self._get_client().generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=PRESIGN_TTL_SECONDS,
            )
        except Exception as e:
            logger.error(f"❌ presign S3 {bucket}/{key}: {e}")
            return None

    def delete_prefix(self, bucket: str, prefix: str) -> int:
        """Supprime tous les objets sous prefix. Retourne le nombre supprimes."""
        try:
            client = self._get_client()
            deleted = 0
            paginator = client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                objs = [{"Key": o["Key"]} for o in page.get("Contents", [])]
                if objs:
                    client.delete_objects(Bucket=bucket,
                                          Delete={"Objects": objs})
                    deleted += len(objs)
            return deleted
        except Exception as e:
            logger.error(f"❌ delete_prefix S3 {bucket}/{prefix}: {e}")
            return 0

    def health_check(self) -> dict:
        if not self.is_configured:
            return {"configured": False, "status": "disabled"}
        try:
            self._get_client().head_bucket(Bucket=BUCKET_AVATARS)
            return {"configured": True, "status": "ok"}
        except Exception as e:
            return {"configured": True, "status": f"error: {e}"}


# Singleton
storage_service = StorageService()
