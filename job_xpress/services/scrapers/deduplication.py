"""
Module de déduplication avancée et de fusion intelligente pour JobXpress.
Nettoie les titres, normalise les entreprises et élimine les doublons inter-plateformes
tout en conservant l'offre la plus riche en informations (salaire, contact, description).
"""

import re
import urllib.parse
from typing import List, Set, Dict, Optional
from models.job_offer_v2 import JobOffer

# Punctuation & bruit courant dans les titres d'offres
TITLE_NOISE_REGEX = re.compile(
    r'[\(\[\{](?:h/f|f/h|m/f|m/w|cdi|cdd|freelance|ind[ée]pendant|stage|alternance|remote|t[ée]l[ée]travail|full[\s-]?remote)[\)\]\}]|'
    r'\b(?:h/f|f/h|m/f|m/w|cdi|cdd|freelance|stage|alternance|full[\s-]?remote|t[ée]l[ée]travail|100%\s*remote)\b',
    re.IGNORECASE
)

# Formes juridiques et extensions d'entreprises
COMPANY_SUFFIX_REGEX = re.compile(
    r'\b(?:sa|sas|sasu|sarl|eurl|sci|inc|ltd|llc|group|groupe|france|consulting|technologies|solutions)\b',
    re.IGNORECASE
)

def clean_title(title: str) -> str:
    """Normalise un titre de poste en éliminant les marqueurs de genre, type de contrat et bruit."""
    if not title:
        return ""
    # Supprime les bruits fréquents (H/F, CDI, etc.)
    cleaned = TITLE_NOISE_REGEX.sub(" ", title)
    # Supprime les caractères non alphanumériques
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
    # Normalise les espaces
    return " ".join(cleaned.lower().split())

def clean_company(company: str) -> str:
    """Normalise le nom de l'entreprise en supprimant les suffixes légaux et géographiques."""
    if not company:
        return ""
    cleaned = COMPANY_SUFFIX_REGEX.sub(" ", company)
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
    return " ".join(cleaned.lower().split())

def clean_url(url: str) -> str:
    """Nettoie une URL en supprimant les paramètres de tracking (utm, ref, source...) et slash final."""
    if not url:
        return ""
    parsed = urllib.parse.urlparse(url)
    # Conserver uniquement les query params qui ne sont pas du tracking
    query_params = urllib.parse.parse_qsl(parsed.query)
    filtered_params = [
        (k, v) for k, v in query_params
        if not (k.lower().startswith("utm_") or k.lower() in {"ref", "source", "fbclid", "gclid", "spm"})
    ]
    new_query = urllib.parse.urlencode(filtered_params)
    clean_path = parsed.path.rstrip("/")
    return urllib.parse.urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        clean_path,
        parsed.params,
        new_query,
        ""  # Strip fragment
    ))

def token_jaccard_similarity(str1: str, str2: str) -> float:
    """Calcule la similarité de Jaccard basée sur les tokens de mots."""
    tokens1 = set(str1.split())
    tokens2 = set(str2.split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def merge_offers(base: JobOffer, duplicate: JobOffer) -> JobOffer:
    """
    Fusionne deux offres similaires en conservant l'information la plus exhaustive.
    """
    # 1. Privilégier la description la plus détaillée
    if len(duplicate.description or "") > len(base.description or ""):
        base.description = duplicate.description

    # 2. Conserver le salaire s'il est manquant sur l'une
    if not base.salary and duplicate.salary:
        base.salary = duplicate.salary

    # 3. Union des compétences détectées
    all_skills = list(set((base.skills or []) + (duplicate.skills or [])))
    base.skills = all_skills

    # 4. Contacts directs
    if not base.contact_email and duplicate.contact_email:
        base.contact_email = duplicate.contact_email
    if not base.contact_phone and duplicate.contact_phone:
        base.contact_phone = duplicate.contact_phone

    # 5. Drapeaux
    base.is_remote = base.is_remote or duplicate.is_remote
    base.is_agency = base.is_agency or duplicate.is_agency
    base.salary_warning = base.salary_warning or duplicate.salary_warning

    # 6. Source agrégée si différente
    if duplicate.source and duplicate.source not in base.source:
        base.source = f"{base.source}, {duplicate.source}"

    return base

def deduplicate_job_offers(offers: List[JobOffer], limit: int = 15) -> List[JobOffer]:
    """
    Déduplication avancée multi-niveaux :
    - Niveau 1 : Déduplication stricte par URL canonique nettoyée.
    - Niveau 2 : Déduplication sémantique par (titre nettoyé, entreprise nettoyée).
    - Niveau 3 : Déduplication floue par similarité de tokens de titre pour une même entreprise (Jaccard >= 0.70).
    """
    if not offers:
        return []

    unique_offers: List[JobOffer] = []
    seen_urls: Set[str] = set()
    company_groups: Dict[str, List[JobOffer]] = {}

    for offer in offers:
        c_url = clean_url(offer.url)
        if c_url and c_url in seen_urls:
            continue

        c_title = clean_title(offer.title)
        c_company = clean_company(offer.company)

        # Vérifier si l'entreprise a déjà une offre similaire
        is_dup = False
        if c_company and c_company in company_groups:
            for existing_offer in company_groups[c_company]:
                existing_title = clean_title(existing_offer.title)
                # Même titre exact ou similarité jaccard élevée
                if c_title == existing_title or token_jaccard_similarity(c_title, existing_title) >= 0.70:
                    merge_offers(existing_offer, offer)
                    is_dup = True
                    break

        if is_dup:
            if c_url:
                seen_urls.add(c_url)
            continue

        # Nouvelle offre unique
        if c_url:
            seen_urls.add(c_url)

        if c_company:
            company_groups.setdefault(c_company, []).append(offer)

        unique_offers.append(offer)

        if len(unique_offers) >= limit:
            break

    return unique_offers
