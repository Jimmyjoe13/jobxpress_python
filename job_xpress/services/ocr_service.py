from mistralai.client import Mistral
from core.config import settings
from core.logging_config import get_logger

logger = get_logger()

# Mots-clés pour détecter un CV valide
CV_KEYWORDS = [
    "expérience",
    "experience",
    "formation",
    "compétences",
    "competences",
    "diplôme",
    "diplome",
    "poste",
    "emploi",
    "mission",
    "stage",
    "stages",
    "projets",
    "professionnel",
    "professionnelle",
    "curriculum",
    "cv",
]

# Mots-clés indiquant un document NON-CV
NON_CV_KEYWORDS = [
    "facture",
    "invoice",
    "reçu",
    "receipt",
    "paiement",
    "payment",
    "commande",
    "order",
    "total",
    "€",
    "montant",
    "ttc",
    "tva",
]


class OCRService:
    def __init__(self):
        self.api_key = settings.MISTRAL_API_KEY
        self.client = None
        if self.api_key:
            self.client = Mistral(api_key=self.api_key)

    def _is_valid_cv(self, text: str) -> bool:
        """
        Vérifie si le texte extrait ressemble à un CV.
        Retourne False si c'est un reçu, une facture, etc.
        """
        if not text or len(text) < 100:
            return False

        text_lower = text.lower()

        # Compter les mots-clés CV vs non-CV
        cv_count = sum(1 for kw in CV_KEYWORDS if kw in text_lower)
        non_cv_count = sum(1 for kw in NON_CV_KEYWORDS if kw in text_lower)

        # Si plus de mots-clés non-CV que CV, ce n'est probablement pas un CV
        if non_cv_count > cv_count:
            return False

        # Si aucun mot-clé CV trouvé, ce n'est probablement pas un CV
        if cv_count == 0:
            return False

        return True

    async def extract_text_from_cv(self, cv_url: str) -> str:
        """
        Télécharge le CV et utilise Mistral OCR pour extraire le texte.
        Ignore les documents qui ne sont pas des CV (reçus, factures, etc.)
        """
        if not self.client:
            logger.warning("⚠️ Clé API Mistral manquante. OCR ignoré.")
            return ""

        if not cv_url:
            return ""

        logger.info(f"👁️ Analyse OCR: {cv_url[:50]}...")

        try:
            # 1. Envoi de l'URL directement à Mistral OCR
            ocr_response = self.client.ocr.process(
                model="mistral-ocr-latest",
                document={"type": "document_url", "document_url": cv_url},
            )

            # 2. Extraction du texte (Markdown)
            full_text = ""
            for page in ocr_response.pages:
                full_text += page.markdown + "\n\n"

            # 3. Validation du document
            if not self._is_valid_cv(full_text):
                logger.warning(
                    "⚠️ Document non reconnu comme CV (reçu/facture ?). Ignoré."
                )
                return ""

            logger.info(f"✅ OCR terminé: {len(full_text)} caractères")
            return full_text

        except TimeoutError:
            logger.error("❌ Timeout OCR Mistral")
            return ""  # Graceful degradation
        except Exception as e:
            logger.exception(f"❌ Erreur OCR Mistral: {e}")
            return ""  # Graceful degradation - ne pas bloquer le pipeline


ocr_service = OCRService()
