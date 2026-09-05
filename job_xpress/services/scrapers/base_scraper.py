"""
Base Scraper pour les Reverse APIs de jobboards.
Fournit le client HTTP commun, la détection des cabinets de recrutement
et l'extraction regex des contacts directs.
"""

import re
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx
from models.job_offer_v2 import JobOffer

logger = logging.getLogger("jobxpress.scrapers")

KNOWN_RECRUITMENT_AGENCIES = [
    "michael page", "page personnel", "hays", "robert half", "expectra",
    "randstad", "adecco", "manpower", "fed it", "fed", "walters people",
    "spring", "badenoch", "groupe adéquat", "synergie", "proman", "crit",
    "sii", "alten", "altran", "capgemini", "sopra steria", "cgi", "atos",
    "devoteam", "ausy", "akkodis", "modis", "amaris", "infeeny", "aubay",
    "extia", "open", "sword", "consort", "gfi", "inetum"
]

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}')

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)

class BaseJobScraper(ABC):
    """Classe de base pour tous les connecteurs Reverse API."""

    name: str = "base"

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        }

    def detect_agency(self, company_name: str, description: str = "") -> bool:
        """Détecte si l'entreprise est une ESN ou un cabinet de recrutement."""
        name_lower = (company_name or "").lower()
        desc_lower = (description or "").lower()[:500]

        for agency in KNOWN_RECRUITMENT_AGENCIES:
            if agency in name_lower:
                return True

        agency_keywords = ["cabinet de recrutement", "chasseur de têtes", "esn", "société de conseil en technologies"]
        for kw in agency_keywords:
            if kw in desc_lower:
                return True

        return False

    def extract_contacts(self, text: str) -> Dict[str, Optional[str]]:
        """Extrait les emails et numéros de téléphone directs dans le texte de l'offre."""
        if not text:
            return {"email": None, "phone": None}

        emails = EMAIL_REGEX.findall(text)
        phones = PHONE_REGEX.findall(text)

        # Filtrer les faux positifs courants (ex: pas d'images ou formats)
        valid_email = None
        for e in emails:
            if not any(e.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif"]):
                valid_email = e
                break

        return {
            "email": valid_email,
            "phone": phones[0].strip() if phones else None
        }

    @abstractmethod
    async def search(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        limit: int = 15
    ) -> List[JobOffer]:
        """Recherche des offres d'emploi via l'API cible."""
        pass