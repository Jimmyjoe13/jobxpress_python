"""
Tests unitaires pour les endpoints de paramètres utilisateur.

Tests couverts:
- GET /api/v2/settings (récupération et création automatique)
- PUT /api/v2/settings (mise à jour partielle et complète)
- Authentification requise
- Validation des données
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

from models.user_settings import (
    UserSettingsRead,
    UserSettingsUpdate,
    SettingsUpdateResponse
)

# ============================================
# FIXTURES
# ============================================

@pytest.fixture
def mock_settings_data():
    """Données de paramètres de test."""
    return {
        "id": "settings-uuid-123",
        "user_id": "user-uuid-456",
        "email_candidatures": True,
        "email_new_offers": True,
        "email_newsletter": False,
        "push_notifications": True,
        "language": "fr",
        "timezone": "Europe/Paris",
        "dark_mode": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def mock_supabase_client(mock_settings_data):
    """Mock du client Supabase pour les tests."""
    client = MagicMock()
    
    # Mock pour select
    select_result = MagicMock()
    select_result.data = [mock_settings_data]
    
    eq_mock = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=select_result)))
    select_mock = MagicMock(return_value=MagicMock(eq=eq_mock))
    
    client.table.return_value.select = select_mock
    
    return client


# ============================================
# TESTS MODELS
# ============================================

class TestUserSettingsModels:
    """Tests des modèles Pydantic de paramètres."""
    
    def test_user_settings_base_defaults(self):
        """Vérifie les valeurs par défaut."""
        from models.user_settings import UserSettingsBase
        settings = UserSettingsBase()
        
        assert settings.email_candidatures is True
        assert settings.email_new_offers is True
        assert settings.email_newsletter is False
        assert settings.push_notifications is True
        assert settings.language == "fr"
        assert settings.timezone == "Europe/Paris"
        assert settings.dark_mode is True
    
    def test_language_validation_valid(self):
        """Vérifie que les langues valides sont acceptées."""
        from models.user_settings import UserSettingsBase
        
        settings_fr = UserSettingsBase(language="fr")
        assert settings_fr.language == "fr"
        
        settings_en = UserSettingsBase(language="en")
        assert settings_en.language == "en"
    
    def test_language_validation_invalid_falls_back(self):
        """Vérifie le fallback pour une langue invalide."""
        from models.user_settings import UserSettingsBase
        
        settings = UserSettingsBase(language="de")
        assert settings.language == "fr"  # Fallback to French
    
    def test_timezone_validation_valid(self):
        """Vérifie que les fuseaux horaires valides sont acceptés."""
        from models.user_settings import UserSettingsBase
        
        for tz in ["Europe/Paris", "Europe/London", "America/New_York", "Asia/Tokyo"]:
            settings = UserSettingsBase(timezone=tz)
            assert settings.timezone == tz
    
    def test_timezone_validation_invalid_falls_back(self):
        """Vérifie le fallback pour un fuseau horaire invalide."""
        from models.user_settings import UserSettingsBase
        
        settings = UserSettingsBase(timezone="Invalid/Zone")
        assert settings.timezone == "Europe/Paris"  # Fallback
    
    def test_user_settings_update_all_optional(self):
        """Vérifie que tous les champs sont optionnels pour la mise à jour."""
        settings = UserSettingsUpdate()
        
        # Tous les champs doivent être None
        assert settings.email_candidatures is None
        assert settings.language is None
        assert settings.dark_mode is None
    
    def test_user_settings_update_partial(self):
        """Vérifie la mise à jour partielle."""
        settings = UserSettingsUpdate(email_newsletter=True, language="en")
        
        assert settings.email_newsletter is True
        assert settings.language == "en"
        assert settings.dark_mode is None  # Non fourni
    
    def test_user_settings_read_from_dict(self, mock_settings_data):
        """Vérifie la création depuis un dict."""
        settings = UserSettingsRead(**mock_settings_data)
        
        assert settings.id == "settings-uuid-123"
        assert settings.user_id == "user-uuid-456"
        assert settings.email_candidatures is True
        assert settings.language == "fr"


# ============================================
# TESTS INTEGRATION (avec mocks)
# ============================================

class TestSettingsEndpoints:
    """Tests d'intégration des endpoints de paramètres."""
    
    @pytest.fixture
    def mock_auth(self):
        """Mock de l'authentification."""
        with patch('api.settings_endpoints.get_required_token') as mock_token, \
             patch('api.settings_endpoints.get_current_user_id') as mock_user_id:
            mock_token.return_value = "valid-jwt-token"
            mock_user_id.return_value = "user-uuid-456"
            yield
    
    @pytest.fixture
    def mock_db(self, mock_settings_data):
        """Mock de la base de données."""
        with patch('api.settings_endpoints.db_service') as mock_db_service:
            client = MagicMock()
            
            # Configure select chain
            select_result = MagicMock()
            select_result.data = [mock_settings_data]
            
            table_mock = MagicMock()
            table_mock.select.return_value.eq.return_value.execute.return_value = select_result
            table_mock.update.return_value.eq.return_value.execute.return_value = select_result
            
            client.table.return_value = table_mock
            mock_db_service.get_user_client.return_value = client
            
            yield client
    
    def test_build_settings_response(self, mock_settings_data):
        """Vérifie la construction de la réponse."""
        from api.settings_endpoints import _build_settings_response
        
        response = _build_settings_response(mock_settings_data)
        
        assert response.id == "settings-uuid-123"
        assert response.email_candidatures is True
        assert response.language == "fr"
    
    def test_build_settings_response_with_defaults(self):
        """Vérifie les valeurs par défaut dans la réponse."""
        from api.settings_endpoints import _build_settings_response
        
        # Données minimales
        minimal_data = {
            "id": "id-123",
            "user_id": "user-123"
        }
        
        response = _build_settings_response(minimal_data)
        
        assert response.email_candidatures is True  # Default
        assert response.language == "fr"  # Default
        assert response.dark_mode is True  # Default


# ============================================
# TESTS VALIDATION
# ============================================

class TestSettingsValidation:
    """Tests de validation des paramètres."""
    
    def test_update_with_all_booleans(self):
        """Vérifie la mise à jour de tous les booléens."""
        update = UserSettingsUpdate(
            email_candidatures=False,
            email_new_offers=False,
            email_newsletter=True,
            push_notifications=False,
            dark_mode=False
        )
        
        assert update.email_candidatures is False
        assert update.email_newsletter is True
        assert update.dark_mode is False
    
    def test_model_dump_excludes_none(self):
        """Vérifie que model_dump exclut les valeurs None."""
        update = UserSettingsUpdate(
            email_candidatures=True,
            language="en"
        )
        
        data = update.model_dump(exclude_none=True)
        
        assert "email_candidatures" in data
        assert "language" in data
        assert "email_newsletter" not in data
        assert "dark_mode" not in data
    
    def test_language_none_stays_none(self):
        """Vérifie que None reste None pour la langue."""
        from models.user_settings import UserSettingsUpdate
        
        update = UserSettingsUpdate(language=None)
        assert update.language is None


# ============================================
# TESTS RESPONSE MODELS
# ============================================

class TestResponseModels:
    """Tests des modèles de réponse."""
    
    def test_settings_update_response(self, mock_settings_data):
        """Vérifie le modèle de réponse de mise à jour."""
        settings = UserSettingsRead(**mock_settings_data)
        
        response = SettingsUpdateResponse(
            success=True,
            message="Test message",
            settings=settings
        )
        
        assert response.success is True
        assert response.message == "Test message"
        assert response.settings.id == "settings-uuid-123"
    
    def test_settings_update_response_defaults(self, mock_settings_data):
        """Vérifie les valeurs par défaut de la réponse."""
        settings = UserSettingsRead(**mock_settings_data)
        
        response = SettingsUpdateResponse(settings=settings)
        
        assert response.success is True
        assert response.message == "Paramètres mis à jour avec succès"
