from typing import List
from job_xpress_v2.models.job_offer import JobOffer

class NotificationService:
    """
    Gère les alertes utilisateur pour les offres à haut potentiel.
    """
    
    def send_daily_summary(self, top_offers: List[JobOffer]):
        """
        Génère un résumé des meilleures opportunités du jour.
        (Pourrait être étendu à Email, Telegram ou Slack)
        """
        if not top_offers:
            print("📭 Pas d'offres exceptionnelles aujourd'hui.")
            return

        summary = f"🚀 JobXpress V2 : {len(top_offers)} opportunités détectées !\n"
        summary += "="*40 + "\n"
        for offer in top_offers:
            summary += f"⭐ {offer.title} @ {offer.company} (Match: {offer.match_score}%)\n"
            summary += f"   🔗 {offer.url}\n"
            summary += f"   🏢 {offer.contract_type} | {offer.location}\n"
            summary += "-" * 20 + "\n"
        
        print(summary)
        return summary

# Instance globale
notification_service = NotificationService()
