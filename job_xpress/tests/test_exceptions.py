"""
Tests pour le système d'exceptions personnalisées.
"""
import pytest
from core.exceptions import (
    JobXpressError,
    APIError,
    RateLimitError,
    DuplicateRequestError,
    PayloadValidationError,
    ServiceError,
    ExternalAPIError,
    SearchError,
    SearchTimeoutError,
    SearchAPIError,
    LLMError,
    LLMTimeoutError,
    LLMResponseError,
    LLMQuotaError,
    OCRError,
    OCRTimeoutError,
    EmailError,
    EmailSendError,
    DatabaseError,
    DatabaseConnectionError,
    DatabaseQueryError,
    CacheError,
    PDFError,
    PDFGenerationError
)


class TestJobXpressError:
    """Tests pour l'exception de base."""
    
    def test_basic_creation(self):
        """Vérifie la création basique d'une exception."""
        error = JobXpressError("TEST-001", "Test error message")
        
        assert error.error_code == "TEST-001"
        assert error.message == "Test error message"
        assert error.details == {}
        assert error.timestamp is not None
    
    def test_with_details(self):
        """Vérifie la création avec détails."""
        error = JobXpressError(
            "TEST-002", 
            "Error with context",
            details={"key": "value", "count": 42}
        )
        
        assert error.details["key"] == "value"
        assert error.details["count"] == 42
    
    def test_to_dict(self):
        """Vérifie la sérialisation en dictionnaire."""
        error = JobXpressError("TEST-003", "Serializable error")
        result = error.to_dict()
        
        assert "error" in result
        assert result["error"]["code"] == "TEST-003"
        assert result["error"]["message"] == "Serializable error"
        assert "timestamp" in result["error"]
    
    def test_str_representation(self):
        """Vérifie la représentation string."""
        error = JobXpressError("TEST-004", "String test")
        
        assert "[TEST-004]" in str(error)
        assert "String test" in str(error)
    
    def test_original_exception(self):
        """Vérifie le stockage de l'exception originale."""
        original = ValueError("Original error")
        error = JobXpressError("TEST-005", "Wrapped error", original_exception=original)
        
        assert error.original_exception == original


class TestAPIErrors:
    """Tests pour les erreurs API."""
    
    def test_rate_limit_error(self):
        """Vérifie l'erreur de rate limit."""
        error = RateLimitError(retry_after=120)
        
        assert error.error_code == "JXP-002"
        assert error.retry_after == 120
        assert error.details["retry_after_seconds"] == 120
    
    def test_duplicate_request_error(self):
        """Vérifie l'erreur de requête dupliquée."""
        error = DuplicateRequestError("test@example.com", cooldown=300)
        
        assert error.error_code == "JXP-003"
        assert "test@example.com" in error.message
        assert error.details["email"] == "test@example.com"
    
    def test_payload_validation_error(self):
        """Vérifie l'erreur de validation payload."""
        error = PayloadValidationError("Champ manquant", field="email")
        
        assert error.error_code == "JXP-001"
        assert error.details["invalid_field"] == "email"


class TestServiceErrors:
    """Tests pour les erreurs de services."""
    
    def test_service_error_includes_service_name(self):
        """Vérifie que le nom du service est inclus."""
        error = ServiceError("SVC-001", "Service failed", "test_service")
        
        assert error.service_name == "test_service"
        assert error.details["service"] == "test_service"
    
    def test_external_api_error_with_status_code(self):
        """Vérifie l'erreur API externe avec code HTTP."""
        error = ExternalAPIError(
            "EXT-001", 
            "External API failed",
            "deepseek",
            status_code=503
        )
        
        assert error.status_code == 503
        assert error.details["status_code"] == 503
        assert error.service_name == "deepseek"


class TestSearchErrors:
    """Tests pour les erreurs de recherche."""
    
    def test_search_timeout_error(self):
        """Vérifie l'erreur de timeout recherche."""
        error = SearchTimeoutError("jsearch", 30.0)
        
        assert error.error_code == "SEARCH-001"
        assert "jsearch" in error.message
        assert error.details["source"] == "jsearch"
        assert error.details["timeout"] == 30.0
    
    def test_search_api_error(self):
        """Vérifie l'erreur API de recherche."""
        error = SearchAPIError("active_jobs", 429)
        
        assert error.error_code == "SEARCH-003"
        assert error.status_code == 429


class TestLLMErrors:
    """Tests pour les erreurs LLM."""
    
    def test_llm_timeout_error(self):
        """Vérifie l'erreur de timeout LLM."""
        error = LLMTimeoutError(60.0)
        
        assert error.error_code == "LLM-001"
        assert "60" in error.message
    
    def test_llm_response_error(self):
        """Vérifie l'erreur de réponse LLM invalide."""
        error = LLMResponseError("Invalid JSON", raw_response='{"invalid": }')
        
        assert error.error_code == "LLM-002"
        assert error.details["reason"] == "Invalid JSON"
    
    def test_llm_quota_error(self):
        """Vérifie l'erreur de quota LLM."""
        error = LLMQuotaError()
        
        assert error.error_code == "LLM-003"


class TestOCRErrors:
    """Tests pour les erreurs OCR."""
    
    def test_ocr_timeout_error(self):
        """Vérifie l'erreur de timeout OCR."""
        error = OCRTimeoutError(45.0)
        
        assert error.error_code == "OCR-001"
        assert "45" in error.message


class TestEmailErrors:
    """Tests pour les erreurs email."""
    
    def test_email_send_error(self):
        """Vérifie l'erreur d'envoi email."""
        error = EmailSendError("test@test.com", status_code=400, reason="Invalid email")
        
        assert error.error_code == "EMAIL-001"
        assert error.details["recipient"] == "test@test.com"
        assert error.details["status_code"] == 400


class TestDatabaseErrors:
    """Tests pour les erreurs base de données."""
    
    def test_database_connection_error(self):
        """Vérifie l'erreur de connexion DB."""
        error = DatabaseConnectionError(reason="Connection refused")
        
        assert error.error_code == "DB-001"
        assert error.details["reason"] == "Connection refused"
    
    def test_database_query_error(self):
        """Vérifie l'erreur de requête DB."""
        error = DatabaseQueryError("INSERT", reason="Duplicate key")
        
        assert error.error_code == "DB-002"
        assert error.details["operation"] == "INSERT"


class TestCacheErrors:
    """Tests pour les erreurs cache."""
    
    def test_cache_error(self):
        """Vérifie l'erreur cache basique."""
        error = CacheError("CACHE-001", "Cache unavailable")
        
        assert error.service_name == "cache"


class TestPDFErrors:
    """Tests pour les erreurs PDF."""
    
    def test_pdf_generation_error(self):
        """Vérifie l'erreur de génération PDF."""
        error = PDFGenerationError(reason="Invalid HTML")
        
        assert error.error_code == "PDF-001"
        assert error.details["reason"] == "Invalid HTML"


class TestExceptionHierarchy:
    """Tests pour la hiérarchie d'héritage."""
    
    def test_api_error_is_jobxpress_error(self):
        """Vérifie l'héritage APIError -> JobXpressError."""
        error = RateLimitError()
        
        assert isinstance(error, APIError)
        assert isinstance(error, JobXpressError)
    
    def test_service_error_is_jobxpress_error(self):
        """Vérifie l'héritage ServiceError -> JobXpressError."""
        error = SearchError("TEST", "Test")
        
        assert isinstance(error, ServiceError)
        assert isinstance(error, JobXpressError)
    
    def test_llm_error_is_service_error(self):
        """Vérifie l'héritage LLMError -> ServiceError."""
        error = LLMTimeoutError(30)
        
        assert isinstance(error, LLMError)
        assert isinstance(error, ServiceError)
        assert isinstance(error, JobXpressError)
    
    def test_external_api_error_is_service_error(self):
        """Vérifie l'héritage ExternalAPIError -> ServiceError."""
        error = SearchAPIError("test", 500)
        
        assert isinstance(error, ExternalAPIError)
        assert isinstance(error, ServiceError)
