import httpx
from typing import List
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

# Mapping simplifié pour aider le filtre technique (sans polluer la barre de recherche)
JSEARCH_TYPES_MAP = {
    "CDI": "FULLTIME",
    "CDD": "CONTRACT",
    "Stage": "INTERN",
    "Alternance": "INTERN",
    "Freelance": "CONTRACT"
}

class SearchEngine:
    BASE_URL = "https://jsearch.p.rapidapi.com/search"
    
    def __init__(self):
        self.headers = {
            "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }

    async def find_jobs(self, candidate: CandidateProfile, limit: int = 10) -> List[JobOffer]:
        
        # --- 1. Construction de la requête SIMPLIFIÉE ---
        # On imite une recherche naturelle : "Quoi Où"
        # Ex: "Growth Hacker Marseille"
        query = f"{candidate.job_title} {candidate.location}"
        
        print(f"🔎 Query JSearch (Simple) : '{query}'")

        # --- 2. Paramètres API ---
        params = {
            "query": query,
            "page": "1",
            "num_pages": "1", 
            "date_posted": "month",  # On garde un spectre large
            "country": "fr",
            "language": "fr"
        }

        # On ajoute le filtre technique de contrat si disponible
        # (C'est mieux que de l'écrire dans la requête)
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        if jsearch_type:
            params["job_type"] = jsearch_type
            print(f"   👉 Filtre type : {jsearch_type}")

        # --- 3. Appel API ---
        if not settings.RAPIDAPI_KEY:
            print("⚠️  Pas de clé API. Mode MOCK.")
            return self._get_mock_jobs()

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.BASE_URL, headers=self.headers, params=params, timeout=15.0)
                
                if response.status_code == 429:
                    print("❌ Quota RapidAPI dépassé !")
                    return []
                
                response.raise_for_status()
                data = response.json()
                
                # print(f"DEBUG RAW: {data}") # Décommenter si toujours 0 résultats
                
                return self._parse_results(data.get("data", []))
            except Exception as e:
                print(f"❌ Erreur JSearch : {str(e)}")
                return []

    def _parse_results(self, raw_jobs: List[dict]) -> List[JobOffer]:
        clean_offers = []
        if not raw_jobs:
            return []
            
        for item in raw_jobs:
            description = (item.get("job_description") or "").lower()
            
            # Détection du remote
            is_remote = item.get("job_is_remote") is True or \
                        "télétravail" in description or \
                        "remote" in (item.get("job_title") or "").lower()

            offer = JobOffer(
                title=item.get("job_title", "Sans titre"),
                company=item.get("employer_name", "Entreprise inconnue"),
                location=f"{item.get('job_city', '')}".strip(),
                description=item.get("job_description", "")[:1000], 
                url=item.get("job_apply_link") or item.get("job_google_link") or "#",
                date_posted=item.get("job_posted_at_datetime_utc"),
                contract_type=item.get("job_employment_type"),
                is_remote=is_remote
            )
            clean_offers.append(offer)
        
        return clean_offers

    def _get_mock_jobs(self) -> List[JobOffer]:
        return [
            JobOffer(
                title="Growth Hacker (Mock)",
                company="Startup Test",
                location="Marseille",
                description="Ceci est une fausse offre pour tester...",
                url="http://google.com",
                contract_type="CDI"
            )
        ]

search_engine = SearchEngine()