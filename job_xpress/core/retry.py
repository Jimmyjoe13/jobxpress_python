"""
Module de résilience avec retry pattern et circuit breaker.
Utilisé pour toutes les requêtes HTTP vers des APIs externes.
"""
import httpx
import logging
from tenacity import (
    retry, 
    stop_after_attempt, 
    wait_exponential, 
    retry_if_exception_type,
    before_sleep_log
)

logger = logging.getLogger("jobxpress")

# Configuration du retry pattern
RETRY_CONFIG = dict(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((
        httpx.TimeoutException, 
        httpx.ConnectError,
        httpx.HTTPStatusError
    )),
    before_sleep=before_sleep_log(logger, logging.WARNING)
)


@retry(**RETRY_CONFIG)
async def resilient_get(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    """
    Effectue une requête GET avec retry automatique.
    
    Args:
        client: Client httpx asynchrone
        url: URL cible
        **kwargs: Arguments passés à client.get()
    
    Returns:
        httpx.Response: Réponse HTTP
    
    Raises:
        Exception après 3 tentatives échouées
    """
    response = await client.get(url, **kwargs)
    response.raise_for_status()
    return response


@retry(**RETRY_CONFIG)
async def resilient_post(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    """
    Effectue une requête POST avec retry automatique.
    
    Args:
        client: Client httpx asynchrone
        url: URL cible
        **kwargs: Arguments passés à client.post()
    
    Returns:
        httpx.Response: Réponse HTTP
    
    Raises:
        Exception après 3 tentatives échouées
    """
    response = await client.post(url, **kwargs)
    response.raise_for_status()
    return response


class CircuitBreaker:
    """
    Implémentation du pattern Circuit Breaker pour protéger contre les services défaillants.
    
    États:
    - CLOSED: Normal, les requêtes passent
    - OPEN: Service down, requêtes bloquées
    - HALF_OPEN: Test de récupération
    """
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time = None
        self.state = "CLOSED"
    
    def _check_recovery(self):
        """Vérifie si on peut tenter une récupération."""
        from datetime import datetime, timedelta
        if self.state == "OPEN" and self.last_failure_time:
            if datetime.now() - self.last_failure_time > timedelta(seconds=self.recovery_timeout):
                self.state = "HALF_OPEN"
                logger.info("⚡ Circuit Breaker: passage en HALF_OPEN")
    
    async def call(self, func, *args, **kwargs):
        """
        Exécute une fonction protégée par le circuit breaker.
        
        Args:
            func: Fonction async à exécuter
            *args, **kwargs: Arguments de la fonction
            
        Returns:
            Résultat de la fonction
            
        Raises:
            Exception si circuit ouvert ou échec
        """
        from datetime import datetime
        
        self._check_recovery()
        
        if self.state == "OPEN":
            logger.warning("🚫 Circuit OPEN - Service indisponible")
            raise Exception("Circuit is OPEN - Service unavailable")
        
        try:
            result = await func(*args, **kwargs)
            
            # Succès: reset du compteur
            if self.state == "HALF_OPEN":
                logger.info("✅ Circuit Breaker: retour à CLOSED")
                self.state = "CLOSED"
                self.failure_count = 0
            
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(f"🔴 Circuit OPEN après {self.failure_count} échecs")
            
            raise e
    
    def reset(self):
        """Reset manuel du circuit breaker."""
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None
        logger.info("🔄 Circuit Breaker reset manuellement")
