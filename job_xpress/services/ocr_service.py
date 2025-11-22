import httpx
from mistralai import Mistral
from core.config import settings

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
            print("⚠️ Clé API Mistral manquante. OCR ignoré.")
            return ""

        if not cv_url:
            return ""

        print(f"👁️ Analyse OCR en cours pour : {cv_url}")

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
            
            print(f"✅ OCR Terminé ({len(full_text)} caractères extraits)")
            return full_text

        except Exception as e:
            print(f"❌ Erreur OCR Mistral : {e}")
            return ""

ocr_service = OCRService()