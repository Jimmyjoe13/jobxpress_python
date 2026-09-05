"""
Connecteur Reverse API pour Remotive (https://remotive.com/api/remote-jobs).
Spécialiste mondial et européen des offres 100% Remote Tech.
"""

from typing import List, Optional
import httpx
from models.job_offer_v2 import JobOffer
from services.scrapers.base_scraper import BaseJobScraper, logger

class RemotiveScraper(BaseJobScraper):
    name: str = "remotive"
    BASE_URL: str = "https://remotive.com/api/remote-jobs"

    async def search(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        limit: int = 15
    ) -> List[JobOffer]:
        params = {
            "search": job_title,
            "limit": str(limit * 2)
        }

        offers: List[JobOffer] = []

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
                resp = await client.get(self.BASE_URL, params=params)
                if resp.status_code != 200:
                    logger.warning(f"⚠️ Remotive API retourné HTTP {resp.status_code}")
                    return []

                data = resp.json()
                raw_jobs = data.get("jobs", [])

                for item in raw_jobs:
                    if len(offers) >= limit:
                        break

                    # Filtrer géographie si spécifiée (accepte Worldwide, Europe, France, Anytime)
                    req_loc = item.get("candidate_required_location", "") or ""
                    if location and location.lower() not in ["france", "tous", "all"]:
                        if not any(loc_kw in req_loc.lower() for loc_kw in [location.lower(), "worldwide", "anywhere", "europe", "emea"]):
                            continue

                    title = item.get("title") or job_title
                    company = item.get("company_name") or "Entreprise Remote"
                    salary = item.get("salary") or None
                    desc = item.get("description") or ""

                    contacts = self.extract_contacts(desc)
                    is_agency = self.detect_agency(company, desc)

                    job_type_raw = item.get("job_type", "full_time")
                    c_type = "CDI" if "full" in job_type_raw else ("Freelance" if "contract" in job_type_raw else "CDD")

                    offers.append(
                        JobOffer(
                            title=title,
                            company=company,
                            location=req_loc or "Full Remote",
                            salary=salary,
                            description=desc,
                            skills=item.get("tags", []),
                            contract_type=c_type,
                            is_remote=True,
                            work_type="Full Remote",
                            date_posted=item.get("publication_date"),
                            salary_warning=(salary is None),
                            is_agency=is_agency,
                            source="remotive",
                            contact_email=contacts.get("email"),
                            contact_phone=contacts.get("phone"),
                            url=item.get("url") or "https://remotive.com",
                            match_score=0
                        )
                    )

            logger.info(f"✅ Remotive API: {len(offers)} offres récupérées pour '{job_title}'")
        except Exception as e:
            logger.error(f"❌ Erreur RemotiveScraper: {e}")

        return offers