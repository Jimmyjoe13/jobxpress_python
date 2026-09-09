"""
Tests unitaires pour le service d'analyse ATS (1 crédit) et de CV tailoring (5 crédits).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from services.tailoring_service import (
    TailoringService,
    ATSAnalysisResponse,
    TailoredCVResponse,
)


@pytest.mark.asyncio
async def test_ats_analysis_insufficient_credits():
    service = TailoringService()
    service.billing.can_analyze_ats = AsyncMock(return_value=(False, 0))

    with pytest.raises(HTTPException) as exc:
        await service.analyze_ats_match(
            application_id="app-123",
            user_id="user-123",
            access_token="token-abc",
        )
    assert exc.value.status_code == 402
    assert "1 crédit est requis" in exc.value.detail


@pytest.mark.asyncio
async def test_ats_analysis_success():
    service = TailoringService()
    service.billing.can_analyze_ats = AsyncMock(return_value=(True, 10))
    service.billing.debit_ats_analysis = AsyncMock(return_value=9)

    # Mock DB client
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table
    
    # Mock application_v2 data
    mock_app_data = {
        "id": "app-123",
        "user_id": "user-123",
        "job_title": "Développeur Fullstack",
        "final_choice": {
            "title": "Senior Fullstack Dev",
            "company": "Acme Corp",
            "description": "Recherche dev Next.js et FastAPI avec compétences Docker.",
        },
    }
    # Mock profile data
    mock_profile_data = {
        "id": "user-123",
        "first_name": "Jimmy",
        "last_name": "Dev",
        "job_title": "Développeur Web",
        "key_skills": ["Python", "FastAPI", "React", "Docker"],
        "cv_text": "Expérience de 4 ans en développement d'APIs et interfaces modernes.",
    }

    mock_table.execute.side_effect = [
        MagicMock(data=mock_app_data),      # applications_v2
        MagicMock(data=mock_profile_data),  # user_profiles
        MagicMock(data={"id": "app-123"}),  # update applications_v2
    ]

    # Mock LLM JSON output
    mock_ats_result = {
        "match_score": 88,
        "strengths": ["Maîtrise de FastAPI", "Expérience Docker confirmée"],
        "missing_skills": ["Next.js App Router approfondi"],
        "ats_keywords_to_add": ["FastAPI", "Microservices", "Docker Compose"],
        "recommendations": ["Insister sur l'orchestration Docker dans les réalisations"],
    }
    service.llm.generate_json = AsyncMock(return_value=mock_ats_result)

    with patch("services.tailoring_service.db_service.get_user_client", return_value=mock_client):
        res = await service.analyze_ats_match(
            application_id="app-123",
            user_id="user-123",
            access_token="token-abc",
        )

        assert isinstance(res, ATSAnalysisResponse)
        assert res.match_score == 88
        assert len(res.strengths) == 2
        assert len(res.missing_skills) == 1
        assert "FastAPI" in res.ats_keywords_to_add
        assert res.credits_remaining == 9
        service.billing.debit_ats_analysis.assert_called_once_with("user-123", "token-abc")


@pytest.mark.asyncio
async def test_cv_tailoring_insufficient_credits():
    service = TailoringService()
    service.billing.can_tailor_cv = AsyncMock(return_value=(False, 4))

    with pytest.raises(HTTPException) as exc:
        await service.generate_tailored_cv(
            application_id="app-123",
            user_id="user-123",
            access_token="token-abc",
        )
    assert exc.value.status_code == 402
    assert "5 crédits sont nécessaires" in exc.value.detail


@pytest.mark.asyncio
async def test_cv_tailoring_success():
    service = TailoringService()
    service.billing.can_tailor_cv = AsyncMock(return_value=(True, 20))
    service.billing.debit_cv_tailoring = AsyncMock(return_value=15)

    # Mock DB client
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table

    mock_app_data = {
        "id": "app-123",
        "user_id": "user-123",
        "job_title": "Développeur Fullstack",
        "final_choice": {
            "title": "Lead Dev Python / React",
            "company": "Tech Corp",
            "description": "Nous cherchons un Lead Dev Python...",
        },
    }
    mock_profile_data = {
        "id": "user-123",
        "first_name": "Jimmy",
        "last_name": "Dev",
        "job_title": "Développeur Fullstack",
        "key_skills": ["Python", "FastAPI", "React"],
        "cv_text": "Développeur fullstack expérimenté.",
    }

    mock_table.execute.side_effect = [
        MagicMock(data=mock_app_data),
        MagicMock(data=mock_profile_data),
        MagicMock(data={"id": "app-123"}),
    ]

    mock_tailored_cv = {
        "full_name": "Jimmy Dev",
        "target_title": "Lead Dev Python / React",
        "contact": {"email": "jimmy@example.com", "phone": "0600000000", "location": "Paris"},
        "pitch": "Développeur Fullstack chevronné expert en architecture FastAPI et interfaces React.",
        "highlighted_skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker"],
        "experiences": [
            {
                "role": "Lead Developer",
                "company": "ScaleUp",
                "location": "Paris",
                "period": "2023 - Présent",
                "bullets": ["Architecture de 10 microservices", "Optimisation des temps de réponse de 40%"],
            }
        ],
        "education": [
            {
                "degree": "Master Informatique",
                "institution": "Université Paris",
                "year": "2022",
            }
        ],
        "ats_score": 94,
    }
    service.llm.generate_json = AsyncMock(return_value=mock_tailored_cv)

    with patch("services.tailoring_service.db_service.get_user_client", return_value=mock_client):
        res = await service.generate_tailored_cv(
            application_id="app-123",
            user_id="user-123",
            access_token="token-abc",
        )

        assert isinstance(res, TailoredCVResponse)
        assert res.full_name == "Jimmy Dev"
        assert res.target_title == "Lead Dev Python / React"
        assert res.ats_score == 94
        assert res.credits_remaining == 15
        assert len(res.experiences) == 1
        service.billing.debit_cv_tailoring.assert_called_once_with("user-123", "token-abc")
