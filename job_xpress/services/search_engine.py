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

# LISTE ULTRA-ÉTENDUE DE SYNONYMES (Français/Anglais + Abréviations)
JOB_SYNONYMS_LIST = {
    "growth hacker": [
        "Growth Hacker", "Growth Marketer", "Traffic Manager", "Responsable Acquisition", 
        "Head of Growth", "Digital Marketer", "Chargé de marketing digital", "SEO Manager", 
        "Acquisition Specialist", "Demand Generation Manager", "Inbound Marketer"
    ],
    "business developer": [
        "Business Developer", "BizDev", "Sales Manager", "Account Manager", 
        "Chargé d'affaires", "Ingénieur commercial", "Commercial B2B", 
        "Sales Development Representative", "SDR", "Business Development Representative", "BDR",
        "Responsable commercial", "Technico-commercial", "Inside Sales", "Key Account Manager", "KAM"
    ],
    "développeur": [
        "Développeur", "Developer", "Software Engineer", "Backend Developer", 
        "Frontend Developer", "Fullstack Developer", "Ingénieur d'études", 
        "Programmer", "Tech Lead", "DevOps", "Architecte Web", "Lead Developer"
    ],
    "data analyst": [
        "Data Analyst", "Data Scientist", "Business Analyst", "Data Engineer", 
        "Consultant Data", "Analytics Manager", "BI Analyst", "Machine Learning Engineer",
        "Data Manager", "Chief Data Officer"
    ],
    "chef de projet": [
        "Chef de projet", "Project Manager", "Product Owner", "Product Manager", 
        "Scrum Master", "Consultant fonctionnel", "Chargé de mission", "Program Manager", 
        "Delivery Manager", "Chef de projet digital", "Chef de projet MOA"
    ],
    "commercial": [
        "Commercial", "Vendeur", "Sales Representative", "Négociateur", 
        "Conseiller commercial", "Attaché commercial", "Directeur de clientèle",
        "Responsable des ventes", "Agent commercial", "Sales Executive"
    ],
    "marketing": [
        "Assistant Marketing", "Chargé de marketing", "Chef de produit", 
        "Brand Manager", "Responsable Marketing", "Communication Officer",
        "Social Media Manager", "Community Manager", "Content Manager", "Marketing Manager"
    ],
    "rh": [
        "Chargé de recrutement", "Talent Acquisition", "Assistant RH", 
        "Ressources Humaines", "HR Manager", "Gestionnaire Paie", 
        "Recruteur", "HRBP", "Responsable RH", "Directeur des Ressources Humaines"
    ],
    "assistant": [
        "Assistant", "Office Manager", "Secrétaire", "Assistant de direction",
        "Assistant administratif", "Assistant polyvalent", "Clerc", "Assistant de gestion"
    ],
    "finance": [
        "Contrôleur de gestion", "Comptable", "Auditeur", "Directeur Financier",
        "DAF", "Trésorier", "Analyste financier", "Comptable fournisseurs", "Comptable clients"
    ],
    "communication": [
        "Chargé de communication", "Responsable communication", "Attaché de presse",
        "Directeur de la communication", "Chargé de relations publiques"
    ]
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
        print(f"🔎 Recherche élargie (V3 - Tous Métiers) : {candidate.job_title} ({candidate.contract_type}) à {candidate.location}")

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
            # On limite le deep fetching à 25 pour être large mais performant
            jobs_to_fetch = unique_jobs[:25]
            print(f"   ⬇️ Deep Fetching : Extraction contenu pour {len(jobs_to_fetch)} offres...")
            unique_jobs = await self._enrich_jobs_with_full_content(jobs_to_fetch)

        return unique_jobs

    # ==========================================
    # STRATÉGIE JSEARCH (VOLUME MAXIMISÉ)
    # ==========================================
    async def _search_jsearch_strategy(self, candidate: CandidateProfile) -> List[JobOffer]:
        # 1. Synonymes Intelligents
        base_title = candidate.job_title.lower()
        keywords = [candidate.job_title]
        
        # On cherche la catégorie la plus proche
        for key, synonyms in JOB_SYNONYMS_LIST.items():
            if key in base_title:
                keywords = synonyms
                break
        
        # Construction du groupe OR
        or_group = " OR ".join([f'"{k}"' for k in keywords])
        
        # 2. Mots-clés Contrat
        contract_keywords = ""
        if candidate.contract_type == "Alternance":
            contract_keywords = '("Alternance" OR "Apprentissage" OR "Contrat Pro" OR "Professionalisation")'
        elif candidate.contract_type == "Stage":
            contract_keywords = '("Stage" OR "Internship" OR "Stagiaire")'
        
        # 3. Requête Experte
        query_expert = f"({or_group}) {contract_keywords} {candidate.location}".strip()
        
        # 4. Paramètres (Volume : 2 pages)
        base_params = {
            "query": query_expert,
            "page": "1", 
            "num_pages": "2",
            "country": "fr"
        }
        
        if candidate.work_type == "Full Remote":
            base_params["remote_jobs_only"] = "true"

        print(f"   🔎 JSearch Query Expert : {query_expert}")
        
        jobs = []
        
        # TENTATIVE 1 : Expert + Filtre Technique
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        if jsearch_type:
            params = base_params.copy()
            params["job_type"] = jsearch_type
            jobs = await self._call_jsearch_api(params)
            if jobs: print(f"      ✅ JSearch : {len(jobs)} offres (Strict)")

        # TENTATIVE 2 : Expert Large (Si < 5 offres)
        if len(jobs) < 5:
            print("      ⚠️ Peu de résultats -> Tentative Large (Mots-clés seuls)...")
            jobs_large = await self._call_jsearch_api(base_params)
            
            # Fusion intelligente
            existing_urls = {j.url for j in jobs}
            for j in jobs_large:
                if j.url not in existing_urls:
                    jobs.append(j)
            print(f"      ✅ JSearch : Total {len(jobs)} offres après élargissement")

        # TENTATIVE 3 : SAUVETAGE (Simple)
        if not jobs:
            print("      ⚠️ Toujours vide -> Tentative Sauvetage (Simple)...")
            simple_query = f"{candidate.job_title} {candidate.location}"
            params_simple = base_params.copy()
            params_simple["query"] = simple_query
            params_simple["num_pages"] = "2"
            
            jobs = await self._call_jsearch_api(params_simple)
            if jobs: print(f"      ✅ JSearch : {len(jobs)} offres (Sauvetage)")
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
    # STRATÉGIE ACTIVE JOBS (OPTIMISÉE)
    # ==========================================
    async def _search_active_jobs_db(self, candidate: CandidateProfile) -> List[JobOffer]:
        if not settings.RAPIDAPI_KEY: return []

        base_title = candidate.job_title.lower()
        titles_to_try = [candidate.job_title]
        
        # Ajout des synonymes pertinents (Max 3 pour Active Jobs)
        for key, synonyms in JOB_SYNONYMS_LIST.items():
            if key in base_title:
                for syn in synonyms: 
                    if syn.lower() != base_title and syn not in titles_to_try:
                        titles_to_try.append(syn)
                break
        
        # On limite à 4 titres à tester max
        titles_to_try = titles_to_try[:4]

        # Combinaison Contrat
        final_titles = []
        if candidate.contract_type == "Alternance":
            for t in titles_to_try:
                final_titles.append(f"{t} Alternance")
                # On ne garde pas le titre nu ici pour éviter trop de bruit non-alternance sur Active Jobs
        else:
            final_titles = titles_to_try

        loc_filter = "Remote" if candidate.work_type == "Full Remote" else candidate.location
        print(f"   🔎 Active Jobs : Test {final_titles} à {loc_filter}...")
        
        all_found = []
        for title in final_titles:
            params = {
                "title_filter": title,
                "location_filter": loc_filter,
                "limit": "10", "offset": "0"
            }
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(self.URL_ACTIVE_JOBS, headers=self.headers_active_jobs, params=params, timeout=10.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_list = data if isinstance(data, list) else data.get("jobs", [])
                        if raw_list:
                            all_found.extend(self._parse_active_jobs_results(raw_list))
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