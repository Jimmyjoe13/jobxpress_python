import sqlite3
import json
from typing import List, Optional
from models.job_offer_v2 import JobOffer

class DatabaseV2:
    """
    Gestionnaire de base de données pour la V2 (SQLite pour le stockage local des offres).
    Permet de stocker les offres scrappées et d'éviter les doublons.
    """
    
    def __init__(self, db_path: str = "jobs_v2.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE,
                    title TEXT,
                    company TEXT,
                    location TEXT,
                    salary TEXT,
                    description TEXT,
                    skills TEXT,
                    contract_type TEXT,
                    is_remote INTEGER,
                    match_score INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def save_offer(self, offer: JobOffer) -> bool:
        """Sauvegarde une offre en base de données. Retourne False si déjà existante."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO jobs (
                        url, title, company, location, salary, description, skills, contract_type, is_remote, match_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    offer.url, offer.title, offer.company, offer.location, offer.salary,
                    offer.description, json.dumps(offer.skills), offer.contract_type,
                    1 if offer.is_remote else 0, offer.match_score
                ))
                conn.commit()
            return True
        except sqlite3.IntegrityError:
            # Doublon d'URL
            return False

    def get_top_offers(self, limit: int = 10) -> List[JobOffer]:
        """Récupère les meilleures offres triées par score."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM jobs ORDER BY match_score DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            
            offers = []
            for row in rows:
                offer_dict = dict(row)
                offer_dict['skills'] = json.loads(offer_dict['skills'])
                offer_dict['is_remote'] = bool(offer_dict['is_remote'])
                offers.append(JobOffer(**offer_dict))
            return offers

# Instance globale
db_v2 = DatabaseV2()
