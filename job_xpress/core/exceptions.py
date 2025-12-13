"""
Hiérarchie d'exceptions personnalisées pour JobXpress.

Cette architecture permet :
- Des erreurs typées et spécifiques
- Des codes d'erreur métier standardisés
- Une meilleure observabilité en production
- Des réponses API cohérentes
"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone


class JobXpressError(Exception):
    """
    Exception de base pour toutes les erreurs JobXpress.
    
    Attributes:
        error_code: Code unique identifiant l'erreur (ex: JXP-001)
        message: Message d'erreur lisible
        details: Contexte additionnel pour le debugging
        timestamp: Moment de l'erreur
    """
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.original_exception = original_exception
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Sérialise l'erreur en dictionnaire pour les réponses API."""
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
                "timestamp": self.timestamp
            }
        }
    
    def __str__(self) -> str:
        return f"[{self.error_code}] {self.message}"


# ===========================================
# ERREURS API
# ===========================================

class APIError(JobXpressError):
    """Erreurs liées aux endpoints API."""
    pass


class RateLimitError(APIError):
    """Rate limit dépassé."""
    
    def __init__(self, message: str = "Trop de requêtes", retry_after: int = 300):
        super().__init__(
            error_code="JXP-002",
            message=message,
            details={"retry_after_seconds": retry_after}
        )
        self.retry_after = retry_after


class DuplicateRequestError(APIError):
    """Requête dupliquée (même email dans le cooldown)."""
    
    def __init__(self, email: str, cooldown: int = 300):
        super().__init__(
            error_code="JXP-003",
            message=f"Candidature déjà reçue pour {email}",
            details={"email": email, "cooldown_seconds": cooldown}
        )


class PayloadValidationError(APIError):
    """Payload Tally invalide."""
    
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            error_code="JXP-001",
            message=message,
            details={"invalid_field": field} if field else {}
        )


# ===========================================
# ERREURS SERVICES
# ===========================================

class ServiceError(JobXpressError):
    """Erreur de base pour les services internes."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        service_name: str,
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, details, original_exception)
        self.service_name = service_name
        self.details["service"] = service_name


class ExternalAPIError(ServiceError):
    """Erreur lors d'un appel à une API externe."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        service_name: str,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, service_name, details, original_exception)
        self.status_code = status_code
        if status_code:
            self.details["status_code"] = status_code


# --- Search Engine Errors ---

class SearchError(ServiceError):
    """Erreurs du moteur de recherche."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "search_engine", details, original_exception)


class SearchTimeoutError(SearchError):
    """Timeout lors de la recherche."""
    
    def __init__(self, source: str, timeout: float):
        super().__init__(
            error_code="SEARCH-001",
            message=f"Timeout {source} après {timeout}s",
            details={"source": source, "timeout": timeout}
        )


class NoResultsError(SearchError):
    """Aucune offre trouvée."""
    
    def __init__(self, query: str, location: str):
        super().__init__(
            error_code="SEARCH-002",
            message="Aucune offre trouvée",
            details={"query": query, "location": location}
        )


class SearchAPIError(ExternalAPIError):
    """Erreur API de recherche (JSearch, Active Jobs)."""
    
    def __init__(self, source: str, status_code: int, message: str = "Erreur API recherche"):
        super().__init__(
            error_code="SEARCH-003",
            message=message,
            service_name=f"search_{source}",
            status_code=status_code
        )


# --- LLM Engine Errors ---

class LLMError(ServiceError):
    """Erreurs du service LLM (DeepSeek)."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "llm_engine", details, original_exception)


class LLMTimeoutError(LLMError):
    """Timeout DeepSeek."""
    
    def __init__(self, timeout: float):
        super().__init__(
            error_code="LLM-001",
            message=f"DeepSeek timeout après {timeout}s",
            details={"timeout": timeout}
        )


class LLMResponseError(LLMError):
    """Réponse LLM invalide ou parsing échoué."""
    
    def __init__(self, reason: str, raw_response: Optional[str] = None):
        super().__init__(
            error_code="LLM-002",
            message=f"Réponse LLM invalide: {reason}",
            details={"reason": reason, "raw_sample": raw_response[:200] if raw_response else None}
        )


class LLMQuotaError(LLMError):
    """Quota DeepSeek dépassé."""
    
    def __init__(self):
        super().__init__(
            error_code="LLM-003",
            message="Quota DeepSeek dépassé"
        )


# --- OCR Errors ---

class OCRError(ServiceError):
    """Erreurs du service OCR (Mistral)."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "ocr_service", details, original_exception)


class OCRTimeoutError(OCRError):
    """Timeout Mistral OCR."""
    
    def __init__(self, timeout: float):
        super().__init__(
            error_code="OCR-001",
            message=f"Mistral OCR timeout après {timeout}s",
            details={"timeout": timeout}
        )


class OCRFormatError(OCRError):
    """Format de CV non supporté."""
    
    def __init__(self, file_type: str):
        super().__init__(
            error_code="OCR-002",
            message=f"Format de CV non supporté: {file_type}",
            details={"file_type": file_type}
        )


# --- Email Errors ---

class EmailError(ServiceError):
    """Erreurs du service email (Brevo)."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "email_service", details, original_exception)


class EmailSendError(EmailError):
    """Échec d'envoi email."""
    
    def __init__(self, recipient: str, status_code: Optional[int] = None, reason: str = ""):
        super().__init__(
            error_code="EMAIL-001",
            message=f"Échec envoi email à {recipient}",
            details={"recipient": recipient, "status_code": status_code, "reason": reason}
        )


class EmailInvalidError(EmailError):
    """Adresse email invalide."""
    
    def __init__(self, email: str):
        super().__init__(
            error_code="EMAIL-002",
            message=f"Adresse email invalide: {email}",
            details={"email": email}
        )


# --- Database Errors ---

class DatabaseError(ServiceError):
    """Erreurs du service base de données (Supabase)."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "database", details, original_exception)


class DatabaseConnectionError(DatabaseError):
    """Connexion Supabase échouée."""
    
    def __init__(self, reason: str = ""):
        super().__init__(
            error_code="DB-001",
            message="Connexion Supabase échouée",
            details={"reason": reason}
        )


class DatabaseQueryError(DatabaseError):
    """Requête Supabase échouée."""
    
    def __init__(self, operation: str, reason: str = ""):
        super().__init__(
            error_code="DB-002",
            message=f"Opération {operation} échouée",
            details={"operation": operation, "reason": reason}
        )


# --- Cache Errors ---

class CacheError(ServiceError):
    """Erreurs du service cache (SQLite)."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "cache", details, original_exception)


class CacheConnectionError(CacheError):
    """Erreur connexion cache."""
    
    def __init__(self, db_path: str, reason: str = ""):
        super().__init__(
            error_code="CACHE-001",
            message="Erreur cache SQLite",
            details={"db_path": db_path, "reason": reason}
        )


# --- PDF Errors ---

class PDFError(ServiceError):
    """Erreurs du service génération PDF."""
    
    def __init__(
        self, 
        error_code: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(error_code, message, "pdf_generator", details, original_exception)


class PDFGenerationError(PDFError):
    """Échec de génération PDF."""
    
    def __init__(self, reason: str = ""):
        super().__init__(
            error_code="PDF-001",
            message="Échec génération PDF",
            details={"reason": reason}
        )
