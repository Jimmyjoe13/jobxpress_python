"""
Tests pour le cycle de facturation (Billing Cycle).

Teste:
- Création d'abonnement
- Annulation d'abonnement
- Renouvellement (re-upgrade)
- Cas limites (données manquantes, erreurs DB)
- BillingService: can_search, debit_search (règle no cure no pay), _debit_credits
"""

import sys
from unittest.mock import MagicMock

# Mock dependencies that break on Python 3.14
sys.modules['supabase'] = MagicMock()
sys.modules['realtime'] = MagicMock()

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

@pytest.fixture
def mock_db_service():
    """Mock du service de base de données."""
    with patch("api.stripe_webhook.db_service") as mock:
        mock.admin_client = MagicMock()
        yield mock


@pytest.fixture
def billing_service():
    """Instance BillingService avec db mocké."""
    from services.billing import BillingService
    mock_db = MagicMock()
    return BillingService(mock_db)


@pytest.mark.asyncio
class TestBillingCycle:
    """Tests pour le cycle de vie des abonnements."""

    async def test_upgrade_subscription_success(self, mock_db_service):
        """Teste l'upgrade réussi d'un utilisateur."""
        from api.stripe_webhook import upgrade_user_subscription
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
        from api.stripe_webhook import downgrade_user_subscription
        user_id = "user_456"

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
        from api.stripe_webhook import upgrade_user_subscription
        with patch("api.stripe_webhook.db_service") as mock_db:
            mock_db.admin_client = None
            success = await upgrade_user_subscription("id", "PRO")
            assert success is False

    async def test_upgrade_handles_db_error(self, mock_db_service):
        """Une erreur DB lors de l'upgrade doit retourner False."""
        from api.stripe_webhook import upgrade_user_subscription
        mock_db_service.admin_client.table.return_value.update.side_effect = Exception("DB Error")

        success = await upgrade_user_subscription("id", "PRO")
        assert success is False

    async def test_upgrade_with_missing_customer_id(self, mock_db_service):
        """L'upgrade doit fonctionner même si customer_id est manquant (pas d'update du champ)."""
        from api.stripe_webhook import upgrade_user_subscription
        user_id = "user_789"

        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id}]

        success = await upgrade_user_subscription(user_id, "STARTER", stripe_customer_id=None)

        assert success is True
        update_call = mock_db_service.admin_client.table.return_value.update.call_args[0][0]
        assert "stripe_customer_id" not in update_call
        assert update_call["plan"] == "STARTER"


@pytest.mark.asyncio
class TestBillingServiceCredits:
    """Tests pour la logique de crédits du BillingService."""

    async def test_can_search_with_sufficient_credits(self, billing_service):
        """Un utilisateur avec des crédits peut lancer une recherche."""
        with patch.object(billing_service, "get_user_credits", new_callable=AsyncMock) as mock_credits:
            mock_credits.return_value = {"credits": 5, "plan": "FREE"}

            can, remaining = await billing_service.can_search("user_1", "token")

            assert can is True
            assert remaining == 5

    async def test_can_search_without_credits(self, billing_service):
        """Un utilisateur sans crédit ne peut pas lancer une recherche."""
        with patch.object(billing_service, "get_user_credits", new_callable=AsyncMock) as mock_credits:
            mock_credits.return_value = {"credits": 0, "plan": "FREE"}

            can, remaining = await billing_service.can_search("user_2", "token")

            assert can is False
            assert remaining == 0

    async def test_debit_search_no_results_no_charge(self, billing_service):
        """Règle no cure no pay: 0 résultats = 0 crédit débité."""
        with patch.object(billing_service, "get_user_credits", new_callable=AsyncMock) as mock_credits:
            mock_credits.return_value = {"credits": 3, "plan": "FREE"}

            remaining = await billing_service.debit_search("user_3", "token", results_count=0)

            # Aucun débit — retourne les crédits actuels
            assert remaining == 3
            mock_credits.assert_called_once()

    async def test_debit_search_with_results_charges_one_credit(self, billing_service):
        """Une recherche avec résultats débite exactement 1 crédit."""
        from services.billing import SEARCH_COST
        with patch.object(billing_service, "_debit_credits", new_callable=AsyncMock) as mock_debit:
            mock_debit.return_value = 4  # 5 - 1

            remaining = await billing_service.debit_search("user_4", "token", results_count=10)

            assert remaining == 4
            mock_debit.assert_called_once_with("user_4", "token", SEARCH_COST, "search")

    async def test_debit_credits_raises_on_insufficient(self, billing_service):
        """_debit_credits doit lever DatabaseError si crédits insuffisants."""
        from core.exceptions import DatabaseError
        mock_client = MagicMock()
        billing_service.db.get_user_client.return_value = mock_client
        mock_client.rpc.return_value.execute.side_effect = Exception("crédits insuffisants")

        with pytest.raises(DatabaseError) as exc_info:
            await billing_service._debit_credits("user_5", "token", 1, "search")

        assert exc_info.value.error_code == "BILLING-001"

    async def test_debit_credits_raises_on_db_error(self, billing_service):
        """_debit_credits doit lever DatabaseError pour toute erreur DB."""
        from core.exceptions import DatabaseError
        mock_client = MagicMock()
        billing_service.db.get_user_client.return_value = mock_client
        mock_client.rpc.return_value.execute.side_effect = Exception("connection lost")

        with pytest.raises(DatabaseError) as exc_info:
            await billing_service._debit_credits("user_6", "token", 1, "search")

        assert exc_info.value.error_code == "BILLING-002"

    async def test_debit_credits_fails_if_no_client(self, billing_service):
        """_debit_credits doit lever DatabaseError si le client Supabase est None."""
        from core.exceptions import DatabaseError
        billing_service.db.get_user_client.return_value = None

        with pytest.raises(DatabaseError) as exc_info:
            await billing_service._debit_credits("user_7", "token", 1, "search")

        assert exc_info.value.error_code == "DB-003"

    async def test_upgrade_to_plan_unknown_raises(self, billing_service):
        """upgrade_to_plan doit lever DatabaseError pour un plan inconnu."""
        from core.exceptions import DatabaseError
        with pytest.raises(DatabaseError) as exc_info:
            await billing_service.upgrade_to_plan("user_8", "token", "ENTERPRISE")

        assert exc_info.value.error_code == "BILLING-004"

    async def test_upgrade_to_pro_delegates_to_upgrade_to_plan(self, billing_service):
        """upgrade_to_pro doit appeler upgrade_to_plan avec 'PRO'."""
        with patch.object(billing_service, "upgrade_to_plan", new_callable=AsyncMock) as mock_upgrade:
            mock_upgrade.return_value = {"plan": "PRO"}

            result = await billing_service.upgrade_to_pro("user_9", "token")

            mock_upgrade.assert_called_once_with("user_9", "token", "PRO")
            assert result["plan"] == "PRO"

    async def test_upgrade_to_starter_delegates_to_upgrade_to_plan(self, billing_service):
        """upgrade_to_starter doit appeler upgrade_to_plan avec 'STARTER'."""
        with patch.object(billing_service, "upgrade_to_plan", new_callable=AsyncMock) as mock_upgrade:
            mock_upgrade.return_value = {"plan": "STARTER"}

            result = await billing_service.upgrade_to_starter("user_10", "token")

            mock_upgrade.assert_called_once_with("user_10", "token", "STARTER")

    async def test_get_user_credits_fallback_on_error(self, billing_service):
        """get_user_credits retourne 0 crédits en cas d'erreur DB (sécurité)."""
        mock_client = MagicMock()
        billing_service.db.get_user_client.return_value = mock_client
        mock_client.rpc.return_value.execute.side_effect = Exception("DB down")

        result = await billing_service.get_user_credits("user_11", "token")

        assert result["credits"] == 0
        assert result["plan"] == "FREE"
        assert "error" in result
