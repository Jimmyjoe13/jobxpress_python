"""
Hack: Mock supabase before importing services.database
"""

import sys
from unittest.mock import MagicMock

# Mock dependencies that break on Python 3.14 (due to Pydantic v1)
sys.modules['supabase'] = MagicMock()
sys.modules['realtime'] = MagicMock()

import pytest
from unittest.mock import patch
from services.database import DatabaseService
from core.exceptions import QuotaError, DatabaseQueryError

@pytest.fixture
def db_service():
    """Service DB mocké."""
    service = DatabaseService()
    service.admin_client = MagicMock()
    return service

@pytest.mark.asyncio
class TestQuotaManagement:
    """Tests pour check_and_consume_search_quota."""

    async def test_quota_allowed_success(self, db_service):
        """Si le quota est disponible, retourne les infos de quota."""
        user_id = "user_123"
        rpc_data = [{"allowed": True, "remaining": 10, "reset_at": "2025-01-01"}]
        
        db_service.admin_client.rpc.return_value.execute.return_value.data = rpc_data
        
        result = await db_service.check_and_consume_search_quota(user_id)
        
        assert result["allowed"] is True
        assert result["remaining"] == 10
        db_service.admin_client.rpc.assert_called_with(
            "check_and_use_search_quota", {"p_user_id": user_id}
        )

    async def test_quota_exhausted_raises_error(self, db_service):
        """Si le quota est épuisé, lève une QuotaError."""
        user_id = "user_full"
        rpc_data = [{"allowed": False, "remaining": 0, "reset_at": "2025-01-01"}]
        
        db_service.admin_client.rpc.return_value.execute.return_value.data = rpc_data
        
        with pytest.raises(QuotaError) as excinfo:
            await db_service.check_and_consume_search_quota(user_id)
            
        assert "épuisé" in str(excinfo.value)
