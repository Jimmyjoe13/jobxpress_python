import httpx
from mistralai import Mistral
from core.config import settings
from core.logging_config import get_logger
from core.exceptions import OCRError, OCRTimeoutError

logger = get_logger()

class OCRService:
    def __init__(self):
        self.api_key = settings.MISTRAL_API_KEY
        self.client = None
        if self.api_key:
            self.client = Mistral(api_key=self.api_key)

    async def extract_text_from_cv(self, cv_url: str) -> str:
        """
        Télécharge le CV et utilise Mistral OCR pour extraire le texte.
        """
        if not self.client:
            logger.warning("⚠️ Clé API Mistral manquante. OCR ignoré.")
            return ""

        if not cv_url:
            return ""

        logger.info(f"👁️ Analyse OCR: {cv_url[:50]}...")

        try:
            # 1. Envoi de l'URL directement à Mistral OCR
            # Mistral OCR peut traiter des URLs publiques. Les URLs Tally sont signées et publiques.
            
            ocr_response = self.client.ocr.process(
                model="mistral-ocr-latest",
                document={
                    "type": "document_url",
                    "document_url": cv_url
                }
            )
            
            # 2. Extraction du texte (Markdown)
            full_text = ""
            for page in ocr_response.pages:
                full_text += page.markdown + "\n\n"
            
            logger.info(f"✅ OCR terminé: {len(full_text)} caractères")
            return full_text

        except TimeoutError as e:
            logger.error(f"❌ Timeout OCR Mistral")
            return ""  # Graceful degradation
        except Exception as e:
            logger.exception(f"❌ Erreur OCR Mistral: {e}")
            return ""  # Graceful degradation - ne pas bloquer le pipeline

ocr_service = OCRService()