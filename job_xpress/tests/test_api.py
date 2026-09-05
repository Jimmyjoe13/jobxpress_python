"""
Tests pour les endpoints API FastAPI.

Note (cleanup Tally 2026-09-03) : l'endpoint /webhook/tally a été supprimé,
l'input des candidatures passe par le formulaire frontend -> /api/v2/search/start.
"""

import pytest


class TestHealthEndpoints:
    """Tests pour les endpoints de santé."""

    def test_root_endpoint(self, test_client):
        """Vérifie l'endpoint racine."""
        response = test_client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "version" in data

    def test_head_endpoint(self, test_client):
        """Vérifie l'endpoint HEAD."""
        response = test_client.head("/")
        assert response.status_code == 200

    def test_health_endpoint(self, test_client):
        """Vérifie l'endpoint de santé approfondi (env test = payload détaillé)."""
        response = test_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "checks" in data
        assert "version" in data
        assert "environment" in data

        # Vérifier les checks attendus
        checks = data["checks"]
        assert "api" in checks
        assert "cache" in checks
        assert "supabase" in checks
        assert "llm_api" in checks
        assert "reverse_api" in checks

    def test_health_api_always_healthy(self, test_client):
        """Vérifie que l'API est toujours marquée healthy."""
        response = test_client.get("/health")
        data = response.json()

        assert data["checks"]["api"] == "healthy"

    def test_health_minimal_in_production(self, test_client):
        """Fix audit P2 : en production, /health ne révèle ni version ni checks détaillés."""
        from unittest.mock import patch
        from core.config import settings

        with patch.object(settings, "ENVIRONMENT", "production"):
            response = test_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert set(data.keys()) == {"status"}


class TestRemovedEndpoints:
    """Vérifie que les endpoints legacy sont bien retirés."""

    def test_tally_webhook_gone(self, test_client):
        """/webhook/tally n'existe plus (404/405)."""
        response = test_client.post("/webhook/tally", json={})
        assert response.status_code in (404, 405)

    def test_legacy_apply_gone(self, test_client):
        """/api/v2/apply (stub 410) a été retiré du tout."""
        response = test_client.post("/api/v2/apply", json={})
        assert response.status_code in (404, 422)


class TestDocumentation:
    """Tests pour la documentation API."""

    def test_openapi_schema_available(self, test_client):
        """Vérifie que le schéma OpenAPI est disponible."""
        response = test_client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()

        assert "info" in data
        assert "paths" in data
        assert data["info"]["title"] == "JobXpress API"

    def test_docs_endpoint_available(self, test_client):
        """Vérifie que la documentation Swagger est disponible."""
        response = test_client.get("/docs")

        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "html" in response.headers.get(
            "content-type", ""
        )
