"""
Service de base de données Supabase avec gestion des accès sécurisée.

Architecture à deux clients :
- admin_client : Utilise service_role, bypass RLS (pour workers/admin uniquement)
- user_client : Utilise le JWT utilisateur, respecte RLS (pour requêtes user)

⚠️ SÉCURITÉ : Le service_role donne un accès TOTAL à la base.
                Ne l'utiliser que pour les opérations admin/background.
"""
from supabase import create_client, Client
from typing import Optional
from core.config import settings
from core.logging_config import get_logger
from core.exceptions import DatabaseError, DatabaseConnectionError, DatabaseQueryError
from models.candidate import CandidateProfile
from models.job_offer import JobOffer

logger = get_logger()


class DatabaseService:
    """
    Service d'accès à Supabase avec séparation des privilèges.
    
    Attributes:
        admin_client: Client avec service_role (bypass RLS)
        anon_client: Client public (respecte RLS)
    """
    
    def __init__(self):
        self.url = settings.SUPABASE_URL
        
        # Client ADMIN (service_role) - Pour workers/background tasks UNIQUEMENT
        self.admin_client: Optional[Client] = None
        if self.url and settings.SUPABASE_SERVICE_KEY:
            try:
                self.admin_client = create_client(self.url, settings.SUPABASE_SERVICE_KEY)
                logger.info("✅ Supabase Admin Client (service_role) initialisé")
            except Exception as e:
                logger.error(f"⚠️ Erreur init Admin Client: {e}")
        
        # Client PUBLIC (anon key) - Pour requêtes avec JWT utilisateur
        self.anon_client: Optional[Client] = None
        if self.url and settings.SUPABASE_KEY:
            try:
                self.anon_client = create_client(self.url, settings.SUPABASE_KEY)
                logger.info("✅ Supabase Anon Client initialisé")
            except Exception as e:
                logger.error(f"⚠️ Erreur init Anon Client: {e}")
        
        # Alias pour rétrocompatibilité (utilise admin si dispo, sinon anon)
        self.client = self.admin_client or self.anon_client
        
        if not self.client:
            logger.warning("⚠️ Aucun client Supabase configuré (SUPABASE_URL ou clés manquantes)")
    
    def get_user_client(self, access_token: str) -> Optional[Client]:
        """
        Retourne un client authentifié 'on behalf of' l'utilisateur.
        
        Ce client respecte les politiques RLS définies dans Supabase,
        limitant l'accès aux données de l'utilisateur connecté.
        
        Args:
            access_token: JWT de l'utilisateur (depuis Supabase Auth)
        
        Returns:
            Client Supabase authentifié ou None si erreur
        """
        if not self.url or not settings.SUPABASE_KEY:
            logger.warning("⚠️ Impossible de créer user client: config manquante")
            return None
        
        try:
            # Créer un client avec la clé anon
            user_client = create_client(self.url, settings.SUPABASE_KEY)
            
            # Définir le header Authorization pour que Supabase utilise le JWT
            user_client.postgrest.auth(access_token)
            
            logger.debug("🔐 User client créé avec JWT")
            return user_client
        except Exception as e:
            logger.error(f"⚠️ Erreur création user client: {e}")
            return None
    
    def save_application(
        self, 
        candidate: CandidateProfile, 
        offer: JobOffer, 
        pdf_path: str,
        use_admin: bool = True
    ):
        """
        Sauvegarde le candidat et sa candidature.
        
        Args:
            candidate: Profil du candidat
            offer: Offre d'emploi sélectionnée
            pdf_path: Chemin vers le PDF généré
            use_admin: Si True, utilise le client admin (bypass RLS).
                       Pour les background workers, doit être True.
        
        ⚠️ Note: Cette méthode utilise le client admin car elle est appelée
                  par les background workers qui n'ont pas de contexte utilisateur.
        """
        client = self.admin_client if use_admin else self.anon_client
        
        if not client:
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
            res_candidate = client.table("candidates").upsert(
                candidate_data, on_conflict="email"
            ).execute()
            
            # Récupération de l'ID du candidat
            if res_candidate.data:
                candidate_id = res_candidate.data[0]['id']
                logger.info(f"✅ Candidat enregistré/mis à jour (ID: {candidate_id})")
            else:
                # Fallback: récupérer l'ID existant
                res = client.table("candidates").select("id").eq("email", candidate.email).execute()
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
            
            client.table("applications").insert(app_data).execute()
            logger.info(f"💾 Application enregistrée: {candidate.email} -> {offer.company}")

        except Exception as e:
            error_details = str(e)
            if hasattr(e, 'args') and e.args:
                error_details = str(e.args[0]) if e.args else str(e)
            
            logger.error(f"❌ Erreur Supabase: {error_details}")
            
            if "row-level security" in error_details.lower():
                logger.error("🔐 RLS bloquée: Assurez-vous d'utiliser use_admin=True pour les workers")
    
    def get_user_applications(self, user_id: str, access_token: str = None) -> list:
        """
        Récupère les candidatures d'un utilisateur.
        
        Si access_token est fourni, utilise le client user (respecte RLS).
        Sinon, utilise le client admin avec filtre sur user_id.
        
        Args:
            user_id: ID de l'utilisateur
            access_token: JWT optionnel pour respecter RLS
        
        Returns:
            Liste des candidatures
        """
        if access_token:
            client = self.get_user_client(access_token)
            if not client:
                return []
        else:
            client = self.admin_client
            if not client:
                logger.warning("⚠️ Admin client non configuré")
                return []
        
        try:
            # Avec RLS activé et JWT, Supabase filtre automatiquement par user
            # Avec admin client, on doit filtrer manuellement
            query = client.table("candidates").select(
                "id, email, first_name, last_name, applications(*)"
            )
            
            if not access_token:
                # Filtre manuel si pas de RLS
                query = query.eq("user_id", user_id)
            
            result = query.execute()
            return result.data if result.data else []
        
        except Exception as e:
            logger.error(f"❌ Erreur récupération applications: {e}")
            return []


# Instance globale du service
db_service = DatabaseService()
