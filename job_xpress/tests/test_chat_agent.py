import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from services.chat_agent import ChatAgent
from models.job_offer_v2 import JobOffer


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
        "function": {"name": "search_jobs", "arguments": '{"job_title": "Python"}'}
    }

    # Mock db_service quota
    with patch("services.chat_agent.db_service.check_and_consume_search_quota", new_callable=AsyncMock) as mock_quota:
        mock_quota.return_value = {"allowed": True, "free_remaining": 5, "used_credit": False}
        
        # Mock search_engine
        with patch(
            "services.chat_agent.get_search_engine"
        ) as mock_get_engine:
            mock_engine = MagicMock()
            mock_find = AsyncMock()
            mock_engine.find_jobs_v2 = mock_find
            mock_get_engine.return_value = mock_engine
            
            mock_find.return_value = [
                JobOffer(
                    title="Dev Python",
                    company="Tech Corp",
                    location="Paris",
                    url="http://test",
                    description="Desc",
                    match_score=90,
                    skills=[]
                )
            ]

            # Act
            res = await mock_agent.execute_tool(tool_call, "user", "token")

            # Assert
            assert "1. Dev Python chez Tech Corp" in res
            assert "Paris" in res
            assert "[ACTION:NAVIGATE_SEARCH]" in res
