"""
Package scrapers : Connecteurs Reverse API multi-sources pour JobXpress.
"""

from services.scrapers.base_scraper import BaseJobScraper
from services.scrapers.free_work_scraper import FreeWorkScraper
from services.scrapers.remotive_scraper import RemotiveScraper
from services.scrapers.jobicy_scraper import JobicyScraper
from services.scrapers.unified_discovery import UnifiedReverseApiEngine

__all__ = [
    "BaseJobScraper",
    "FreeWorkScraper",
    "RemotiveScraper",
    "JobicyScraper",
    "UnifiedReverseApiEngine"
]