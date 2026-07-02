---
updated_at: "2026-06-30T22:30:00.000Z"
---

## Architecture Overview

Modular monolith with three independent services (frontend, backend, AI service) orchestrated via a Turborepo monorepo. The AI service (Python FastAPI) provides real OpenRouter LLM calls for code generation, quiz generation, code diff scoring, and Socratic defend sessions. The API backend (Express + tRPC + Prisma) acts as the middleware, with a BullMQ job queue for async submission processing. The frontend (Next.js 14 App Router) communicates with the backend via tRPC and the AI service via HTTP.

## Key Components

| Component               | Path               | Responsibility                                                                                                                                      |
| ----------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (web)          | `apps/web/`        | Next.js 14 App Router, client state (Zustand), server state (React Query), auth (NextAuth v5), Monaco editor, Socket.io client                      |
| Backend (api)           | `apps/api/`        | Express + tRPC endpoints, Prisma ORM (PostgreSQL), BullMQ job queue, Socket.io server, Sentry error monitoring                                      |
| AI Service (ai-service) | `apps/ai-service/` | FastAPI server with 5 endpoints: `/health`, `/generate/`, `/quiz/generate`, `/diff/`, `/defend/respond`. Uses OpenRouter unified API via OpenAI SDK |
| Shared types            | `packages/types/`  | TypeScript interfaces (User, Track, Module, Submission, DefendSession, WarRoom, IRSScore) shared between web + api                                  |
| Infrastructure          | `infra/`           | Docker Compose with PostgreSQL 16 and Redis 7 for local development                                                                                 |

## Data Flow

```
Browser (Next.js App) ──HTTP/tRPC──► Express API (port 4000) ──Prisma──► PostgreSQL
                                          │
                                          ├── BullMQ ──► Redis (job queue)
                                          │
                                          └── Socket.io (real-time pub/sub)
                                          │
Browser ──HTTP──► Python FastAPI (port 8000) ──OpenRouter SDK──► OpenRouter API (200+ LLM models)
                         │
                         └── AST differ engine (offline, for /diff/ scoring)

Submissions flow:
  1. User submits code in Monaco editor → tRPC call to API backend
  2. API enqueues job in BullMQ 'submissions' queue
  3. Submission worker (submission-worker.ts) picks up job:
     a. Calls AI service POST /diff/ to score rebuild against original
     b. Stores score in Submission record via Prisma
     c. Triggers IRS recalculation (aggregate score)
     d. Schedules Defend session in PostgreSQL
```

## Key Implementation Details (Dev 2 — AI Service)

**Python Services (3 modules):**

- `llm_client.py` — Universal LLM client via OpenRouter using OpenAI SDK. Supports sync/async, retry with exponential backoff, model listing. Singleton `llm` instance for module-level use.
- `prompt_manager.py` — Versioned prompt template loader from `prompts/v1/*.txt`. Caches templates via `lru_cache`. Includes `strip_markdown_fence()` utility for cleaning LLM JSON responses.
- `ast_differ.py` — Pure-Python AST diff engine (no external API calls). Scores rebuilds across 4 weighted dimensions: Structural similarity (40%), Correctness (30%), Readability (15%), Simplicity (15%). Falls back to text-based difflib for non-Python languages.

**LLM Endpoints (real OpenRouter calls):**

- `POST /generate/` — Renders `code_generation` prompt, calls LLM, strips fences, returns code + metadata
- `POST /quiz/generate` — Renders `quiz_generation` prompt, parses JSON response with validation of 4-option questions
- `POST /diff/` — Uses local `ast_differ` (no LLM call), returns scored diff across 4 dimensions
- `POST /defend/respond` — Ask mode (generates Socratic question via LLM) / Evaluate mode (after 5 questions, evaluates via LLM)

**TypeScript Bridge (2 modules):**

- `ai-client.ts` — Typed HTTP client for Python AI service. Maps snake_case ↔ camelCase. Retry logic (exponential backoff, 4xx non-retryable). Singleton `aiClient` instance.
- `submission-worker.ts` — BullMQ worker processing code submissions. Orchestrates diff scoring → persistence → IRS recalculation → defend scheduling.

**Tests:**

- 28 Python tests across 4 test files (pytest with asyncio mode), testing endpoints, AST differ, JSON parsers, edge cases
- 12 TypeScript tests (Jest + ts-jest) for AIClient with mocked fetch, covering all endpoints and retry logic

**Environment Changes (vs scaffolding):**

- `ANTHROPIC_API_KEY` → `OPENROUTER_API_KEY` (OpenRouter unified API)
- Added `LLM_MODEL` (default: `google/gemini-2.0-flash-001`), `LLM_MAX_TOKENS` (default: 4096)
- Added `OPENROUTER_BASE_URL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME` config

## Conventions

- Python (ai-service): snake_case for files, classes PascalCase, functions snake_case. Routes in `routes/`, services in `services/`, prompts in `prompts/v1/`. Singleton pattern for LLM client and AST differ.
- TypeScript (api): camelCase for variables/functions, PascalCase for types/classes. Services in `src/services/`, tests in `src/__tests__/`. Snake_case ↔ camelCase translation at API boundaries.
- Monorepo: pnpm workspaces (`apps/*`, `packages/*`). Turborepo pipeline for build, test, lint, dev tasks.
- Imports: Web uses `@/*` alias for `src/*`. API uses relative imports. Python uses absolute imports from `app.` package root.
