import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_pdf_endpoint_mock():
    """Vérifie que l'endpoint PDF appelle bien le générateur."""
    app_id = "test-app-id"
    
    # Mock du client Supabase
    mock_db_res = MagicMock()
    mock_db_res.data = {
        "id": app_id,
        "cover_letter_html": "<h3>Test</h3>",
        "candidate_email": "test@jobxpress.fr",
        "final_choice": {
            "title": "Dev",
            "company": "TestCorp",
            "url": "http://test.com",
            "description": "Desc"
        }
    }
    
    with patch("services.database.DatabaseService.get_user_client") as mock_get_client:
        mock_user_client = MagicMock()
        mock_user_client.table().select().eq().single().execute.return_value = mock_db_res
        mock_get_client.return_value = mock_user_client
        
        with patch("services.pdf_generator.PDFGenerator.create_application_pdf") as mock_gen_pdf:
            mock_gen_pdf.return_value = "dummy.pdf"
            
            # Créer un fichier dummy
            with open("dummy.pdf", "w") as f:
                f.write("pdf content")
            
            # On doit bypasser l'auth pour le test simple ou utiliser un token valide
            # Pour ce test on mock l'auth via Depends
            from core.auth import get_required_token, get_current_user_id
            app.dependency_overrides[get_required_token] = lambda: "fake-token"
            app.dependency_overrides[get_current_user_id] = lambda: "fake-user-id"
            
            response = client.get(f"/api/v2/applications/{app_id}/pdf")
            
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            
            # Cleanup
            if os.path.exists("dummy.pdf"):
                os.remove("dummy.pdf")
            app.dependency_overrides = {}
