# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `apps/` | Contains three application sub-projects: web (frontend), api (backend), ai-service (AI) | `ls apps/`, `pnpm-workspace.yaml` |
| `apps/web/` | Next.js 14 frontend with App Router | `apps/web/package.json` |
| `apps/api/` | Express + tRPC + Prisma backend API | `apps/api/package.json`, `apps/api/src/index.ts` |
| `apps/ai-service/` | Python FastAPI service for all AI logic | `apps/ai-service/requirements.txt`, `apps/ai-service/app/main.py` |
| `packages/` | Shared packages within the monorepo | `pnpm-workspace.yaml` |
| `packages/types/` | Shared TypeScript interfaces and types (`@unvibe/types`) | `packages/types/src/index.ts`, `packages/types/package.json` |
| `infra/` | Docker Compose files for local development infrastructure | `infra/docker-compose.yml` |
| `.github/` | GitHub workflows and CI/CD configuration | `.github/workflows/discord.yml` |
| `.env.example` | Template for required environment variables | `.env.example` |
| `turbo.json` | Turborepo pipeline configuration | `turbo.json` |
| `pnpm-workspace.yaml` | pnpm workspace definitions (`apps/*`, `packages/*`) | `pnpm-workspace.yaml` |
| `eslint.base.json` | Base ESLint configuration shared across workspaces | `eslint.base.json` |
| `tsconfig.base.json` | Base TypeScript configuration shared across workspaces | `tsconfig.base.json` |

### 2) Entry Points

| App | Entry Point | Port | How Started |
|-----|-------------|------|-------------|
| Frontend (web) | `apps/web/src/app/layout.tsx` (root layout) | 3000 | `pnpm --filter web dev` → Next.js dev server |
| Backend (api) | `apps/api/src/index.ts` | 4000 | `pnpm --filter api dev` → tsx watch |
| AI Service | `apps/ai-service/app/main.py` | 8000 | `uvicorn app.main:app --reload` |

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `apps/web/src/app/` | Page components, layouts, API routes (NextAuth) | Business logic, DB access, AI service calls (should go through API) |
| `apps/web/src/lib/` | Utilities, auth config, state stores, tRPC client, mock data | Page-level components, routing |
| `apps/web/src/components/` | Reusable UI components (shadcn/ui + feature components) | Backend logic, API routes |
| `apps/web/src/stores/` | Zustand client state stores (auth, editor, UI) | Business logic, API routes |
| `apps/api/src/` | Express server entry point (index.ts) — wires tRPC, BullMQ, Socket.io, Sentry, CORS | AI model calls |
| `apps/api/src/services/` | Business logic — `ai-client.ts` (typed HTTP client for AI service), `submission-worker.ts` (BullMQ worker) | HTTP handling, route definitions |
| `apps/api/prisma/` | Database schema and migrations | Business logic, API handlers |
| `apps/api/src/__tests__/` | Jest test files (e.g., `ai-client.test.ts`) | Source code |
| `apps/api/src/middleware/` | [TODO] Express middleware. Not yet created. | Route definitions, business logic |
| `apps/ai-service/app/routes/` | FastAPI endpoint definitions (`generate.py`, `quiz.py`, `diff.py`, `defend.py`) | Business logic should delegate to services |
| `apps/ai-service/app/services/` | AI service wrappers — `llm_client.py` (OpenRouter client), `prompt_manager.py` (template loader), `ast_differ.py` (AST comparison engine) | Route definitions, HTTP concerns |
| `apps/ai-service/app/prompts/` | Versioned LLM prompt templates (`v1/` containing `code_generation.txt`, `quiz_generation.txt`, `defend_question.txt`, `defend_evaluation.txt`) | Application logic, HTTP handling |
| `apps/ai-service/tests/` | pytest test files (`test_generate.py`, `test_quiz.py`, `test_diff.py`, `test_defend.py`, `conftest.py`) | Application code |
| `packages/types/src/` | Shared TypeScript interfaces used by web + api | Implementation code, runtime dependencies |

### 4) Naming and Organization Rules

- File naming pattern:
  - **TypeScript/React (web + api):** kebab-case for files (`route.ts`, `providers.tsx`, `layout.tsx`), PascalCase for page/component files (`page.tsx` as convention)
  - **Python (ai-service):** snake_case for files (`generate.py`, `quiz.py`, `llm_client.py`, `ast_differ.py`)
  - **Config files:** kebab-case (`docker-compose.yml`, `eslint.base.json`, `tsconfig.base.json`)
  - **Test files (Python):** `test_{module}.py` (e.g., `test_generate.py`)
  - **Test files (TypeScript):** `{module}.test.ts` (e.g., `ai-client.test.ts`)
- Directory organization pattern: **Layer-by-layer** within each app (e.g., `routes/`, `services/`, `tests/` in ai-service; `services/`, `__tests__/` in api)
- Import aliasing or path conventions:
  - Web (apps/web): `@/*` maps to `src/*` (e.g., `@/app/providers`, `@/lib/utils`)
  - API (apps/api): No path aliases — uses relative imports
  - AI Service: Standard Python imports with explicit module paths (`from app.services.llm_client import llm`)
  - Shared: Workspace package names via pnpm (`@unvibe/types`)

### 5) Evidence

- `apps/web/tsconfig.json` (path alias `@/*`)
- `apps/api/tsconfig.json` (no path aliases, extends `tsconfig.base.json`)
- `apps/api/src/services/ai-client.ts` — TypeScript service with camelCase ↔ snake_case mapping
- `apps/api/src/services/submission-worker.ts` — BullMQ worker with Prisma writes
- `apps/api/src/__tests__/ai-client.test.ts` — Jest test file
- `apps/ai-service/app/routes/` — 4 route files (generate.py, quiz.py, diff.py, defend.py)
- `apps/ai-service/app/services/` — 3 service files (llm_client.py, prompt_manager.py, ast_differ.py)
- `apps/ai-service/app/prompts/v1/` — 4 prompt template files
- `apps/ai-service/tests/` — 5 test files (conftest.py + 4 test modules)
- `pnpm-workspace.yaml`
- `turbo.json`
