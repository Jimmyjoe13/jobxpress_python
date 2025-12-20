"""
Service de cache Redis pour les opérations coûteuses.

Ce cache est utilisé pour:
- Résultats de recherche d'emploi (appels RapidAPI coûteux)
- Profils utilisateur (réduire les lectures Supabase)
- Rate limiting distribué

Le cache SQLite reste utilisé pour:
- Queue de tâches persistante (doit survivre aux redémarrages)
- Déduplication locale

Connection Redis:
- Upstash: rediss://default:xxx@xxx.upstash.io:6379
- Redis Cloud: redis://default:xxx@xxx.cloud.redislabs.com:port
- Railway: redis://default:xxx@xxx.railway.internal:6379
"""

import json
import hashlib
from typing import Optional, Any, Union
from datetime import timedelta

from core.logging_config import get_logger
from core.config import settings

logger = get_logger()


class RedisCache:
    """
    Client Redis pour le caching des opérations coûteuses.
    
    Features:
    - Serialisation JSON automatique
    - TTL configurable par clé
    - Fallback graceful si Redis indisponible
    - Préfixes de clé pour organiser le cache
    """
    
    # Préfixes pour organiser les clés
    PREFIX_SEARCH = "search:"       # Résultats de recherche d'emploi
    PREFIX_USER = "user:"           # Données utilisateur (crédits, profil)
    PREFIX_RATE = "rate:"           # Rate limiting
    
    # TTL par défaut (en secondes)
    TTL_SEARCH = 3600           # 1 heure pour les résultats de recherche
    TTL_USER_CREDITS = 60       # 1 minute pour les crédits (besoin de fraîcheur)
    TTL_USER_PROFILE = 300      # 5 minutes pour le profil
    TTL_RATE_LIMIT = 60         # 1 minute pour le rate limiting
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialise la connexion Redis.
        
        Args:
            redis_url: URL de connexion Redis. Si None, utilise les settings.
        """
        self.redis_url = redis_url or getattr(settings, 'REDIS_URL', None)
        self._client = None
        self._available = False
        
        if self.redis_url:
            self._connect()
        else:
            logger.info("📦 Redis non configuré - cache désactivé")
    
    def _connect(self):
        """Établit la connexion Redis."""
        try:
            import redis
            
            self._client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True
            )
            
            # Test de connexion
            self._client.ping()
            self._available = True
            
            logger.info("✅ Redis connecté avec succès")
            
        except ImportError:
            logger.warning("⚠️ Package 'redis' non installé. Exécutez: pip install redis")
            self._available = False
        except Exception as e:
            logger.warning(f"⚠️ Redis indisponible: {e}")
            self._available = False
    
    @property
    def is_available(self) -> bool:
        """Retourne True si Redis est disponible."""
        return self._available and self._client is not None
    
    def _serialize(self, value: Any) -> str:
        """Sérialise une valeur en JSON."""
        return json.dumps(value, ensure_ascii=False, default=str)
    
    def _deserialize(self, value: Optional[str]) -> Any:
        """Désérialise une valeur JSON."""
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    
    def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 300,
        prefix: str = ""
    ) -> bool:
        """
        Stocke une valeur dans Redis.
        
        Args:
            key: Clé unique
            value: Valeur à stocker (sera sérialisée en JSON)
            ttl: Durée de vie en secondes
            prefix: Préfixe optionnel pour la clé
        
        Returns:
            True si succès, False sinon
        """
        if not self.is_available:
            return False
        
        full_key = f"{prefix}{key}"
        
        try:
            serialized = self._serialize(value)
            self._client.setex(full_key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Redis SET error ({full_key}): {e}")
            return False
    
    def get(self, key: str, prefix: str = "") -> Optional[Any]:
        """
        Récupère une valeur de Redis.
        
        Args:
            key: Clé à rechercher
            prefix: Préfixe de la clé
        
        Returns:
            Valeur désérialisée ou None
        """
        if not self.is_available:
            return None
        
        full_key = f"{prefix}{key}"
        
        try:
            value = self._client.get(full_key)
            return self._deserialize(value)
        except Exception as e:
            logger.error(f"Redis GET error ({full_key}): {e}")
            return None
    
    def delete(self, key: str, prefix: str = "") -> bool:
        """Supprime une clé de Redis."""
        if not self.is_available:
            return False
        
        full_key = f"{prefix}{key}"
        
        try:
            self._client.delete(full_key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error ({full_key}): {e}")
            return False
    
    def exists(self, key: str, prefix: str = "") -> bool:
        """Vérifie si une clé existe."""
        if not self.is_available:
            return False
        
        full_key = f"{prefix}{key}"
        
        try:
            return self._client.exists(full_key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error ({full_key}): {e}")
            return False
    
    # ===========================================
    # MÉTHODES SPÉCIALISÉES
    # ===========================================
    
    def cache_search_results(
        self, 
        job_title: str, 
        location: str, 
        filters: dict,
        results: list
    ) -> bool:
        """
        Cache les résultats d'une recherche d'emploi.
        
        La clé est un hash des paramètres de recherche pour garantir l'unicité.
        """
        # Créer une clé unique basée sur les paramètres
        cache_key = self._generate_search_key(job_title, location, filters)
        
        return self.set(
            key=cache_key,
            value=results,
            ttl=self.TTL_SEARCH,
            prefix=self.PREFIX_SEARCH
        )
    
    def get_cached_search(
        self, 
        job_title: str, 
        location: str, 
        filters: dict
    ) -> Optional[list]:
        """
        Récupère les résultats cachés d'une recherche.
        
        Returns:
            Liste des résultats ou None si pas en cache
        """
        cache_key = self._generate_search_key(job_title, location, filters)
        
        results = self.get(key=cache_key, prefix=self.PREFIX_SEARCH)
        
        if results:
            logger.info(f"🎯 Cache HIT pour recherche: {job_title} @ {location}")
        
        return results
    
    def _generate_search_key(self, job_title: str, location: str, filters: dict) -> str:
        """Génère une clé de cache unique pour une recherche."""
        # Normaliser les paramètres
        normalized = {
            "job_title": job_title.lower().strip(),
            "location": location.lower().strip(),
            "filters": json.dumps(filters, sort_keys=True)
        }
        
        # Hash pour réduire la taille de la clé
        key_string = json.dumps(normalized, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def cache_user_credits(self, user_id: str, credits_info: dict) -> bool:
        """Cache les informations de crédits d'un utilisateur."""
        return self.set(
            key=f"credits:{user_id}",
            value=credits_info,
            ttl=self.TTL_USER_CREDITS,
            prefix=self.PREFIX_USER
        )
    
    def get_cached_credits(self, user_id: str) -> Optional[dict]:
        """Récupère les crédits cachés d'un utilisateur."""
        return self.get(
            key=f"credits:{user_id}",
            prefix=self.PREFIX_USER
        )
    
    def invalidate_user_credits(self, user_id: str) -> bool:
        """Invalide le cache des crédits (après débit ou upgrade)."""
        return self.delete(
            key=f"credits:{user_id}",
            prefix=self.PREFIX_USER
        )
    
    # ===========================================
    # RATE LIMITING DISTRIBUÉ
    # ===========================================
    
    def check_rate_limit(
        self, 
        identifier: str, 
        limit: int, 
        window_seconds: int = 60
    ) -> tuple[bool, int]:
        """
        Vérifie et incrémente un compteur de rate limit.
        
        Args:
            identifier: Identifiant unique (IP, user_id, etc.)
            limit: Nombre max de requêtes autorisées
            window_seconds: Fenêtre de temps en secondes
        
        Returns:
            Tuple (autorisé: bool, requêtes restantes: int)
        """
        if not self.is_available:
            return True, limit  # Fail-open si Redis indisponible
        
        key = f"{self.PREFIX_RATE}{identifier}"
        
        try:
            # Utiliser INCR atomique
            current = self._client.incr(key)
            
            # Définir le TTL seulement à la première requête
            if current == 1:
                self._client.expire(key, window_seconds)
            
            remaining = max(0, limit - current)
            allowed = current <= limit
            
            return allowed, remaining
            
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return True, limit  # Fail-open
    
    # ===========================================
    # HEALTH & STATS
    # ===========================================
    
    def health_check(self) -> dict:
        """Vérifie l'état de Redis."""
        if not self.is_available:
            return {"status": "disabled", "connected": False}
        
        try:
            self._client.ping()
            info = self._client.info("memory")
            
            return {
                "status": "healthy",
                "connected": True,
                "used_memory": info.get("used_memory_human", "unknown"),
                "max_memory": info.get("maxmemory_human", "unlimited")
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    def get_stats(self) -> dict:
        """Retourne des statistiques sur le cache Redis."""
        if not self.is_available:
            return {"available": False}
        
        try:
            info = self._client.info()
            return {
                "available": True,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0B"),
                "total_keys": self._client.dbsize(),
                "hit_rate": self._calculate_hit_rate(info)
            }
        except Exception as e:
            return {"available": False, "error": str(e)}
    
    def _calculate_hit_rate(self, info: dict) -> str:
        """Calcule le taux de cache hit."""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        
        if total == 0:
            return "N/A"
        
        rate = (hits / total) * 100
        return f"{rate:.1f}%"


# Instance globale du cache Redis
redis_cache = RedisCache()
