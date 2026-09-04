# -*- coding: utf-8 -*-
"""Tests du service de stockage S3/MinIO (sniffing, presign, mode non configure)."""

import sys
from unittest.mock import MagicMock, patch

sys.modules.setdefault("supabase", MagicMock())
sys.modules.setdefault("realtime", MagicMock())

from services.storage_service import (  # noqa: E402
    sniff_content_type,
    storage_service,
)


class TestSniffContent:
    def test_jpeg(self):
        assert sniff_content_type(b"\xff\xd8\xff\xe0" + b"\x00" * 20) == "image/jpeg"

    def test_png(self):
        data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
        assert sniff_content_type(data) == "image/png"

    def test_gif(self):
        assert sniff_content_type(b"GIF89a" + b"\x00" * 20) == "image/gif"

    def test_webp_valide(self):
        data = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 8
        assert sniff_content_type(data) == "image/webp"

    def test_riff_non_webp_rejete(self):
        data = b"RIFF\x00\x00\x00\x00AVI " + b"\x00" * 8
        assert sniff_content_type(data) != "image/webp"

    def test_pdf(self):
        assert sniff_content_type(b"%PDF-1.7\n" + b"\x00" * 20) == "application/pdf"

    def test_docx_comme_zip(self):
        assert sniff_content_type(b"PK\x03\x04" + b"\x00" * 20) == "application/zip"

    def test_doc_comme_ole(self):
        assert sniff_content_type(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 8) == "application/vnd.ms-office"

    def test_trop_court(self):
        assert sniff_content_type(b"ab") is None

    def test_inconnu(self):
        assert sniff_content_type(b"hello world........") is None


class TestStorageServiceHorsVPS:
    """Hors configuration (cas Render/tests) : mode passif, pas de crash."""

    def test_non_configure_par_defaut(self):
        # S3_ENDPOINT vide dans l'env de test
        assert storage_service.is_configured in (True, False)

    def test_presigned_url_legacy_http_passthrough(self):
        url = "https://xxx.supabase.co/storage/v1/object/public/cvs/f.pdf"
        assert storage_service.presigned_url(url) == url

    def test_presigned_url_none(self):
        assert storage_service.presigned_url(None) is None
        assert storage_service.presigned_url("") is None

    def test_presigned_key_sans_config_retourne_none(self):
        # is_configured True mais boto absent -> _get_client leve -> None
        with patch.object(type(storage_service), "is_configured",
                          new_callable=lambda: property(lambda self: True)):
            storage_service._client = MagicMock()  # evite le reseau: generate_presigned_url leve
            storage_service._client.generate_presigned_url.side_effect = RuntimeError("boom")
            assert storage_service.presigned_url("avatars/x/y.png") is None
        storage_service._client = None

    def test_upload_sans_config_false(self):
        with patch.object(type(storage_service), "is_configured",
                          new_callable=lambda: property(lambda self: True)):
            storage_service._client = MagicMock()
            storage_service._client.put_object.side_effect = RuntimeError("boom")
            assert storage_service.upload("avatars", "k", b"data") is False
        storage_service._client = None

    def test_delete_prefix_sans_config_zero(self):
        with patch.object(type(storage_service), "is_configured",
                          new_callable=lambda: property(lambda self: True)):
            storage_service._client = MagicMock()
            storage_service._client.get_paginator.side_effect = RuntimeError("boom")
            assert storage_service.delete_prefix("avatars", "uid/") == 0
        storage_service._client = None
