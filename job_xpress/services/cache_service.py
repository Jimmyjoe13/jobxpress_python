"""
Service de cache persistant avec SQLite.
Remplace le cache in-memory pour survivre aux redémarrages.
"""
import sqlite3
import time
import os
from typing import Optional, Dict, Any
from contextlib import contextmanager
from core.logging_config import get_logger

logger = get_logger()


class CacheService:
    """
    Cache persistant basé sur SQLite pour la déduplication et le stockage temporaire.
    
    Features:
    - Survit aux redémarrages
    - TTL automatique (expiration)
    - Thread-safe avec connections par thread
    - Nettoyage automatique des entrées expirées
    """
    
    def __init__(self, db_path: str = "cache.db"):
        self.db_path = db_path
        self._init_db()
        logger.info(f"💾 Cache SQLite initialisé: {db_path}")
    
    @contextmanager
    def _get_connection(self):
        """Context manager pour les connexions SQLite."""
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Erreur SQLite: {e}")
            raise
        finally:
            conn.close()
    
    def _init_db(self):
        """Initialise la structure de la base de données."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    expires_at REAL,
                    created_at REAL DEFAULT (strftime('%s', 'now'))
                )
            """)
            
            # Index pour le nettoyage rapide
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_expires 
                ON cache(expires_at)
            """)
            
            # Table pour les tâches en attente (queue persistante légère)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pending_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at REAL DEFAULT (strftime('%s', 'now')),
                    processed_at REAL,
                    retries INTEGER DEFAULT 0,
                    error_message TEXT
                )
            """)
    
    def set(self, key: str, value: str, ttl_seconds: int = 300) -> bool:
        """
        Stocke une valeur avec TTL.
        
        Args:
            key: Clé unique
            value: Valeur à stocker
            ttl_seconds: Durée de vie en secondes (défaut: 5 min)
        
        Returns:
            True si succès
        """
        expires_at = time.time() + ttl_seconds
        
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO cache (key, value, expires_at)
                    VALUES (?, ?, ?)
                """, (key, value, expires_at))
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def get(self, key: str) -> Optional[str]:
        """
        Récupère une valeur du cache.
        
        Args:
            key: Clé à rechercher
        
        Returns:
            Valeur ou None si expirée/inexistante
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    SELECT value FROM cache 
                    WHERE key = ? AND expires_at > ?
                """, (key, time.time()))
                row = cursor.fetchone()
                return row['value'] if row else None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def exists(self, key: str) -> bool:
        """Vérifie si une clé existe et n'est pas expirée."""
        return self.get(key) is not None
    
    def delete(self, key: str) -> bool:
        """Supprime une clé du cache."""
        try:
            with self._get_connection() as conn:
                conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    def cleanup_expired(self) -> int:
        """
        Supprime toutes les entrées expirées.
        
        Returns:
            Nombre d'entrées supprimées
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    DELETE FROM cache WHERE expires_at < ?
                """, (time.time(),))
                count = cursor.rowcount
                if count > 0:
                    logger.info(f"🧹 Cache: {count} entrée(s) expirée(s) supprimée(s)")
                return count
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne des statistiques sur le cache."""
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) as active,
                        SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired
                    FROM cache
                """, (time.time(), time.time()))
                row = cursor.fetchone()
                return {
                    "total": row['total'] or 0,
                    "active": row['active'] or 0,
                    "expired": row['expired'] or 0
                }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"total": 0, "active": 0, "expired": 0}
    
    # --- Méthodes pour la Queue de Tâches ---
    
    def enqueue_task(self, task_type: str, payload: str) -> Optional[int]:
        """
        Ajoute une tâche à la queue persistante.
        
        Returns:
            ID de la tâche ou None si erreur
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    INSERT INTO pending_tasks (task_type, payload)
                    VALUES (?, ?)
                """, (task_type, payload))
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Task enqueue error: {e}")
            return None
    
    def get_pending_tasks(self, limit: int = 10) -> list:
        """Récupère les tâches en attente."""
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    SELECT id, task_type, payload, retries 
                    FROM pending_tasks 
                    WHERE status = 'pending'
                    ORDER BY id
                    LIMIT ?
                """, (limit,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Get pending tasks error: {e}")
            return []
    
    def mark_task_done(self, task_id: int):
        """Marque une tâche comme terminée."""
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    UPDATE pending_tasks 
                    SET status = 'done', processed_at = ?
                    WHERE id = ?
                """, (time.time(), task_id))
        except Exception as e:
            logger.error(f"Mark task done error: {e}")
    
    def mark_task_failed(self, task_id: int, error: str):
        """Marque une tâche comme échouée."""
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    UPDATE pending_tasks 
                    SET status = 'failed', 
                        error_message = ?,
                        retries = retries + 1
                    WHERE id = ?
                """, (error, task_id))
        except Exception as e:
            logger.error(f"Mark task failed error: {e}")


# Instance globale du cache
cache_service = CacheService()
