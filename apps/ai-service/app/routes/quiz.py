from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from loguru import logger

router = APIRouter(prefix="/quiz", tags=["quiz"])

class Question(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option: int

class QuizGenerateResponse(BaseModel):
    title: str
    questions: List[Question]

@router.post("/generate", response_model=QuizGenerateResponse)
async def generate_quiz(topic: str, count: int = 5):
    logger.info(f"Generating quiz for topic: {topic} with {count} questions")
    # Mock quiz generation
    questions = [
        Question(
            id=f"q-{i}",
            question=f"Sample question {i} about {topic}",
            options=["Option A", "Option B", "Option C", "Option D"],
            correct_option=0
        ) for i in range(1, count + 1)
    ]
    return QuizGenerateResponse(title=f"{topic} Quiz", questions=questions)
