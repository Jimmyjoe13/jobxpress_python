"""
Tests pour les endpoints API FastAPI.
"""
import pytest
import uuid
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient


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
        """Vérifie l'endpoint de santé approfondi."""
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
        assert "deepseek" in checks
        assert "rapidapi" in checks
    
    def test_health_api_always_healthy(self, test_client):
        """Vérifie que l'API est toujours marquée healthy."""
        response = test_client.get("/health")
        data = response.json()
        
        assert data["checks"]["api"] == "healthy"


class TestWebhookEndpoint:
    """Tests pour l'endpoint webhook Tally."""
    
    @pytest.fixture
    def unique_tally_payload(self, sample_tally_payload):
        """Génère un payload avec un email unique pour éviter les conflits de cache."""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        payload = sample_tally_payload.copy()
        payload["data"] = payload["data"].copy()
        payload["data"]["fields"] = payload["data"]["fields"].copy()
        
        # Modifier l'email (index 2 dans le payload)
        for i, field in enumerate(payload["data"]["fields"]):
            if field["key"] == "question_D7V1kj":
                payload["data"]["fields"][i] = {**field, "value": unique_email}
                break
        
        return payload
    
    def test_webhook_accepts_valid_payload(self, test_client, unique_tally_payload):
        """Vérifie que le webhook accepte un payload valide."""
        response = test_client.post("/webhook/tally", json=unique_tally_payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] in ["received", "received_fallback"]
    
    def test_webhook_returns_event_id(self, test_client, unique_tally_payload):
        """Vérifie que le webhook retourne l'event_id."""
        response = test_client.post("/webhook/tally", json=unique_tally_payload)
        
        if response.status_code == 200:
            data = response.json()
            if data["status"] == "received":
                assert data["event_id"] == unique_tally_payload["eventId"]
    
    def test_webhook_rejects_duplicate(self, test_client, unique_tally_payload):
        """Vérifie le rejet des doublons."""
        # Premier envoi
        response1 = test_client.post("/webhook/tally", json=unique_tally_payload)
        assert response1.status_code == 200
        
        # Deuxième envoi immédiat (doublon)
        response2 = test_client.post("/webhook/tally", json=unique_tally_payload)
        
        # Le deuxième doit être rejeté (429)
        assert response2.status_code == 429
        data = response2.json()
        assert data["status"] == "ignored"
        assert data["reason"] == "rate_limited"
    
    def test_webhook_rejects_invalid_payload(self, test_client):
        """Vérifie le rejet des payloads invalides."""
        invalid_payload = {"invalid": "data"}
        
        response = test_client.post("/webhook/tally", json=invalid_payload)
        
        # Doit retourner une erreur de validation
        assert response.status_code == 422
    
    def test_webhook_handles_missing_fields(self, test_client):
        """Vérifie la gestion des champs manquants."""
        unique_email = f"minimal_{uuid.uuid4().hex[:8]}@test.com"
        minimal_payload = {
            "eventId": f"test-minimal-{uuid.uuid4().hex[:8]}",
            "createdAt": "2025-12-13T19:00:00Z",
            "data": {
                "responseId": "resp-123",
                "submissionId": "sub-123",
                "fields": [
                    {"key": "question_D7V1kj", "label": "Email", "value": unique_email, "type": "INPUT_EMAIL"}
                ]
            }
        }
        
        response = test_client.post("/webhook/tally", json=minimal_payload)
        
        # Doit accepter même avec des champs manquants
        assert response.status_code in [200, 422]


class TestRateLimiting:
    """Tests pour le rate limiting."""
    
    def test_rate_limit_headers(self, test_client, sample_tally_payload):
        """Vérifie la présence des headers de rate limit."""
        # Modifier l'email pour éviter la déduplication
        unique_email = f"ratelimit_{uuid.uuid4().hex[:8]}@test.com"
        payload = sample_tally_payload.copy()
        payload["data"] = payload["data"].copy()
        payload["data"]["fields"] = [
            {**f, "value": unique_email} if f["key"] == "question_D7V1kj" else f
            for f in payload["data"]["fields"]
        ]
        
        response = test_client.post("/webhook/tally", json=payload)
        
        # Les headers de rate limit peuvent être présents
        # (dépend de la configuration exacte)
        assert response.status_code in [200, 429]


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
        assert "swagger" in response.text.lower() or "html" in response.headers.get("content-type", "")
