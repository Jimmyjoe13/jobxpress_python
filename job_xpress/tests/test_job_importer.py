"""
Tests unitaires pour le service d'importation d'offres externes.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from services.job_importer import (
    clean_html_to_text,
    JobImporterService,
    JobImportRequest,
    JobImportResponse,
)


def test_clean_html_to_text():
    html_raw = """
    <html>
        <head><title>Job Title</title><script>console.log('secret')</script></head>
        <body>
            <style>.hidden { display: none; }</style>
            <h1>Développeur Python Fullstack</h1>
            <p>Entreprise : <strong>Tech Innov</strong></p>
            <p>Lieu : Paris &amp; Télétravail</p>
            <br>
            <div>Missions : Concevoir des API FastAPI &amp; Next.js</div>
        </body>
    </html>
    """
    cleaned = clean_html_to_text(html_raw)
    assert "console.log" not in cleaned
    assert "display: none" not in cleaned
    assert "Développeur Python Fullstack" in cleaned
    assert "Tech Innov" in cleaned
    assert "Paris & Télétravail" in cleaned
    assert "FastAPI & Next.js" in cleaned


@pytest.mark.asyncio
async def test_job_importer_empty_request():
    service = JobImporterService()
    req = JobImportRequest(url=None, raw_text=None)
    with pytest.raises(HTTPException) as exc:
        await service.import_job(req, user_id="test-user", access_token="test-token")
    assert exc.value.status_code == 400
    assert "Veuillez fournir" in exc.value.detail


@pytest.mark.asyncio
async def test_job_importer_too_short_text():
    service = JobImporterService()
    req = JobImportRequest(url=None, raw_text="trop court")
    with pytest.raises(HTTPException) as exc:
        await service.import_job(req, user_id="test-user", access_token="test-token")
    assert exc.value.status_code == 400
    assert "trop court" in exc.value.detail


@pytest.mark.asyncio
async def test_job_importer_successful_import():
    service = JobImporterService()
    
    # Mock LLM
    mock_parsed_job = {
        "title": "Lead Dev Python",
        "company": "ScaleUp Corp",
        "location": "Lyon / Hybride",
        "contract_type": "CDI",
        "work_type": "Hybride",
        "salary": "55k-65k€",
        "description": "Nous cherchons un Lead Developer Python pour piloter l'architecture de nos microservices.",
        "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "experience_level": "Sénior",
    }
    service.llm.generate_json = AsyncMock(return_value=mock_parsed_job)

    # Mock DB client
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data={"first_name": "Jimmy", "last_name": "G", "email": "test@example.com", "cv_url": "https://test.com/cv.pdf"})
    mock_table.upsert.return_value = mock_table
    mock_table.insert.return_value = mock_table

    with patch("services.job_importer.db_service.get_user_client", return_value=mock_client):
        req = JobImportRequest(
            url=None,
            raw_text="Nous recrutons un Lead Dev Python chez ScaleUp Corp à Lyon en CDI. Expérience exigée en microservices FastAPI et Docker.",
        )
        res = await service.import_job(req, user_id="11111111-1111-1111-1111-111111111111", access_token="dummy-jwt")

        assert isinstance(res, JobImportResponse)
        assert res.title == "Lead Dev Python"
        assert res.company == "ScaleUp Corp"
        assert res.location == "Lyon / Hybride"
        assert res.contract_type == "CDI"
        assert res.tracking_status == "SAVED"
        assert "Python" in res.skills
        assert "FastAPI" in res.skills
        assert "0 crédit consommé" in res.message

        # Vérifier que applications_v2 a été inséré
        mock_client.table.assert_any_call("applications_v2")
        mock_client.table.assert_any_call("job_offers_v2")
        mock_client.table.assert_any_call("saved_jobs")
