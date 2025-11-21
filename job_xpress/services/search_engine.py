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
        print(f"🔎 Lancement de la recherche Multi-Sources...")

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
            # Normalisation URL
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
    # STRATÉGIE JSEARCH (CASCADE 3 NIVEAUX)
    # ==========================================
    async def _search_jsearch_strategy(self, candidate: CandidateProfile) -> List[JobOffer]:
        """
        Niveau 1 : Expert + Filtre (Complex Query + Type de contrat)
        Niveau 2 : Expert Large (Complex Query seule)
        Niveau 3 : SAUVETAGE (Simple Query)
        """
        # 1. Construction des requêtes
        base_title = candidate.job_title.lower()
        keywords = [candidate.job_title]
        
        # Récupération des synonymes pour la requête complexe
        for key, synonyms in JOB_SYNONYMS_LIST.items():
            if key in base_title:
                keywords = synonyms
                break
        
        # Requête Complexe (A OR B)
        or_group = " OR ".join([f'"{k}"' for k in keywords])
        
        negatives = ""
        if candidate.contract_type == "CDI": 
            negatives = "-stage -alternance -freelance -apprenticeship"
        
        query_expert = f"({or_group}) {candidate.location} {negatives}".strip()
        
        # Requête Simple (Le filet de sécurité)
        query_simple = f"{candidate.job_title} {candidate.location}".strip()

        print(f"   🔎 JSearch Stratégie : Expert='{query_expert}' | Simple='{query_simple}'")
        
        # 2. Exécution en Cascade
        jobs = []
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        
        # TENTATIVE 1 : Expert + Filtre
        if jsearch_type:
            params = {"query": query_expert, "job_type": jsearch_type, "page": "1", "num_pages": "1", "country": "fr"}
            jobs = await self._call_jsearch_api(params)
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 1 (Expert + Filtre)")

        # TENTATIVE 2 : Expert Large
        if not jobs:
            print("      ⚠️ Tentative 1 échouée -> Tentative 2 (Expert Large)...")
            jobs = await self._call_jsearch_api({"query": query_expert, "page": "1", "num_pages": "1", "country": "fr"})
            if jobs: print(f"      ✅ JSearch : Trouvé avec Tentative 2 (Expert Large)")

        # TENTATIVE 3 : SAUVETAGE (Simple)
        if not jobs:
            print("      ⚠️ Tentative 2 échouée -> Tentative 3 (Sauvetage Simple)...")
            jobs = await self._call_jsearch_api({"query": query_simple, "page": "1", "num_pages": "1", "country": "fr"})
            if jobs: 
                print(f"      ✅ JSearch : Trouvé avec Tentative 3 (Simple)")
            else:
                print("      ❌ Échec total JSearch sur les 3 tentatives.")
            
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
    # STRATÉGIE ACTIVE JOBS (Boucle Améliorée)
    # ==========================================
    async def _search_active_jobs_db(self, candidate: CandidateProfile) -> List[JobOffer]:
        """
        Active Jobs : On teste le titre principal PUIS les synonymes un par un.
        """
        if not settings.RAPIDAPI_KEY: return []

        # 1. Liste des titres à tester
        base_title = candidate.job_title.lower()
        titles_to_check = [candidate.job_title] # Le titre original en premier

        # On ajoute TOUS les synonymes connus (jusqu'à 3 pour pas exploser le quota)
        for key, synonyms in JOB_SYNONYMS_LIST.items():
            if key in base_title:
                # On ajoute les synonymes qui sont différents du titre original
                for syn in synonyms:
                    if syn.lower() != base_title and syn not in titles_to_check:
                        titles_to_check.append(syn)
                break
        
        # On limite à 3 tentatives max pour la rapidité
        titles_to_check = titles_to_check[:3]
        print(f"   🔎 Active Jobs : Test des mots-clés {titles_to_check}...")
        
        all_found_jobs = []
        
        # 2. Boucle d'appels
        for title in titles_to_check:
            params = {
                "title_filter": title,
                "location_filter": candidate.location,
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