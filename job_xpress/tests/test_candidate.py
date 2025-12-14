"""
Tests pour le modèle CandidateProfile et la validation des entrées.
"""
import pytest
from pydantic import ValidationError

from models.candidate import (
    CandidateProfile, 
    TallyWebhookPayload,
    sanitize_text,
    EXPERIENCE_MAP,
    CONTRACT_MAP,
    WORK_TYPE_MAP,
    WorkType
)


class TestSanitizeText:
    """Tests pour la fonction de sanitization."""
    
    def test_removes_html_tags(self):
        """Vérifie que les balises HTML sont supprimées."""
        result = sanitize_text("<script>alert('xss')</script>Test")
        assert "<" not in result
        assert ">" not in result
        assert "script" in result.lower()  # Le texte reste
    
    def test_removes_quotes(self):
        """Vérifie que les guillemets sont supprimés."""
        result = sanitize_text('Test "with" quotes')
        assert '"' not in result
    
    def test_respects_max_length(self):
        """Vérifie la limite de longueur."""
        long_text = "A" * 500
        result = sanitize_text(long_text, max_length=100)
        assert len(result) == 100
    
    def test_strips_whitespace(self):
        """Vérifie le strip des espaces."""
        result = sanitize_text("  Test  ")
        assert result == "Test"
    
    def test_handles_empty_string(self):
        """Vérifie la gestion des chaînes vides."""
        assert sanitize_text("") == ""
        assert sanitize_text(None) == ""


class TestCandidateProfileValidation:
    """Tests pour la validation du modèle CandidateProfile."""
    
    def test_valid_candidate_creation(self, sample_candidate_data):
        """Vérifie la création d'un candidat valide."""
        candidate = CandidateProfile(**sample_candidate_data)
        
        assert candidate.first_name == "Marie"
        assert candidate.last_name == "Martin"
        assert candidate.email == "marie.martin@test.com"
    
    def test_email_validation(self):
        """Vérifie la validation de l'email."""
        with pytest.raises(ValidationError):
            CandidateProfile(
                first_name="Test",
                last_name="User",
                email="invalid-email",
                job_title="Developer"
            )
    
    def test_name_sanitization(self):
        """Vérifie la sanitization des noms."""
        candidate = CandidateProfile(
            first_name="<script>Jean</script>",
            last_name="Dupont<>",
            email="test@test.com",
            job_title="Developer"
        )
        
        assert "<" not in candidate.first_name
        assert ">" not in candidate.last_name
    
    def test_name_capitalization(self):
        """Vérifie la capitalisation des noms."""
        candidate = CandidateProfile(
            first_name="jean-pierre",
            last_name="de la fontaine",
            email="test@test.com",
            job_title="Developer"
        )
        
        assert candidate.first_name == "Jean-Pierre"
    
    def test_phone_validation_french_format(self):
        """Vérifie la validation du format téléphone FR."""
        # Format valide
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            phone="0612345678"
        )
        assert candidate.phone == "0612345678"
        
        # Format +33
        candidate2 = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            phone="+33612345678"
        )
        assert "+33" in candidate2.phone or "06" in candidate2.phone
    
    def test_phone_with_spaces(self):
        """Vérifie le nettoyage des espaces dans le téléphone."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            phone="06 12 34 56 78"
        )
        # Les espaces doivent être supprimés
        assert " " not in (candidate.phone or "")
    
    def test_job_title_sanitization(self):
        """Vérifie la sanitization du titre de poste."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Growth Hacker / Digital Marketing"
        )
        
        # Les caractères valides doivent rester
        assert "Growth" in candidate.job_title
        assert "/" in candidate.job_title
    
    def test_default_values(self):
        """Vérifie les valeurs par défaut."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer"
        )
        
        assert candidate.location == "France"
        assert candidate.contract_type == "Non spécifié"
        assert candidate.work_type == WorkType.TOUS  # Défaut: recherche tous les types
        assert candidate.cv_text == ""
    
    def test_cv_url_validation(self):
        """Vérifie la validation de l'URL du CV."""
        # URL valide
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            cv_url="https://example.com/cv.pdf"
        )
        assert candidate.cv_url == "https://example.com/cv.pdf"
        
        # URL invalide -> None
        candidate2 = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer",
            cv_url="not-a-url"
        )
        assert candidate2.cv_url is None


class TestCandidateFromTally:
    """Tests pour la conversion depuis payload Tally."""
    
    def test_from_tally_valid_payload(self, sample_tally_payload):
        """Vérifie la conversion d'un payload Tally valide."""
        payload = TallyWebhookPayload(**sample_tally_payload)
        candidate = CandidateProfile.from_tally(payload)
        
        assert candidate.first_name == "Jean"
        assert candidate.last_name == "Dupont"
        assert candidate.email == "jean.dupont@test.com"
        assert candidate.job_title == "Growth Hacker"
        assert candidate.contract_type == "CDI"
        assert candidate.experience_level == "Confirmé"
        assert candidate.work_type == "Full Remote"
        assert candidate.location == "Paris"
    
    def test_from_tally_missing_fields(self):
        """Vérifie la gestion des champs manquants."""
        minimal_payload = {
            "eventId": "test-123",
            "createdAt": "2025-12-13T19:00:00Z",
            "data": {
                "responseId": "resp-123",
                "submissionId": "sub-123",
                "fields": [
                    {"key": "question_D7V1kj", "label": "Email", "value": "test@test.com", "type": "INPUT_EMAIL"}
                ]
            }
        }
        
        payload = TallyWebhookPayload(**minimal_payload)
        candidate = CandidateProfile.from_tally(payload)
        
        assert candidate.first_name == "Inconnu"
        assert candidate.last_name == "Inconnu"
        assert candidate.job_title == "Non spécifié"
        assert candidate.location == "France"
    
    def test_mapping_dictionaries(self):
        """Vérifie que les dictionnaires de mapping sont corrects."""
        assert "Junior" in EXPERIENCE_MAP.values()
        assert "CDI" in CONTRACT_MAP.values()
        assert "Full Remote" in WORK_TYPE_MAP.values()


class TestEdgeCases:
    """Tests pour les cas limites."""
    
    def test_very_long_name(self):
        """Vérifie la gestion des noms très longs."""
        long_name = "A" * 500
        candidate = CandidateProfile(
            first_name=long_name,
            last_name="User",
            email="test@test.com",
            job_title="Developer"
        )
        
        assert len(candidate.first_name) <= 100
    
    def test_special_characters_in_name(self):
        """Vérifie la gestion des caractères spéciaux dans les noms."""
        candidate = CandidateProfile(
            first_name="Jean-François",
            last_name="O'Connor",
            email="test@test.com",
            job_title="Developer"
        )
        
        assert "Jean" in candidate.first_name
        # Les apostrophes peuvent être filtrées
    
    def test_unicode_names(self):
        """Vérifie la gestion des caractères Unicode."""
        candidate = CandidateProfile(
            first_name="Éloïse",
            last_name="Müller",
            email="test@test.com",
            job_title="Developer"
        )
        
        # Vérifier que le nom contient des caractères Unicode
        assert len(candidate.first_name) > 0
        assert "lo" in candidate.first_name.lower()  # Partie commune


class TestWorkTypeEnum:
    """Tests pour le nouvel Enum WorkType."""
    
    def test_all_values_exist(self):
        """Vérifie que les 4 valeurs de l'enum existent."""
        assert WorkType.FULL_REMOTE.value == "Full Remote"
        assert WorkType.HYBRIDE.value == "Hybride"
        assert WorkType.PRESENTIEL.value == "Présentiel"
        assert WorkType.TOUS.value == "Tous"
    
    def test_from_tally_id_full_remote(self):
        """Vérifie la conversion de l'ID Tally Full Remote."""
        assert WorkType.from_tally_id("29694558-89d8-4dfa-973b-19506de2a1ad") == WorkType.FULL_REMOTE
    
    def test_from_tally_id_hybride(self):
        """Vérifie la conversion de l'ID Tally Hybride."""
        assert WorkType.from_tally_id("74591379-f02b-4565-93f8-53d2251ec6ab") == WorkType.HYBRIDE
    
    def test_from_tally_id_presentiel(self):
        """Vérifie la conversion de l'ID Tally Présentiel."""
        assert WorkType.from_tally_id("4f646aeb-c80a-4acf-b772-786f64834a8e") == WorkType.PRESENTIEL
    
    def test_from_tally_id_none_returns_tous(self):
        """IMPORTANT: Aucune sélection retourne TOUS (recherche tous les types)."""
        assert WorkType.from_tally_id(None) == WorkType.TOUS
    
    def test_from_tally_id_unknown_returns_tous(self):
        """Un ID inconnu retourne TOUS."""
        assert WorkType.from_tally_id("unknown-id") == WorkType.TOUS
    
    def test_from_tally_id_empty_string_returns_tous(self):
        """Une chaîne vide retourne TOUS."""
        assert WorkType.from_tally_id("") == WorkType.TOUS
    
    def test_enum_is_string_compatible(self):
        """Vérifie que l'enum est compatible avec les strings (héritage str)."""
        assert WorkType.FULL_REMOTE == "Full Remote"
        assert WorkType.HYBRIDE == "Hybride"
    
    def test_candidate_default_work_type_is_tous(self):
        """Vérifie que le work_type par défaut d'un candidat est TOUS."""
        candidate = CandidateProfile(
            first_name="Test",
            last_name="User",
            email="test@test.com",
            job_title="Developer"
        )
        assert candidate.work_type == WorkType.TOUS
