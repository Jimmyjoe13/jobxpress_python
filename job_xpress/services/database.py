from supabase import create_client, Client
from core.config import settings
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

class DatabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.client: Client = None
        
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                print(f"⚠️ Erreur connexion Supabase : {e}")

    def save_application(self, candidate: CandidateProfile, offer: JobOffer, pdf_path: str):
        """
        Sauvegarde le candidat et sa candidature.
        """
        if not self.client:
            print("⚠️ Supabase non configuré (Pas de sauvegarde).")
            return

        try:
            # 1. Insérer ou Récupérer le Candidat (Upsert sur l'email)
            candidate_data = {
                "email": candidate.email,
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "phone": candidate.phone,
                "job_title": candidate.job_title
            }
            
            # On upsert (mise à jour si l'email existe déjà, sinon création)
            res_candidate = self.client.table("candidates").upsert(
                candidate_data, on_conflict="email"
            ).execute()
            
            # Récupération de l'ID du candidat
            if res_candidate.data:
                candidate_id = res_candidate.data[0]['id']
            else:
                # Fallback si upsert ne renvoie rien (rare)
                res = self.client.table("candidates").select("id").eq("email", candidate.email).execute()
                candidate_id = res.data[0]['id']

            # 2. Enregistrer la Candidature
            app_data = {
                "candidate_id": candidate_id,
                "company_name": offer.company,
                "job_title": offer.title,
                "job_url": offer.url,
                "match_score": offer.match_score,
                "pdf_path": pdf_path,
                "status": "generated"
            }
            
            self.client.table("applications").insert(app_data).execute()
            print(f"💾 Sauvegarde Supabase réussie pour {candidate.email} -> {offer.company}")

        except Exception as e:
            print(f"❌ Erreur Sauvegarde Supabase : {e}")

db_service = DatabaseService()