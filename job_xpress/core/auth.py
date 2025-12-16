"""
Dépendances d'authentification pour FastAPI.

Fournit des fonctions pour extraire et valider les JWT Supabase
depuis les requêtes HTTP.
"""
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    Décode le JWT Supabase pour extraire l'ID utilisateur.
    
    Note: Cette fonction fait confiance au JWT sans le valider
    côté serveur (Supabase le valide via RLS). Pour une validation
    complète, utilisez le endpoint /auth/v1/user de Supabase.
    
    Returns:
        ID de l'utilisateur (sub claim du JWT)
    
    Raises:
        HTTPException 401 si token invalide
    """
    import base64
    import json
    
    try:
        # Le JWT est composé de 3 parties séparées par des points
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Format JWT invalide")
        
        # Décoder le payload (2ème partie)
        # Ajouter le padding si nécessaire
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        
        # Le claim 'sub' contient l'ID utilisateur Supabase
        user_id = payload.get('sub')
        if not user_id:
            raise ValueError("Claim 'sub' manquant dans le JWT")
        
        return user_id
    
    except Exception as e:
        logger.warning(f"⚠️ Erreur décodage JWT: {e}")
        raise HTTPException(
            status_code=401,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"}
        )
