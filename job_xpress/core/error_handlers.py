"""
Handlers d'exceptions globaux pour FastAPI.

Ces handlers interceptent les exceptions et retournent des réponses
API standardisées avec les codes HTTP appropriés.
"""
import uuid
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from core.exceptions import (
    JobXpressError,
    APIError,
    ServiceError,
    ExternalAPIError,
    RateLimitError,
    DuplicateRequestError,
    PayloadValidationError,
    SearchError,
    LLMError,
    OCRError,
    EmailError,
    DatabaseError,
    CacheError,
    PDFError
)
from core.logging_config import get_logger

logger = get_logger()


def add_request_id(request: Request) -> str:
    """Génère ou récupère un request ID pour le tracking."""
    request_id = request.headers.get("X-Request-ID")
    if not request_id:
        request_id = str(uuid.uuid4())[:8]
    return request_id


async def jobxpress_exception_handler(request: Request, exc: JobXpressError) -> JSONResponse:
    """
    Handler pour toutes les exceptions JobXpress de base.
    Retourne 500 Internal Server Error par défaut.
    """
    request_id = add_request_id(request)
    
    # Log avec contexte
    logger.error(
        f"[{request_id}] {exc.error_code}: {exc.message}",
        extra={
            "error_code": exc.error_code,
            "request_id": request_id,
            "details": exc.details
        }
    )
    
    response_data = exc.to_dict()
    response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=500,
        content=response_data
    )


async def api_exception_handler(request: Request, exc: APIError) -> JSONResponse:
    """
    Handler pour les erreurs API (validation, rate limit, etc.).
    Retourne 400 Bad Request par défaut.
    """
    request_id = add_request_id(request)
    
    logger.warning(
        f"[{request_id}] API Error: {exc.error_code} - {exc.message}",
        extra={"error_code": exc.error_code, "request_id": request_id}
    )
    
    response_data = exc.to_dict()
    response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=400,
        content=response_data
    )


async def rate_limit_exception_handler(request: Request, exc: RateLimitError) -> JSONResponse:
    """
    Handler pour les erreurs de rate limiting.
    Retourne 429 Too Many Requests.
    """
    request_id = add_request_id(request)
    
    logger.warning(f"[{request_id}] Rate limit: {exc.message}")
    
    response_data = exc.to_dict()
    response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=429,
        content=response_data,
        headers={"Retry-After": str(exc.retry_after)}
    )


async def duplicate_request_handler(request: Request, exc: DuplicateRequestError) -> JSONResponse:
    """
    Handler pour les requêtes dupliquées.
    Retourne 429 Too Many Requests.
    """
    request_id = add_request_id(request)
    
    logger.info(f"[{request_id}] Duplicate blocked: {exc.message}")
    
    response_data = exc.to_dict()
    response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=429,
        content=response_data
    )


async def service_exception_handler(request: Request, exc: ServiceError) -> JSONResponse:
    """
    Handler pour les erreurs de services internes.
    Retourne 500 Internal Server Error.
    """
    request_id = add_request_id(request)
    
    logger.error(
        f"[{request_id}] Service Error [{exc.service_name}]: {exc.error_code} - {exc.message}",
        extra={
            "error_code": exc.error_code,
            "service": exc.service_name,
            "request_id": request_id,
            "details": exc.details
        }
    )
    
    response_data = exc.to_dict()
    response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=500,
        content=response_data
    )


async def external_api_exception_handler(request: Request, exc: ExternalAPIError) -> JSONResponse:
    """
    Handler pour les erreurs d'API externes.
    Retourne 502 Bad Gateway (l'erreur vient d'un service tiers).
    """
    request_id = add_request_id(request)
    
    logger.error(
        f"[{request_id}] External API Error [{exc.service_name}]: {exc.error_code} - {exc.message}",
        extra={
            "error_code": exc.error_code,
            "service": exc.service_name,
            "status_code": exc.status_code,
            "request_id": request_id
        }
    )
    
    response_data = exc.to_dict()
    response_data["error"]["request_id"] = request_id
    
    return JSONResponse(
        status_code=502,
        content=response_data
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handler pour les erreurs de validation Pydantic/FastAPI.
    Retourne 422 Unprocessable Entity avec détails.
    """
    request_id = add_request_id(request)
    
    # Extraire les détails des erreurs
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        f"[{request_id}] Validation Error: {len(errors)} error(s)",
        extra={"request_id": request_id, "errors": errors}
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "JXP-001",
                "message": "Validation du payload échouée",
                "details": {"validation_errors": errors},
                "request_id": request_id
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler de dernier recours pour les exceptions non gérées.
    Retourne 500 Internal Server Error.
    """
    request_id = add_request_id(request)
    
    # Log complet avec stack trace
    logger.exception(
        f"[{request_id}] Unhandled Exception: {type(exc).__name__}: {str(exc)}",
        extra={"request_id": request_id}
    )
    
    # En production, ne pas exposer les détails internes
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "JXP-500",
                "message": "Erreur interne du serveur",
                "request_id": request_id
            }
        }
    )


def register_exception_handlers(app):
    """
    Enregistre tous les handlers d'exceptions sur l'application FastAPI.
    
    Usage:
        from core.error_handlers import register_exception_handlers
        register_exception_handlers(app)
    """
    # Ordre important : du plus spécifique au plus général
    
    # Erreurs API spécifiques
    app.add_exception_handler(RateLimitError, rate_limit_exception_handler)
    app.add_exception_handler(DuplicateRequestError, duplicate_request_handler)
    app.add_exception_handler(PayloadValidationError, api_exception_handler)
    
    # Erreurs d'API externes
    app.add_exception_handler(ExternalAPIError, external_api_exception_handler)
    
    # Erreurs de services
    app.add_exception_handler(SearchError, service_exception_handler)
    app.add_exception_handler(LLMError, service_exception_handler)
    app.add_exception_handler(OCRError, service_exception_handler)
    app.add_exception_handler(EmailError, service_exception_handler)
    app.add_exception_handler(DatabaseError, service_exception_handler)
    app.add_exception_handler(CacheError, service_exception_handler)
    app.add_exception_handler(PDFError, service_exception_handler)
    
    # Erreurs générales
    app.add_exception_handler(ServiceError, service_exception_handler)
    app.add_exception_handler(APIError, api_exception_handler)
    app.add_exception_handler(JobXpressError, jobxpress_exception_handler)
    
    # Validation FastAPI/Pydantic
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Fallback pour tout le reste
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("✅ Exception handlers enregistrés")
