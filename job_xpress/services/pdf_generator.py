"""
Service de génération de PDF avec WeasyPrint.

WeasyPrint produit des PDF de meilleure qualité que xhtml2pdf,
avec un meilleur support CSS (flexbox, grid, etc.).

Dépendances système Linux requises:
- libcairo2
- libpango-1.0-0
- libpangocairo-1.0-0
- libgdk-pixbuf2.0-0
"""

from pathlib import Path
from typing import Optional

from core.logging_config import get_logger
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

logger = get_logger()

# Import conditionnel de WeasyPrint (lazy)
def _get_weasyprint():
    try:
        from weasyprint import HTML, CSS
        return HTML, CSS
    except ImportError:
        logger.warning("⚠️ WeasyPrint non disponible - Fallback vers xhtml2pdf")
        return None, None

# Fallback xhtml2pdf
try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    XHTML2PDF_AVAILABLE = False


class PDFGenerator:
    """
    Générateur de PDF pour les lettres de motivation.
    """

    def __init__(self):
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)
        logger.info("✅ PDFGenerator initialisé")

    def create_application_pdf(
        self, candidate: CandidateProfile, offer: JobOffer, letter_html: str
    ) -> Optional[str]:
        """
        Crée un PDF avec la lettre de motivation.
        """
        # Nettoyage du nom de fichier
        safe_company = "".join([c if c.isalnum() else "_" for c in offer.company])
        safe_name = "".join([c if c.isalnum() else "_" for c in candidate.last_name])
        filename = f"Lettre_{safe_name}_{safe_company}.pdf"
        filepath = self.output_dir / filename

        # Générer le HTML complet
        full_html = self._build_html_template(candidate, offer, letter_html)

        logger.info(f"🖨️ Génération PDF: {filepath}")

        # Essayer WeasyPrint d'abord
        HTML, CSS = _get_weasyprint()
        if HTML:
            return self._generate_with_weasyprint(full_html, str(filepath), HTML, CSS)

        # Fallback vers xhtml2pdf
        if XHTML2PDF_AVAILABLE:
            return self._generate_with_xhtml2pdf(full_html, str(filepath))

        # Aucun générateur disponible
        logger.error("❌ Aucun générateur PDF disponible")
        return None

    def _generate_with_weasyprint(self, html: str, filepath: str, HTML, CSS) -> Optional[str]:
        """Génère le PDF avec WeasyPrint."""
        try:
            # CSS supplémentaire pour WeasyPrint
            css = CSS(
                string="""
                @page {
                    size: A4;
                    margin: 2cm;
                }
                body {
                    font-family: 'Helvetica', 'Arial', sans-serif;
                }
            """
            )

            HTML(string=html).write_pdf(filepath, stylesheets=[css])
            logger.info(f"✅ PDF créé (WeasyPrint): {filepath}")
            return filepath

        except Exception as e:
            logger.exception(f"❌ Erreur WeasyPrint: {e}")

            # Fallback vers xhtml2pdf si disponible
            if XHTML2PDF_AVAILABLE:
                logger.info("🔄 Tentative fallback xhtml2pdf...")
                return self._generate_with_xhtml2pdf(html, filepath)

            return None

    def _generate_with_xhtml2pdf(self, html: str, filepath: str) -> Optional[str]:
        """Génère le PDF avec xhtml2pdf (fallback)."""
        try:
            with open(filepath, "wb") as pdf_file:
                pisa_status = pisa.CreatePDF(src=html, dest=pdf_file)

            if pisa_status.err:
                logger.error(f"❌ Erreur xhtml2pdf: {pisa_status.err}")
                return None

            logger.info(f"✅ PDF créé (xhtml2pdf): {filepath}")
            return filepath

        except Exception as e:
            logger.exception(f"❌ Exception xhtml2pdf: {e}")
            return None

    def _build_html_template(
        self, candidate: CandidateProfile, offer: JobOffer, content_html: str
    ) -> str:
        """
        Construit le template HTML complet pour le dossier de préparation.
        """
        return f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 1.5cm;
                }}
                body {{ 
                    font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; 
                    font-size: 11pt; 
                    color: #1f2937;
                    line-height: 1.5;
                }}
                .header {{ 
                    background-color: #6366f1;
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }}
                .header h1 {{ margin: 0; font-size: 18pt; }}
                .info {{ font-size: 10pt; opacity: 0.9; margin-top: 5px; }}
                .section {{ margin-top: 25px; }}
                h3 {{ color: #4f46e5; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }}
                .footer {{ 
                    margin-top: 50px; 
                    text-align: center; 
                    font-size: 9pt; 
                    color: #9ca3af;
                    border-top: 1px solid #f3f4f6;
                    padding-top: 10px;
                }}
                ul {{ padding-left: 20px; }}
                li {{ margin-bottom: 5px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Dossier de Préparation : {offer.company}</h1>
                <div class="info">
                    Poste : {offer.title} | Candidat : {candidate.first_name} {candidate.last_name}
                </div>
            </div>

            <div class="content">
                {content_html}
            </div>

            <div class="footer">
                Document généré par JobXpress - Votre Assistant de Carrière IA
            </div>
        </body>
        </html>
        """


# Instance globale
pdf_generator = PDFGenerator()
