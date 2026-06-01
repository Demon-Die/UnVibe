from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from loguru import logger

router = APIRouter(prefix="/defend", tags=["defend"])

class DefendMessage(BaseModel):
    role: str # user or assistant
    content: str

class DefendSessionRequest(BaseModel):
    session_id: str
    messages: List[DefendMessage]
    code: str

class DefendResponse(BaseModel):
    next_question: str
    passed: bool
    feedback: str | None = None

@router.post("/respond", response_model=DefendResponse)
async def respond_defend(req: DefendSessionRequest):
    logger.info(f"Processing defend response for session: {req.session_id}")
    # Simple defense evaluation mockup
    if len(req.messages) >= 3:
        return DefendResponse(
            next_question="Defense completed.",
            passed=True,
            feedback="Great work defending your solution! You demonstrated strong conceptual understanding."
        )
    return DefendResponse(
        next_question="Why did you choose this specific data structure here?",
        passed=False
    )
