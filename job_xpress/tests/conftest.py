"""
Configuration pytest et fixtures globales pour les tests JobXpress.
"""
import os
import sys
import pytest
import asyncio
from typing import Generator

# Ajouter le dossier parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def event_loop():
    """Crée un event loop pour les tests async."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def test_client() -> Generator:
    """Client de test pour l'API FastAPI."""
    from main import app
    
    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_tally_payload() -> dict:
    """Payload Tally de test complet."""
    return {
        "eventId": "test-event-123",
        "createdAt": "2025-12-13T19:00:00Z",
        "data": {
            "responseId": "test-response-123",
            "submissionId": "test-submission-123",
            "fields": [
                {"key": "question_l6NAep", "label": "Prénom", "value": "Jean", "type": "INPUT_TEXT"},
                {"key": "question_Y4ZO06", "label": "Nom", "value": "Dupont", "type": "INPUT_TEXT"},
                {"key": "question_D7V1kj", "label": "Email", "value": "jean.dupont@test.com", "type": "INPUT_EMAIL"},
                {"key": "question_RDz4Mp", "label": "Téléphone", "value": "0612345678", "type": "INPUT_PHONE"},
                {"key": "question_a26zVy", "label": "Poste", "value": "Growth Hacker", "type": "INPUT_TEXT"},
                {"key": "question_7NWEGz", "label": "Contrat", "value": "5bdc568d-a217-464e-af74-bf1a5add3c9c", "type": "CHECKBOXES"},
                {"key": "question_6Z7Po5", "label": "Expérience", "value": "6089233a-8e41-442d-81c1-517c21a95c85", "type": "DROPDOWN"},
                {"key": "question_Q7Je8X", "label": "Remote", "value": "29694558-89d8-4dfa-973b-19506de2a1ad", "type": "MULTIPLE_CHOICE"},
                {"key": "question_4K2egY", "label": "Localisation", "value": "Paris", "type": "INPUT_TEXT"},
                {"key": "question_D7DOXE", "label": "CV", "value": [{"url": "https://example.com/cv.pdf"}], "type": "FILE_UPLOAD"}
            ]
        }
    }


@pytest.fixture
def sample_candidate_data() -> dict:
    """Données de candidat pour tests directs."""
    return {
        "first_name": "Marie",
        "last_name": "Martin",
        "email": "marie.martin@test.com",
        "phone": "0687654321",
        "job_title": "Data Analyst",
        "contract_type": "CDI",
        "work_type": "Hybride",
        "experience_level": "Confirmé",
        "location": "Lyon"
    }


@pytest.fixture
def sample_job_offer() -> dict:
    """Offre d'emploi de test."""
    return {
        "title": "Growth Hacker Senior",
        "company": "TechStartup",
        "location": "Paris",
        "description": "Nous recherchons un Growth Hacker expérimenté pour développer notre acquisition...",
        "url": "https://example.com/job/123",
        "contract_type": "CDI",
        "is_remote": True
    }


@pytest.fixture
def temp_cache_db(tmp_path):
    """Crée une base de cache temporaire pour les tests."""
    db_path = tmp_path / "test_cache.db"
    yield str(db_path)
    # Nettoyage automatique par tmp_path


@pytest.fixture
def mock_deepseek_response():
    """Réponse simulée de DeepSeek pour les tests."""
    return {
        "choices": [{
            "message": {
                "content": '{"score_technical": 85, "score_structural": 90, "score_experience": 80, "is_school_scheme": false, "reasoning": "Bon match", "strengths": ["Expérience pertinente"], "weaknesses": []}'
            }
        }]
    }
