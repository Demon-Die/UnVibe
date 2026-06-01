from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

router = APIRouter(prefix="/diff", tags=["diff"])

class DiffRequest(BaseModel):
    original_code: str
    updated_code: str

class DiffResponse(BaseModel):
    explanation: str
    clean_diff: str

@router.post("/", response_model=DiffResponse)
async def generate_diff_explanation(req: DiffRequest):
    logger.info("Generating explanation for code differences")
    # Simple mockup
    return DiffResponse(
        explanation="Refactored the loop to be more memory efficient by utilizing generators instead of loading all items in-memory.",
        clean_diff="@@ -1,3 +1,3 @@\n-items = [x for x in data]\n+items = (x for x in data)"
    )
