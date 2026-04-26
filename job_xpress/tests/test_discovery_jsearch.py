import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from services.discovery_engine import DiscoveryEngine

@pytest.mark.asyncio
async def test_discovery_engine_multi_attempts():
    """Vérifie que DiscoveryEngine essaie plusieurs requêtes si la 1ère échoue."""
    engine = DiscoveryEngine()
    engine.api_key = "fake_key"
    
    # Mock de httpx.AsyncClient.get
    # Tentative 1: 0 résultats
    # Tentative 2: 1 résultat (Succès)
    mock_resp1 = MagicMock()
    mock_resp1.status_code = 200
    mock_resp1.json.return_value = {"data": []}
    
    mock_resp2 = MagicMock()
    mock_resp2.status_code = 200
    mock_resp2.json.return_value = {"data": [{"job_title": "Found"}]}
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.side_effect = [mock_resp1, mock_resp2]
        
        results = await engine.find_jobs("Dev", "Paris")
        
        assert len(results) == 1
        assert results[0].title == "Found"
        # Vérifier qu'il y a eu 2 appels
        assert mock_get.call_count == 2
        
        # Vérifier les requêtes
        call1_args = mock_get.call_args_list[0]
        assert "Dev in Paris" in call1_args.kwargs["params"]["query"]
        
        call2_args = mock_get.call_args_list[1]
        assert "Dev Paris" in call2_args.kwargs["params"]["query"]
