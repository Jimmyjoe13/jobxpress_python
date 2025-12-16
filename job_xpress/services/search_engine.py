import httpx
import asyncio
import trafilatura
import json
from pathlib import Path
from typing import List, Any
from core.config import settings
from core.logging_config import get_logger
from core.retry import resilient_get, CircuitBreaker
from core.exceptions import SearchError, SearchTimeoutError, SearchAPIError
from models.candidate import CandidateProfile, WorkType
from models.job_offer import JobOffer

# Logger structuré
logger = get_logger()

# Circuit breakers pour les APIs
jsearch_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=120)
active_jobs_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=120)

# --- 1. CONFIGURATION ---

JSEARCH_TYPES_MAP = {
    "CDI": "FULLTIME", "CDD": "CONTRACT", "Stage": "INTERN", "Alternance": "INTERN", "Freelance": "CONTRACT"
}


def _load_job_synonyms() -> dict:
    """
    Charge les synonymes de jobs depuis le fichier JSON externe.
    
    Permet de modifier les synonymes sans redéployer le code.
    Fallback sur un dictionnaire vide si le fichier n'existe pas.
    """
    synonyms_path = Path(__file__).parent.parent / "data" / "job_synonyms.json"
    
    if synonyms_path.exists():
        try:
            with open(synonyms_path, "r", encoding="utf-8") as f:
                synonyms = json.load(f)
                logger.info(f"📚 {len(synonyms)} catégories de synonymes chargées depuis {synonyms_path.name}")
                return synonyms
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"⚠️ Erreur chargement synonymes: {e}")
            return {}
    
    logger.warning(f"⚠️ Fichier synonymes non trouvé: {synonyms_path}")
    return {}


# Chargement des synonymes au démarrage du module
JOB_SYNONYMS_LIST = _load_job_synonyms()

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
        logger.info(f"🔎 Recherche: {candidate.job_title} ({candidate.contract_type}) à {candidate.location}")

        # --- LANCEMENT PARALLÈLE ---
        task_jsearch = self._search_jsearch_strategy(candidate)
        task_active_jobs = self._search_active_jobs_db(candidate)

        results = await asyncio.gather(task_jsearch, task_active_jobs)
        
        jobs_jsearch = results[0]
        jobs_active = results[1]
        
        logger.info(f"📊 Bilan: {len(jobs_jsearch)} JSearch | {len(jobs_active)} Active Jobs")

        # --- FUSION ---
        all_jobs = jobs_jsearch + jobs_active
        unique_jobs = []
        seen_urls = set()
        
        for job in all_jobs:
            if job.url and job.url not in seen_urls:
                unique_jobs.append(job)
                seen_urls.add(job.url)
        
        logger.info(f"✨ Total unique: {len(unique_jobs)}")

        # --- DEEP FETCHING ---
        if unique_jobs:
            # On limite le deep fetching à 25 pour être large mais performant
            jobs_to_fetch = unique_jobs[:25]
            logger.info(f"⬇️ Deep Fetching: {len(jobs_to_fetch)} offres")
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
        
        # Filtrage par type de travail (amélioré)
        match candidate.work_type:
            case WorkType.FULL_REMOTE:
                base_params["remote_jobs_only"] = "true"
            case WorkType.HYBRIDE:
                # Ajouter un mot-clé hybride à la requête
                query_expert += ' ("Hybride" OR "Hybrid" OR "Télétravail partiel")'
                base_params["query"] = query_expert
            case WorkType.PRESENTIEL:
                # Pas de filtre remote, mais on peut exclure les remote-only
                base_params["remote_jobs_only"] = "false"
            case WorkType.TOUS | _:
                # Aucun filtre = recherche tous les types
                pass

        logger.debug(f"JSearch Query: {query_expert}")
        
        jobs = []
        
        # TENTATIVE 1 : Expert + Filtre Technique
        jsearch_type = JSEARCH_TYPES_MAP.get(candidate.contract_type)
        if jsearch_type:
            params = base_params.copy()
            params["job_type"] = jsearch_type
            jobs = await self._call_jsearch_api(params)
            if jobs: logger.info(f"✅ JSearch: {len(jobs)} offres (Strict)")

        # TENTATIVE 2 : Expert Large (Si < 5 offres)
        if len(jobs) < 5:
            logger.info("⚠️ Peu de résultats -> Tentative Large")
            jobs_large = await self._call_jsearch_api(base_params)
            
            # Fusion intelligente
            existing_urls = {j.url for j in jobs}
            for j in jobs_large:
                if j.url not in existing_urls:
                    jobs.append(j)
            logger.info(f"✅ JSearch: Total {len(jobs)} offres (élargi)")

        # TENTATIVE 3 : SAUVETAGE (Simple)
        if not jobs:
            logger.warning("⚠️ JSearch vide -> Tentative Sauvetage")
            simple_query = f"{candidate.job_title} {candidate.location}"
            params_simple = base_params.copy()
            params_simple["query"] = simple_query
            params_simple["num_pages"] = "2"
            
            jobs = await self._call_jsearch_api(params_simple)
            if jobs: logger.info(f"✅ JSearch: {len(jobs)} offres (Sauvetage)")
            else: logger.error("❌ Échec total JSearch")
            
        return jobs

    async def _call_jsearch_api(self, params: dict) -> List[JobOffer]:
        if not settings.RAPIDAPI_KEY: 
            return self._get_mock_jobs()
        
        try:
            async with httpx.AsyncClient() as client:
                # Utilisation du retry pattern avec circuit breaker
                resp = await jsearch_circuit.call(
                    resilient_get,
                    client, 
                    self.URL_JSEARCH, 
                    headers=self.headers_jsearch, 
                    params=params, 
                    timeout=settings.REQUEST_TIMEOUT
                )
                return self._parse_jsearch_results(resp.json().get("data", []))
        except httpx.TimeoutException as e:
            logger.warning(f"JSearch timeout: {e}")
            return []  # Graceful degradation
        except httpx.HTTPStatusError as e:
            logger.warning(f"JSearch HTTP error: {e.response.status_code}")
            return []
        except Exception as e:
            logger.warning(f"JSearch API error: {e}")
            return []

    def _parse_jsearch_results(self, raw_jobs: List[Any]) -> List[JobOffer]:
        clean = []
        for item in raw_jobs:
            if not isinstance(item, dict): continue
            
            # Détection du work_type à partir des données
            is_remote = item.get("job_is_remote") is True
            description = (item.get("job_description") or "").lower()
            
            # Logique de détection du work_type
            if is_remote:
                work_type = "Full Remote"
            elif any(kw in description for kw in ["hybride", "hybrid", "télétravail partiel", "2 jours", "3 jours"]):
                work_type = "Hybride"
            else:
                work_type = "Présentiel"
            
            clean.append(JobOffer(
                title=item.get("job_title", "Sans titre"),
                company=item.get("employer_name", "Entreprise inconnue"),
                location=item.get('job_city', 'France'),
                description=item.get("job_description", "")[:1000],
                url=item.get("job_apply_link") or item.get("job_google_link") or "#",
                contract_type=item.get("job_employment_type"),
                is_remote=is_remote,
                work_type=work_type
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

        # Filtrage localisation selon le type de travail
        match candidate.work_type:
            case WorkType.FULL_REMOTE:
                loc_filter = "Remote"
            case WorkType.HYBRIDE:
                loc_filter = f"{candidate.location} Hybrid"
            case _:
                loc_filter = candidate.location
        logger.debug(f"Active Jobs: Test {final_titles} à {loc_filter}")
        
        all_found = []
        for title in final_titles:
            params = {
                "title_filter": title,
                "location_filter": loc_filter,
                "limit": "10", "offset": "0"
            }
            try:
                async with httpx.AsyncClient() as client:
                    resp = await active_jobs_circuit.call(
                        resilient_get,
                        client,
                        self.URL_ACTIVE_JOBS, 
                        headers=self.headers_active_jobs, 
                        params=params, 
                        timeout=settings.REQUEST_TIMEOUT
                    )
                    data = resp.json()
                    raw_list = data if isinstance(data, list) else data.get("jobs", [])
                    if raw_list:
                        all_found.extend(self._parse_active_jobs_results(raw_list))
            except httpx.TimeoutException:
                logger.debug(f"Active Jobs timeout for {title}")
            except httpx.HTTPStatusError as e:
                logger.debug(f"Active Jobs HTTP error for {title}: {e.response.status_code}")
            except Exception as e:
                logger.debug(f"Active Jobs query failed for {title}: {e}")
            
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