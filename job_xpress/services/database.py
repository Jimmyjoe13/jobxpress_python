from supabase import create_client, Client
from core.config import settings
from core.logging_config import get_logger
from core.exceptions import DatabaseError, DatabaseConnectionError, DatabaseQueryError
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

logger = get_logger()

class DatabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        # Utiliser la service_role key pour bypass RLS (prioritaire)
        # Sinon fallback sur SUPABASE_KEY
        self.key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        self.client: Client = None
        
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
                key_type = "service_role" if settings.SUPABASE_SERVICE_KEY else "anon"
                logger.info(f"✅ Connexion Supabase établie (clé: {key_type})")
            except Exception as e:
                logger.error(f"⚠️ Erreur connexion Supabase: {e}")
        else:
            logger.warning("⚠️ Variables Supabase non configurées (SUPABASE_URL ou clé manquante)")

    def save_application(self, candidate: CandidateProfile, offer: JobOffer, pdf_path: str):
        """
        Sauvegarde le candidat et sa candidature.
        Utilise la clé service_role pour bypass les politiques RLS.
        """
        if not self.client:
            logger.warning("⚠️ Supabase non configuré - sauvegarde ignorée")
            return

        try:
            # 1. Préparer les données du candidat
            candidate_data = {
                "email": candidate.email,
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "phone": candidate.phone,
                "job_title": candidate.job_title
            }
            
            # Ajouter user_id si l'utilisateur est connecté
            if candidate.user_id:
                candidate_data["user_id"] = candidate.user_id
                logger.info(f"📎 Liaison avec user_id: {candidate.user_id}")
            
            logger.info(f"💾 Sauvegarde candidat: {candidate.email}")
            
            # 2. Upsert le candidat (mise à jour si l'email existe déjà)
            res_candidate = self.client.table("candidates").upsert(
                candidate_data, on_conflict="email"
            ).execute()
            
            # Récupération de l'ID du candidat
            if res_candidate.data:
                candidate_id = res_candidate.data[0]['id']
                logger.info(f"✅ Candidat enregistré/mis à jour (ID: {candidate_id})")
            else:
                # Fallback: récupérer l'ID existant
                res = self.client.table("candidates").select("id").eq("email", candidate.email).execute()
                if res.data:
                    candidate_id = res.data[0]['id']
                    logger.info(f"📋 Candidat existant récupéré (ID: {candidate_id})")
                else:
                    logger.error("❌ Impossible de créer ou récupérer le candidat")
                    return

            # 3. Enregistrer la Candidature
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
            logger.info(f"💾 Application enregistrée: {candidate.email} -> {offer.company}")

        except Exception as e:
            # Log détaillé de l'erreur
            error_details = str(e)
            if hasattr(e, 'args') and e.args:
                error_details = str(e.args[0]) if e.args else str(e)
            
            logger.error(f"❌ Erreur Supabase: {error_details}")
            
            # Log de debug supplémentaire
            if "row-level security" in error_details.lower():
                logger.error("🔐 Conseil: Utilisez SUPABASE_SERVICE_KEY (pas SUPABASE_KEY) pour bypass RLS")
            
            # Ne pas relancer l'exception pour ne pas bloquer le workflow email

db_service = DatabaseService()