import httpx
import json
from typing import List, Any
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

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
        query = f"{candidate.job_title} {candidate.location}"
        print(f"🔎 Query JSearch : '{query}'")

        # --- MODIFICATION ICI : Paramètres beaucoup plus larges ---
        base_params = {
            "query": query,
            "page": "1",
            "num_pages": "1", 
            # "date_posted": "month",  <-- SUPPRIMÉ (Trop restrictif)
            "country": "fr",
            # "language": "fr"         <-- SUPPRIMÉ (Growth Hacker est souvent en anglais)
        }

        # Tentative 1 : Stricte (avec type de contrat)
        jobs = []
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        
        if jsearch_type:
            print(f"   👉 Tentative 1 (Stricte) : Filtre type = {jsearch_type}")
            params_strict = base_params.copy()
            params_strict["job_type"] = jsearch_type
            jobs = await self._execute_search(params_strict)

        # Tentative 2 : Large (sans type de contrat)
        if not jobs:
            print(f"   ⚠️ 0 résultat strict. Tentative 2 (Large) : Sans filtre de contrat...")
            jobs = await self._execute_search(base_params)
            
        return jobs

    async def _execute_search(self, params: dict) -> List[JobOffer]:
        if not settings.RAPIDAPI_KEY:
            print("⚠️  Pas de clé API. Mode MOCK.")
            return self._get_mock_jobs()

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.BASE_URL, headers=self.headers, params=params, timeout=30.0)
                
                if response.status_code == 429:
                    print("❌ Quota RapidAPI dépassé ! (Erreur 429)")
                    return []
                
                response.raise_for_status()
                data = response.json()
                
                raw_list = data.get("data", [])
                
                # --- DEBUG DE L'EXTRÊME ---
                # Si la liste est vide, on veut savoir pourquoi !
                if not raw_list:
                    print(f"   ❓ API JSearch a répondu 200 OK mais liste vide.")
                    # Décommente la ligne suivante si tu veux voir TOUT le JSON (attention c'est gros)
                    # print(f"   🔍 Réponse brute : {json.dumps(data)[:500]}...") 
                else:
                    print(f"   ✅ API a renvoyé {len(raw_list)} items bruts.")

                return self._parse_results(raw_list)

            except Exception as e:
                print(f"❌ Erreur appel JSearch : {str(e)}")
                return []

    def _parse_results(self, raw_jobs: List[Any]) -> List[JobOffer]:
        clean_offers = []
        if not raw_jobs:
            return []
            
        for item in raw_jobs:
            # Sécurité : parfois item est None ou mal formé
            if not isinstance(item, dict): continue
            
            description = (item.get("job_description") or "").lower()
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