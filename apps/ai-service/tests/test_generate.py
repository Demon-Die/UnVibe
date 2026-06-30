"""Tests for the code generation endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_generate_endpoint_exists(client):
    """The generate endpoint should accept POST and return structured response."""
    response = await client.post("/generate/", json={
        "problem_description": "Write a function to add two numbers",
        "language": "python",
        "difficulty": "easy",
    })
    # With real API key it returns 200; without it returns 503 or 502 (we can't control which)
    assert response.status_code in (200, 502, 503)
    if response.status_code == 200:
        data = response.json()
        assert "code" in data
        assert "language" in data
        assert "model_used" in data


@pytest.mark.asyncio
async def test_generate_missing_problem(client):
    """Missing problem_description should return 422 validation error."""
    response = await client.post("/generate/", json={
        "language": "python",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_different_languages(client):
    """Should accept different language values."""
    for lang in ["python", "javascript", "typescript", "go", "rust"]:
        response = await client.post("/generate/", json={
            "problem_description": "Write a hello world function",
            "language": lang,
            "difficulty": "easy",
        })
        assert response.status_code in (200, 502, 503)
