"""
Tests pour les endpoints de gestion du profil.

Vérifie:
- Suppression de compte réussie (DELETE /api/v2/profile)
- Gestion des erreurs d'authentification (401)
- Suppression d'un compte inexistant
"""

import sys
from unittest.mock import MagicMock

# Mock dependencies that break on Python 3.14
sys.modules['supabase'] = MagicMock()
sys.modules['realtime'] = MagicMock()

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)

@pytest.fixture
def mock_auth_token():
    """Mock le token d'authentification."""
    with patch("api.profile_endpoints.get_required_token", return_value="fake_token"):
        with patch("api.profile_endpoints.get_current_user_id", return_value="user_123"):
            yield "fake_token"

@pytest.mark.asyncio
class TestProfileEndpoints:
    """Tests pour l'endpoint DELETE /api/v2/profile."""

    def test_delete_profile_unauthorized(self, client):
        """Doit retourner 401 si pas de token."""
        # On ne mocke pas l'auth ici pour tester le rejet
        response = client.delete("/api/v2/profile")
        assert response.status_code == 401

    def test_delete_profile_success(self, client, mock_auth_token):
        """Suppression réussie du compte."""
        with patch("api.profile_endpoints.db_service") as mock_db:
            mock_db.delete_user_account.return_value = True
            
            response = client.delete(
                "/api/v2/profile",
                headers={"Authorization": f"Bearer {mock_auth_token}"}
            )
            
            assert response.status_code == 200
            assert response.json()["success"] is True
            mock_db.delete_user_account.assert_called_with("user_123")

    def test_delete_profile_failure_in_db(self, client, mock_auth_token):
        """Erreur lors de la suppression en base."""
        with patch("api.profile_endpoints.db_service") as mock_db:
            mock_db.delete_user_account.return_value = False
            
            response = client.delete(
                "/api/v2/profile",
                headers={"Authorization": f"Bearer {mock_auth_token}"}
            )
            
            assert response.status_code == 500
            assert "Échec" in response.json()["detail"]

    def test_delete_profile_exception(self, client, mock_auth_token):
        """Exception levée durant le processus de suppression."""
        with patch("api.profile_endpoints.db_service") as mock_db:
            mock_db.delete_user_account.side_effect = Exception("DB Crash")
            
            response = client.delete(
                "/api/v2/profile",
                headers={"Authorization": f"Bearer {mock_auth_token}"}
            )
            
            assert response.status_code == 500
            assert "Une erreur est survenue" in response.json()["detail"]
