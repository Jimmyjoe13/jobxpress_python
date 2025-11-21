import httpx
import base64
import os
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

class EmailService:
    API_URL = "https://api.brevo.com/v3/smtp/email"

    def __init__(self):
        self.api_key = settings.BREVO_API_KEY
        self.sender_email = settings.SENDER_EMAIL

    def send_application_email(self, candidate: CandidateProfile, offer: JobOffer, pdf_path: str):
        """
        Envoie l'email via l'API Brevo (Port 443 - Jamais bloqué).
        """
        if not self.api_key:
            print("⚠️ Clé API Brevo manquante. Email non envoyé.")
            return

        try:
            # 1. Préparation du PDF en Base64 (Requis par l'API)
            attachment = []
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    pdf_content = base64.b64encode(f.read()).decode("utf-8")
                
                attachment.append({
                    "content": pdf_content,
                    "name": os.path.basename(pdf_path)
                })

            # 2. Corps du message
            html_content = f"""
            <p>Bonjour {candidate.first_name},</p>
            <p>Bonne nouvelle ! JobXpress a identifié une opportunité pertinente pour vous.</p>
            <ul>
                <li><strong>Poste :</strong> {offer.title}</li>
                <li><strong>Entreprise :</strong> {offer.company}</li>
                <li><strong>Score :</strong> {offer.match_score}%</li>
            </ul>
            <p>Vous trouverez ci-joint votre lettre de motivation personnalisée.</p>
            <p><a href="{offer.url}">👉 Voir l'offre originale</a></p>
            <p>Bonne chance !<br>L'équipe JobXpress</p>
            """

            # 3. Payload API
            payload = {
                "sender": {"email": self.sender_email, "name": "JobXpress AI"},
                "to": [{"email": candidate.email, "name": f"{candidate.first_name} {candidate.last_name}"}],
                "subject": f"Candidature générée : {offer.title} chez {offer.company}",
                "htmlContent": html_content,
                "attachment": attachment
            }

            headers = {
                "accept": "application/json",
                "api-key": self.api_key,
                "content-type": "application/json"
            }

            # 4. Envoi (Synchrone ici pour simplifier, ou Async possible)
            with httpx.Client() as client:
                response = client.post(self.API_URL, json=payload, headers=headers)
                
                if response.status_code in [200, 201]:
                    print(f"✅ Email envoyé via Brevo à {candidate.email} !")
                else:
                    print(f"❌ Erreur Brevo : {response.text}")

        except Exception as e:
            print(f"❌ Exception Email : {str(e)}")

email_service = EmailService()