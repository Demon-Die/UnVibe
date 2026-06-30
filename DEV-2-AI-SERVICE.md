# Dev 2 — AI Service + Backend Bridge

**Owner of Python AI service + the TypeScript bridge connecting API to AI.**

Zero frontend work. Zero auth work. Zero database work. This document is your complete scope.

---

## What You Own

```
apps/ai-service/           ← Python FastAPI — ALL YOURS
apps/api/src/services/     ← TS bridge files (ai-client.ts, submission-worker.ts)
apps/api/src/routers/      ← submissions.ts (the one that triggers AI calls)
apps/api/src/__tests__/    ← Tests for bridge code
```

---

## The Only API Key You Need

Create an Anthropic account and API key:
- **Signup:** https://console.anthropic.com
- **Pay as you go:** ~$5–$10 will last through all development and testing
- **Your `.env` only needs:**
  ```env
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- **Nothing else.** Skip OAuth, R2, Resend, Sentry, PostHog — all irrelevant to you.
- The AI service already reads `.env` from the repo root (`main.py` line 8). Just put your key there.

---

## Implementation Plan (7 Phases, Build Order)

### Phase 1 — Foundation: Real Claude Client + Prompt System

**Files you create:**
```
apps/ai-service/app/
├── services/
│   ├── __init__.py
│   ├── claude_client.py      ← Real Anthropic client wrapper
│   └── prompt_manager.py     ← Prompt template loader + versioning
├── prompts/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── code_generation.txt
│       ├── quiz_generation.txt
│       ├── defend_question.txt
│       └── defend_evaluation.txt
└── config.py                 ← Settings from env
```

**What each file does:**

`config.py`:
```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"  # or whatever current model
    max_tokens: int = 4096

    class Config:
        env_file = "../../../.env"
        env_file_encoding = "utf-8"

settings = Settings()
```

`services/claude_client.py`:
- Initialize `anthropic.Anthropic(api_key=settings.anthropic_api_key)` once
- Generic method: `async def generate(prompt: str, system: str = "", max_tokens: int = 4096) -> str`
- Handle API errors, retry logic (2 retries with exponential backoff), logging with loguru
- Return the response text (handle `response.content[0].text`)

`services/prompt_manager.py`:
- Load prompt templates from `prompts/v1/` directory
- `def load_prompt(name: str, **kwargs) -> str` — reads file, formats with kwargs
- Allows easy swap to `v2/` prompts later without code changes

`prompts/v1/code_generation.txt`:
```
You are a senior software engineer. Generate a production-grade solution for the following problem.

Problem: {problem_description}

Language: {language}
Difficulty: {difficulty}

Requirements:
- Write clean, well-commented code
- Handle edge cases
- Follow {language} best practices
- Include type hints / type annotations
- DO NOT include any explanation — return ONLY the code

Return the code inside a single markdown code block.
```

`prompts/v1/quiz_generation.txt`:
```
You are a technical quiz generator. Given the following code and annotations, generate {count} multiple-choice questions that test deep understanding.

Code:
{code}

Annotations:
{annotations}

For each question:
1. Focus on understanding WHY the code works, not what it does
2. Include one distractor that is a common misconception
3. Vary difficulty between surface-level and deep understanding

Return a JSON array. Each item: {{"question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..."}}
```

`prompts/v1/defend_question.txt`:
```
You are conducting a Socratic interview about a developer's code submission. The developer has rebuilt a solution from memory. Ask them questions that test whether they truly understand the code's design decisions.

Original problem: {problem_description}
Developer's submitted code:
{code}

Conversation so far:
{messages}

Ask ONE probing question that:
- Challenges a specific design choice in their code
- Asks about error handling or edge cases
- Tests understanding of time/space complexity tradeoffs
- Probes why they chose one approach over alternatives

Return ONLY the question text, nothing else.
```

`prompts/v1/defend_evaluation.txt`:
```
Evaluate the developer's answer in a Defend session.

Question asked: {question}
Developer's answer: {answer}
Code context: {code}

Determine if the answer demonstrates genuine understanding:
- passed: true/false
- feedback: constructive feedback explaining what they got right/wrong
- score: 0-100

Return JSON: {{"passed": bool, "feedback": str, "score": int}}
```

**Verification:** Start the AI service, call `/health` → 200. Call `/generate/` with a real prompt → returns real Claude output (not mock).

---

### Phase 2 — Code Generation Endpoint (Replace Mock)

**File to modify:** `apps/ai-service/app/routes/generate.py`

**What changes:**
- Remove all mock code
- Use `claude_client.generate()` with `prompt_manager.load_prompt("code_generation", ...)`
- Add proper request fields:
  ```python
  class GenerateRequest(BaseModel):
      problem_description: str
      language: str = "python"
      difficulty: str = "medium"
  ```
- Handle streaming if desired (start synchronous, optimize later)
- Add error handling for Claude API failures → return 503 with clear message
- Add logging for token usage

**Output contract (what backend receives):**
```json
{
  "code": "def solution(): ...",
  "language": "python",
  "model_used": "claude-sonnet-4-20250514",
  "token_count": 847
}
```

**Verification:** `curl -X POST http://localhost:8000/generate/ -H "Content-Type: application/json" -d '{"problem_description":"Write a function to reverse a linked list","language":"python"}'` → returns real code.

---

### Phase 3 — Quiz Generation Endpoint (Replace Mock)

**File to modify:** `apps/ai-service/app/routes/quiz.py`

**What changes:**
- Change from query params to POST body:
  ```python
  class QuizRequest(BaseModel):
      code: str
      annotations: list[Annotation] = []
      topic: str
      count: int = 5
  ```
- Use Claude to generate questions from the code + annotations
- Parse Claude's JSON response and validate before returning
- Ensure each question has exactly 4 options with one correct answer
- Add explanation field to each question

**Output contract:**
```json
{
  "title": "Python: Reverse Linked List — Comprehension Check",
  "questions": [
    {
      "id": "q-1",
      "question": "Why does line 7 use 'next_node = current.next' before reassigning 'current.next'?",
      "options": ["To save the reference before overwriting it", "To create a new node", "To check if next exists", "To advance the loop"],
      "correct_option": 0,
      "explanation": "You must save the reference to the next node before changing current.next, otherwise you lose access to the rest of the list."
    }
  ]
}
```

**Verification:** `curl -X POST http://localhost:8000/quiz/generate -H "Content-Type: application/json" -d '{"code":"def reverse(head): ...","topic":"Linked Lists","count":3}'` → returns real quiz questions.

---

### Phase 4 — AST Diff Engine (Replace Mock)

**New file:** `apps/ai-service/app/services/ast_differ.py`

**What it does:**
- Takes original code + user's rebuilt code
- Parses both into AST (use Python's `ast` module)
- Compares structure, not text — a rename is not a wrong answer
- Scoring dimensions:
  | Dimension | Weight | What it measures |
  |-----------|--------|------------------|
  | Structural similarity | 40% | Same control flow, function signatures, data structures |
  | Correctness | 30% | Does the code produce correct output for edge cases? |
  | Readability | 15% | Variable naming, comments, code organization |
  | Simplicity | 15% | No unnecessary complexity, no AI-generated verbosity |
- Return detailed per-dimension scores with explanations

**File to modify:** `apps/ai-service/app/routes/diff.py`

```python
class DiffRequest(BaseModel):
    original_code: str
    updated_code: str
    language: str = "python"

class DiffScore(BaseModel):
    dimension: str
    score: float      # 0.0 to 1.0
    explanation: str

class DiffResponse(BaseModel):
    overall_score: float
    dimensions: list[DiffScore]
    summary: str
    clean_diff: str   # text-based unified diff for display
```

**Verification:** Submit original code + a slightly modified version → returns structured score with per-dimension breakdown. Pure Python — no API calls needed, works offline.

---

### Phase 5 — Defend Q&A Endpoint (Replace Mock)

**File to modify:** `apps/ai-service/app/routes/defend.py`

**What changes:**
- Two modes per request:
  1. **Generate next question** — Claude generates a Socratic question based on the code + conversation history
  2. **Evaluate answer** — Claude evaluates the user's answer and returns pass/fail + feedback
- Request body expansion:
  ```python
  class DefendSessionRequest(BaseModel):
      session_id: str
      code: str
      problem_description: str
      messages: list[DefendMessage]
      mode: Literal["ask", "evaluate"]
  ```
- For `mode: "ask"` → use prompt `defend_question.txt`
- For `mode: "evaluate"` → use prompt `defend_evaluation.txt`
- Session state tracking (how many questions asked, how many passed)

**Output contract:**
```json
// mode: "ask"
{
  "next_question": "You used a while loop instead of recursion. What's the memory tradeoff here?",
  "passed": false,
  "feedback": null
}

// mode: "evaluate"
{
  "next_question": null,
  "passed": true,
  "feedback": "Good answer — you correctly identified that the iterative approach uses O(1) space vs O(n) for recursion.",
  "score": 88
}
```

**Verification:** Send a defend request with a code submission, get back a real Claude-generated question. Send an answer, get evaluation back.

---

### Phase 6 — API Bridge (TypeScript)

**New file:** `apps/api/src/services/ai-client.ts`

TypeScript HTTP client that the backend API uses to call the Python AI service.

```typescript
class AIClient {
  private baseUrl: string;

  constructor(baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000') {}

  async generateCode(params: {
    problemDescription: string;
    language: string;
    difficulty: string;
  }): Promise<{ code: string; language: string; modelUsed: string; tokenCount: number }>;

  async generateQuiz(params: {
    code: string;
    annotations: Annotation[];
    topic: string;
    count: number;
  }): Promise<{ title: string; questions: Question[] }>;

  async diffCode(params: {
    originalCode: string;
    updatedCode: string;
    language: string;
  }): Promise<{ overallScore: number; dimensions: DiffScore[]; summary: string; cleanDiff: string }>;

  async defendAsk(params: {
    code: string;
    problemDescription: string;
    messages: DefendMessage[];
  }): Promise<{ nextQuestion: string }>;

  async defendEvaluate(params: {
    code: string;
    question: string;
    answer: string;
  }): Promise<{ passed: boolean; feedback: string; score: number }>;
}
```

- Use `fetch` or `axios` (whichever the API already uses)
- 10-second timeout on each call
- Retry logic: 2 retries with 1s backoff
- Log every call with pino (request shape, response status, duration)
- Handle errors gracefully — return structured error, don't crash the API

**New file:** `apps/api/src/services/submission-worker.ts`

Refactor the existing BullMQ worker in `index.ts` into its own file. The worker should:

1. Receive a job with `{ submissionId, userId, moduleId, code, originalCode }`
2. Call `aiClient.diffCode()` to score the submission
3. Store the score in the Submission record (via Prisma)
4. Trigger IRS recalculation via `irs-engine.ts` (created by Dev 3)
5. Schedule a Defend session via BullMQ

**File to modify:** `apps/api/src/index.ts`
- Remove inline worker code, import from `services/submission-worker.ts`
- Keep queue initialization, move handler logic out

---

### Phase 7 — Tests for Everything

**Python tests (new file structure):**
```
apps/ai-service/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              ← Fixtures (mock Claude client, sample code)
│   ├── test_generate.py
│   ├── test_quiz.py
│   ├── test_diff.py
│   └── test_defend.py
```

- `conftest.py` — mock `ANTHROPIC_API_KEY` env var, provide sample code fixtures
- `test_generate.py` — test prompt construction, response parsing, error handling
- `test_diff.py` — most important tests since diff engine is pure Python logic:
  - Same code → 1.0 score
  - Completely different solution → lower but non-zero score (same output)
  - Structural changes detected correctly
  - Comments/whitespace changes → minimal score impact
- `test_quiz.py` — test JSON parsing from Claude, validation of question structure
- `test_defend.py` — test both ask and evaluate modes

**TypeScript tests:**
- `apps/api/src/__tests__/ai-client.test.ts` — mock HTTP responses, test retry logic, test timeout
- `apps/api/src/__tests__/submission-worker.test.ts` — mock AI client, test job processing flow

---

## API Contract Summary (Interface Between Dev 2 and Dev 3)

| Endpoint | Method | Dev 2 Builds | Dev 3 Consumes |
|----------|--------|--------------|----------------|
| `POST /generate/` | FastAPI | ✅ Code gen | Dev 3 calls via `ai-client.ts` when user starts a module |
| `POST /quiz/generate` | FastAPI | ✅ Quiz gen | Dev 3 calls when user completes annotations |
| `POST /diff/` | FastAPI | ✅ Diff scoring | Dev 3 calls via submission worker on rebuild submit |
| `POST /defend/respond` | FastAPI | ✅ Defend Q&A | Dev 3 calls for defend session flow |
| BullMQ `submissions` queue | Redis | ✅ Worker impl | Dev 3 triggers jobs, worker processes them |

---

## Dependencies on Other Devs

| You Need From Dev 3 | When |
|---------------------|------|
| The tRPC router that receives quiz answers | After Phase 3 (quiz endpoint done) |
| The Submission model write path | After Phase 4 (diff scoring needs to save results) |
| The DefendSession model + router | After Phase 5 |
| IRS engine integration | After Phase 6 (submission worker triggers IRS recalc) |

**None of these block you from starting.** You can build and test all AI endpoints in isolation using curl/Postman. The bridge code (`ai-client.ts`, `submission-worker.ts`) depends on knowing the Prisma model shapes — which already exist in `schema.prisma`.

---

## Your `.env` (Minimal)

```env
# From .env.example — only what you need:
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unvibe?schema=public
REDIS_URL=redis://localhost:6379
```

The last two are only needed when testing the bridge + worker (Phase 6). For Phases 1–5, you only need the Anthropic key and Docker running (for the AI service alone, you don't even need Docker).

---

## Quick Start Commands

```bash
# 1. Set up Python environment
cd apps/ai-service
python3 -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt

# 2. Copy env with your Anthropic key
# Edit .env in repo root — put ANTHROPIC_API_KEY there

# 3. Run the AI service
uvicorn app.main:app --reload --port 8000

# 4. Test it
curl http://localhost:8000/health
```

---

## File Inventory (All 7 Phases)

**New files to create:**

| File | Phase | Lang |
|------|-------|------|
| `apps/ai-service/app/config.py` | 1 | Python |
| `apps/ai-service/app/services/__init__.py` | 1 | Python |
| `apps/ai-service/app/services/claude_client.py` | 1 | Python |
| `apps/ai-service/app/services/prompt_manager.py` | 1 | Python |
| `apps/ai-service/app/services/ast_differ.py` | 4 | Python |
| `apps/ai-service/app/prompts/__init__.py` | 1 | Python |
| `apps/ai-service/app/prompts/v1/__init__.py` | 1 | Python |
| `apps/ai-service/app/prompts/v1/code_generation.txt` | 1 | Text |
| `apps/ai-service/app/prompts/v1/quiz_generation.txt` | 1 | Text |
| `apps/ai-service/app/prompts/v1/defend_question.txt` | 1 | Text |
| `apps/ai-service/app/prompts/v1/defend_evaluation.txt` | 1 | Text |
| `apps/ai-service/tests/__init__.py` | 7 | Python |
| `apps/ai-service/tests/conftest.py` | 7 | Python |
| `apps/ai-service/tests/test_generate.py` | 7 | Python |
| `apps/ai-service/tests/test_quiz.py` | 7 | Python |
| `apps/ai-service/tests/test_diff.py` | 7 | Python |
| `apps/ai-service/tests/test_defend.py` | 7 | Python |
| `apps/api/src/services/ai-client.ts` | 6 | TypeScript |
| `apps/api/src/services/submission-worker.ts` | 6 | TypeScript |
| `apps/api/src/__tests__/ai-client.test.ts` | 7 | TypeScript |
| `apps/api/src/__tests__/submission-worker.test.ts` | 7 | TypeScript |

**Existing files to modify:**

| File | Phase | Change |
|------|-------|--------|
| `apps/ai-service/app/routes/generate.py` | 2 | Replace mock with real Claude call |
| `apps/ai-service/app/routes/quiz.py` | 3 | Replace mock with real quiz generation |
| `apps/ai-service/app/routes/diff.py` | 4 | Replace mock with real diff engine |
| `apps/ai-service/app/routes/defend.py` | 5 | Replace mock with real defend Q&A |
| `apps/ai-service/app/main.py` | 1 | No changes needed (already imports routes + env) |
| `apps/api/src/index.ts` | 6 | Extract worker into separate file |
| `apps/api/requirements.txt` | — | Already has `anthropic` dep (not needed for TS code) |

---

## Measure of Done

You are done when:

1. ✅ `ANTHROPIC_API_KEY` in `.env` → AI service works
2. ✅ `POST /generate/` returns real Claude-generated code (not mock)
3. ✅ `POST /quiz/generate` returns real quiz questions from code
4. ✅ `POST /diff/` returns structured AST-diff scores (not hardcoded string)
5. ✅ `POST /defend/respond` returns real Socratic questions + evaluation
6. ✅ All 4 endpoints have error handling, logging, and timeouts
7. ✅ `ai-client.ts` exists and the backend can call all 4 endpoints
8. ✅ `submission-worker.ts` processes submissions end-to-end (diff → store → schedule defend)
9. ✅ pytest suite passes for all Python endpoints
10. ✅ TypeScript tests pass for bridge code
11. ✅ No hardcoded responses remain — every endpoint talks to Claude or the diff engine
