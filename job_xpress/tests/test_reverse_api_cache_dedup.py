"""
Tests unitaires pour la déduplication avancée, la détection d'agences et le cache Redis.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models.job_offer_v2 import JobOffer
from services.scrapers.base_scraper import BaseJobScraper
from services.scrapers.deduplication import (
    clean_title,
    clean_company,
    clean_url,
    token_jaccard_similarity,
    merge_offers,
    deduplicate_job_offers
)
from services.scrapers.unified_discovery import UnifiedReverseApiEngine

class DummyScraper(BaseJobScraper):
    name = "dummy"
    async def search(self, job_title, location=None, contract_type=None, limit=15):
        return []

# ==============================================================================
# TESTS NETTOYAGE ET DÉDUPLICATION
# ==============================================================================

def test_clean_title_removes_noise_and_contracts():
    raw1 = "Développeur Python (H/F) - CDI"
    raw2 = "[CDI] Lead Dev Python / Django Full Remote (F/H)"
    raw3 = "Ingénieur DevOps h/f - Freelance / Télétravail"

    assert clean_title(raw1) == "développeur python"
    assert clean_title(raw2) == "lead dev python django"
    assert clean_title(raw3) == "ingénieur devops"

def test_clean_company_removes_legal_suffixes():
    comp1 = "Capgemini France SAS"
    comp2 = "Wavestone Consulting SA"
    comp3 = "Scalers Groupe"

    assert clean_company(comp1) == "capgemini"
    assert clean_company(comp2) == "wavestone"
    assert clean_company(comp3) == "scalers"

def test_clean_url_strips_tracking_and_trailing_slash():
    url1 = "https://www.free-work.com/fr/jobs/12345?utm_source=alert&utm_medium=email&ref=homepage/"
    url2 = "https://remotive.com/job/python-dev/?ref=jobboard"

    cleaned1 = clean_url(url1)
    cleaned2 = clean_url(url2)

    assert "utm_source" not in cleaned1
    assert "ref" not in cleaned1
    assert cleaned1 == "https://www.free-work.com/fr/jobs/12345"
    assert cleaned2 == "https://remotive.com/job/python-dev"

def test_token_jaccard_similarity():
    s1 = "senior python developer"
    s2 = "python developer senior"
    s3 = "java spring developer"

    assert token_jaccard_similarity(s1, s2) == 1.0
    assert token_jaccard_similarity(s1, s3) < 0.3

def test_merge_offers_preserves_richest_data():
    base = JobOffer(
        title="Dev Python",
        company="TechCorp",
        url="https://example.com/job1",
        description="Brève description",
        skills=["Python"],
        salary=None,
        contact_email=None
    )
    dup = JobOffer(
        title="Dev Python (H/F)",
        company="TechCorp France",
        url="https://example.com/job1-alt",
        description="Description très complète et détaillée sur l'équipe et le stack",
        skills=["Python", "FastAPI", "Docker"],
        salary="55k-65k €",
        contact_email="rh@techcorp.com",
        is_remote=True
    )

    merged = merge_offers(base, dup)

    assert merged.salary == "55k-65k €"
    assert merged.contact_email == "rh@techcorp.com"
    assert "FastAPI" in merged.skills
    assert merged.is_remote is True
    assert len(merged.description) > 30

def test_deduplicate_job_offers_multi_level():
    o1 = JobOffer(
        title="Développeur Python (H/F)",
        company="Acme SAS",
        url="https://site.com/job/1?utm_source=google",
        description="Description 1"
    )
    # Doublon par URL canonique
    o2 = JobOffer(
        title="Autre titre",
        company="Acme",
        url="https://site.com/job/1",
        description="Description 2"
    )
    # Doublon par (titre + entreprise)
    o3 = JobOffer(
        title="Développeur Python - CDI",
        company="Acme France",
        url="https://site.com/job/99",
        description="Description 3 avec salaire",
        salary="60k €"
    )
    # Offre distincte
    o4 = JobOffer(
        title="Data Engineer",
        company="Acme",
        url="https://site.com/job/2",
        description="Data engineer job"
    )

    offers = [o1, o2, o3, o4]
    unique = deduplicate_job_offers(offers, limit=10)

    assert len(unique) == 2
    # La première offre doit avoir hérité du salaire de o3 lors du merge
    assert unique[0].salary == "60k €"
    assert unique[1].title == "Data Engineer"

# ==============================================================================
# TESTS DÉTECTION AGENCES & ESN
# ==============================================================================

def test_detect_agency_by_name():
    scraper = DummyScraper()
    assert scraper.detect_agency("Michael Page") is True
    assert scraper.detect_agency("Capgemini France") is True
    assert scraper.detect_agency("Avanda") is True
    assert scraper.detect_agency("Allegis Group") is True
    assert scraper.detect_agency("Doctolib") is False

def test_detect_agency_by_description():
    scraper = DummyScraper()
    desc_agency1 = "Nous recrutons pour le compte d'un de nos clients finaux dans le secteur bancaire..."
    desc_agency2 = "Notre client recherche un Développeur Senior pour un projet stratégique."
    desc_direct = "Au sein de notre équipe produit, vous concevrez les nouvelles fonctionnalités SaaS."

    assert scraper.detect_agency("Inconnu SAS", desc_agency1) is True
    assert scraper.detect_agency("Société Secrète", desc_agency2) is True
    assert scraper.detect_agency("Startup Direct", desc_direct) is False

# ==============================================================================
# TESTS CACHE REDIS DANS UNIFIED REVERSE API ENGINE
# ==============================================================================

@pytest.mark.asyncio
async def test_unified_engine_redis_cache_hit():
    engine = UnifiedReverseApiEngine()
    fake_cached = [
        {
            "title": "Cached Python Dev",
            "company": "CacheCorp",
            "url": "https://example.com/cached",
            "location": "Paris",
            "salary": "50k",
            "skills": ["Python"]
        }
    ]

    with patch("services.scrapers.unified_discovery.redis_cache") as mock_cache:
        mock_cache.is_available = True
        mock_cache.get.return_value = fake_cached

        results = await engine.find_jobs("python", "paris")

        assert len(results) == 1
        assert results[0].title == "Cached Python Dev"
        assert results[0].company == "CacheCorp"
        mock_cache.get.assert_called_once()

@pytest.mark.asyncio
async def test_unified_engine_redis_cache_miss_stores_results():
    engine = UnifiedReverseApiEngine()

    mock_scraper = DummyScraper()
    dummy_offer = JobOffer(
        title="Live Python Dev",
        company="LiveCorp",
        url="https://example.com/live",
        location="Paris"
    )
    mock_scraper.search = AsyncMock(return_value=[dummy_offer])
    engine.scrapers = [mock_scraper]

    with patch("services.scrapers.unified_discovery.redis_cache") as mock_cache:
        mock_cache.is_available = True
        mock_cache.get.return_value = None  # Cache MISS
        mock_cache.set.return_value = True

        results = await engine.find_jobs("python", "paris")

        assert len(results) == 1
        assert results[0].title == "Live Python Dev"
        mock_cache.get.assert_called_once()
        mock_cache.set.assert_called_once()
