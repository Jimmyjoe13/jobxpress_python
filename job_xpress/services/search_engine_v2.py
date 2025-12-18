"""
SearchEngine V2 - Moteur de recherche multi-sources avec déduplication intelligente.

Sources supportées:
- JSearch (RapidAPI) - Google Jobs wrapper
- Active Jobs DB (RapidAPI)  
- SerpAPI (Google Jobs direct) - Plan gratuit: 100 req/mois

Fonctionnalités V2:
- Déduplication Fuzzy (Levenshtein > 90% + même entreprise)
- Filtres intelligents post-processing (anti-cabinet, cutoff date)
- Flags salary_warning et is_agency
"""

import httpx
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from slugify import slugify
from thefuzz import fuzz

from core.config import settings
from core.logging_config import get_logger
from core.retry import resilient_get, CircuitBreaker
from models.candidate import CandidateProfile, WorkType
from models.job_offer import JobOffer

logger = get_logger()

# Circuit breakers
serpapi_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=120)

# Patterns pour détection des cabinets de recrutement
AGENCY_PATTERNS = [
    "notre client",
    "pour le compte de",
    "notre partenaire",
    "cabinet de recrutement",
    "notre mandant",
    "client final",
    "nous recrutons pour",
    "pour l'un de nos clients",
    "notre client recherche",
    "nous recherchons pour notre client"
]


class SearchEngineV2:
    """
    Moteur de recherche multi-sources avec déduplication et filtres intelligents.
    
    Hérite des méthodes existantes de SearchEngine et ajoute:
    - Intégration SerpAPI (Google Jobs)
    - Déduplication Fuzzy cross-sources
    - Filtres post-processing avancés
    """
    
    URL_SERPAPI = "https://serpapi.com/search"
    
    def __init__(self, base_engine):
        """
        Args:
            base_engine: Instance de SearchEngine existante
        """
        self.base = base_engine
        self.serpapi_key = settings.SERPAPI_KEY
    
    async def find_jobs_v2(
        self, 
        candidate: CandidateProfile,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 25
    ) -> List[JobOffer]:
        """
        Recherche multi-sources avec déduplication intelligente.
        
        Args:
            candidate: Profil du candidat
            filters: Filtres optionnels (exclude_agencies, max_days_old, etc.)
            limit: Nombre max d'offres à retourner
            
        Returns:
            Liste d'offres uniques, filtrées et enrichies
        """
        filters = filters or {}
        logger.info(f"🔎 SearchV2: {candidate.job_title} à {candidate.location}")
        
        # 1. Lancement parallèle des sources
        source_tasks = [
            self.base._search_jsearch_strategy(candidate),
            self.base._search_active_jobs_db(candidate),
        ]
        
        # Ajouter SerpAPI si configuré
        if self.serpapi_key:
            source_tasks.append(self._search_serpapi(candidate))
        
        results = await asyncio.gather(*source_tasks, return_exceptions=True)
        
        # 2. Agrégation des résultats
        all_jobs = []
        source_names = ["jsearch", "active_jobs", "serpapi"]
        
        for i, result in enumerate(results):
            source = source_names[i] if i < len(source_names) else f"source_{i}"
            
            if isinstance(result, Exception):
                logger.warning(f"⚠️ {source} failed: {type(result).__name__}")
                continue
            
            # Marquer la source
            for job in result:
                if not job.source:
                    job.source = source
                all_jobs.append(job)
        
        logger.info(f"📊 Total brut: {len(all_jobs)} offres")
        
        if not all_jobs:
            logger.warning("❌ Aucune offre trouvée sur toutes les sources")
            return []
        
        # 3. Déduplication Fuzzy
        unique_jobs = self._deduplicate_fuzzy(all_jobs)
        logger.info(f"✨ Après déduplication: {len(unique_jobs)} offres")
        
        # 4. Filtres intelligents
        filtered_jobs = self._apply_smart_filters(unique_jobs, filters, candidate)
        logger.info(f"🔧 Après filtres: {len(filtered_jobs)} offres")
        
        # 5. Deep Fetching (limité)
        jobs_to_enrich = filtered_jobs[:limit]
        if jobs_to_enrich:
            logger.info(f"⬇️ Deep Fetching: {len(jobs_to_enrich)} offres")
            jobs_to_enrich = await self.base._enrich_jobs_with_full_content(jobs_to_enrich)
        
        return jobs_to_enrich
    
    async def _search_serpapi(self, candidate: CandidateProfile) -> List[JobOffer]:
        """
        Recherche via SerpAPI (Google Jobs).
        
        Plan gratuit: 100 recherches/mois.
        """
        if not self.serpapi_key:
            return []
        
        # Construction de la requête
        query = f"{candidate.job_title} {candidate.location}"
        
        # Ajout du type de contrat si pertinent
        if candidate.contract_type in ["Alternance", "Stage"]:
            query += f" {candidate.contract_type}"
        
        params = {
            "engine": "google_jobs",
            "q": query,
            "hl": "fr",
            "gl": "fr",
            "api_key": self.serpapi_key
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await serpapi_circuit.call(
                    resilient_get,
                    client,
                    self.URL_SERPAPI,
                    params=params,
                    timeout=15.0
                )
                resp.raise_for_status()
                data = resp.json()
                
                jobs = self._parse_serpapi_results(data.get("jobs_results", []))
                logger.info(f"✅ SerpAPI: {len(jobs)} offres trouvées")
                return jobs
                
        except httpx.TimeoutException:
            logger.warning("⚠️ SerpAPI timeout")
            return []
        except httpx.HTTPStatusError as e:
            logger.warning(f"⚠️ SerpAPI HTTP error: {e.response.status_code}")
            return []
        except Exception as e:
            logger.warning(f"⚠️ SerpAPI error: {e}")
            return []
    
    def _parse_serpapi_results(self, raw_jobs: List[dict]) -> List[JobOffer]:
        """Parse les résultats SerpAPI en JobOffer."""
        jobs = []
        
        for item in raw_jobs:
            try:
                # Extraction de la localisation
                location = item.get("location", "France")
                
                # Détection remote
                is_remote = False
                detected_extensions = item.get("detected_extensions", {})
                if detected_extensions.get("work_from_home"):
                    is_remote = True
                
                # Construction de la description
                description = item.get("description", "")
                highlights = item.get("job_highlights", [])
                for highlight in highlights:
                    items = highlight.get("items", [])
                    description += " " + " ".join(items)
                
                # Date de publication
                posted_at = item.get("detected_extensions", {}).get("posted_at", "")
                
                jobs.append(JobOffer(
                    title=item.get("title", "Sans titre"),
                    company=item.get("company_name", "Inconnu"),
                    location=location,
                    description=description[:2000],
                    url=item.get("apply_options", [{}])[0].get("link", "#") if item.get("apply_options") else "#",
                    date_posted=posted_at,
                    is_remote=is_remote,
                    work_type="Full Remote" if is_remote else None,
                    source="serpapi"
                ))
            except Exception as e:
                logger.debug(f"Erreur parsing SerpAPI job: {e}")
                continue
        
        return jobs
    
    def _deduplicate_fuzzy(self, jobs: List[JobOffer]) -> List[JobOffer]:
        """
        Déduplication intelligente cross-sources.
        
        Algorithme:
        1. Slugify le nom de l'entreprise
        2. Pour chaque paire avec même entreprise, calculer Levenshtein sur le titre
        3. Si similarité > 90%, garder l'offre avec la date la plus récente
        
        Complexité: O(n²) mais acceptable pour ~100 offres max.
        """
        if not jobs:
            return []
        
        unique: List[JobOffer] = []
        seen_keys: Dict[str, Tuple[int, Optional[datetime]]] = {}  # key -> (index, date)
        
        for job in jobs:
            company_slug = slugify(job.company or "unknown", lowercase=True)
            job_title_lower = job.title.lower().strip()
            
            # Chercher un doublon potentiel
            is_duplicate = False
            
            for key, (idx, existing_date) in list(seen_keys.items()):
                try:
                    existing_company_slug, existing_title = key.split("|", 1)
                except ValueError:
                    continue
                
                # Même entreprise?
                if company_slug != existing_company_slug:
                    continue
                
                # Similarité du titre?
                similarity = fuzz.ratio(job_title_lower, existing_title)
                
                if similarity > 90:
                    is_duplicate = True
                    
                    # Garder le plus récent
                    job_date = self._parse_date(job.date_posted)
                    if job_date and existing_date and job_date > existing_date:
                        # Remplacer par la version plus récente
                        unique[idx] = job
                        seen_keys[key] = (idx, job_date)
                        logger.debug(f"🔄 Doublon mis à jour: {job.title} ({job.source})")
                    
                    break
            
            if not is_duplicate:
                key = f"{company_slug}|{job_title_lower}"
                seen_keys[key] = (len(unique), self._parse_date(job.date_posted))
                unique.append(job)
        
        duplicates_removed = len(jobs) - len(unique)
        if duplicates_removed > 0:
            logger.info(f"🔍 {duplicates_removed} doublon(s) supprimé(s)")
        
        return unique
    
    def _apply_smart_filters(
        self, 
        jobs: List[JobOffer], 
        filters: Dict[str, Any],
        candidate: CandidateProfile
    ) -> List[JobOffer]:
        """
        Applique les filtres intelligents post-processing.
        
        Filtres:
        - Anti-cabinet: Exclut si patterns détectés dans la description
        - Cutoff date: Exclut si > max_days_old (sauf match titre exact)
        - Salary warning: Flag si aucune mention de salaire
        """
        exclude_agencies = filters.get("exclude_agencies", True)
        max_days_old = filters.get("max_days_old", 14)
        cutoff_date = datetime.now() - timedelta(days=max_days_old)
        
        filtered = []
        excluded_agencies = 0
        excluded_old = 0
        
        for job in jobs:
            description_lower = (job.description or "").lower()
            
            # Flag salary_warning
            job.salary_warning = not self._has_salary_info(description_lower)
            
            # Détection cabinet (Anti-Agency)
            job.is_agency = self._is_agency(description_lower)
            
            # Exclure si cabinet et filtre actif
            if exclude_agencies and job.is_agency:
                excluded_agencies += 1
                continue
            
            # Cutoff date
            job_date = self._parse_date(job.date_posted)
            if job_date and job_date < cutoff_date:
                # Exception: garder si le titre correspond parfaitement
                if not self._is_title_match(job.title, candidate.job_title):
                    excluded_old += 1
                    continue
            
            filtered.append(job)
        
        if excluded_agencies > 0:
            logger.info(f"🏢 {excluded_agencies} offre(s) cabinet exclue(s)")
        if excluded_old > 0:
            logger.info(f"📅 {excluded_old} offre(s) trop anciennes exclue(s)")
        
        return filtered
    
    def _has_salary_info(self, description: str) -> bool:
        """Vérifie si la description contient des infos de salaire."""
        salary_keywords = [
            "€", "eur", "euros", "k€",
            "salaire", "rémunération", "package",
            "fixe", "variable", "brut", "net"
        ]
        return any(kw in description for kw in salary_keywords)
    
    def _is_agency(self, description: str) -> bool:
        """Détecte si l'offre provient d'un cabinet de recrutement."""
        return any(pattern in description for pattern in AGENCY_PATTERNS)
    
    def _is_title_match(self, job_title: str, candidate_title: str) -> bool:
        """Vérifie si le titre de l'offre correspond au titre recherché."""
        job_lower = job_title.lower()
        candidate_lower = candidate_title.lower()
        
        # Match exact ou le titre recherché est contenu dans l'offre
        return candidate_lower in job_lower or fuzz.ratio(job_lower, candidate_lower) > 85
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """
        Parse une date depuis différents formats.
        
        Supporte:
        - ISO 8601: 2024-01-15
        - Format FR: 15/01/2024
        - Relatif SerpAPI: "il y a 3 jours", "posted 2 days ago"
        """
        if not date_str:
            return None
        
        date_str = date_str.strip().lower()
        
        # Formats standards
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # Formats relatifs
        now = datetime.now()
        
        # "il y a X jours" ou "X days ago"
        if "jour" in date_str or "day" in date_str:
            for word in date_str.split():
                try:
                    days = int(word)
                    return now - timedelta(days=days)
                except ValueError:
                    continue
        
        # "il y a X semaines" ou "X weeks ago"
        if "semaine" in date_str or "week" in date_str:
            for word in date_str.split():
                try:
                    weeks = int(word)
                    return now - timedelta(weeks=weeks)
                except ValueError:
                    continue
        
        # "aujourd'hui" ou "today"
        if "aujourd" in date_str or "today" in date_str:
            return now
        
        # "hier" ou "yesterday"
        if "hier" in date_str or "yesterday" in date_str:
            return now - timedelta(days=1)
        
        return None


# Factory function pour créer l'instance
def create_search_engine_v2():
    """Crée une instance de SearchEngineV2 avec le moteur de base."""
    from services.search_engine import search_engine
    return SearchEngineV2(search_engine)
