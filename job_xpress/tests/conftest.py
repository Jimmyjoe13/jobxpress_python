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

# Forcer l'environnement de test avant tout import d'app.
# Cela empêche le validator Redis (obligatoire en prod) de bloquer la collecte.
os.environ.setdefault("ENVIRONMENT", "test")
# Fournir un REDIS_URL factice si non défini (le validator ne s'active qu'en production)
os.environ.setdefault("REDIS_URL", "")

import sys
from unittest.mock import MagicMock

# Mock dependencies that break on Python 3.14 (due to Pydantic v1) or are not
# installed in the test environment. Must be done BEFORE any imports from the app.
_MOCK_MODULES = [
    'supabase', 'realtime', 'gotrue', 'postgrest', 'storage3', 'supafunc',
    # jwt (pyjwt) and slowapi are installed in the venv — do not mock them
    'stripe', 'stripe.error',
    'redis',
    'weasyprint',
    'xhtml2pdf', 'xhtml2pdf.pisa',
    'mistralai',
    'sentry_sdk', 'sentry_sdk.integrations', 'sentry_sdk.integrations.fastapi',
    'trafilatura',
    'lxml_html_clean',
    'thefuzz', 'thefuzz.fuzz',
    'Levenshtein',
    'slugify',
    'ddgs',
]
for _mod in _MOCK_MODULES:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

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
def sample_candidate_data() -> dict:
    """Données de candidat pour tests directs."""
    from models.candidate import WorkType

    return {
        "first_name": "Marie",
        "last_name": "Martin",
        "email": "marie.martin@test.com",
        "phone": "0687654321",
        "job_title": "Data Analyst",
        "contract_type": "CDI",
        "work_type": WorkType.HYBRIDE,
        "experience_level": "Confirmé",
        "location": "Lyon",
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
        "is_remote": True,
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
        "choices": [
            {
                "message": {
                    "content": '{"score_technical": 85, "score_structural": 90, "score_experience": 80, "is_school_scheme": false, "reasoning": "Bon match", "strengths": ["Expérience pertinente"], "weaknesses": []}'
                }
            }
        ]
    }
