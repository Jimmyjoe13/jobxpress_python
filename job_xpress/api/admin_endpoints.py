"""
API Admin - Monitoring et statistiques globales.
Accès réservé aux administrateurs (SUPABASE_ADMIN_USER_ID).
"""

from fastapi import APIRouter, Depends, HTTPException
from core.auth import get_current_admin_user
from services.database import db_service
from core.logging_config import get_logger
from datetime import datetime, timedelta

logger = get_logger()
router = APIRouter(prefix="/api/v2/admin", tags=["Admin - Monitoring"])

# Constantes de coûts estimées (USD per 1K tokens)
COSTS = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "deepseek-chat": {"input": 0.00014, "output": 0.00028},
}

@router.get("/usage-stats")
async def get_usage_stats(
    days: int = 30,
    admin_id: str = Depends(get_current_admin_user)
):
    """
    Récupère les statistiques d'utilisation globales (coûts LLM, volume de requêtes).
    Réservé aux admins.
    """
    logger.info(f"📊 Admin {admin_id} accède aux stats d'utilisation ({days} jours)")
    
    # Calculer la date de début
    since = datetime.now() - timedelta(days=days)
    
    # 1. Récupérer tous les logs depuis Supabase
    # Note: On utilise le service_role_client pour lire TOUS les logs
    client = db_service.get_admin_client()
    
    response = client.table("usage_logs") \
        .select("*") \
        .gte("created_at", since.isoformat()) \
        .order("created_at", descending=True) \
        .execute()
        
    logs = response.data
    
    # 2. Agrégation des données
    stats = {
        "total_calls": len(logs),
        "total_cost_usd": 0.0,
        "by_feature": {},
        "by_model": {},
        "over_time": [] # Optionnel: groupé par jour
    }
    
    for log in logs:
        feature = log.get("feature", "unknown")
        model = log.get("model", "unknown")
        input_tokens = log.get("input_tokens", 0) or 0
        output_tokens = log.get("output_tokens", 0) or 0
        
        # Calcul du coût
        cost = 0.0
        if model in COSTS:
            cost = (input_tokens / 1000 * COSTS[model]["input"]) + \
                   (output_tokens / 1000 * COSTS[model]["output"])
        
        # Stats par feature
        if feature not in stats["by_feature"]:
            stats["by_feature"][feature] = {"calls": 0, "cost": 0.0}
        stats["by_feature"][feature]["calls"] += 1
        stats["by_feature"][feature]["cost"] += cost
        
        # Stats par modèle
        if model not in stats["by_model"]:
            stats["by_model"][model] = {"calls": 0, "cost": 0.0, "tokens": 0}
        stats["by_model"][model]["calls"] += 1
        stats["by_model"][model]["cost"] += cost
        stats["by_model"][model]["tokens"] += (input_tokens + output_tokens)
        
        stats["total_cost_usd"] += cost

    # Arrondir les coûts
    stats["total_cost_usd"] = round(stats["total_cost_usd"], 4)
    for f in stats["by_feature"]:
        stats["by_feature"][f]["cost"] = round(stats["by_feature"][f]["cost"], 4)
    for m in stats["by_model"]:
        stats["by_model"][m]["cost"] = round(stats["by_model"][m]["cost"], 4)
        
    return stats
