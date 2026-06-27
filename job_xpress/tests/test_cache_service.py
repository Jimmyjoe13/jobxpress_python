# -*- coding: utf-8 -*-
"""
Tests pour le service de cache SQLite async.
"""

import pytest
import time
import os

from services.cache_service import CacheService


class TestCacheService:
    """Tests pour le service de cache persistant."""

    @pytest.fixture
    def cache(self, temp_cache_db):
        """Crée une instance de cache pour les tests."""
        return CacheService(db_path=temp_cache_db)

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        """Vérifie set et get basiques."""
        await cache.set("test_key", "test_value", ttl_seconds=60)
        result = await cache.get("test_key")

        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, cache):
        """Vérifie la gestion des clés inexistantes."""
        result = await cache.get("nonexistent_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_ttl_expiration(self, cache):
        """Vérifie l'expiration TTL."""
        await cache.set("expiring_key", "value", ttl_seconds=1)

        # Immédiatement disponible
        assert await cache.get("expiring_key") == "value"

        # Attendre l'expiration
        time.sleep(1.5)

        # Doit être expiré
        assert await cache.get("expiring_key") is None

    @pytest.mark.asyncio
    async def test_exists(self, cache):
        """Vérifie la méthode exists."""
        await cache.set("exists_key", "value", ttl_seconds=60)

        assert await cache.exists("exists_key") is True
        assert await cache.exists("not_exists_key") is False

    @pytest.mark.asyncio
    async def test_delete(self, cache):
        """Vérifie la suppression."""
        await cache.set("delete_key", "value", ttl_seconds=60)
        assert await cache.exists("delete_key") is True

        await cache.delete("delete_key")
        assert await cache.exists("delete_key") is False

    @pytest.mark.asyncio
    async def test_overwrite_key(self, cache):
        """Vérifie l'écrasement d'une clé existante."""
        await cache.set("overwrite_key", "value1", ttl_seconds=60)
        await cache.set("overwrite_key", "value2", ttl_seconds=60)

        assert await cache.get("overwrite_key") == "value2"

    @pytest.mark.asyncio
    async def test_cleanup_expired(self, cache):
        """Vérifie le nettoyage des entrées expirées."""
        await cache.set("expired1", "value", ttl_seconds=1)
        await cache.set("expired2", "value", ttl_seconds=1)
        await cache.set("valid", "value", ttl_seconds=60)

        time.sleep(1.5)

        count = await cache.cleanup_expired()

        assert count == 2
        assert await cache.exists("valid") is True

    @pytest.mark.asyncio
    async def test_get_stats(self, cache):
        """Vérifie les statistiques."""
        await cache.set("key1", "value", ttl_seconds=60)
        await cache.set("key2", "value", ttl_seconds=60)

        stats = await cache.get_stats()

        assert stats["total"] >= 2
        assert stats["active"] >= 2

    @pytest.mark.asyncio
    async def test_unicode_values(self, cache):
        """Vérifie la gestion des caractères Unicode."""
        await cache.set("unicode_key", "Éloïse Müller 日本語", ttl_seconds=60)
        result = await cache.get("unicode_key")

        assert "Éloïse" in result
        assert "日本語" in result

    @pytest.mark.asyncio
    async def test_long_values(self, cache):
        """Vérifie la gestion des valeurs longues."""
        long_value = "A" * 10000
        await cache.set("long_key", long_value, ttl_seconds=60)
        result = await cache.get("long_key")

        assert len(result) == 10000


class TestCacheTaskQueue:
    """Tests pour la queue de tâches du cache."""

    @pytest.fixture
    def cache(self, temp_cache_db):
        """Crée une instance de cache pour les tests."""
        return CacheService(db_path=temp_cache_db)

    @pytest.mark.asyncio
    async def test_enqueue_task(self, cache):
        """Vérifie l'ajout d'une tâche."""
        task_id = await cache.enqueue_task("process_candidate", '{"email": "test@test.com"}')

        assert task_id is not None
        assert task_id > 0

    @pytest.mark.asyncio
    async def test_get_pending_tasks(self, cache):
        """Vérifie la récupération des tâches en attente."""
        await cache.enqueue_task("task_type_1", '{"data": 1}')
        await cache.enqueue_task("task_type_2", '{"data": 2}')

        tasks = await cache.get_pending_tasks(limit=10)

        assert len(tasks) == 2
        assert tasks[0]["task_type"] == "task_type_1"

    @pytest.mark.asyncio
    async def test_mark_task_done(self, cache):
        """Vérifie le marquage d'une tâche comme terminée."""
        task_id = await cache.enqueue_task("test_task", "{}")

        await cache.mark_task_done(task_id)

        tasks = await cache.get_pending_tasks()
        task_ids = [t["id"] for t in tasks]

        assert task_id not in task_ids

    @pytest.mark.asyncio
    async def test_mark_task_failed(self, cache):
        """Vérifie le marquage d'une tâche comme échouée."""
        task_id = await cache.enqueue_task("failing_task", "{}")

        await cache.mark_task_failed(task_id, "Test error message")

        tasks = await cache.get_pending_tasks()
        task_ids = [t["id"] for t in tasks]

        assert task_id not in task_ids


class TestCachePersistence:
    """Tests pour la persistance du cache."""

    @pytest.mark.asyncio
    async def test_persistence_across_instances(self, temp_cache_db):
        """Vérifie que les données persistent entre les instances."""
        cache1 = CacheService(db_path=temp_cache_db)
        await cache1.initialize()
        await cache1.set("persistent_key", "persistent_value", ttl_seconds=300)
        del cache1

        cache2 = CacheService(db_path=temp_cache_db)
        await cache2.initialize()
        result = await cache2.get("persistent_key")

        assert result == "persistent_value"

    @pytest.mark.asyncio
    async def test_database_file_created(self, tmp_path):
        """Vérifie que le fichier de base de données est créé."""
        db_path = str(tmp_path / "new_cache.db")

        cache = CacheService(db_path=db_path)
        await cache.initialize()
        await cache.set("key", "value", ttl_seconds=60)

        assert os.path.exists(db_path)
