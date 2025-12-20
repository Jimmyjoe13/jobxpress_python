"""
Tests pour le webhook Stripe avec idempotence.

Ces tests vérifient que:
1. Un événement n'est traité qu'une seule fois
2. Les retries Stripe ne dupliquent pas les crédits
3. Les erreurs sont correctement enregistrées
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


# ===========================================
# FIXTURES
# ===========================================

@pytest.fixture
def mock_db_service():
    """Mock du service de base de données."""
    with patch("api.stripe_webhook.db_service") as mock:
        mock.admin_client = MagicMock()
        yield mock


@pytest.fixture
def sample_checkout_event():
    """Événement checkout.session.completed type."""
    return {
        "id": "evt_1234567890abcdef",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "customer_email": "test@example.com",
                "customer": "cus_test123",
                "amount_total": 999
            }
        }
    }


@pytest.fixture
def sample_invoice_event():
    """Événement invoice.payment_succeeded type."""
    return {
        "id": "evt_invoice_123456",
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "customer": "cus_test123",
                "amount_paid": 999
            }
        }
    }


# ===========================================
# TESTS IDEMPOTENCE
# ===========================================

class TestStripeIdempotence:
    """Tests pour la vérification d'idempotence."""
    
    @pytest.mark.asyncio
    async def test_is_event_processed_returns_false_for_new_event(self, mock_db_service):
        """Un nouvel événement n'est pas marqué comme traité."""
        from api.stripe_webhook import is_event_processed
        
        # Mock: la requête retourne une liste vide
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
        
        result = await is_event_processed("evt_new_event")
        
        assert result is False
        mock_db_service.admin_client.table.assert_called_with("stripe_events")
    
    @pytest.mark.asyncio
    async def test_is_event_processed_returns_true_for_existing_event(self, mock_db_service):
        """Un événement déjà traité retourne True."""
        from api.stripe_webhook import is_event_processed
        
        # Mock: la requête retourne l'événement
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
            {"event_id": "evt_already_processed"}
        ]
        
        result = await is_event_processed("evt_already_processed")
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_is_event_processed_handles_db_error_gracefully(self, mock_db_service):
        """Une erreur DB retourne False (fail-open)."""
        from api.stripe_webhook import is_event_processed
        
        # Mock: la requête lève une exception
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.side_effect = Exception("DB Error")
        
        result = await is_event_processed("evt_test")
        
        # Fail-open: on continue le traitement en cas d'erreur
        assert result is False
    
    @pytest.mark.asyncio
    async def test_mark_event_processed_inserts_record(self, mock_db_service):
        """mark_event_processed insère correctement un enregistrement."""
        from api.stripe_webhook import mark_event_processed
        
        mock_insert = MagicMock()
        mock_db_service.admin_client.table.return_value.insert.return_value.execute = mock_insert
        
        await mark_event_processed(
            event_id="evt_test_123",
            event_type="checkout.session.completed",
            payload={"test": "data"},
            user_id="user_123",
            status="processed"
        )
        
        mock_db_service.admin_client.table.assert_called_with("stripe_events")
        mock_db_service.admin_client.table.return_value.insert.assert_called_once()
        
        # Vérifier les données insérées
        call_args = mock_db_service.admin_client.table.return_value.insert.call_args[0][0]
        assert call_args["event_id"] == "evt_test_123"
        assert call_args["event_type"] == "checkout.session.completed"
        assert call_args["status"] == "processed"
        assert call_args["user_id"] == "user_123"


# ===========================================
# TESTS WEBHOOK HANDLER
# ===========================================

class TestStripeWebhookHandler:
    """Tests pour le handler principal du webhook."""
    
    @pytest.mark.asyncio
    async def test_webhook_skips_already_processed_event(self, mock_db_service, sample_checkout_event):
        """Un événement déjà traité retourne 'already_processed'."""
        from api.stripe_webhook import stripe_webhook
        from fastapi import Request
        import json
        
        # Mock: l'événement est déjà traité
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
            {"event_id": sample_checkout_event["id"]}
        ]
        
        # Mock Request
        mock_request = MagicMock(spec=Request)
        mock_request.body = AsyncMock(return_value=json.dumps(sample_checkout_event).encode())
        mock_request.json = AsyncMock(return_value=sample_checkout_event)
        
        result = await stripe_webhook(mock_request, None)
        
        assert result["status"] == "already_processed"
        assert result["event_id"] == sample_checkout_event["id"]
    
    @pytest.mark.asyncio
    async def test_duplicate_event_does_not_double_credits(self, mock_db_service, sample_checkout_event):
        """
        CRITICAL TEST: Vérifier qu'un événement envoyé 2x ne double pas les crédits.
        
        Scénario:
        1. Premier appel: événement non trouvé -> traitement + enregistrement
        2. Deuxième appel: événement trouvé -> skip
        """
        from api.stripe_webhook import stripe_webhook, is_event_processed, mark_event_processed
        from fastapi import Request
        import json
        
        processed_events = []
        
        # Mock is_event_processed pour simuler le comportement réel
        original_is_processed = is_event_processed
        
        async def mock_is_processed(event_id):
            return event_id in processed_events
        
        async def mock_mark_processed(event_id, *args, **kwargs):
            processed_events.append(event_id)
        
        with patch("api.stripe_webhook.is_event_processed", mock_is_processed):
            with patch("api.stripe_webhook.mark_event_processed", mock_mark_processed):
                with patch("api.stripe_webhook.find_user_by_email", AsyncMock(return_value="user_123")):
                    with patch("api.stripe_webhook.upgrade_user_subscription", AsyncMock(return_value=True)):
                        
                        mock_request = MagicMock(spec=Request)
                        mock_request.body = AsyncMock(return_value=json.dumps(sample_checkout_event).encode())
                        mock_request.json = AsyncMock(return_value=sample_checkout_event)
                        
                        # Premier appel - doit traiter
                        result1 = await stripe_webhook(mock_request, None)
                        assert result1["status"] == "success"
                        
                        # L'événement est maintenant dans processed_events
                        assert sample_checkout_event["id"] in processed_events
                        
                        # Deuxième appel - doit skip
                        result2 = await stripe_webhook(mock_request, None)
                        assert result2["status"] == "already_processed"
                        
                        # L'événement n'a pas été ajouté une deuxième fois
                        assert processed_events.count(sample_checkout_event["id"]) == 1


# ===========================================
# TESTS EDGE CASES
# ===========================================

class TestStripeWebhookEdgeCases:
    """Tests des cas limites."""
    
    @pytest.mark.asyncio
    async def test_no_admin_client_skips_idempotence(self):
        """Sans admin_client, la vérification d'idempotence est ignorée."""
        from api.stripe_webhook import is_event_processed
        
        with patch("api.stripe_webhook.db_service") as mock_db:
            mock_db.admin_client = None
            
            result = await is_event_processed("evt_test")
            
            # Fail-open: retourne False si pas d'admin client
            assert result is False
    
    @pytest.mark.asyncio
    async def test_mark_processed_handles_insert_error(self, mock_db_service):
        """Une erreur lors de l'enregistrement ne bloque pas le traitement."""
        from api.stripe_webhook import mark_event_processed
        
        # Mock: l'insertion échoue
        mock_db_service.admin_client.table.return_value.insert.return_value.execute.side_effect = Exception("Insert failed")
        
        # Ne doit pas lever d'exception
        await mark_event_processed(
            event_id="evt_test",
            event_type="test",
            payload={}
        )
        # Si on arrive ici sans exception, le test passe
