import httpx
import asyncio
import trafilatura
from typing import List, Any
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

# --- 1. CONFIGURATION ---

JSEARCH_TYPES_MAP = {
    "CDI": "FULLTIME", "CDD": "CONTRACT", "Stage": "INTERN", "Alternance": "INTERN", "Freelance": "CONTRACT"
}

JOB_SYNONYMS_LIST = {
    "growth hacker": ["Growth Hacker", "Growth Marketer", "Traffic Manager", "Responsable Acquisition"],
    "business developer": ["Business Developer", "BizDev", "Sales Manager", "Account Manager"],
    "développeur": ["Développeur", "Developer", "Software Engineer", "Backend", "Fullstack"],
    "data analyst": ["Data Analyst", "Data Scientist", "Business Analyst"],
    "chef de projet": ["Chef de projet", "Project Manager", "Product Owner"],
    "commercial": ["Commercial", "Vendeur", "Sales Representative"],
}

class SearchEngine:
    URL_JSEARCH = "https://jsearch.p.rapidapi.com/search"
    URL_ACTIVE_JOBS = "https://active-jobs-db.p.rapidapi.com/active-ats-7d"

    def __init__(self):
        self.headers_jsearch = {
            "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
        self.headers_active_jobs = {
            "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "active-jobs-db.p.rapidapi.com"
        }

    async def find_jobs(self, candidate: CandidateProfile, limit: int = 10) -> List[JobOffer]:
        print(f"🔎 Recherche stricte : {candidate.job_title} ({candidate.contract_type}) - {candidate.work_type}")

        # --- LANCEMENT PARALLÈLE ---
        task_jsearch = self._search_jsearch_strategy(candidate)
        task_active_jobs = self._search_active_jobs_db(candidate)

        results = await asyncio.gather(task_jsearch, task_active_jobs)
        
        jobs_jsearch = results[0]
        jobs_active = results[1]
        
        print(f"   📊 Bilan : {len(jobs_jsearch)} via JSearch | {len(jobs_active)} via Active Jobs")

        # --- FUSION ---
        all_jobs = jobs_jsearch + jobs_active
        unique_jobs = []
        seen_urls = set()
        
        for job in all_jobs:
            if job.url and job.url not in seen_urls:
                unique_jobs.append(job)
                seen_urls.add(job.url)
        
        print(f"   ✨ Total unique avant filtrage : {len(unique_jobs)}")

        # --- DEEP FETCHING ---
        if unique_jobs:
            print(f"   ⬇️ Deep Fetching : Extraction contenu pour {len(unique_jobs)} offres...")
            unique_jobs = await self._enrich_jobs_with_full_content(unique_jobs)

        return unique_jobs

    # ==========================================
    # STRATÉGIE JSEARCH (DURCIE)
    # ==========================================
    async def _search_jsearch_strategy(self, candidate: CandidateProfile) -> List[JobOffer]:
        # 1. Gestion des Synonymes
        base_title = candidate.job_title.lower()
        keywords = [candidate.job_title]
        for key, synonyms in JOB_SYNONYMS_LIST.items():
            if key in base_title:
                keywords = synonyms
                break
        
        or_group = " OR ".join([f'"{k}"' for k in keywords])
        
        # 2. FILTRAGE STRICT (Alternance vs Stage)
        # On injecte les termes obligatoires dans la requête texte
        contract_keywords = ""
        if candidate.contract_type == "Alternance":
            contract_keywords = '("Alternance" OR "Apprentissage" OR "Contrat de professionnalisation")'
        elif candidate.contract_type == "Stage":
            contract_keywords = '("Stage" OR "Internship")'
        
        # 3. Exclusions
        negatives = ""
        if candidate.contract_type == "CDI": negatives = "-stage -alternance -freelance -apprenticeship"
        if candidate.contract_type == "Alternance": negatives = "-stage -cdi -freelance"

        # 4. Construction de la Requête Experte
        # Ex: (Growth Hacker OR ...) (Alternance OR ...) Marseille -stage
        query_expert = f"({or_group}) {contract_keywords} {candidate.location} {negatives}".strip()
        
        # 5. Paramètres API de base
        base_params = {
            "query": query_expert,
            "page": "1", "num_pages": "1", "country": "fr"
        }
        
        # --- APPLICATION DES FILTRES TECHNIQUES ---
        
        # A. Filtre Remote (JSearch a un paramètre dédié)
        if candidate.work_type == "Full Remote":
            base_params["remote_jobs_only"] = "true"
            print("   👉 JSearch : Filtre Remote Only ACTIVÉ")

        # B. Filtre Type de Contrat
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        
        print(f"   🔎 JSearch Query : {query_expert}")
        
        jobs = []
        
        # TENTATIVE 1 : Expert + Filtre Technique (Le top du top)
        if jsearch_type:
            params = base_params.copy()
            params["job_type"] = jsearch_type
            jobs = await self._call_jsearch_api(params)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 1 (Strict)")

        # TENTATIVE 2 : Expert Large (Si le filtre technique bug, on fait confiance aux mots-clés)
        if not jobs:
            print("      ⚠️ JSearch Strict vide -> Tentative Large (Mots-clés seuls)...")
            # On garde remote_jobs_only s'il est actif, mais on enlève job_type
            jobs = await self._call_jsearch_api(base_params)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 2 (Large)")

        # TENTATIVE 3 : SAUVETAGE (Query Simple + Mots clés Contrat)
        if not jobs:
            print("      ⚠️ JSearch Large vide -> Tentative Sauvetage...")
            simple_query = f"{candidate.job_title} {contract_keywords} {candidate.location}"
            params_simple = base_params.copy()
            params_simple["query"] = simple_query
            jobs = await self._call_jsearch_api(params_simple)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 3 (Simple)")
            else: print("      ❌ Échec total JSearch.")
            
        return jobs

    async def _call_jsearch_api(self, params: dict) -> List[JobOffer]:
        if not settings.RAPIDAPI_KEY: return self._get_mock_jobs()
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(self.URL_JSEARCH, headers=self.headers_jsearch, params=params, timeout=20.0)
                if resp.status_code != 200: return []
                return self._parse_jsearch_results(resp.json().get("data", []))
            except Exception: return []

    def _parse_jsearch_results(self, raw_jobs: List[Any]) -> List[JobOffer]:
        clean = []
        for item in raw_jobs:
            if not isinstance(item, dict): continue
            clean.append(JobOffer(
                title=item.get("job_title", "Sans titre"),
                company=item.get("employer_name", "Entreprise inconnue"),
                location=item.get('job_city', 'France'),
                description=item.get("job_description", "")[:1000],
                url=item.get("job_apply_link") or item.get("job_google_link") or "#",
                contract_type=item.get("job_employment_type"),
                is_remote=item.get("job_is_remote") is True
            ))
        return clean

    # ==========================================
    # STRATÉGIE ACTIVE JOBS
    # ==========================================
    async def _search_active_jobs_db(self, candidate: CandidateProfile) -> List[JobOffer]:
        if not settings.RAPIDAPI_KEY: return []

        titles_to_try = [candidate.job_title]
        
        # Si Alternance, on combine le titre avec le mot clé pour filtrer dès la recherche
        if candidate.contract_type == "Alternance":
            titles_to_try = [f"{candidate.job_title} Alternance", f"{candidate.job_title} Apprentissage"]
        elif candidate.contract_type == "Stage":
            titles_to_try = [f"{candidate.job_title} Stage"]

        # Gestion du filtre Location pour le Remote (Active Jobs n'a pas de booléen)
        loc_filter = candidate.location
        if candidate.work_type == "Full Remote":
            loc_filter = "Remote" 

        print(f"   🔎 Active Jobs : Test {titles_to_try} à {loc_filter}...")
        
        all_found_jobs = []
        
        for title in titles_to_try:
            params = {
                "title_filter": title,
                "location_filter": loc_filter,
                "limit": "10",
                "offset": "0"
            }
            
            async with httpx.AsyncClient() as client:
                try:
                    resp = await client.get(self.URL_ACTIVE_JOBS, headers=self.headers_active_jobs, params=params, timeout=10.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_list = data if isinstance(data, list) else data.get("jobs", [])
                        parsed = self._parse_active_jobs_results(raw_list)
                        if parsed:
                            print(f"      ✅ Active Jobs : {len(parsed)} offres pour '{title}'")
                            all_found_jobs.extend(parsed)
                except Exception: pass

            if len(all_found_jobs) > 0:
                break
            
        return all_found_jobs

    def _parse_active_jobs_results(self, raw_jobs: List[dict]) -> List[JobOffer]:
        clean = []
        for item in raw_jobs:
            url = item.get("url") or item.get("application_url")
            if url:
                clean.append(JobOffer(
                    title=item.get("title", "Sans titre"),
                    company=item.get("organization_name") or item.get("company_name") or "Inconnu",
                    location=item.get("location") or "France",
                    description=(item.get("description") or "")[:1000],
                    url=url,
                    contract_type="Non spécifié"
                ))
        return clean

    # ==========================================
    # DEEP FETCHING
    # ==========================================
    async def _enrich_jobs_with_full_content(self, offers: List[JobOffer]) -> List[JobOffer]:
        tasks = [self._fetch_single_url(offer) for offer in offers]
        return await asyncio.gather(*tasks)

    async def _fetch_single_url(self, offer: JobOffer) -> JobOffer:
        if not offer.url or not offer.url.startswith("http"): return offer
        try:
            downloaded = await asyncio.to_thread(trafilatura.fetch_url, offer.url)
            if downloaded:
                full_text = await asyncio.to_thread(trafilatura.extract, downloaded)
                if full_text and len(full_text) > 200:
                    offer.description = full_text[:5000]
        except Exception: pass
        return offer

    def _get_mock_jobs(self) -> List[JobOffer]:
        return [JobOffer(title="Mock Job", company="Mock Corp", location="Paris", description="Test", url="http://test.com")]

search_engine = SearchEngine()