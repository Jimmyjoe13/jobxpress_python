import httpx
import base64
import os
from typing import List
from core.config import settings
from core.logging_config import get_logger
from core.exceptions import EmailError, EmailSendError
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

logger = get_logger()


class EmailService:
    API_URL = "https://api.brevo.com/v3/smtp/email"

    def __init__(self):
        self.api_key = settings.BREVO_API_KEY
        self.sender_email = settings.SENDER_EMAIL

    def send_application_email(self, candidate: CandidateProfile, best_offer: JobOffer, other_offers: List[JobOffer], pdf_path: str):
        """
        Envoie l'email avec le PDF du Top 1 et la liste des autres offres pertinentes.
        Template moderne avec gradient et cards.
        """
        if not self.api_key:
            logger.warning("⚠️ Clé API Brevo manquante. Email non envoyé.")
            return

        try:
            # 1. Préparation du PDF en Base64
            attachment = []
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    pdf_content = base64.b64encode(f.read()).decode("utf-8")
                
                attachment.append({
                    "content": pdf_content,
                    "name": os.path.basename(pdf_path)
                })

            # 2. Construction des cards pour les autres offres
            other_jobs_html = ""
            if other_offers:
                job_cards = ""
                for job in other_offers[:6]:
                    # Récupération sécurisée des sous-scores
                    analysis = job.ai_analysis or {}
                    s_tech = analysis.get("score_technical", "0")
                    s_struct = analysis.get("score_structural", "0")
                    
                    job_cards += f'''
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                        <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">{job.title}</div>
                        <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">chez {job.company}</div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; font-size: 13px;">
                            <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: 500;">Match Global : {job.match_score}%</span>
                            <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: 500;">Tech: {s_tech}%</span>
                            <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: 500;">Contrat: {s_struct}%</span>
                        </div>
                        <a href="{job.url}" style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px;">👉 Voir l'offre →</a>
                    </div>
                    '''
                
                other_jobs_html = f'''
                <h2 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 30px 0 20px;">📍 Autres opportunités ({len(other_offers)})</h2>
                {job_cards}
                '''

            # 3. Corps du message complet avec nouveau design
            total_offers = 1 + len(other_offers)
            html_content = f'''
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vos nouvelles opportunités JobXpress</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
        
        <!-- Header avec gradient -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 10px 0;">🎯 JobXpress AI</h1>
            <p style="font-size: 16px; opacity: 0.95; margin: 0;">Vos nouvelles opportunités professionnelles</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Bonjour {candidate.first_name},</p>
            <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Bonne nouvelle ! JobXpress a identifié <strong>{total_offers} opportunités</strong> pour vous.</p>
            
            <!-- Highlight Box - Meilleure recommandation -->
            <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 10px; padding: 25px; margin: 25px 0; border-left: 4px solid #f97316;">
                <span style="display: inline-block; background-color: #fbbf24; color: #78350f; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 15px;">🏆 Meilleure recommandation</span>
                
                <div style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 10px 0;">
                    🎯 {best_offer.title}
                </div>
                
                <div style="font-size: 16px; color: #6b7280; margin: 8px 0;">
                    🏢 {best_offer.company}
                </div>
                
                <div style="font-size: 15px; color: #059669; font-weight: 600; margin: 8px 0;">
                    ⭐️ Pertinence : {best_offer.match_score}%
                </div>
                
                <p style="margin: 15px 0; color: #374151;">
                    👉 Vous trouverez ci-joint votre lettre de motivation personnalisée pour cette offre.
                </p>
                
                <a href="{best_offer.url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 15px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">Postuler à cette offre</a>
            </div>
            
            <!-- Autres offres -->
            {other_jobs_html}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Bonne chance dans vos recherches ! 🍀</p>
            <p style="margin: 0;">L'équipe <span style="color: #667eea; font-weight: 700;">JobXpress</span></p>
        </div>
    </div>
</body>
</html>
            '''

            # 4. Payload API
            payload = {
                "sender": {"email": self.sender_email, "name": "JobXpress AI"},
                "to": [{"email": candidate.email, "name": f"{candidate.first_name} {candidate.last_name}"}],
                "subject": f"🎯 {best_offer.title} chez {best_offer.company} (+ {len(other_offers)} autres offres)",
                "htmlContent": html_content,
                "attachment": attachment
            }

            headers = {
                "accept": "application/json",
                "api-key": self.api_key,
                "content-type": "application/json"
            }

            # 5. Envoi
            with httpx.Client() as client:
                response = client.post(self.API_URL, json=payload, headers=headers)
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Email envoyé à {candidate.email}")
                else:
                    logger.error(f"❌ Erreur Brevo [{response.status_code}]: {response.text[:200]}")

        except httpx.TimeoutException:
            logger.error(f"❌ Timeout envoi email à {candidate.email}")
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Erreur HTTP Brevo [{e.response.status_code}]")
        except Exception as e:
            logger.exception(f"❌ Exception Email: {e}")

email_service = EmailService()
