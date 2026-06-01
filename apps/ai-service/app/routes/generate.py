from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger
import os

router = APIRouter(prefix="/generate", tags=["generate"])

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1024

class GenerateResponse(BaseModel):
    text: str

@router.post("/", response_model=GenerateResponse)
async def generate_text(req: GenerateRequest):
    logger.info(f"Generating content for prompt: {req.prompt[:50]}...")
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY is not set. Returning mock response.")
        return GenerateResponse(text=f"Mock response for prompt: {req.prompt}")
    
    # In a real implementation:
    # client = anthropic.Anthropic(api_key=api_key)
    # response = client.messages.create(...)
    # return GenerateResponse(text=response.content[0].text)
    
    return GenerateResponse(text=f"Successfully processed prompt on mock backend: {req.prompt}")
