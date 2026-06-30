"""Quiz generation endpoint — generates comprehension quizzes from code using Claude."""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

from app.config import get_settings
from app.services.llm_client import llm, LLMClientError
from app.services.prompt_manager import render_prompt, strip_markdown_fence

router = APIRouter(prefix="/quiz", tags=["quiz"])


class Annotation(BaseModel):
    """A single annotation on a piece of code."""
    line_start: int
    line_end: int
    text: str


class Question(BaseModel):
    """A single multiple-choice question."""
    id: str
    question: str
    options: list[str]
    correct_option: int
    explanation: Optional[str] = None


class QuizRequest(BaseModel):
    code: str
    annotations: list[Annotation] = []
    topic: str
    count: int = 5


class QuizGenerateResponse(BaseModel):
    title: str
    questions: list[Question]


@router.post("/generate", response_model=QuizGenerateResponse)
async def generate_quiz(req: QuizRequest) -> QuizGenerateResponse:
    """
    Generate a multiple-choice quiz from code and optional annotations using Claude.

    Accepts the submitted code and any user annotations, then uses Claude
    to generate comprehension questions that test deep understanding.
    """
    settings = get_settings()

    if not settings.has_llm_key:
        raise HTTPException(
            status_code=503,
            detail="AI Service unavailable: OPENROUTER_API_KEY not configured.",
        )

    try:
        annotations_text = "\n".join(
            f"Lines {a.line_start}-{a.line_end}: {a.text}" for a in req.annotations
        ) if req.annotations else "No annotations provided."

        prompt = render_prompt(
            "quiz_generation",
            code=req.code,
            annotations=annotations_text,
            count=str(req.count),
            topic=req.topic,
        )

        logger.info(
            "Generating quiz",
            topic=req.topic,
            question_count=req.count,
            code_length=len(req.code),
            annotation_count=len(req.annotations),
        )

        text = await llm.generate_async(prompt=prompt)

        # Parse Claude's JSON response
        quiz_data = _parse_quiz_response(text, req.topic, req.count)

        return QuizGenerateResponse(
            title=quiz_data["title"],
            questions=quiz_data["questions"],
        )

    except LLMClientError as exc:
        logger.error(f"Quiz generation failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Quiz generation failed: {exc}",
        ) from exc
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.error(f"Failed to parse quiz response from Claude: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Quiz generation returned an invalid response format.",
        ) from exc


def _parse_quiz_response(text: str, topic: str, expected_count: int) -> dict:
    """
    Parse Claude's JSON response into a validated quiz structure.

    Handles cases where Claude wraps JSON in markdown code blocks or
    includes explanatory text before/after the JSON.
    """
    # Strip markdown code fences if present
    text = strip_markdown_fence(text)

    data = json.loads(text)

    title = data.get("title", f"Comprehension Check: {topic}")
    questions_raw = data.get("questions", [])

    if not questions_raw:
        raise ValueError("No questions returned from Claude")

    questions = []
    for i, q in enumerate(questions_raw):
        options = q.get("options", [])
        if len(options) != 4:
            raise ValueError(f"Question {i} has {len(options)} options, expected 4")

        questions.append(Question(
            id=q.get("id", f"q-{i + 1}"),
            question=q.get("question", ""),
            options=options,
            correct_option=q.get("correct_option", 0),
            explanation=q.get("explanation"),
        ))

    return {"title": title, "questions": questions}
