import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.search_engine_v2 import SearchEngineV2
from models.candidate import CandidateProfile
from models.job_offer_v2 import JobOffer

@pytest.mark.asyncio
async def test_hybrid_search_vector_hit():
    """Teste que le moteur utilise la base vectorielle avant le web."""
    engine = SearchEngineV2()
    candidate = CandidateProfile(
        job_title="Développeur React",
        location="Paris",
        experience_level="Confirmé",
        email="test@example.com",
        first_name="Test",
        last_name="User"
    )

    # Mock de OpenAI embeddings
    engine.openai.generate_embeddings = AsyncMock(return_value=[0.1] * 1536)
    
    # Mock de Supabase Vector Search (HIT)
    mock_job = {
        "id": "123",
        "title": "Développeur Front-end React",
        "company": "StartupAI",
        "description": "Super job React...",
        "location": "Paris",
        "contract_type": "CDI",
        "url": "https://example.com/react-job",
        "match_score": 95
    }
    
    with patch("services.search_engine_v2.db_service") as mock_db:
        mock_db.search_jobs_vector.return_value = [mock_job]
        
        # Mock de DiscoveryEngine pour vérifier qu'il n'est PAS appelé si on a assez de résultats
        engine.discovery.find_jobs = AsyncMock()

        results = await engine.find_jobs_v2(candidate, limit=1)
        
        assert len(results) == 1
        assert results[0].company == "StartupAI"
        assert not engine.discovery.find_jobs.called

@pytest.mark.asyncio
async def test_hybrid_search_vector_miss_discovery():
    """Teste que le moteur lance JSearch si la base vectorielle est vide."""
    engine = SearchEngineV2()
    candidate = CandidateProfile(
        job_title="Astronaute",
        location="Mars",
        experience_level="Expert",
        email="test@example.com",
        first_name="Test",
        last_name="User"
    )

    engine.openai.generate_embeddings = AsyncMock(return_value=[0.1] * 1536)
    
    with patch("services.search_engine_v2.db_service") as mock_db:
        mock_db.search_jobs_vector.return_value = [] # MISS
        
        # Mock de DiscoveryEngine (JSearch)
        mock_web_job = JobOffer(
            title="Astronaute de bord",
            company="SpaceX",
            description="Mission vers Mars...",
            url="https://spacex.com/mars"
        )
        engine.discovery.find_jobs = AsyncMock(return_value=[mock_web_job])
        
        # Mock de l'indexation asynchrone
        engine._index_job_vector = AsyncMock()

        results = await engine.find_jobs_v2(candidate, limit=1)
        
        assert len(results) == 1
        assert results[0].company == "SpaceX"
        assert engine.discovery.find_jobs.called
