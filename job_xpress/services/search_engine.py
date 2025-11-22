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
        print(f"🔎 Recherche élargie : {candidate.job_title} ({candidate.contract_type}) à {candidate.location}")

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
        
        print(f"   ✨ Total unique avant filtrage IA : {len(unique_jobs)}")

        # --- DEEP FETCHING ---
        if unique_jobs:
            print(f"   ⬇️ Deep Fetching : Extraction contenu pour {len(unique_jobs)} offres...")
            unique_jobs = await self._enrich_jobs_with_full_content(unique_jobs)

        return unique_jobs

    # ==========================================
    # STRATÉGIE JSEARCH (ASSOUPLIE)
    # ==========================================
    async def _search_jsearch_strategy(self, candidate: CandidateProfile) -> List[JobOffer]:
        # 1. Synonymes
        base_title = candidate.job_title.lower()
        keywords = [candidate.job_title]
        for key, synonyms in JOB_SYNONYMS_LIST.items():
            if key in base_title:
                keywords = synonyms
                break
        
        or_group = " OR ".join([f'"{k}"' for k in keywords])
        
        # 2. Mots-clés Contrat (Positifs uniquement)
        contract_keywords = ""
        if candidate.contract_type == "Alternance":
            contract_keywords = '("Alternance" OR "Apprentissage" OR "Contrat Pro")'
        elif candidate.contract_type == "Stage":
            contract_keywords = '("Stage" OR "Internship")'
        
        # 3. Suppression des NEGATIVES (-stage -cdi...)
        # C'est ici qu'on assouplit : on ne bannit plus rien, on filtre juste positivement.
        
        # 4. Requête Experte (Synonymes + Contrat + Lieu)
        query_expert = f"({or_group}) {contract_keywords} {candidate.location}".strip()
        
        # 5. Paramètres Base
        base_params = {
            "query": query_expert,
            "page": "1", "num_pages": "1", "country": "fr"
        }
        
        if candidate.work_type == "Full Remote":
            base_params["remote_jobs_only"] = "true"

        print(f"   🔎 JSearch Query Expert : {query_expert}")
        
        jobs = []
        
        # TENTATIVE 1 : Expert + Filtre Technique JSearch
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        if jsearch_type:
            params = base_params.copy()
            params["job_type"] = jsearch_type
            jobs = await self._call_jsearch_api(params)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 1 (Strict + Filtre API)")

        # TENTATIVE 2 : Expert Large (Sans filtre technique API)
        if not jobs:
            print("      ⚠️ JSearch Strict vide -> Tentative Large (Mots-clés seuls)...")
            # On garde les mots clés "Alternance" dans le texte, mais on enlève le filtre technique strict
            jobs = await self._call_jsearch_api(base_params)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 2 (Large)")

        # TENTATIVE 3 : SAUVETAGE ULTIME (Titre + Ville uniquement)
        # Si on ne trouve rien avec "Alternance", on cherche tout le reste.
        # L'IA filtrera si c'est vraiment pas bon, mais au moins on aura des résultats.
        if not jobs:
            print("      ⚠️ JSearch Large vide -> Tentative Sauvetage (Open Bar)...")
            # On retire les mots clés de contrat
            simple_query = f"{candidate.job_title} {candidate.location}"
            params_simple = base_params.copy()
            params_simple["query"] = simple_query
            
            jobs = await self._call_jsearch_api(params_simple)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 3 (Sauvetage)")
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
    # STRATÉGIE ACTIVE JOBS (ASSOUPLIE)
    # ==========================================
    async def _search_active_jobs_db(self, candidate: CandidateProfile) -> List[JobOffer]:
        if not settings.RAPIDAPI_KEY: return []

        # On teste d'abord le titre précis, puis le titre générique
        titles_to_try = []
        
        # 1. Avec mention contrat (ex: "Growth Hacker Alternance")
        if candidate.contract_type == "Alternance":
            titles_to_try.append(f"{candidate.job_title} Alternance")
        
        # 2. Titre seul (ex: "Growth Hacker") - Plus large
        titles_to_try.append(candidate.job_title)

        loc_filter = candidate.location
        if candidate.work_type == "Full Remote":
            loc_filter = "Remote" 

        print(f"   🔎 Active Jobs : Test {titles_to_try} à {loc_filter}...")
        
        all_found = []
        for title in titles_to_try:
            params = {
                "title_filter": title,
                "location_filter": loc_filter,
                "limit": "10",
                "offset": "0"
            }
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(self.URL_ACTIVE_JOBS, headers=self.headers_active_jobs, params=params, timeout=10.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_list = data if isinstance(data, list) else data.get("jobs", [])
                        if raw_list:
                            all_found.extend(self._parse_active_jobs_results(raw_list))
                            # Si on trouve avec le titre précis, on peut s'arrêter (optionnel)
                            # break 
            except: pass
            
        return all_found

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
    # DEEP FETCHING (Commun)
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