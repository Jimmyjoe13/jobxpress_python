"""
Service de gestion des crédits utilisateur.

Implémente la logique métier de facturation:
- Plan Freemium (FREE): 5 crédits/semaine, reset lazy
- Plan Starter: 100 crédits/mois @ 9.99€
- Plan Pro: 300 crédits/mois @ 24.99€, fonctionnalités avancées JobyJoba
- Règle "No cure, no pay": débit seulement si résultats > 0

Utilise les fonctions RPC Supabase pour les opérations atomiques.
"""

from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, Dict, Any
from core.logging_config import get_logger
from core.config import settings
from core.exceptions import DatabaseError

logger = get_logger()

# Configuration des plans - Pricing V2
PLANS = {
    "FREE": {
        "credits": 5,
        "reset_days": 7,
        "name": "Freemium",
        "price": 0,
        "jobyjoba_messages": 10,  # par session
        "jobyjoba_daily_limit": False,  # pas de limite journalière
        "custom_context": False
    },
    "STARTER": {
        "credits": 100,
        "reset_days": 30,
        "name": "Starter",
        "price": 9.99,
        "jobyjoba_messages": 10,  # par session
        "jobyjoba_daily_limit": False,
        "custom_context": False
    },
    "PRO": {
        "credits": 300,
        "reset_days": 30,
        "name": "Pro",
        "price": 24.99,
        "jobyjoba_messages": 20,  # par jour (pas par session)
        "jobyjoba_daily_limit": True,  # limite journalière
        "custom_context": True
    }
}

SEARCH_COST = 1
ADVICE_COST = 1


class BillingService:
    """
    Service de facturation et gestion des crédits.
    
    Utilise les RPC Supabase pour garantir l'atomicité des opérations.
    """
    
    def __init__(self, db_service):
        self.db = db_service
    
    async def get_user_credits(self, user_id: str, access_token: str) -> dict:
        """
        Récupère l'état des crédits d'un utilisateur.
        
        Effectue un reset lazy si nécessaire (plan FREE seulement).
        
        Args:
            user_id: ID de l'utilisateur
            access_token: JWT pour l'authentification
            
        Returns:
            dict avec credits, plan, next_reset_at
        """
        client = self.db.get_user_client(access_token)
        if not client:
            logger.error("❌ Impossible de créer le client Supabase pour billing")
            raise DatabaseError("DB-003", "Client Supabase non disponible")
        
        try:
            # Appel RPC pour check + reset atomique
            result = client.rpc("check_and_reset_credits", {
                "p_user_id": user_id,
                "p_free_credits": PLANS["FREE"]["credits"],
                "p_reset_days": PLANS["FREE"]["reset_days"]
            }).execute()
            
            credits = result.data if result.data is not None else 0
            
            # Récupérer les infos complètes du profil
            profile = client.table("user_profiles").select(
                "credits, plan, last_credit_reset"
            ).eq("id", user_id).single().execute()
            
            if profile.data:
                plan = profile.data.get("plan", "FREE")
                last_reset = profile.data.get("last_credit_reset")
                plan_config = PLANS.get(plan, PLANS["FREE"])
                
                # Calculer la prochaine date de reset
                next_reset = None
                if last_reset:
                    last_reset_dt = datetime.fromisoformat(
                        last_reset.replace("Z", "+00:00")
                    )
                    reset_days = plan_config["reset_days"]
                    next_reset = last_reset_dt + timedelta(days=reset_days)
                
                return {
                    "credits": profile.data.get("credits", credits),
                    "plan": plan,
                    "plan_name": plan_config["name"],
                    "last_reset": last_reset,
                    "next_reset_at": next_reset.isoformat() if next_reset else None,
                    # Nouvelles infos pour le frontend
                    "max_credits": plan_config["credits"],
                    "reset_period_days": plan_config["reset_days"],
                    "jobyjoba_messages_limit": plan_config["jobyjoba_messages"],
                    "jobyjoba_is_daily_limit": plan_config["jobyjoba_daily_limit"],
                    "has_custom_context": plan_config["custom_context"],
                    "price": plan_config["price"]
                }
            
            return {
                "credits": credits,
                "plan": "FREE",
                "plan_name": "Freemium",
                "last_reset": None,
                "next_reset_at": None,
                "max_credits": 5,
                "reset_period_days": 7,
                "jobyjoba_messages_limit": 10,
                "jobyjoba_is_daily_limit": False,
                "has_custom_context": False,
                "price": 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération crédits: {e}")
            # Fallback: retourner 0 crédits (sécurité)
            return {
                "credits": 0,
                "plan": "FREE",
                "plan_name": "Gratuit",
                "error": str(e)
            }
    
    async def can_search(self, user_id: str, access_token: str) -> Tuple[bool, int]:
        """
        Vérifie si l'utilisateur peut lancer une recherche.
        
        Args:
            user_id: ID de l'utilisateur
            access_token: JWT
            
        Returns:
            Tuple (peut_chercher: bool, crédits_restants: int)
        """
        user_credits = await self.get_user_credits(user_id, access_token)
        credits = user_credits.get("credits", 0)
        
        can_proceed = credits >= SEARCH_COST
        
        if not can_proceed:
            logger.warning(f"⚠️ User {user_id[:8]}... a {credits} crédits (insuffisant)")
        
        return can_proceed, credits
    
    async def debit_search(
        self, 
        user_id: str, 
        access_token: str,
        results_count: int
    ) -> int:
        """
        Débite un crédit pour une recherche.
        
        Règle "No cure, no pay": débite seulement si results_count > 0.
        
        Args:
            user_id: ID de l'utilisateur
            access_token: JWT
            results_count: Nombre de résultats trouvés
            
        Returns:
            Crédits restants après débit
        """
        if results_count == 0:
            logger.info(f"💳 Pas de débit pour {user_id[:8]}... (0 résultats)")
            user_credits = await self.get_user_credits(user_id, access_token)
            return user_credits.get("credits", 0)
        
        return await self._debit_credits(user_id, access_token, SEARCH_COST, "search")
    
    async def debit_advice(self, user_id: str, access_token: str) -> int:
        """
        Débite un crédit pour le conseil entretien.
        
        Returns:
            Crédits restants après débit
        """
        return await self._debit_credits(user_id, access_token, ADVICE_COST, "advice")
    
    async def _debit_credits(
        self, 
        user_id: str, 
        access_token: str, 
        amount: int,
        reason: str
    ) -> int:
        """
        Débite des crédits de manière atomique via RPC.
        
        Args:
            user_id: ID de l'utilisateur
            access_token: JWT
            amount: Nombre de crédits à débiter
            reason: Raison du débit (pour logs)
            
        Returns:
            Crédits restants
            
        Raises:
            DatabaseError si crédit insuffisant ou erreur DB
        """
        client = self.db.get_user_client(access_token)
        if not client:
            raise DatabaseError("DB-003", "Client Supabase non disponible")
        
        try:
            result = client.rpc("debit_credit", {
                "p_user_id": user_id,
                "p_amount": amount
            }).execute()
            
            new_credits = result.data
            logger.info(
                f"💳 Débit {amount} crédit(s) pour {user_id[:8]}... "
                f"(raison: {reason}), reste: {new_credits}"
            )
            
            return new_credits
            
        except Exception as e:
            error_msg = str(e)
            if "insuffisants" in error_msg.lower():
                logger.warning(f"⚠️ Crédits insuffisants pour {user_id[:8]}...")
                raise DatabaseError(
                    "BILLING-001", 
                    "Crédits insuffisants",
                    details={"user_id": user_id, "required": amount}
                )
            
            logger.error(f"❌ Erreur débit crédits: {e}")
            raise DatabaseError(
                "BILLING-002",
                "Erreur lors du débit des crédits",
                details={"error": error_msg}
            )
    
    async def upgrade_to_plan(
        self, 
        user_id: str, 
        access_token: str, 
        target_plan: str
    ) -> dict:
        """
        Upgrade/Downgrade un utilisateur vers un plan spécifique.
        
        Args:
            user_id: ID de l'utilisateur
            access_token: JWT
            target_plan: Plan cible (FREE, STARTER, PRO)
        
        Returns:
            Nouveau profil avec crédits mis à jour
        """
        if target_plan not in PLANS:
            raise DatabaseError("BILLING-004", f"Plan inconnu: {target_plan}")
        
        client = self.db.get_user_client(access_token)
        if not client:
            raise DatabaseError("DB-003", "Client Supabase non disponible")
        
        try:
            plan_config = PLANS[target_plan]
            result = client.table("user_profiles").update({
                "plan": target_plan,
                "credits": plan_config["credits"],
                "last_credit_reset": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", user_id).execute()
            
            if result.data:
                logger.info(f"⭐ User {user_id[:8]}... changé vers {target_plan}")
                return result.data[0]
            
            raise DatabaseError("BILLING-003", "Échec du changement de plan")
            
        except Exception as e:
            logger.error(f"❌ Erreur changement plan: {e}")
            raise
    
    async def upgrade_to_pro(self, user_id: str, access_token: str) -> dict:
        """
        Upgrade un utilisateur vers le plan Pro.
        Méthode de compatibilité, utilise upgrade_to_plan.
        """
        return await self.upgrade_to_plan(user_id, access_token, "PRO")
    
    async def upgrade_to_starter(self, user_id: str, access_token: str) -> dict:
        """
        Upgrade un utilisateur vers le plan Starter.
        """
        return await self.upgrade_to_plan(user_id, access_token, "STARTER")
    
    def get_plan_features(self, plan: str) -> Dict[str, Any]:
        """
        Récupère les fonctionnalités d'un plan.
        
        Args:
            plan: Nom du plan (FREE, STARTER, PRO)
            
        Returns:
            Dict avec toutes les fonctionnalités du plan
        """
        return PLANS.get(plan, PLANS["FREE"]).copy()
    
    def get_jobyjoba_limit(self, plan: str) -> dict:
        """
        Récupère les limites JobyJoba pour un plan.
        
        Args:
            plan: Nom du plan
            
        Returns:
            Dict avec max_messages et is_daily_limit
        """
        plan_config = PLANS.get(plan, PLANS["FREE"])
        return {
            "max_messages": plan_config["jobyjoba_messages"],
            "is_daily_limit": plan_config["jobyjoba_daily_limit"],
            "custom_context_enabled": plan_config["custom_context"]
        }


# Fonction utilitaire pour accès direct aux plans
def get_plan_config(plan: str) -> Dict[str, Any]:
    """Récupère la configuration d'un plan."""
    return PLANS.get(plan, PLANS["FREE"]).copy()


# Note: L'instance sera créée dans main.py après import de db_service
# billing_service = BillingService(db_service)

