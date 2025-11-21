import httpx
import base64
import os
from typing import List
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

class EmailService:
    API_URL = "https://api.brevo.com/v3/smtp/email"

    def __init__(self):
        self.api_key = settings.BREVO_API_KEY
        self.sender_email = settings.SENDER_EMAIL

    def send_application_email(self, candidate: CandidateProfile, best_offer: JobOffer, other_offers: List[JobOffer], pdf_path: str):
        """
        Envoie l'email avec le PDF du Top 1 et la liste des autres offres pertinentes.
        """
        if not self.api_key:
            print("⚠️ Clé API Brevo manquante. Email non envoyé.")
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

            # 2. Construction de la liste HTML des autres offres
            other_jobs_html = ""
            if other_offers:
                list_items = ""
                for job in other_offers[:5]: # On limite à 5 pour ne pas faire un mail trop long
                    list_items += f"""
                    <li style="margin-bottom: 10px;">
                        <strong>{job.title}</strong> chez {job.company} <br>
                        <span style="color: green;">Match: {job.match_score}%</span> 
                        - <a href="{job.url}" style="text-decoration: none; color: #0066cc;">Voir l'offre 🔗</a>
                    </li>
                    """
                
                other_jobs_html = f"""
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <h3>📍 Autres opportunités détectées ({len(other_offers)}) :</h3>
                <p>Ces offres pourraient aussi vous intéresser :</p>
                <ul style="padding-left: 20px;">
                    {list_items}
                </ul>
                """

            # 3. Corps du message complet
            html_content = f"""
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Bonjour {candidate.first_name},</p>
                
                <p>Bonne nouvelle ! JobXpress a identifié <strong>{1 + len(other_offers)} opportunités</strong> pour vous.</p>
                
                <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0066cc;">🏆 Meilleure recommandation</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li>🎯 <strong>Poste :</strong> {best_offer.title}</li>
                        <li>🏢 <strong>Entreprise :</strong> {best_offer.company}</li>
                        <li>⭐️ <strong>Pertinence :</strong> {best_offer.match_score}%</li>
                    </ul>
                    <p>👉 <strong>Vous trouverez ci-joint votre lettre de motivation personnalisée pour cette offre.</strong></p>
                    <p><a href="{best_offer.url}" style="background-color: #0066cc; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px;">Postuler à cette offre</a></p>
                </div>

                {other_jobs_html}

                <p style="margin-top: 30px; font-size: 12px; color: #888;">
                    Bonne chance dans vos recherches !<br>
                    L'équipe JobXpress
                </p>
            </div>
            """

            # 4. Payload API
            payload = {
                "sender": {"email": self.sender_email, "name": "JobXpress AI"},
                "to": [{"email": candidate.email, "name": f"{candidate.first_name} {candidate.last_name}"}],
                "subject": f"Votre candidature pour {best_offer.company} (+ {len(other_offers)} autres offres)",
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
                    print(f"✅ Email envoyé via Brevo à {candidate.email} !")
                else:
                    print(f"❌ Erreur Brevo : {response.text}")

        except Exception as e:
            print(f"❌ Exception Email : {str(e)}")

email_service = EmailService()