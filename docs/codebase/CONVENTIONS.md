# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files (TypeScript) | kebab-case with lowercase | `providers.tsx`, `layout.tsx`, `globals.css`, `route.ts` | `apps/web/src/app/` directory listing |
| Files (Python) | snake_case | `generate.py`, `quiz.py`, `defend.py`, `diff.py` | `apps/ai-service/app/routes/` directory listing |
| Files (Config) | kebab-case | `docker-compose.yml`, `eslint.base.json`, `tsconfig.base.json` | Root directory listing |
| Page components (Next.js) | Lowercase, `page.tsx` convention | `page.tsx` for homepage | `apps/web/src/app/page.tsx` |
| Layout components (Next.js) | Lowercase, `layout.tsx` convention | `layout.tsx` for root layout | `apps/web/src/app/layout.tsx` |
| Functions (TypeScript) | camelCase | `generateCode()`, `diffCode()`, `defendAsk()` | `apps/api/src/services/ai-client.ts` |
| Functions (Python) | snake_case | `generate_async()`, `render_prompt()`, `strip_markdown_fence()`, `compare()`, `_count_nodes()` | `apps/ai-service/app/services/llm_client.py`, `prompt_manager.py`, `ast_differ.py` |
| Classes (Python) | PascalCase | `LLMClient`, `LLMClientError`, `AstDiffer`, `PromptNotFoundError`, `DimensionScore`, `DiffResult` | `apps/ai-service/app/services/llm_client.py`, `ast_differ.py`, `prompt_manager.py` |
| Types/interfaces (TypeScript) | PascalCase | `User`, `Track`, `Module`, `GenerateCodeResult`, `QuizResult`, `DiffResult`, `DefendResult`, `AIClientError` | `packages/types/src/index.ts`, `apps/api/src/services/ai-client.ts` |
| Pydantic models (Python) | PascalCase (camel) | `GenerateRequest`, `GenerateResponse`, `QuizRequest`, `DiffRequest`, `DefendSessionRequest`, `DimensionScoreOut` | `apps/ai-service/app/routes/generate.py`, `quiz.py`, `diff.py`, `defend.py` |
| Constants/env vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `REDIS_URL`, `OPENROUTER_API_KEY`, `LLM_MODEL`, `MAX_QUESTIONS` | `.env.example`, `apps/ai-service/app/routes/defend.py` |
| Branch naming | `feat/`, `fix/`, `chore/`, `docs/` prefix | `feat/your-feature-name` | `CONTRIBUTING.md` |

### 2) Formatting and Linting

- Formatter: **No formatter configured.** No `.prettierrc` or equivalent exists in the monorepo.
- Linter: **ESLint ^8** with config:
  - Root: `eslint.base.json` — `eslint:recommended`, `es2022`, `no-unused-vars: warn`, `no-console: off`
  - Web: `apps/web/.eslintrc.json` — extends `next/core-web-vitals`, `next/typescript`
  - API: `[TODO]` — no ESLint config found in apps/api/; inherits from base
- Most relevant enforced rules: `no-unused-vars: warn`, `no-console: off` (base)
- Run commands: `pnpm lint` (runs turbo lint across all workspaces)

### 3) Import and Module Conventions

- Import grouping/order: **No explicit convention enforced.** No ESLint import ordering plugin configured.
- Alias vs relative import policy:
  - **Web (apps/web):** Uses `@/` alias for all imports (e.g., `@/lib/utils`, `@/app/providers`). Configured in `tsconfig.json` paths.
  - **API (apps/api):** Uses relative imports (no path aliases configured).
  - **AI Service:** Standard Python imports with explicit module paths (e.g., `from app.services.llm_client import llm`).
  - **Packages:** Uses `@unvibe/types` workspace package name.
- Public exports/barrel policy:
  - **Shared types:** Barrel export from `packages/types/src/index.ts`.
  - **Python services:** Module-level singletons imported directly (e.g., `from app.services.llm_client import llm`; `from app.services.ast_differ import differ`).
  - **TypeScript services:** Named exports (`export class AIClient`, `export function createSubmissionWorker`) plus singleton instance (`export const aiClient`).

### 4) Error and Logging Conventions

- Error strategy by layer:
  - **AI Service (Python):** Custom exception classes (`LLMClientError`, `PromptNotFoundError`). Routes use `try/except` with `HTTPException` for API error responses. Structured logging with `logger.info()`, `logger.warning()`, `logger.error()` at each failure point.
  - **API (TypeScript):** Custom `AIClientError` class with status code + endpoint context. `submission-worker.ts` catches errors and updates submission status to `'failed'` in DB. pino logger with structured context.
  - **Web:** No explicit error boundaries configured yet. Sentry client config exists.
- Logging style and required context fields:
  - **AI Service (Python):** `loguru` logger with structured extra fields — `model`, `prompt_length`, `attempt`, `input_tokens`, `output_tokens`, `language`, `difficulty`, `session_id`, `score`. Used in all 4 routes, all 3 services.
  - **API (TypeScript):** pino logger with structured context — `endpoint`, `attempt`, `jobId`, `submissionId`, `userId`, `err`. Used in `ai-client.ts` and `submission-worker.ts`.
  - **Web:** No client-side logging library configured (Sentry for errors only).
- Sensitive-data redaction rules: **Not established.** No evidence of PII/secret redaction in any layer.

### 5) Testing Conventions

- Test file naming/location rule:
  - **Python:** `tests/test_{module}.py` alongside app package (e.g., `tests/test_generate.py`, `tests/conftest.py`)
  - **TypeScript:** `src/__tests__/{module}.test.ts` (e.g., `src/__tests__/ai-client.test.ts`)
- Test framework:
  - **Python:** pytest 8+ with pytest-asyncio for async endpoint tests
  - **TypeScript:** Jest with ts-jest
- Mocking strategy:
  - **Python:** `conftest.py` sets `OPENROUTER_API_KEY` to placeholder (prevents real API calls); tests use `httpx.AsyncClient` with `ASGITransport` for in-process FastAPI testing
  - **TypeScript:** `jest.spyOn(global, 'fetch')` with mockResolvedValue/mockRejectedValue to simulate AI service responses without network calls
- Async test support: Python tests use `@pytest.mark.asyncio` decorator; TypeScript tests use async/await natively
- Coverage expectation: **Not configured.**

### 6) Evidence

- `eslint.base.json` — base lint rules
- `apps/web/.eslintrc.json` — web-specific lint rules
- `apps/web/tsconfig.json` — path alias configuration
- `packages/types/src/index.ts` — barrel export pattern
- `apps/api/src/trpc.ts` — tRPC error formatting
- `apps/api/src/index.ts` — pino logger setup
- `apps/api/src/services/ai-client.ts` — TypeScript naming, error classes, logging
- `apps/api/src/__tests__/ai-client.test.ts` — Jest test conventions
- `apps/ai-service/app/services/llm_client.py` — Python class naming, error handling, logging
- `apps/ai-service/app/services/prompt_manager.py` — Python function naming, caching
- `apps/ai-service/app/services/ast_differ.py` — Python class/function naming, dataclass usage
- `apps/ai-service/app/routes/generate.py` — Pydantic model naming, route structure
- `apps/ai-service/tests/conftest.py` — pytest fixtures and test data
- `apps/ai-service/tests/test_generate.py` — pytest async test patterns
- `.env.example` — env var naming convention
- `CONTRIBUTING.md` — branch naming and commit conventions
