"""
Tests complets pour le webhook Stripe.

Vérifie:
- Signature valide/invalide
- Traitement correct des événements:
  - checkout.session.completed (Upgrade initial)
  - customer.subscription.deleted (Annulation et downgrade)
  - invoice.payment_failed (Downgrade après retry)
  - invoice.payment_succeeded (Renouvellement)
- Idempotence (Double envoi d'événement)
"""

import sys
from unittest.mock import MagicMock

# Mock dependencies that break on Python 3.14
sys.modules['supabase'] = MagicMock()
sys.modules['realtime'] = MagicMock()

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import Request, HTTPException

# Fixture mock Supabase
@pytest.fixture
def mock_db_service():
    """Mock du service de base de données."""
    with patch("api.stripe_webhook.db_service") as mock:
        mock.admin_client = MagicMock()
        yield mock

# Fixture mock Stripe SDK
@pytest.fixture
def mock_stripe():
    """Mock du SDK Stripe."""
    with patch("api.stripe_webhook.stripe") as mock:
        yield mock

# ===========================================
# TESTS SIGNATURE & ROUTAGE
# ===========================================

@pytest.mark.asyncio
class TestStripeWebhookCore:
    """Tests pour la sécurité et l'entrée principale du webhook."""

    def test_verify_stripe_signature_returns_false_on_sdk_error(self, mock_stripe):
        """verify_stripe_signature doit retourner False si le SDK Stripe lève une exception."""
        from api.stripe_webhook import verify_stripe_signature

        # Fournir une vraie classe d'exception pour le catch stripe.error.SignatureVerificationError
        class FakeSignatureError(Exception):
            pass

        mock_stripe.error.SignatureVerificationError = FakeSignatureError
        mock_stripe.Webhook.construct_event.side_effect = FakeSignatureError("Signature mismatch")

        result = verify_stripe_signature(b"payload", "bad-sig", "whsec_test")

        assert result is False

    def test_verify_stripe_signature_returns_true_without_secret(self, mock_stripe):
        """Sans secret configuré, la vérification est ignorée (passe en dev)."""
        from api.stripe_webhook import verify_stripe_signature

        result = verify_stripe_signature(b"payload", "any-sig", "")

        assert result is True

    async def test_webhook_skips_processed_event(self, mock_db_service):
        """Si l'événement a déjà été traité, on ne fait rien."""
        from api.stripe_webhook import stripe_webhook
        
        # Simuler événement existant
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"event_id": "evt_123"}]
        
        # Mock request
        mock_request = MagicMock(spec=Request)
        mock_request.json = AsyncMock(return_value={"id": "evt_123", "type": "test", "data": {"object": {}}})
        mock_request.body = AsyncMock(return_value=b'{"id": "evt_123"}')
        
        # Skip signature check (secret non vide simule la présence)
        with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
            result = await stripe_webhook(mock_request, "sig")
            assert result["status"] == "already_processed"

# ===========================================
# TESTS ÉVÉNEMENTS SPÉCIFIQUES
# ===========================================

@pytest.mark.asyncio
class TestStripeEventsHandling:
    """Tests du traitement métier des événements Stripe."""

    async def test_subscription_deleted_downgrades_user(self, mock_db_service):
        """customer.subscription.deleted doit basculer l'utilisateur en plan FREE."""
        from api.stripe_webhook import stripe_webhook
        
        event = {
            "id": "evt_cancel_1",
            "type": "customer.subscription.deleted",
            "data": {"object": {"customer": "cus_123"}}
        }
        
        # Mock: L'utilisateur existe en base par son stripe_customer_id
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"id": "user_456"}]
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "user_456"}]
        
        # Simulation idempotence: non traité
        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())
                
                result = await stripe_webhook(mock_request, "sig")
                
                assert result["status"] == "success"
                assert result["action"] == "downgraded"

    async def test_payment_failed_after_multiple_attempts(self, mock_db_service):
        """invoice.payment_failed doit downgrade après 3 tentatives."""
        from api.stripe_webhook import stripe_webhook
        
        event = {
            "id": "evt_fail_3",
            "type": "invoice.payment_failed",
            "data": {"object": {"customer": "cus_123", "attempt_count": 3}}
        }
        
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"id": "user_789"}]
        
        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())
                
                result = await stripe_webhook(mock_request, "sig")
                
                assert result["status"] == "downgraded"
                assert result["reason"] == "payment_failed"

    async def test_new_checkout_upgrades_user(self, mock_db_service):
        """checkout.session.completed doit passer le user en plan payant."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_ok_1",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer_email": "pro@test.com",
                    "customer": "cus_vip",
                    "metadata": {"plan": "PRO"}
                }
            }
        }

        # Mock: Trouver le user par son email (via RPC get_user_id_by_email)
        mock_db_service.admin_client.rpc.return_value.execute.return_value.data = "user_vip_123"
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "user_vip_123"}]

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "success"
                assert result["plan"] == "PRO"

    async def test_checkout_with_price_id_maps_to_correct_plan(self, mock_db_service):
        """checkout.session.completed avec price_id dans line_items doit mapper le bon plan."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_price_1",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer_email": "starter@test.com",
                    "customer": "cus_starter",
                    "metadata": {},
                    "line_items": {
                        "data": [{"price": {"id": "price_1Sg51YLlPGgejV8rz28oXmd4"}}]
                    }
                }
            }
        }

        mock_db_service.admin_client.rpc.return_value.execute.return_value.data = "user_starter_1"
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "user_starter_1"}]

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "success"
                assert result["plan"] == "STARTER"

    async def test_checkout_without_email_is_skipped(self, mock_db_service):
        """checkout.session.completed sans email doit être ignoré (skipped)."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_noemail_1",
            "type": "checkout.session.completed",
            "data": {"object": {"customer": "cus_anon", "metadata": {}}}
        }

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "skipped"
                assert result["reason"] == "no email"

    async def test_checkout_with_unknown_user_returns_pending(self, mock_db_service):
        """checkout.session.completed pour un utilisateur inconnu doit retourner 'pending'."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_unknown_user",
            "type": "checkout.session.completed",
            "data": {"object": {"customer_email": "ghost@test.com", "customer": "cus_ghost", "metadata": {}}}
        }

        # RPC ne trouve pas l'utilisateur
        mock_db_service.admin_client.rpc.return_value.execute.return_value.data = None
        # Fallback table user_profiles aussi vide
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "pending"
                assert result["reason"] == "user not found"

    async def test_invoice_payment_succeeded_renews_credits(self, mock_db_service):
        """invoice.payment_succeeded doit renouveler les crédits selon le plan."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_renew_1",
            "type": "invoice.payment_succeeded",
            "data": {"object": {"customer": "cus_pro_1"}}
        }

        # L'utilisateur est PRO
        mock_db_service.admin_client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
            {"id": "user_pro_1", "plan": "PRO"}
        ]
        mock_db_service.admin_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "user_pro_1"}]

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "success"
                assert result["action"] == "credits_renewed"

    async def test_invoice_payment_failed_below_threshold_is_warning(self, mock_db_service):
        """invoice.payment_failed avec attempt < 3 doit retourner un warning sans downgrade."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_fail_1",
            "type": "invoice.payment_failed",
            "data": {"object": {"customer": "cus_warn", "attempt_count": 1}}
        }

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "warning"
                assert result["attempt"] == 1

    async def test_unhandled_event_type_is_ignored(self, mock_db_service):
        """Un type d'événement non géré doit retourner 'ignored' sans erreur."""
        from api.stripe_webhook import stripe_webhook

        event = {
            "id": "evt_unknown_type",
            "type": "customer.created",
            "data": {"object": {}}
        }

        with patch("api.stripe_webhook.is_event_processed", return_value=False):
            with patch("api.stripe_webhook.verify_stripe_signature", return_value=True):
                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value=event)
                mock_request.body = AsyncMock(return_value=json.dumps(event).encode())

                result = await stripe_webhook(mock_request, "sig")

                assert result["status"] == "ignored"

    async def test_invalid_signature_raises_401(self):
        """Une signature Stripe invalide doit lever HTTPException 401."""
        from api.stripe_webhook import stripe_webhook
        from fastapi import HTTPException

        with patch("api.stripe_webhook.verify_stripe_signature", return_value=False):
            with patch("api.stripe_webhook.settings") as mock_settings:
                mock_settings.STRIPE_WEBHOOK_SECRET = "whsec_test"

                mock_request = MagicMock(spec=Request)
                mock_request.json = AsyncMock(return_value={"id": "evt_x", "type": "test", "data": {"object": {}}})
                mock_request.body = AsyncMock(return_value=b'{}')

                with pytest.raises(HTTPException) as exc_info:
                    await stripe_webhook(mock_request, "bad-signature")

                assert exc_info.value.status_code == 401
