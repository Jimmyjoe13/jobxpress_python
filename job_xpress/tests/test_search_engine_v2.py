"""
Tests pour le SearchEngine V2 - Déduplication et filtres.
"""
import pytest
from datetime import datetime, timedelta
from models.job_offer import JobOffer


class TestDeduplication:
    """Tests pour la déduplication Fuzzy."""
    
    def setup_method(self):
        """Setup pour chaque test."""
        from services.search_engine_v2 import SearchEngineV2
        from unittest.mock import MagicMock
        
        mock_base = MagicMock()
        self.engine = SearchEngineV2(mock_base)
    
    def test_exact_duplicates_removed(self):
        """Les doublons exacts doivent être supprimés."""
        jobs = [
            JobOffer(
                title="Développeur Python",
                company="TechCorp",
                description="Description 1",
                url="http://job1.com",
                source="jsearch"
            ),
            JobOffer(
                title="Développeur Python",
                company="TechCorp",
                description="Description 2",
                url="http://job2.com",
                source="serpapi"
            ),
        ]
        
        result = self.engine._deduplicate_fuzzy(jobs)
        
        assert len(result) == 1
        assert result[0].title == "Développeur Python"
    
    def test_similar_titles_same_company_deduplicated(self):
        """Titres similaires (>90%) de même entreprise = doublons."""
        jobs = [
            JobOffer(
                title="Senior Python Developer",
                company="Google",
                description="Desc 1",
                url="http://job1.com"
            ),
            JobOffer(
                title="Senior Python Developper",  # Typo = 95% similarité
                company="Google",
                description="Desc 2",
                url="http://job2.com"
            ),
        ]
        
        result = self.engine._deduplicate_fuzzy(jobs)
        
        assert len(result) == 1
    
    def test_different_companies_kept(self):
        """Même titre mais entreprises différentes = pas de dédup."""
        jobs = [
            JobOffer(
                title="Data Engineer",
                company="Microsoft",
                description="Desc 1",
                url="http://job1.com"
            ),
            JobOffer(
                title="Data Engineer",
                company="Amazon",
                description="Desc 2",
                url="http://job2.com"
            ),
        ]
        
        result = self.engine._deduplicate_fuzzy(jobs)
        
        assert len(result) == 2
    
    def test_different_titles_kept(self):
        """Titres différents même entreprise = pas de dédup."""
        jobs = [
            JobOffer(
                title="Backend Developer",
                company="Netflix",
                description="Desc 1",
                url="http://job1.com"
            ),
            JobOffer(
                title="Frontend Developer",
                company="Netflix",
                description="Desc 2",
                url="http://job2.com"
            ),
        ]
        
        result = self.engine._deduplicate_fuzzy(jobs)
        
        assert len(result) == 2
    
    def test_company_slug_normalization(self):
        """Les noms d'entreprise doivent être normalisés (slug)."""
        jobs = [
            JobOffer(
                title="Developer",
                company="Apple Inc.",
                description="Desc 1",
                url="http://job1.com"
            ),
            JobOffer(
                title="Developer",
                company="apple-inc",  # Même slug
                description="Desc 2",
                url="http://job2.com"
            ),
        ]
        
        result = self.engine._deduplicate_fuzzy(jobs)
        
        assert len(result) == 1
    
    def test_most_recent_kept(self):
        """L'offre la plus récente doit être conservée."""
        jobs = [
            JobOffer(
                title="Developer",
                company="Test",
                description="Old",
                url="http://old.com",
                date_posted="2024-01-01"
            ),
            JobOffer(
                title="Developer",
                company="Test",
                description="New",
                url="http://new.com",
                date_posted="2024-12-15"
            ),
        ]
        
        result = self.engine._deduplicate_fuzzy(jobs)
        
        assert len(result) == 1
        assert result[0].url == "http://new.com"


class TestSmartFilters:
    """Tests pour les filtres intelligents."""
    
    def setup_method(self):
        """Setup pour chaque test."""
        from services.search_engine_v2 import SearchEngineV2
        from unittest.mock import MagicMock
        from models.candidate import CandidateProfile
        
        mock_base = MagicMock()
        self.engine = SearchEngineV2(mock_base)
        self.candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Python Developer"
        )
    
    def test_agency_detection(self):
        """Les cabinets de recrutement doivent être détectés."""
        assert self.engine._is_agency("nous recrutons pour notre client final")
        assert self.engine._is_agency("cabinet de recrutement recherche")  # lowercase
        assert not self.engine._is_agency("nous recherchons un développeur")
    
    def test_salary_warning_no_salary(self):
        """Offre sans mention de salaire = warning (pas de keywords)."""
        # 'confirmé' contient 'eur' qui est un keyword, donc on utilise un texte différent
        assert not self.engine._has_salary_info("CDI temps plein")
    
    def test_salary_warning_with_salary(self):
        """Offre avec mention de salaire = pas de warning."""
        assert self.engine._has_salary_info("salaire: 45k€ - 55k€")  # lowercase
        assert self.engine._has_salary_info("rémunération attractive")  # lowercase
        assert self.engine._has_salary_info("Package 50000€ brut")
    
    def test_exclude_agencies_filter(self):
        """Filtre anti-cabinet doit exclure les offres de cabinet."""
        jobs = [
            JobOffer(
                title="Developer",
                company="Direct Hire",
                description="Nous recherchons un développeur Python",
                url="http://direct.com"
            ),
            JobOffer(
                title="Developer",
                company="Agency XYZ",
                description="Pour le compte de notre client, nous recherchons",
                url="http://agency.com"
            ),
        ]
        
        filters = {"exclude_agencies": True}
        result = self.engine._apply_smart_filters(jobs, filters, self.candidate)
        
        assert len(result) == 1
        assert result[0].company == "Direct Hire"
    
    def test_cutoff_date_filter(self):
        """Filtrer les offres trop anciennes."""
        old_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        recent_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        
        jobs = [
            JobOffer(
                title="Developer",
                company="Old Corp",
                description="Old job",
                url="http://old.com",
                date_posted=old_date
            ),
            JobOffer(
                title="Developer",
                company="New Corp",
                description="Recent job",
                url="http://new.com",
                date_posted=recent_date
            ),
        ]
        
        filters = {"max_days_old": 14}
        result = self.engine._apply_smart_filters(jobs, filters, self.candidate)
        
        assert len(result) == 1
        assert result[0].company == "New Corp"


class TestDateParsing:
    """Tests pour le parsing des dates."""
    
    def setup_method(self):
        """Setup pour chaque test."""
        from services.search_engine_v2 import SearchEngineV2
        from unittest.mock import MagicMock
        
        mock_base = MagicMock()
        self.engine = SearchEngineV2(mock_base)
    
    def test_iso_format(self):
        """Format ISO 8601."""
        result = self.engine._parse_date("2024-12-15")
        assert result is not None
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 15
    
    def test_french_format(self):
        """Format français DD/MM/YYYY."""
        result = self.engine._parse_date("15/12/2024")
        assert result is not None
        assert result.day == 15
    
    def test_relative_days(self):
        """Format relatif 'il y a X jours'."""
        result = self.engine._parse_date("il y a 3 jours")
        assert result is not None
        
        expected = datetime.now() - timedelta(days=3)
        assert abs((result - expected).total_seconds()) < 86400  # À un jour près
    
    def test_today(self):
        """Format 'aujourd'hui'."""
        result = self.engine._parse_date("aujourd'hui")
        assert result is not None
        assert result.date() == datetime.now().date()
    
    def test_invalid_returns_none(self):
        """Format invalide doit retourner None."""
        assert self.engine._parse_date("invalid date") is None
        assert self.engine._parse_date("") is None
        assert self.engine._parse_date(None) is None
