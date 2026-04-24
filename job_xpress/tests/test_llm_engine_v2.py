import pytest
import json
from unittest.mock import AsyncMock, patch
from services.llm_engine import LLMEngine
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

@pytest.mark.asyncio
async def test_llm_engine_analyze_offers_parallel_with_cache():
    """Teste l'analyse des offres avec cache par hash."""
    engine = LLMEngine()
    candidate = CandidateProfile(
        first_name="Jean",
        last_name="Dupont",
        email="jean.dupont@example.com",
        job_title="Développeur Python",
        experience_level="Sénior"
    )
    
    offer = JobOffer(
        title="Développeur Backend Python",
        company="TechCorp",
        description="Nous recherchons un expert Python...",
        url="https://example.com/job1"
    )
    
    # Mock du cache pour simuler un MISS puis un HIT
    with patch("services.llm_engine.cache_service") as mock_cache:
        mock_cache.get.return_value = None # MISS
        
        # Mock de OpenAIProvider
        with patch("services.llm_engine.OpenAIProvider.generate_json", new_callable=AsyncMock) as mock_openai:
            mock_openai.return_value = {"score": 85, "reasoning": "Excellent match"}
            
            results = await engine.analyze_offers_parallel(candidate, [offer])
            
            assert len(results) == 1
            assert results[0].match_score == 85
            assert mock_openai.called
            
            # Vérifier que le cache.set a été appelé
            mock_cache.set.assert_called()
            
            # Simuler un HIT
            mock_cache.get.return_value = json.dumps({"score": 85, "reasoning": "Excellent match"})
            mock_openai.reset_mock()
            
            results_hit = await engine.analyze_offers_parallel(candidate, [offer])
            assert results_hit[0].match_score == 85
            assert not mock_openai.called # Ne doit pas appeler l'API si c'est dans le cache

@pytest.mark.asyncio
async def test_llm_engine_routing():
    """Vérifie que le routage dynamique utilise les bons modèles."""
    engine = LLMEngine()
    # Supporte gpt-5-mini ou gpt-5-nano pour le modèle rapide
    assert any(m in engine.model_mini.lower() for m in ["mini", "nano"])
    assert "mini" not in engine.model_pro.lower()
    assert "nano" not in engine.model_pro.lower()
