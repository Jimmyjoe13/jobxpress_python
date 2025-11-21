import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

class EmailService:
    def __init__(self):
        self.server = settings.SMTP_SERVER
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD

    def send_application_email(self, candidate: CandidateProfile, offer: JobOffer, pdf_path: str):
        if not self.user or not self.password:
            print("⚠️ Configuration SMTP manquante. Email non envoyé.")
            return

        try:
            # 1. Construction de l'email
            msg = MIMEMultipart()
            msg['Subject'] = f"Candidature générée : {offer.title} chez {offer.company}"
            msg['From'] = self.user
            msg['To'] = candidate.email

            body_text = f"""
            Bonjour {candidate.first_name},

            Bonne nouvelle ! JobXpress a identifié une opportunité pertinente pour vous.

            🎯 Poste : {offer.title}
            🏢 Entreprise : {offer.company}
            ⭐️ Score de pertinence : {offer.match_score}%
            
            Vous trouverez ci-joint votre lettre de motivation personnalisée au format PDF.

            Lien de l'offre : {offer.url}

            Bonne chance !
            L'équipe JobXpress
            """
            msg.attach(MIMEText(body_text, 'plain'))

            # 2. Pièce jointe
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    part = MIMEApplication(f.read(), Name=os.path.basename(pdf_path))
                part['Content-Disposition'] = f'attachment; filename="{os.path.basename(pdf_path)}"'
                msg.attach(part)

            # 3. Envoi via SMTP_SSL (Port 465)
            print(f"📧 Connexion SSL au serveur SMTP ({self.server}:{self.port})...")
            
            # Utilisation de SMTP_SSL direct (plus robuste sur Render)
            with smtplib.SMTP_SSL(self.server, self.port) as server:
                server.login(self.user, self.password)
                server.send_message(msg)
            
            print(f"✅ Email envoyé avec succès à {candidate.email} !")

        except Exception as e:
            print(f"❌ Erreur lors de l'envoi de l'email : {str(e)}")

email_service = EmailService()