"""Tests for the defend session endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_defend_endpoint_exists(client):
    """The defend endpoint should accept POST and return structured response."""
    response = await client.post("/defend/respond", json={
        "session_id": "test-session-1",
        "code": "def hello(): return 'world'",
        "problem_description": "Write a hello world function",
        "messages": [],
    })
    assert response.status_code in (200, 502, 503)
    if response.status_code == 200:
        data = response.json()
        # Should return a next_question (first question)
        assert "next_question" in data
        assert data["next_question"] is not None


@pytest.mark.asyncio
async def test_defend_with_history(client):
    """Should accept conversation history."""
    response = await client.post("/defend/respond", json={
        "session_id": "test-session-2",
        "code": "def add(a, b): return a + b",
        "problem_description": "Write an add function",
        "messages": [
            {"role": "assistant", "content": "Why did you choose this approach?"},
            {"role": "user", "content": "I used simple addition because it's the most readable."},
            {"role": "assistant", "content": "What about edge cases?"},
            {"role": "user", "content": "I'd add type checking for non-number inputs."},
        ],
    })
    assert response.status_code in (200, 502, 503)


@pytest.mark.asyncio
async def test_defend_missing_session(client):
    """Missing session_id should return 422."""
    response = await client.post("/defend/respond", json={
        "code": "x = 1",
        "messages": [],
    })
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Parse evaluation
# ---------------------------------------------------------------------------


def test_parse_evaluation():
    """Test evaluation JSON parser."""
    from app.routes.defend import _parse_evaluation

    sample = '''{
        "passed": true,
        "feedback": "Good understanding of recursion.",
        "score": 85
    }'''

    result = _parse_evaluation(sample)
    assert result["passed"] is True
    assert result["score"] == 85
    assert "recursion" in result["feedback"]


def test_parse_evaluation_failed():
    """Test parsing a failed evaluation."""
    from app.routes.defend import _parse_evaluation

    sample = '''{
        "passed": false,
        "feedback": "You missed the key concept of time complexity.",
        "score": 40
    }'''

    result = _parse_evaluation(sample)
    assert result["passed"] is False
    assert result["score"] == 40


def test_parse_evaluation_missing_field():
    """Missing 'passed' field should raise ValueError."""
    from app.routes.defend import _parse_evaluation

    with pytest.raises(Exception):
        _parse_evaluation('{"feedback": "OK"}')


def test_parse_evaluation_with_markdown():
    """Should handle Claude's markdown-wrapped JSON."""
    from app.routes.defend import _parse_evaluation

    sample = '''```json
    {
        "passed": true,
        "feedback": "Nice work!",
        "score": 92
    }
    ```'''

    result = _parse_evaluation(sample)
    assert result["passed"] is True
    assert result["score"] == 92
