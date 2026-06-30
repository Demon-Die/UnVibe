"""Code diff endpoint — scores user rebuilds against original solutions."""

from fastapi import APIRouter
from pydantic import BaseModel
from loguru import logger

from app.services.ast_differ import differ as ast_differ

router = APIRouter(prefix="/diff", tags=["diff"])


class DiffRequest(BaseModel):
    original_code: str
    updated_code: str
    language: str = "python"


class DimensionScoreOut(BaseModel):
    dimension: str
    score: float
    explanation: str


class DiffResponse(BaseModel):
    overall_score: float
    dimensions: list[DimensionScoreOut]
    summary: str
    clean_diff: str


@router.post("/", response_model=DiffResponse)
async def generate_diff_explanation(req: DiffRequest) -> DiffResponse:
    """
    Score a user's rebuild against the original solution.

    Uses the AST diff engine to compare code structurally and qualitatively.
    For Python code, performs full AST-based analysis across four dimensions.
    For other languages, falls back to text-based similarity.
    """
    logger.info(
        "Running diff",
        language=req.language,
        original_length=len(req.original_code),
        updated_length=len(req.updated_code),
    )

    result = ast_differ.compare(
        original=req.original_code,
        updated=req.updated_code,
        language=req.language,
    )

    return DiffResponse(
        overall_score=result.overall_score,
        dimensions=[
            DimensionScoreOut(
                dimension=d.dimension,
                score=d.score,
                explanation=d.explanation,
            )
            for d in result.dimensions
        ],
        summary=result.summary,
        clean_diff=result.clean_diff,
    )
