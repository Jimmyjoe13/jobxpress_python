from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr

# --- 1. Dictionnaires de Mapping (Tally IDs -> Valeurs lisibles) ---
# Ces IDs viennent de ton fichier JobXpress.json
EXPERIENCE_MAP = {
    "df23bccc-d7ea-4f63-a91b-cff4f63b5369": "Junior",
    "6089233a-8e41-442d-81c1-517c21a95c85": "Confirmé",
    "f97c4c37-e7b4-44f1-a685-2ac0cabd9b50": "Sénior"
}

CONTRACT_MAP = {
    "ff75b0f4-4254-42f5-906c-994b6c443a64": "CDD",
    "5bdc568d-a217-464e-af74-bf1a5add3c9c": "CDI",
    "3ecaa138-be90-4b08-b948-7a912fbccdc6": "Alternance",
    "b1bd7297-85fe-467f-8f46-e541aff12900": "Stage"
}

# --- 2. Modèles pour la structure brute de Tally (Payload) ---

class TallyField(BaseModel):
    key: str
    label: str
    value: Any  # Peut être str, list, int, etc.
    type: str

class TallyData(BaseModel):
    responseId: str
    submissionId: str
    fields: List[TallyField]

class TallyWebhookPayload(BaseModel):
    eventId: str
    createdAt: str
    data: TallyData

# --- 3. Modèle Domaine (Notre structure propre interne) ---

class CandidateProfile(BaseModel):
    """
    Ce modèle représente un candidat 'propre' utilisable par tout le reste de l'app.
    """
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    job_title: str
    contract_type: str
    experience_level: str
    location: str
    cv_url: Optional[str] = None
    cv_text: Optional[str] = ""
    
    # Champs qui seront remplis par l'IA plus tard
    key_skills: List[str] = []

    @classmethod
    def from_tally(cls, payload: TallyWebhookPayload) -> "CandidateProfile":
        """
        Transforme le JSON Tally complexe en objet CandidateProfile simple.
        """
        # On transforme la liste de champs en dictionnaire pour accès rapide
        fields_dict = {f.key: f.value for f in payload.data.fields}

        # Helper pour extraire la valeur proprement (Tally met souvent les dropdowns dans des listes)
        def get_val(key: str):
            val = fields_dict.get(key)
            if isinstance(val, list) and len(val) > 0 and isinstance(val[0], str):
                return val[0] # Retourne l'ID du dropdown
            return val

        # Extraction des fichiers (CV)
        cv_data = fields_dict.get("question_D7DOXE")
        cv_url = None
        if isinstance(cv_data, list) and len(cv_data) > 0:
             # Tally envoie une liste d'objets fichiers
             cv_url = cv_data[0].get('url')

        # Mapping des IDs vers du texte lisible
        contract_id = get_val("question_7NWEGz")
        exp_id = get_val("question_6Z7Po5")
        
        contract_clean = CONTRACT_MAP.get(contract_id, "Non spécifié")
        exp_clean = EXPERIENCE_MAP.get(exp_id, "Non spécifié")

        return cls(
            first_name=fields_dict.get("question_l6NAep", "Inconnu"),
            last_name=fields_dict.get("question_Y4ZO06", "Inconnu"),
            email=fields_dict.get("question_D7V1kj", ""),
            phone=fields_dict.get("question_RDz4Mp"),
            job_title=fields_dict.get("question_a26zVy", "Non spécifié"),
            contract_type=contract_clean,
            experience_level=exp_clean,
            location=fields_dict.get("question_4K2egY", "Paris"),
            cv_url=cv_url,
            cv_text=""
        )