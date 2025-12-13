"""
Tests pour le service de cache SQLite.
"""
import pytest
import time
import os

# Import après ajout du path dans conftest
from services.cache_service import CacheService


class TestCacheService:
    """Tests pour le service de cache persistant."""
    
    @pytest.fixture
    def cache(self, temp_cache_db):
        """Crée une instance de cache pour les tests."""
        return CacheService(db_path=temp_cache_db)
    
    def test_set_and_get(self, cache):
        """Vérifie set et get basiques."""
        cache.set("test_key", "test_value", ttl_seconds=60)
        result = cache.get("test_key")
        
        assert result == "test_value"
    
    def test_get_nonexistent_key(self, cache):
        """Vérifie la gestion des clés inexistantes."""
        result = cache.get("nonexistent_key")
        assert result is None
    
    def test_ttl_expiration(self, cache):
        """Vérifie l'expiration TTL."""
        # Set avec TTL très court
        cache.set("expiring_key", "value", ttl_seconds=1)
        
        # Immédiatement disponible
        assert cache.get("expiring_key") == "value"
        
        # Attendre l'expiration
        time.sleep(1.5)
        
        # Doit être expiré
        assert cache.get("expiring_key") is None
    
    def test_exists(self, cache):
        """Vérifie la méthode exists."""
        cache.set("exists_key", "value", ttl_seconds=60)
        
        assert cache.exists("exists_key") is True
        assert cache.exists("not_exists_key") is False
    
    def test_delete(self, cache):
        """Vérifie la suppression."""
        cache.set("delete_key", "value", ttl_seconds=60)
        assert cache.exists("delete_key") is True
        
        cache.delete("delete_key")
        assert cache.exists("delete_key") is False
    
    def test_overwrite_key(self, cache):
        """Vérifie l'écrasement d'une clé existante."""
        cache.set("overwrite_key", "value1", ttl_seconds=60)
        cache.set("overwrite_key", "value2", ttl_seconds=60)
        
        assert cache.get("overwrite_key") == "value2"
    
    def test_cleanup_expired(self, cache):
        """Vérifie le nettoyage des entrées expirées."""
        # Créer des entrées avec TTL court
        cache.set("expired1", "value", ttl_seconds=1)
        cache.set("expired2", "value", ttl_seconds=1)
        cache.set("valid", "value", ttl_seconds=60)
        
        time.sleep(1.5)
        
        # Nettoyer
        count = cache.cleanup_expired()
        
        assert count == 2
        assert cache.exists("valid") is True
    
    def test_get_stats(self, cache):
        """Vérifie les statistiques."""
        cache.set("key1", "value", ttl_seconds=60)
        cache.set("key2", "value", ttl_seconds=60)
        
        stats = cache.get_stats()
        
        assert stats["total"] >= 2
        assert stats["active"] >= 2
    
    def test_unicode_values(self, cache):
        """Vérifie la gestion des caractères Unicode."""
        cache.set("unicode_key", "Éloïse Müller 日本語", ttl_seconds=60)
        result = cache.get("unicode_key")
        
        assert "Éloïse" in result
        assert "日本語" in result
    
    def test_long_values(self, cache):
        """Vérifie la gestion des valeurs longues."""
        long_value = "A" * 10000
        cache.set("long_key", long_value, ttl_seconds=60)
        result = cache.get("long_key")
        
        assert len(result) == 10000


class TestCacheTaskQueue:
    """Tests pour la queue de tâches du cache."""
    
    @pytest.fixture
    def cache(self, temp_cache_db):
        """Crée une instance de cache pour les tests."""
        return CacheService(db_path=temp_cache_db)
    
    def test_enqueue_task(self, cache):
        """Vérifie l'ajout d'une tâche."""
        task_id = cache.enqueue_task("process_candidate", '{"email": "test@test.com"}')
        
        assert task_id is not None
        assert task_id > 0
    
    def test_get_pending_tasks(self, cache):
        """Vérifie la récupération des tâches en attente."""
        cache.enqueue_task("task_type_1", '{"data": 1}')
        cache.enqueue_task("task_type_2", '{"data": 2}')
        
        tasks = cache.get_pending_tasks(limit=10)
        
        assert len(tasks) == 2
        assert tasks[0]["task_type"] == "task_type_1"
    
    def test_mark_task_done(self, cache):
        """Vérifie le marquage d'une tâche comme terminée."""
        task_id = cache.enqueue_task("test_task", '{}')
        
        cache.mark_task_done(task_id)
        
        # La tâche ne doit plus apparaître dans pending
        tasks = cache.get_pending_tasks()
        task_ids = [t["id"] for t in tasks]
        
        assert task_id not in task_ids
    
    def test_mark_task_failed(self, cache):
        """Vérifie le marquage d'une tâche comme échouée."""
        task_id = cache.enqueue_task("failing_task", '{}')
        
        cache.mark_task_failed(task_id, "Test error message")
        
        # La tâche ne doit plus apparaître dans pending
        tasks = cache.get_pending_tasks()
        task_ids = [t["id"] for t in tasks]
        
        assert task_id not in task_ids


class TestCachePersistence:
    """Tests pour la persistance du cache."""
    
    def test_persistence_across_instances(self, temp_cache_db):
        """Vérifie que les données persistent entre les instances."""
        # Première instance
        cache1 = CacheService(db_path=temp_cache_db)
        cache1.set("persistent_key", "persistent_value", ttl_seconds=300)
        del cache1
        
        # Deuxième instance
        cache2 = CacheService(db_path=temp_cache_db)
        result = cache2.get("persistent_key")
        
        assert result == "persistent_value"
    
    def test_database_file_created(self, tmp_path):
        """Vérifie que le fichier de base de données est créé."""
        db_path = str(tmp_path / "new_cache.db")
        
        cache = CacheService(db_path=db_path)
        cache.set("key", "value", ttl_seconds=60)
        
        assert os.path.exists(db_path)
