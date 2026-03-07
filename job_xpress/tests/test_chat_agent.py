import pytest
import datetime
from unittest.mock import AsyncMock, patch

from services.chat_agent import ChatAgent

@pytest.fixture
def mock_agent():
    agent = ChatAgent()
    agent.api_key = "test_key"
    return agent

@pytest.mark.asyncio
async def test_proactive_message_no_profile(mock_agent):
    with patch("services.chat_agent.db_service.get_user_client") as mock_get_client:
        mock_client = mock_get_client.return_value
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        res = await mock_agent.get_proactive_message("user_123", "token")
        
        assert res["role"] == "assistant"
        assert "pas complètement rempli" in res["content"]
        assert len(res["quick_replies"]) == 1
        assert res["quick_replies"][0]["action"] == "goto_profile"

@pytest.mark.asyncio
async def test_proactive_message_with_profile(mock_agent):
    with patch("services.chat_agent.db_service.get_user_client") as mock_get_client:
        mock_client = mock_get_client.return_value
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"job_title": "Développeur"}
        ]

        res = await mock_agent.get_proactive_message("user_123", "token")
        
        assert res["role"] == "assistant"
        assert "Développeur" in res["content"]
        assert len(res["quick_replies"]) == 2
        assert res["quick_replies"][0]["action"] == "search_now"

@pytest.mark.asyncio
async def test_execute_tool_search_jobs(mock_agent):
    tool_call = {
        "function": {
            "name": "search_jobs",
            "arguments": '{"job_title": "Python"}'
        }
    }
    
    # Mock search_engine_v2
    with patch("services.chat_agent.search_engine_v2.find_jobs_v2", new_callable=AsyncMock) as mock_find:
        mock_find.return_value = [
            {"title": "Dev Python", "company": "Tech Corp", "location": "Paris", "url": "http://test"}
        ]
        
        # Act
        res = await mock_agent.execute_tool(tool_call, "user", "token")
        
        # Assert
        assert "Voici les offres trouvées" in res
        assert "Dev Python" in res
        assert "Tech Corp" in res
