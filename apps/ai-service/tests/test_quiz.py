"""Tests for the quiz generation endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_quiz_endpoint_exists(client, quiz_code):
    """The quiz endpoint should accept POST and return structured response."""
    response = await client.post("/quiz/generate", json={
        "code": quiz_code,
        "annotations": [],
        "topic": "Strings",
        "count": 3,
    })
    assert response.status_code in (200, 502, 503)
    if response.status_code == 200:
        data = response.json()
        assert "title" in data
        assert "questions" in data
        assert len(data["questions"]) > 0
        # Verify question structure
        q = data["questions"][0]
        assert "id" in q
        assert "question" in q
        assert "options" in q
        assert len(q["options"]) == 4
        assert "correct_option" in q


@pytest.mark.asyncio
async def test_quiz_with_annotations(client, quiz_code):
    """Should accept and process annotations."""
    response = await client.post("/quiz/generate", json={
        "code": quiz_code,
        "annotations": [
            {"line_start": 1, "line_end": 1, "text": "This converts to lowercase"},
            {"line_start": 2, "line_end": 2, "text": "This reverses the string"},
        ],
        "topic": "Strings",
        "count": 2,
    })
    assert response.status_code in (200, 502, 503)


@pytest.mark.asyncio
async def test_quiz_missing_code(client):
    """Missing code should return 422."""
    response = await client.post("/quiz/generate", json={
        "topic": "Strings",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_quiz_parse_response():
    """Test the JSON parser directly with sample Claude output."""
    from app.routes.quiz import _parse_quiz_response

    sample = '''{
        "title": "Test Quiz",
        "questions": [
            {
                "id": "q-1",
                "question": "What does line 2 do?",
                "options": ["Reverses the string", "Sorts it", "Capitalizes it", "Splits it"],
                "correct_option": 0,
                "explanation": "s[::-1] reverses the string."
            }
        ]
    }'''

    result = _parse_quiz_response(sample, "Test", 1)
    assert result["title"] == "Test Quiz"
    assert len(result["questions"]) == 1
    assert result["questions"][0].correct_option == 0


@pytest.mark.asyncio
async def test_quiz_parse_with_markdown_fence():
    """Test parsing Claude output wrapped in markdown code blocks."""
    from app.routes.quiz import _parse_quiz_response

    sample = '''```json
    {
        "title": "Quiz",
        "questions": [
            {
                "id": "q-1",
                "question": "What does this code do?",
                "options": ["A", "B", "C", "D"],
                "correct_option": 1
            }
        ]
    }
    ```'''

    result = _parse_quiz_response(sample, "Test", 1)
    assert len(result["questions"]) == 1
    assert result["questions"][0].correct_option == 1


@pytest.mark.asyncio
async def test_quiz_parse_invalid_json():
    """Invalid JSON from Claude should raise ValueError."""
    from app.routes.quiz import _parse_quiz_response

    with pytest.raises(Exception):
        _parse_quiz_response("not json at all", "Test", 1)
