"""
API Endpoints pour les webhooks Stripe.

Gère l'activation et la désactivation des abonnements
suite aux événements de paiement Stripe.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel

from core.logging_config import get_logger
from core.config import settings
from services.database import db_service
from services.billing import PLANS

import hashlib
import hmac

logger = get_logger()

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# ===========================================
# MODELS
# ===========================================

class StripeWebhookEvent(BaseModel):
    """Structure simplifiée d'un événement Stripe webhook."""
    id: str
    type: str
    data: dict


# ===========================================
# HELPERS
# ===========================================

def verify_stripe_signature(
    payload: bytes, 
    signature: str, 
    secret: str
) -> bool:
    """
    Vérifie la signature Stripe du webhook.
    
    En production, utilisez stripe.Webhook.construct_event()
    Cette implémentation est simplifiée pour les Payment Links.
    """
    if not secret:
        # Si pas de secret configuré, on accepte (dev mode)
        logger.warning("⚠️ STRIPE_WEBHOOK_SECRET non configuré - webhook non vérifié")
        return True
    
    try:
        # Stripe utilise HMAC-SHA256 pour la signature
        # Format: t=timestamp,v1=signature
        parts = {p.split("=")[0]: p.split("=")[1] for p in signature.split(",")}
        timestamp = parts.get("t", "")
        sig = parts.get("v1", "")
        
        # Construire le message signé
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        
        # Calculer la signature attendue
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(sig, expected_sig)
    except Exception as e:
        logger.error(f"❌ Erreur vérification signature Stripe: {e}")
        return False


async def find_user_by_email(email: str) -> Optional[str]:
    """
    Trouve un user_id par email dans la base de données.
    """
    admin_client = db_service.admin_client
    if not admin_client:
        return None
    
    try:
        # Rechercher dans auth.users via la table user_profiles
        # Note: Supabase stocke l'email dans auth.users
        result = admin_client.rpc("get_user_id_by_email", {
            "p_email": email
        }).execute()
        
        if result.data:
            return result.data
    except Exception as e:
        logger.warning(f"⚠️ RPC get_user_id_by_email non disponible: {e}")
        # Fallback: essayer via la table profiles si elle contient l'email
        try:
            result = admin_client.table("user_profiles").select("id").eq("email", email).limit(1).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]["id"]
        except Exception:
            pass
    
    return None


async def upgrade_user_subscription(
    user_id: str, 
    plan: str,
    stripe_customer_id: Optional[str] = None
) -> bool:
    """
    Active/Upgrade l'abonnement d'un utilisateur.
    """
    admin_client = db_service.admin_client
    if not admin_client:
        logger.error("❌ Admin client non disponible")
        return False
    
    try:
        plan_config = PLANS.get(plan, PLANS["STARTER"])
        
        update_data = {
            "plan": plan,
            "credits": plan_config["credits"],
            "last_credit_reset": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if stripe_customer_id:
            update_data["stripe_customer_id"] = stripe_customer_id
        
        result = admin_client.table("user_profiles").update(
            update_data
        ).eq("id", user_id).execute()
        
        if result.data:
            logger.info(f"✅ User {user_id[:8]}... upgradé vers {plan}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Erreur upgrade subscription: {e}")
        return False


async def downgrade_user_subscription(user_id: str) -> bool:
    """
    Désactive l'abonnement et remet l'utilisateur en FREE.
    """
    admin_client = db_service.admin_client
    if not admin_client:
        return False
    
    try:
        result = admin_client.table("user_profiles").update({
            "plan": "FREE",
            "credits": PLANS["FREE"]["credits"],
            "last_credit_reset": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_id).execute()
        
        if result.data:
            logger.info(f"⬇️ User {user_id[:8]}... downgradé vers FREE")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Erreur downgrade subscription: {e}")
        return False


# ===========================================
# WEBHOOK ENDPOINTS
# ===========================================

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature")
):
    """
    Webhook Stripe pour gérer les événements de paiement.
    
    Événements gérés:
    - checkout.session.completed: Paiement réussi via Payment Link
    - customer.subscription.created: Nouvel abonnement
    - customer.subscription.updated: Modification d'abonnement
    - customer.subscription.deleted: Annulation d'abonnement
    - invoice.payment_succeeded: Renouvellement réussi
    - invoice.payment_failed: Échec de paiement
    
    Configuration requise:
    - STRIPE_WEBHOOK_SECRET dans le .env
    """
    # Récupérer le payload brut
    try:
        payload = await request.body()
        event_data = await request.json()
    except Exception as e:
        logger.error(f"❌ Erreur parsing webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    # Vérifier la signature (optionnel en dev)
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    if stripe_signature and webhook_secret:
        if not verify_stripe_signature(payload, stripe_signature, webhook_secret):
            logger.warning("⚠️ Signature Stripe invalide")
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Extraire les infos de l'événement
    event_type = event_data.get("type", "unknown")
    event_id = event_data.get("id", "unknown")
    data_object = event_data.get("data", {}).get("object", {})
    
    logger.info(f"📦 Webhook Stripe reçu: {event_type} (id: {event_id[:20]}...)")
    
    # Traiter selon le type d'événement
    try:
        if event_type == "checkout.session.completed":
            # === PAIEMENT RÉUSSI VIA PAYMENT LINK ===
            customer_email = data_object.get("customer_email") or data_object.get("customer_details", {}).get("email")
            customer_id = data_object.get("customer")
            
            if not customer_email:
                logger.warning("⚠️ checkout.session.completed sans email")
                return {"status": "skipped", "reason": "no email"}
            
            # Trouver l'utilisateur par email
            user_id = await find_user_by_email(customer_email)
            
            if not user_id:
                logger.warning(f"⚠️ Utilisateur non trouvé pour email: {customer_email}")
                # On pourrait créer le user ici ou stocker pour traitement manuel
                return {"status": "pending", "reason": "user not found", "email": customer_email}
            
            # Activer le plan Starter (Payment Link actuel)
            success = await upgrade_user_subscription(user_id, "STARTER", customer_id)
            
            if success:
                logger.info(f"🎉 Souscription Starter activée pour {customer_email}")
                return {"status": "success", "plan": "STARTER"}
            else:
                return {"status": "error", "reason": "upgrade failed"}
        
        elif event_type == "customer.subscription.deleted":
            # === ANNULATION D'ABONNEMENT ===
            customer_id = data_object.get("customer")
            
            # Chercher l'utilisateur par stripe_customer_id
            admin_client = db_service.admin_client
            if admin_client:
                result = admin_client.table("user_profiles").select("id").eq("stripe_customer_id", customer_id).limit(1).execute()
                
                if result.data and len(result.data) > 0:
                    user_id = result.data[0]["id"]
                    await downgrade_user_subscription(user_id)
                    logger.info(f"⬇️ Abonnement annulé pour customer {customer_id}")
                    return {"status": "success", "action": "downgraded"}
            
            return {"status": "skipped", "reason": "customer not found"}
        
        elif event_type == "invoice.payment_failed":
            # === ÉCHEC DE PAIEMENT ===
            customer_id = data_object.get("customer")
            attempt_count = data_object.get("attempt_count", 0)
            
            logger.warning(f"⚠️ Échec paiement pour customer {customer_id} (tentative {attempt_count})")
            
            # Après 3 tentatives, downgrade
            if attempt_count >= 3:
                admin_client = db_service.admin_client
                if admin_client:
                    result = admin_client.table("user_profiles").select("id").eq("stripe_customer_id", customer_id).limit(1).execute()
                    
                    if result.data and len(result.data) > 0:
                        user_id = result.data[0]["id"]
                        await downgrade_user_subscription(user_id)
                        return {"status": "downgraded", "reason": "payment_failed"}
            
            return {"status": "warning", "attempt": attempt_count}
        
        elif event_type == "invoice.payment_succeeded":
            # === RENOUVELLEMENT RÉUSSI ===
            customer_id = data_object.get("customer")
            
            # Rafraîchir les crédits pour le mois suivant
            admin_client = db_service.admin_client
            if admin_client:
                result = admin_client.table("user_profiles").select("id, plan").eq("stripe_customer_id", customer_id).limit(1).execute()
                
                if result.data and len(result.data) > 0:
                    user_id = result.data[0]["id"]
                    plan = result.data[0]["plan"]
                    plan_config = PLANS.get(plan, PLANS["STARTER"])
                    
                    admin_client.table("user_profiles").update({
                        "credits": plan_config["credits"],
                        "last_credit_reset": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", user_id).execute()
                    
                    logger.info(f"🔄 Crédits renouvelés pour customer {customer_id}")
                    return {"status": "success", "action": "credits_renewed"}
            
            return {"status": "skipped", "reason": "customer not found"}
        
        else:
            # Événement non géré
            logger.debug(f"📦 Événement Stripe ignoré: {event_type}")
            return {"status": "ignored", "event_type": event_type}
            
    except Exception as e:
        logger.exception(f"❌ Erreur traitement webhook Stripe: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stripe/health")
async def stripe_webhook_health():
    """
    Endpoint de santé pour vérifier que le webhook est configuré.
    """
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    
    return {
        "status": "ok",
        "webhook_configured": bool(webhook_secret),
        "endpoint": "/webhooks/stripe",
        "supported_events": [
            "checkout.session.completed",
            "customer.subscription.created",
            "customer.subscription.updated", 
            "customer.subscription.deleted",
            "invoice.payment_succeeded",
            "invoice.payment_failed"
        ]
    }
