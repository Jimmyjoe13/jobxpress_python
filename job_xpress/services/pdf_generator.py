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

import os
from pathlib import Path
from typing import Optional

from core.logging_config import get_logger
from core.exceptions import PDFError, PDFGenerationError
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

logger = get_logger()

# Import conditionnel de WeasyPrint (peut échouer sur Windows sans deps)
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    logger.warning("⚠️ WeasyPrint non disponible - Fallback vers mode simulation")

# Fallback xhtml2pdf si WeasyPrint non disponible
try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    XHTML2PDF_AVAILABLE = False


class PDFGenerator:
    """
    Générateur de PDF pour les lettres de motivation.
    
    Utilise WeasyPrint en priorité, avec fallback vers xhtml2pdf si non disponible.
    """
    
    def __init__(self):
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)
        
        if WEASYPRINT_AVAILABLE:
            logger.info("✅ PDFGenerator initialisé avec WeasyPrint")
        elif XHTML2PDF_AVAILABLE:
            logger.info("⚠️ PDFGenerator initialisé avec xhtml2pdf (fallback)")
        else:
            logger.warning("❌ Aucun générateur PDF disponible")
    
    def create_application_pdf(
        self, 
        candidate: CandidateProfile, 
        offer: JobOffer, 
        letter_html: str
    ) -> Optional[str]:
        """
        Crée un PDF avec la lettre de motivation.
        
        Args:
            candidate: Profil du candidat
            offer: Offre d'emploi ciblée
            letter_html: Contenu HTML de la lettre
            
        Returns:
            Chemin du fichier PDF créé, ou None si erreur
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
        if WEASYPRINT_AVAILABLE:
            return self._generate_with_weasyprint(full_html, str(filepath))
        
        # Fallback vers xhtml2pdf
        if XHTML2PDF_AVAILABLE:
            return self._generate_with_xhtml2pdf(full_html, str(filepath))
        
        # Aucun générateur disponible
        logger.error("❌ Aucun générateur PDF disponible")
        return None
    
    def _generate_with_weasyprint(self, html: str, filepath: str) -> Optional[str]:
        """Génère le PDF avec WeasyPrint."""
        try:
            # CSS supplémentaire pour WeasyPrint
            css = CSS(string="""
                @page {
                    size: A4;
                    margin: 2cm;
                }
                body {
                    font-family: 'Helvetica', 'Arial', sans-serif;
                }
            """)
            
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
        self, 
        candidate: CandidateProfile, 
        offer: JobOffer, 
        letter_html: str
    ) -> str:
        """
        Construit le template HTML complet pour le PDF.
        
        Design moderne avec header, contenu et footer.
        """
        # Formater le score si disponible
        score_badge = ""
        if offer.match_score > 0:
            score_color = "#22c55e" if offer.match_score >= 70 else "#f59e0b"
            score_badge = f"""
                <span style="
                    background-color: {score_color}; 
                    color: white; 
                    padding: 4px 12px; 
                    border-radius: 20px; 
                    font-size: 10pt;
                    font-weight: bold;
                ">
                    Match: {offer.match_score}%
                </span>
            """
        
        return f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4;
                    margin: 2cm;
                }}
                
                * {{
                    box-sizing: border-box;
                }}
                
                body {{ 
                    font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; 
                    font-size: 11pt; 
                    color: #1f2937;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }}
                
                .header {{ 
                    text-align: center; 
                    border-bottom: 2px solid #6366f1; 
                    padding-bottom: 15px; 
                    margin-bottom: 25px; 
                }}
                
                h1 {{ 
                    color: #4f46e5; 
                    font-size: 20pt; 
                    margin: 0 0 5px 0;
                    font-weight: 600;
                }}
                
                .contact-info {{
                    font-size: 10pt;
                    color: #6b7280;
                    margin-top: 8px;
                }}
                
                .recipient {{ 
                    margin: 25px 0;
                    padding: 15px;
                    background-color: #f9fafb;
                    border-radius: 8px;
                    border-left: 4px solid #6366f1;
                }}
                
                .recipient strong {{
                    color: #1f2937;
                }}
                
                .recipient .company {{
                    font-size: 14pt;
                    font-weight: 600;
                    color: #4f46e5;
                    margin-bottom: 5px;
                }}
                
                .content {{ 
                    text-align: justify;
                    margin-top: 20px;
                }}
                
                .content p {{
                    margin-bottom: 12px;
                }}
                
                .footer {{ 
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 9pt;
                    color: #9ca3af;
                }}
                
                .score-badge {{
                    text-align: right;
                    margin-bottom: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="score-badge">
                {score_badge}
            </div>
            
            <div class="header">
                <h1>{candidate.first_name} {candidate.last_name}</h1>
                <div class="contact-info">
                    📧 {candidate.email}
                    {f" • 📱 {candidate.phone}" if candidate.phone else ""}
                    <br/>
                    📍 {candidate.location}
                </div>
            </div>

            <div class="recipient">
                <div class="company">{offer.company}</div>
                <strong>Objet :</strong> Candidature au poste de <strong>{offer.title}</strong>
                {f"<br/><small>📍 {offer.location}</small>" if offer.location else ""}
            </div>

            <div class="content">
                {letter_html}
            </div>

            <div class="footer">
                Document généré par <strong>JobXpress</strong> - Assistant de Candidature IA
                <br/>
                <small>www.jobxpress.fr</small>
            </div>
        </body>
        </html>
        """


# Instance globale
pdf_generator = PDFGenerator()