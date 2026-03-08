"""
Tests pour le cycle de facturation (Billing Cycle).

Teste:
- Création d'abonnement
- Annulation d'abonnement
- Renouvellement (re-upgrade)
- Cas limites (données manquantes, erreurs DB)
"""

import sys
from unittest.mock import MagicMock

# Mock dependencies that break on Python 3.14
sys.modules['supabase'] = MagicMock()
sys.modules['realtime'] = MagicMock()

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone
from api.stripe_webhook import upgrade_user_subscription, downgrade_user_subscription

@pytest.fixture
def mock_db_service():
    """Mock du service de base de données."""
    with patch("api.stripe_webhook.db_service") as mock:
        mock.admin_client = MagicMock()
        yield mock

@pytest.mark.asyncio
class TestBillingCycle:
    """Tests pour le cycle de vie des abonnements."""

    async def test_upgrade_subscription_success(self, mock_db_service):
        """Teste l'upgrade réussi d'un utilisateur."""
        user_id = "user_123"
        plan = "PRO"
        customer_id = "cus_abc123"

        # Mock: l'update réussit
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            {"id": user_id, "plan": "PRO"}
        ]

        success = await upgrade_user_subscription(user_id, plan, customer_id)

        assert success is True
        # Vérifier que l'update a bien inclus le customer_id
        update_call = mock_db_service.admin_client.table.return_value.update.call_args[0][0]
        assert update_call["plan"] == "PRO"
        assert update_call["stripe_customer_id"] == customer_id
        assert update_call["credits"] == 300

    async def test_downgrade_subscription_success(self, mock_db_service):
        """Teste la remise en plan FREE (annulation)."""
        user_id = "user_456"

        # Mock: l'update réussit
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            {"id": user_id, "plan": "FREE"}
        ]

        success = await downgrade_user_subscription(user_id)

        assert success is True
        update_call = mock_db_service.admin_client.table.return_value.update.call_args[0][0]
        assert update_call["plan"] == "FREE"
        assert update_call["credits"] == 5

    async def test_upgrade_fails_when_no_admin_client(self):
        """Si le client admin est manquant, l'upgrade doit échouer proprement."""
        with patch("api.stripe_webhook.db_service") as mock_db:
            mock_db.admin_client = None
            success = await upgrade_user_subscription("id", "PRO")
            assert success is False

    async def test_upgrade_handles_db_error(self, mock_db_service):
        """Une erreur DB lors de l'upgrade doit retourner False."""
        mock_db_service.admin_client.table.return_value.update.side_effect = Exception("DB Error")
        
        success = await upgrade_user_subscription("id", "PRO")
        assert success is False

    async def test_upgrade_with_missing_customer_id(self, mock_db_service):
        """L'upgrade doit fonctionner même si customer_id est manquant (pas d'update du champ)."""
        user_id = "user_789"
        
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id}]

        success = await upgrade_user_subscription(user_id, "STARTER", stripe_customer_id=None)

        assert success is True
        update_call = mock_db_service.admin_client.table.return_value.update.call_args[0][0]
        assert "stripe_customer_id" not in update_call
        assert update_call["plan"] == "STARTER"
