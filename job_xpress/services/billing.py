"""
Service de gestion des crédits utilisateur.

Implémente la logique métier de facturation:
- Plan Gratuit: 5 crédits/semaine, reset lazy
- Plan Pro: 100 crédits/mois
- Règle "No cure, no pay": débit seulement si résultats > 0

Utilise les fonctions RPC Supabase pour les opérations atomiques.
"""

from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from core.logging_config import get_logger
from core.config import settings
from core.exceptions import DatabaseError

logger = get_logger()

# Configuration des plans
PLANS = {
    "FREE": {
        "credits": 5,
        "reset_days": 7,
        "name": "Gratuit"
    },
    "PRO": {
        "credits": 100,
        "reset_days": 30,
        "name": "Pro"
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
                
                # Calculer la prochaine date de reset
                next_reset = None
                if last_reset:
                    last_reset_dt = datetime.fromisoformat(
                        last_reset.replace("Z", "+00:00")
                    )
                    reset_days = PLANS.get(plan, PLANS["FREE"])["reset_days"]
                    next_reset = last_reset_dt + timedelta(days=reset_days)
                
                return {
                    "credits": profile.data.get("credits", credits),
                    "plan": plan,
                    "plan_name": PLANS.get(plan, PLANS["FREE"])["name"],
                    "last_reset": last_reset,
                    "next_reset_at": next_reset.isoformat() if next_reset else None
                }
            
            return {
                "credits": credits,
                "plan": "FREE",
                "plan_name": "Gratuit",
                "last_reset": None,
                "next_reset_at": None
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
    
    async def upgrade_to_pro(self, user_id: str, access_token: str) -> dict:
        """
        Upgrade un utilisateur vers le plan Pro.
        
        Returns:
            Nouveau profil avec crédits mis à jour
        """
        client = self.db.get_user_client(access_token)
        if not client:
            raise DatabaseError("DB-003", "Client Supabase non disponible")
        
        try:
            result = client.table("user_profiles").update({
                "plan": "PRO",
                "credits": PLANS["PRO"]["credits"],
                "last_credit_reset": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", user_id).execute()
            
            if result.data:
                logger.info(f"⭐ User {user_id[:8]}... upgradé vers PRO")
                return result.data[0]
            
            raise DatabaseError("BILLING-003", "Échec de l'upgrade")
            
        except Exception as e:
            logger.error(f"❌ Erreur upgrade Pro: {e}")
            raise


# Note: L'instance sera créée dans main.py après import de db_service
# billing_service = BillingService(db_service)
