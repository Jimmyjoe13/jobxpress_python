"""
Tests pour le module d'authentification JWT sécurisé.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

# Mock des settings avant import
@pytest.fixture(autouse=True)
def mock_settings():
    with patch('core.auth.settings') as mock:
        mock.SUPABASE_JWT_SECRET = "test-secret-key-for-testing-only"
        yield mock


class TestGetCurrentUserId:
    """Tests pour la fonction get_current_user_id."""
    
    @pytest.mark.asyncio
    async def test_valid_token_returns_user_id(self, mock_settings):
        """Un token valide doit retourner l'ID utilisateur."""
        import jwt
        from core.auth import get_current_user_id
        
        # Créer un token valide
        payload = {
            "sub": "user-123-abc",
            "aud": "authenticated",
            "exp": 9999999999  # Loin dans le futur
        }
        token = jwt.encode(payload, "test-secret-key-for-testing-only", algorithm="HS256")
        
        user_id = await get_current_user_id(token)
        assert user_id == "user-123-abc"
    
    @pytest.mark.asyncio
    async def test_expired_token_raises_401(self, mock_settings):
        """Un token expiré doit lever une HTTPException 401."""
        import jwt
        from core.auth import get_current_user_id
        
        payload = {
            "sub": "user-123",
            "aud": "authenticated",
            "exp": 1  # Expiré depuis longtemps
        }
        token = jwt.encode(payload, "test-secret-key-for-testing-only", algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(token)
        
        assert exc_info.value.status_code == 401
        assert "expiré" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_invalid_signature_raises_401(self, mock_settings):
        """Un token avec signature invalide doit lever une 401."""
        import jwt
        from core.auth import get_current_user_id
        
        payload = {
            "sub": "user-123",
            "aud": "authenticated",
            "exp": 9999999999
        }
        # Signer avec une mauvaise clé
        token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(token)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_missing_sub_claim_raises_401(self, mock_settings):
        """Un token sans claim 'sub' doit lever une 401."""
        import jwt
        from core.auth import get_current_user_id
        
        payload = {
            "aud": "authenticated",
            "exp": 9999999999
            # Pas de "sub"
        }
        token = jwt.encode(payload, "test-secret-key-for-testing-only", algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(token)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_wrong_audience_raises_401(self, mock_settings):
        """Un token avec mauvaise audience doit lever une 401."""
        import jwt
        from core.auth import get_current_user_id
        
        payload = {
            "sub": "user-123",
            "aud": "wrong-audience",  # Pas "authenticated"
            "exp": 9999999999
        }
        token = jwt.encode(payload, "test-secret-key-for-testing-only", algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(token)
        
        assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_missing_jwt_secret_raises_500(self):
        """Si JWT_SECRET non configuré, doit lever une 500."""
        from core.auth import get_current_user_id
        
        with patch('core.auth.settings') as mock:
            mock.SUPABASE_JWT_SECRET = ""  # Non configuré
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_id("any-token")
            
            assert exc_info.value.status_code == 500
            assert "JWT_SECRET" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_malformed_token_raises_401(self, mock_settings):
        """Un token malformé doit lever une 401."""
        from core.auth import get_current_user_id
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id("not-a-valid-jwt-token")
        
        assert exc_info.value.status_code == 401


class TestGetRequiredToken:
    """Tests pour get_required_token."""
    
    @pytest.mark.asyncio
    async def test_returns_token_when_present(self):
        """Doit retourner le token s'il est présent."""
        from core.auth import get_required_token
        from fastapi.security import HTTPAuthorizationCredentials
        
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="my-token")
        token = await get_required_token(creds)
        
        assert token == "my-token"
    
    @pytest.mark.asyncio
    async def test_raises_401_when_missing(self):
        """Doit lever 401 si pas de token."""
        from core.auth import get_required_token
        
        with pytest.raises(HTTPException) as exc_info:
            await get_required_token(None)
        
        assert exc_info.value.status_code == 401


class TestGetOptionalToken:
    """Tests pour get_optional_token."""
    
    @pytest.mark.asyncio
    async def test_returns_token_when_present(self):
        """Doit retourner le token s'il est présent."""
        from core.auth import get_optional_token
        from fastapi.security import HTTPAuthorizationCredentials
        
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="my-token")
        token = await get_optional_token(creds)
        
        assert token == "my-token"
    
    @pytest.mark.asyncio
    async def test_returns_none_when_missing(self):
        """Doit retourner None si pas de token."""
        from core.auth import get_optional_token
        
        token = await get_optional_token(None)
        assert token is None
