"""
Connecteur Reverse API pour Jobicy (https://jobicy.com/api/v2/remote-jobs).
Agrégateur d'offres Tech & Remote avec géolocalisation France & EMEA.
"""

from typing import List, Optional
import httpx
from models.job_offer_v2 import JobOffer
from services.scrapers.base_scraper import BaseJobScraper, logger

class JobicyScraper(BaseJobScraper):
    name: str = "jobicy"
    BASE_URL: str = "https://jobicy.com/api/v2/remote-jobs"

    async def search(
        self,
        job_title: str,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        limit: int = 15
    ) -> List[JobOffer]:
        params = {
            "count": str(limit * 2),
            "tag": job_title.lower()
        }

        offers: List[JobOffer] = []

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
                resp = await client.get(self.BASE_URL, params=params)
                if resp.status_code != 200:
                    logger.warning(f"⚠️ Jobicy API retourné HTTP {resp.status_code}")
                    return []

                data = resp.json()
                raw_jobs = data.get("jobs", [])

                for item in raw_jobs:
                    if len(offers) >= limit:
                        break

                    title = item.get("jobTitle") or job_title
                    company = item.get("companyName") or "Entreprise"
                    geo = item.get("jobGeo") or "Remote"

                    # Salaires
                    salary_str = None
                    min_s = item.get("annualSalaryMin")
                    max_s = item.get("annualSalaryMax")
                    currency = item.get("salaryCurrency", "€")
                    if min_s or max_s:
                        salary_str = f"{min_s or ''} - {max_s or ''} {currency}/an"

                    desc = item.get("jobDescription") or item.get("jobExcerpt") or ""
                    contacts = self.extract_contacts(desc)
                    is_agency = self.detect_agency(company, desc)

                    job_types = item.get("jobType", [])
                    c_type = "CDI"
                    if isinstance(job_types, list):
                        if any("contract" in t.lower() or "freelance" in t.lower() for t in job_types):
                            c_type = "Freelance"
                        elif any("part" in t.lower() for t in job_types):
                            c_type = "Temps partiel"

                    offers.append(
                        JobOffer(
                            title=title,
                            company=company,
                            location=geo,
                            salary=salary_str,
                            description=desc,
                            skills=item.get("jobSkills", []),
                            contract_type=c_type,
                            is_remote=True,
                            work_type="Full Remote",
                            date_posted=item.get("pubDate"),
                            salary_warning=(salary_str is None),
                            is_agency=is_agency,
                            source="jobicy",
                            contact_email=contacts.get("email"),
                            contact_phone=contacts.get("phone"),
                            url=item.get("url") or "https://jobicy.com",
                            match_score=0
                        )
                    )

            logger.info(f"✅ Jobicy API: {len(offers)} offres récupérées pour '{job_title}'")
        except Exception as e:
            logger.error(f"❌ Erreur JobicyScraper: {e}")

        return offers