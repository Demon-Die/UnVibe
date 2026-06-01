from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routes import generate, quiz, defend, diff

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../.env"))

app = FastAPI(title="UnVibe AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router)
app.include_router(quiz.router)
app.include_router(defend.router)
app.include_router(diff.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}
