"""Defend session Q&A endpoint — Socratic questioning via Claude."""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

from app.config import get_settings
from app.services.llm_client import llm, LLMClientError
from app.services.prompt_manager import render_prompt, strip_markdown_fence

router = APIRouter(prefix="/defend", tags=["defend"])

MAX_QUESTIONS = 5  # Maximum questions before auto-evaluation


class DefendMessage(BaseModel):
    """A single message in the defend conversation."""
    role: str  # "user" or "assistant"
    content: str


class DefendSessionRequest(BaseModel):
    """Request to ask a question or evaluate in a defend session."""
    session_id: str
    code: str
    problem_description: str
    messages: list[DefendMessage]


class DefendResponse(BaseModel):
    """Response from the defend endpoint."""
    next_question: Optional[str] = None
    passed: bool = False
    feedback: Optional[str] = None
    score: Optional[int] = None


@router.post("/respond", response_model=DefendResponse)
async def respond_defend(req: DefendSessionRequest) -> DefendResponse:
    """
    Process a defend session interaction.

    Two modes based on conversation state:
    1. **Ask mode** (default) — Generates the next Socratic question using Claude,
       based on the code, problem, and conversation history.
    2. **Evaluate mode** — Triggered when the conversation reaches MAX_QUESTIONS
       exchanges. Claude evaluates the user's overall understanding and returns
       a pass/fail verdict with feedback.

    The endpoint determines which mode to use based on the number of
    assistant messages (questions asked so far) in the conversation.
    """
    settings = get_settings()

    if not settings.has_llm_key:
        raise HTTPException(
            status_code=503,
            detail="AI Service unavailable: OPENROUTER_API_KEY not configured.",
        )

    # Count how many questions have been asked so far
    questions_asked = sum(1 for m in req.messages if m.role == "assistant")
    user_answers = sum(1 for m in req.messages if m.role == "user")

    logger.info(
        "Defend session request",
        session_id=req.session_id,
        questions_asked=questions_asked,
        user_answers=user_answers,
        total_messages=len(req.messages),
    )

    # Determine mode: if we've reached the limit, evaluate
    if questions_asked >= MAX_QUESTIONS:
        return await _evaluate_answer(req)
    else:
        return await _ask_question(req)


async def _ask_question(req: DefendSessionRequest) -> DefendResponse:
    """Generate a Socratic question using Claude."""
    try:
        # Format conversation history for the prompt
        messages_text = _format_conversation(req.messages)

        prompt = render_prompt(
            "defend_question",
            problem_description=req.problem_description,
            code=req.code,
            messages=messages_text,
        )

        question = await llm.generate_async(prompt=prompt)

        return DefendResponse(
            next_question=question.strip(),
            passed=False,
            feedback=None,
            score=None,
        )

    except LLMClientError as exc:
        logger.error(f"Defend question generation failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate defend question: {exc}",
        ) from exc


async def _evaluate_answer(req: DefendSessionRequest) -> DefendResponse:
    """
    Evaluate the user's last answer and overall performance.

    Uses Claude to assess the last user response against the code context,
    then returns pass/fail with detailed feedback and a score.
    """
    try:
        # Get the last user message
        last_answer = ""
        for msg in reversed(req.messages):
            if msg.role == "user":
                last_answer = msg.content
                break

        # Get the question that was asked before that answer
        last_question = ""
        for msg in reversed(req.messages):
            if msg.role == "assistant":
                last_question = msg.content
                break

        prompt = render_prompt(
            "defend_evaluation",
            question=last_question,
            answer=last_answer,
            code=req.code,
        )

        text = await llm.generate_async(prompt=prompt)

        # Parse JSON response
        result = _parse_evaluation(text)

        passed = result.get("passed", False)
        feedback = result.get("feedback", "No feedback provided.")
        score = result.get("score", 0)

        logger.info(
            "Defend evaluation complete",
            session_id=req.session_id,
            passed=passed,
            score=score,
        )

        return DefendResponse(
            next_question=None,
            passed=passed,
            feedback=feedback,
            score=score,
        )

    except LLMClientError as exc:
        logger.error(f"Defend evaluation failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to evaluate defend answer: {exc}",
        ) from exc
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.error(f"Failed to parse evaluation from Claude: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Defend evaluation returned an invalid response format.",
        ) from exc


def _format_conversation(messages: list[DefendMessage]) -> str:
    """Format conversation history for the prompt template."""
    if not messages:
        return "No previous conversation."

    lines = []
    for m in messages:
        role_label = "Interviewer" if m.role == "assistant" else "Developer"
        lines.append(f"{role_label}: {m.content}")
    return "\n\n".join(lines)


def _parse_evaluation(text: str) -> dict:
    """Parse Claude's JSON evaluation response."""
    # Strip markdown code fences if present
    text = strip_markdown_fence(text)

    data = json.loads(text)

    # Validate expected fields
    if "passed" not in data:
        raise ValueError("Missing 'passed' field in evaluation response")

    return {
        "passed": bool(data["passed"]),
        "feedback": str(data.get("feedback", "")),
        "score": max(0, min(100, int(data.get("score", 0)))),
    }
