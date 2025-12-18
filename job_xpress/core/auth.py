"""
Dépendances d'authentification pour FastAPI.

Valide les JWT Supabase avec vérification cryptographique de la signature.
Utilise PyJWT avec l'algorithme HS256 et le secret Supabase.
"""
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, InvalidAudienceError
from core.config import settings
from core.logging_config import get_logger

logger = get_logger()

# Schéma Bearer pour Swagger UI
security = HTTPBearer(auto_error=False)


async def get_optional_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Extrait le token JWT de l'en-tête Authorization (optionnel).
    
    Utile pour les endpoints qui fonctionnent avec ou sans auth.
    
    Returns:
        Token JWT ou None si pas d'authentification
    """
    if credentials:
        return credentials.credentials
    return None


async def get_required_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    Extrait le token JWT de l'en-tête Authorization (obligatoire).
    
    Lève une HTTPException 401 si pas de token.
    
    Returns:
        Token JWT
    
    Raises:
        HTTPException 401 si pas de token
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Token d'authentification requis",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return credentials.credentials


async def get_current_user_id(
    token: str = Depends(get_required_token)
) -> str:
    """
    Valide le JWT Supabase et extrait l'ID utilisateur.
    
    Effectue une validation cryptographique complète:
    - Vérifie la signature avec SUPABASE_JWT_SECRET
    - Vérifie l'expiration du token
    - Vérifie l'audience (authenticated)
    
    Returns:
        ID de l'utilisateur (claim 'sub' du JWT)
    
    Raises:
        HTTPException 401 si token invalide
        HTTPException 500 si JWT_SECRET non configuré
    """
    # Vérification de la configuration
    if not settings.SUPABASE_JWT_SECRET:
        logger.error("❌ SUPABASE_JWT_SECRET non configuré - Validation JWT impossible")
        raise HTTPException(
            status_code=500,
            detail="Configuration serveur incomplète (JWT_SECRET manquant)"
        )
    
    try:
        # Décodage avec validation cryptographique
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "require": ["sub", "exp", "aud"]
            }
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token invalide: claim 'sub' manquant",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return user_id
    
    except ExpiredSignatureError:
        logger.warning("⚠️ Token JWT expiré")
        raise HTTPException(
            status_code=401,
            detail="Token expiré, veuillez vous reconnecter",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except InvalidAudienceError:
        logger.warning("⚠️ Audience JWT invalide")
        raise HTTPException(
            status_code=401,
            detail="Token invalide: audience incorrecte",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except InvalidTokenError as e:
        logger.warning(f"⚠️ Token JWT invalide: {type(e).__name__}")
        raise HTTPException(
            status_code=401,
            detail="Token invalide ou malformé",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except Exception as e:
        logger.error(f"❌ Erreur inattendue validation JWT: {e}")
        raise HTTPException(
            status_code=401,
            detail="Erreur de validation du token",
            headers={"WWW-Authenticate": "Bearer"}
        )
