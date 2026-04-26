import pytest
import json
from unittest.mock import AsyncMock, patch
from services.llm_engine import LLMEngine
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

@pytest.mark.asyncio
async def test_llm_engine_strategic_advice():
    """Vérifie la génération de dossiers stratégiques au lieu de lettres."""
    engine = LLMEngine()
    candidate = CandidateProfile(
        first_name="Jean",
        last_name="Dupont",
        email="jean@example.com",
        job_title="Dev",
        cv_text="Expérience en Python"
    )
    offer = JobOffer(
        title="Python Developer",
        company="AI Corp",
        description="Write code",
        url="http://job.com"
    )
    
    with patch("services.llm_engine.OpenAIProvider.chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = "<h3>Points forts</h3><ul><li>Python</li></ul>"
        
        result = await engine.generate_strategic_advice(candidate, offer)
        
        assert "html_content" in result
        assert "Points forts" in result["html_content"]
        assert "GPT-5 Pro" in result["strategic_advice"]
        assert mock_chat.called

@pytest.mark.asyncio
async def test_llm_engine_analyze_with_md5_cache():
    """Vérifie que le hashage MD5 fonctionne pour le cache."""
    engine = LLMEngine()
    offer = JobOffer(title="T", company="C", description="D", url="U")
    
    hash1 = engine._generate_job_hash(offer)
    assert len(hash1) == 32 # MD5 hex digest length
    
    offer2 = JobOffer(title="T", company="C", description="D", url="U")
    hash2 = engine._generate_job_hash(offer2)
    assert hash1 == hash2
