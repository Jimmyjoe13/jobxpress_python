import os
from xhtml2pdf import pisa
from models.candidate import CandidateProfile
from models.job_offer import JobOffer
from core.logging_config import get_logger
from core.exceptions import PDFError, PDFGenerationError

logger = get_logger()

class PDFGenerator:
    def __init__(self):
        # On crée un dossier 'output' s'il n'existe pas
        self.output_dir = "output"
        os.makedirs(self.output_dir, exist_ok=True)

    def create_application_pdf(self, candidate: CandidateProfile, offer: JobOffer, letter_html: str) -> str:
        """
        Crée un PDF avec la lettre et les infos via xhtml2pdf.
        """
        # Nettoyage du nom de fichier
        safe_company = "".join([c if c.isalnum() else "_" for c in offer.company])
        filename = f"Lettre_{candidate.last_name}_{safe_company}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        # Template HTML (xhtml2pdf aime les styles CSS simples dans le <head>)
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {{
                    size: A4;
                    margin: 2cm;
                }}
                body {{ 
                    font-family: Helvetica, sans-serif; 
                    font-size: 12pt; 
                    color: #333333;
                    line-height: 1.5;
                }}
                .header {{ 
                    text-align: center; 
                    border-bottom: 1px solid #3b82f6; 
                    padding-bottom: 10px; 
                    margin-bottom: 20px; 
                }}
                h1 {{ 
                    color: #1e40af; 
                    font-size: 18pt; 
                    margin-bottom: 5px;
                }}
                .contact-info {{
                    font-size: 10pt;
                    color: #666666;
                }}
                .recipient {{ 
                    margin-top: 30px;
                    margin-bottom: 30px;
                    font-weight: bold;
                }}
                .content {{ 
                    text-align: justify; 
                }}
                .footer {{ 
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 9pt;
                    color: #aaaaaa;
                    border-top: 1px solid #eeeeee;
                    padding-top: 5px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{candidate.first_name} {candidate.last_name}</h1>
                <div class="contact-info">
                    {candidate.email} • {candidate.phone or ''}<br/>
                    📍 {candidate.location}
                </div>
            </div>

            <div class="recipient">
                À l'attention de : {offer.company}<br/>
                Objet : Candidature au poste de {offer.title}
            </div>

            <div class="content">
                {letter_html}
            </div>

            <div class="footer">
                Généré par JobXpress - Assistant de Candidature IA
            </div>
        </body>
        </html>
        """

        logger.info(f"🖨️ Génération PDF: {filepath}")
        
        try:
            # Ouverture du fichier en mode binaire pour écriture
            with open(filepath, "wb") as pdf_file:
                # Conversion HTML -> PDF
                pisa_status = pisa.CreatePDF(src=full_html, dest=pdf_file)

            # Vérification des erreurs
            if pisa_status.err:
                logger.error(f"❌ Erreur xhtml2pdf: {pisa_status.err}")
                return None
            
            logger.info(f"✅ PDF créé: {filepath}")
            return filepath

        except Exception as e:
            logger.exception(f"❌ Exception PDF: {e}")
            return None

pdf_generator = PDFGenerator()