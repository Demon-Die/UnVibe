"""Code generation endpoint — calls Claude to produce production-grade code."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

from app.config import get_settings
from app.services.llm_client import llm, LLMClientError
from app.services.prompt_manager import render_prompt, strip_markdown_fence

router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    problem_description: str
    language: str = "python"
    difficulty: str = "medium"


class GenerateResponse(BaseModel):
    code: str
    language: str
    model_used: str
    token_count: int


@router.post("/", response_model=GenerateResponse)
async def generate_text(req: GenerateRequest) -> GenerateResponse:
    """
    Generate production-grade code for a given problem using Claude.

    Uses the code_generation prompt template with the provided problem
    description, language, and difficulty. Returns the generated code
    along with metadata about the model used.
    """
    settings = get_settings()

    if not settings.has_llm_key:
        raise HTTPException(
            status_code=503,
            detail="AI Service unavailable: OPENROUTER_API_KEY not configured. "
                   "Set it in your .env file to enable code generation.",
        )

    try:
        prompt = render_prompt(
            "code_generation",
            problem_description=req.problem_description,
            language=req.language,
            difficulty=req.difficulty,
        )

        logger.info(
            "Generating code",
            language=req.language,
            difficulty=req.difficulty,
            model=settings.llm_model,
            prompt_length=len(prompt),
        )

        text = await llm.generate_async(prompt=prompt)
        text = strip_markdown_fence(text)

        # Estimate token count from response (rough: ~4 chars per token)
        estimated_tokens = max(1, len(text) // 4)

        return GenerateResponse(
            code=text,
            language=req.language,
            model_used=settings.llm_model,
            token_count=estimated_tokens,
        )

    except LLMClientError as exc:
        logger.error(f"Code generation failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"AI generation failed: {exc}",
        ) from exc
