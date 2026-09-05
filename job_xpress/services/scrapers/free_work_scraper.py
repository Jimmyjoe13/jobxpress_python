"""
Connecteur Reverse API pour Free-Work (https://www.free-work.com/api/job_postings).
Leader français des offres IT & Tech : CDI, CDD, Freelance, TJM et salaires structurés.
"""

from typing import List, Optional
import httpx
from models.job_offer_v2 import JobOffer
from services.scrapers.base_scraper import BaseJobScraper, logger

class FreeWorkScraper(BaseJobScraper):
    name: str = "free-work"
    BASE_URL: str = "https://www.free-work.com/api/job_postings"

    async def search(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        limit: int = 15
    ) -> List[JobOffer]:
        params = {
            "search": job_title,
            "page": "1"
        }

        # Mapping des types de contrats
        if contract_type:
            ct_lower = contract_type.lower()
            if any(k in ct_lower for k in ["free", "contractor", "presta", "indépendant"]):
                params["contracts"] = "contractor"
            elif any(k in ct_lower for k in ["cdi", "cdd", "permanent"]):
                params["contracts"] = "permanent"

        offers: List[JobOffer] = []

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
                resp = await client.get(self.BASE_URL, params=params)
                if resp.status_code != 200:
                    logger.warning(f"⚠️ Free-Work API retourné HTTP {resp.status_code}")
                    return []

                raw_data = resp.json()
                items = raw_data if isinstance(raw_data, list) else raw_data.get("hydra:member", [])

                for it in items:
                    if len(offers) >= limit:
                        break

                    # 1. Contrat & Titre
                    title = it.get("title") or job_title
                    contracts_raw = it.get("contracts", [])
                    c_type = "Freelance" if "contractor" in contracts_raw else ("CDI" if "permanent" in contracts_raw else "Contrat")

                    # 2. Salaire / TJM structuré
                    salary_str = None
                    salary_warning = True
                    if it.get("minDailySalary") or it.get("maxDailySalary"):
                        min_s = it.get("minDailySalary")
                        max_s = it.get("maxDailySalary")
                        salary_warning = False
                        if min_s and max_s:
                            salary_str = f"TJM: {min_s} - {max_s} €/j"
                        else:
                            salary_str = f"TJM: {min_s or max_s} €/j"
                    elif it.get("minAnnualSalary") or it.get("maxAnnualSalary"):
                        min_a = it.get("minAnnualSalary")
                        max_a = it.get("maxAnnualSalary")
                        salary_warning = False
                        if min_a and max_a:
                            salary_str = f"{min_a} - {max_a} €/an"
                        else:
                            salary_str = f"{min_a or max_a} €/an"

                    # 3. Télétravail & Localisation
                    remote_mode = it.get("remoteMode")
                    is_remote = remote_mode in ("full", "partial")
                    work_type = "Full Remote" if remote_mode == "full" else ("Hybride" if remote_mode == "partial" else "Présentiel")

                    loc_obj = it.get("location") or {}
                    loc_str = loc_obj.get("shortLabel") or loc_obj.get("city") or loc_obj.get("label") or (location or "France")

                    # 4. Entreprise & ESN
                    comp_obj = it.get("company") or {}
                    company_name = comp_obj.get("name") or "Entreprise Tech"
                    description = it.get("description") or it.get("candidateProfile") or ""

                    is_agency = self.detect_agency(company_name, description)
                    contacts = self.extract_contacts(description)

                    # 5. URL
                    slug = it.get("slug")
                    contract_slug = "freelance" if "contractor" in contracts_raw else "cdi"
                    canonical_url = f"https://www.free-work.com/fr/tech-it/{contract_slug}/job-mission/{slug}" if slug else "https://www.free-work.com"
                    url = it.get("applicationUrl") or canonical_url

                    # 6. Compétences
                    skills = [s.get("name") for s in it.get("skills", []) if isinstance(s, dict) and s.get("name")]

                    offers.append(
                        JobOffer(
                            title=title,
                            company=company_name,
                            location=loc_str,
                            salary=salary_str,
                            description=description,
                            skills=skills,
                            contract_type=c_type,
                            is_remote=is_remote,
                            work_type=work_type,
                            date_posted=it.get("publishedAt"),
                            salary_warning=salary_warning,
                            is_agency=is_agency,
                            source="free-work",
                            contact_email=contacts.get("email"),
                            contact_phone=contacts.get("phone"),
                            url=url,
                            match_score=0
                        )
                    )

            logger.info(f"✅ Free-Work Reverse API: {len(offers)} offres récupérées pour '{job_title}'")
        except Exception as e:
            logger.error(f"❌ Erreur FreeWorkScraper: {e}")

        return offers