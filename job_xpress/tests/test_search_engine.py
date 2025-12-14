"""
Tests pour le moteur de recherche.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from models.candidate import CandidateProfile, WorkType
from models.job_offer import JobOffer
from services.search_engine import SearchEngine, JOB_SYNONYMS_LIST, JSEARCH_TYPES_MAP


class TestJobSynonyms:
    """Tests pour le dictionnaire de synonymes."""
    
    def test_synonyms_exist_for_common_jobs(self):
        """Vérifie que les métiers courants ont des synonymes."""
        assert "growth hacker" in JOB_SYNONYMS_LIST
        assert "business developer" in JOB_SYNONYMS_LIST
        assert "data analyst" in JOB_SYNONYMS_LIST
        assert "développeur" in JOB_SYNONYMS_LIST
    
    def test_synonyms_contain_variations(self):
        """Vérifie que les synonymes contiennent des variations."""
        growth_synonyms = JOB_SYNONYMS_LIST.get("growth hacker", [])
        
        assert len(growth_synonyms) > 5
        assert "Growth Marketer" in growth_synonyms
        assert "Traffic Manager" in growth_synonyms
    
    def test_contract_type_mapping(self):
        """Vérifie le mapping des types de contrat."""
        assert JSEARCH_TYPES_MAP["CDI"] == "FULLTIME"
        assert JSEARCH_TYPES_MAP["Stage"] == "INTERN"
        assert JSEARCH_TYPES_MAP["Alternance"] == "INTERN"


class TestSearchEngine:
    """Tests pour le moteur de recherche."""
    
    @pytest.fixture
    def search_engine(self):
        """Instance du moteur de recherche."""
        return SearchEngine()
    
    @pytest.fixture
    def sample_candidate(self):
        """Candidat de test."""
        return CandidateProfile(
            first_name="Jean",
            last_name="Dupont",
            email="jean@test.com",
            job_title="Growth Hacker",
            contract_type="CDI",
            work_type=WorkType.FULL_REMOTE,
            experience_level="Confirmé",
            location="Paris"
        )
    
    def test_search_engine_initialization(self, search_engine):
        """Vérifie l'initialisation du moteur."""
        assert search_engine is not None
        assert hasattr(search_engine, 'find_jobs')
        assert hasattr(search_engine, 'headers_jsearch')
        assert hasattr(search_engine, 'headers_active_jobs')
    
    def test_parse_jsearch_results_valid(self, search_engine):
        """Vérifie le parsing des résultats JSearch."""
        raw_results = [
            {
                "job_title": "Growth Hacker",
                "employer_name": "TechCorp",
                "job_city": "Paris",
                "job_description": "Description du poste...",
                "job_apply_link": "https://example.com/apply",
                "job_employment_type": "FULLTIME",
                "job_is_remote": True
            }
        ]
        
        jobs = search_engine._parse_jsearch_results(raw_results)
        
        assert len(jobs) == 1
        assert jobs[0].title == "Growth Hacker"
        assert jobs[0].company == "TechCorp"
        assert jobs[0].is_remote is True
    
    def test_parse_jsearch_results_empty(self, search_engine):
        """Vérifie le parsing avec résultats vides."""
        jobs = search_engine._parse_jsearch_results([])
        assert jobs == []
    
    def test_parse_jsearch_results_malformed(self, search_engine):
        """Vérifie la gestion des résultats malformés."""
        raw_results = [
            "not a dict",
            None,
            {"job_title": "Valid Job", "employer_name": "Corp", "job_description": "Desc", "job_apply_link": "https://example.com"}
        ]
        
        jobs = search_engine._parse_jsearch_results(raw_results)
        
        # Seul le dernier élément valide doit être parsé
        assert len(jobs) == 1
    
    def test_parse_active_jobs_results(self, search_engine):
        """Vérifie le parsing des résultats Active Jobs."""
        raw_results = [
            {
                "title": "Data Analyst",
                "organization_name": "DataCorp",
                "location": "Lyon",
                "description": "Analyse de données...",
                "url": "https://example.com/job/1"
            }
        ]
        
        jobs = search_engine._parse_active_jobs_results(raw_results)
        
        assert len(jobs) == 1
        assert jobs[0].title == "Data Analyst"
        assert jobs[0].company == "DataCorp"
    
    def test_mock_jobs_returned_without_api_key(self, search_engine):
        """Vérifie que les mock jobs sont retournés sans clé API."""
        # Sauvegarder la clé
        with patch('services.search_engine.settings') as mock_settings:
            mock_settings.RAPIDAPI_KEY = ""
            
            mock_jobs = search_engine._get_mock_jobs()
            
            assert len(mock_jobs) >= 1
            assert mock_jobs[0].title == "Mock Job"


class TestJobOfferModel:
    """Tests pour le modèle JobOffer."""
    
    def test_job_offer_creation(self, sample_job_offer):
        """Vérifie la création d'une offre."""
        job = JobOffer(**sample_job_offer)
        
        assert job.title == "Growth Hacker Senior"
        assert job.company == "TechStartup"
        assert job.match_score == 0  # Par défaut
    
    def test_job_offer_with_analysis(self):
        """Vérifie une offre avec analyse IA."""
        job = JobOffer(
            title="Developer",
            company="Corp",
            description="Description",
            url="https://example.com",
            match_score=85,
            ai_analysis={
                "score_technical": 90,
                "score_structural": 80,
                "reasoning": "Good match"
            }
        )
        
        assert job.match_score == 85
        assert job.ai_analysis["score_technical"] == 90
    
    def test_job_offer_default_values(self):
        """Vérifie les valeurs par défaut d'une offre."""
        job = JobOffer(
            title="Test",
            company="Corp",
            description="Desc",
            url="https://example.com"
        )
        
        assert job.location == "Non spécifié"
        assert job.is_remote is False
        assert job.match_score == 0
        assert job.ai_analysis is None


class TestSearchStrategies:
    """Tests pour les stratégies de recherche."""
    
    @pytest.fixture
    def search_engine(self):
        return SearchEngine()
    
    @pytest.mark.asyncio
    async def test_jsearch_strategy_builds_query(self, search_engine):
        """Vérifie la construction de la requête JSearch."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Growth Hacker",
            contract_type="CDI",
            work_type=WorkType.FULL_REMOTE,
            location="Paris"
        )
        
        with patch.object(search_engine, '_call_jsearch_api', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = []
            
            await search_engine._search_jsearch_strategy(candidate)
            
            # Vérifier que l'API a été appelée
            assert mock_call.called
    
    @pytest.mark.asyncio
    async def test_parallel_search_execution(self, search_engine):
        """Vérifie l'exécution parallèle des recherches."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            location="Paris"
        )
        
        with patch.object(search_engine, '_search_jsearch_strategy', new_callable=AsyncMock) as mock_jsearch:
            with patch.object(search_engine, '_search_active_jobs_db', new_callable=AsyncMock) as mock_active:
                with patch.object(search_engine, '_enrich_jobs_with_full_content', new_callable=AsyncMock) as mock_enrich:
                    mock_jsearch.return_value = []
                    mock_active.return_value = []
                    mock_enrich.return_value = []
                    
                    await search_engine.find_jobs(candidate)
                    
                    # Les deux sources doivent être appelées
                    assert mock_jsearch.called
                    assert mock_active.called


class TestWorkTypeFiltering:
    """Tests pour le filtrage par type de travail."""
    
    @pytest.fixture
    def search_engine(self):
        return SearchEngine()
    
    @pytest.mark.asyncio
    async def test_full_remote_adds_filter(self, search_engine):
        """Full Remote active le filtre remote_jobs_only."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            work_type=WorkType.FULL_REMOTE,
            location="Paris"
        )
        
        with patch.object(search_engine, '_call_jsearch_api', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = []
            
            await search_engine._search_jsearch_strategy(candidate)
            
            # Vérifier que remote_jobs_only est dans les params
            call_args = mock_call.call_args[0][0]
            assert call_args.get("remote_jobs_only") == "true"
    
    @pytest.mark.asyncio
    async def test_tous_no_remote_filter(self, search_engine):
        """WorkType.TOUS ne filtre pas par remote."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            work_type=WorkType.TOUS,
            location="Paris"
        )
        
        with patch.object(search_engine, '_call_jsearch_api', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = []
            
            await search_engine._search_jsearch_strategy(candidate)
            
            # Vérifier que remote_jobs_only n'est PAS dans les params
            call_args = mock_call.call_args[0][0]
            assert "remote_jobs_only" not in call_args
    
    @pytest.mark.asyncio
    async def test_hybride_adds_keywords(self, search_engine):
        """Hybride ajoute des mots-clés à la requête."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            work_type=WorkType.HYBRIDE,
            location="Paris"
        )
        
        # Retourner des résultats pour éviter les tentatives de sauvetage
        mock_job = JobOffer(
            title="Developer",
            company="Corp",
            description="Test",
            url="https://example.com"
        )
        
        with patch.object(search_engine, '_call_jsearch_api', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = [mock_job] * 5  # Assez de résultats
            
            await search_engine._search_jsearch_strategy(candidate)
            
            # Vérifier que le mot-clé Hybride est dans la query de la première tentative
            first_call_args = mock_call.call_args_list[0][0][0]
            assert "Hybride" in first_call_args.get("query", "")
    
    def test_parse_jsearch_detects_remote(self, search_engine):
        """Le parsing détecte correctement les offres remote."""
        raw_jobs = [
            {
                "job_title": "Developer",
                "employer_name": "Corp",
                "job_description": "Description",
                "job_apply_link": "https://example.com",
                "job_is_remote": True
            }
        ]
        
        jobs = search_engine._parse_jsearch_results(raw_jobs)
        
        assert len(jobs) == 1
        assert jobs[0].work_type == "Full Remote"
        assert jobs[0].is_remote is True
    
    def test_parse_jsearch_detects_hybride(self, search_engine):
        """Le parsing détecte les offres hybrides via description."""
        raw_jobs = [
            {
                "job_title": "Developer",
                "employer_name": "Corp",
                "job_description": "Poste hybride avec 2 jours de télétravail",
                "job_apply_link": "https://example.com",
                "job_is_remote": False
            }
        ]
        
        jobs = search_engine._parse_jsearch_results(raw_jobs)
        
        assert len(jobs) == 1
        assert jobs[0].work_type == "Hybride"
    
    def test_parse_jsearch_detects_presentiel(self, search_engine):
        """Le parsing détecte les offres présentiel par défaut."""
        raw_jobs = [
            {
                "job_title": "Developer",
                "employer_name": "Corp",
                "job_description": "Poste en bureau à Paris",
                "job_apply_link": "https://example.com",
                "job_is_remote": False
            }
        ]
        
        jobs = search_engine._parse_jsearch_results(raw_jobs)
        
        assert len(jobs) == 1
        assert jobs[0].work_type == "Présentiel"
