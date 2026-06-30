# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test frameworks:
  - **Python (AI service):** pytest ^8.0.0 with pytest-asyncio ^0.23.0
  - **TypeScript (API backend):** Jest with ts-jest
- Assertion/mocking tools:
  - **Python:** pytest-native assertions, `httpx.AsyncClient` with `ASGITransport` for in-process FastAPI testing
  - **TypeScript:** Jest's `jest.spyOn()` and `mockResolvedValue()`/`mockRejectedValue()` for fetch mocking
- Commands:

  ```bash
  # Python AI service tests (28 tests)
  cd apps/ai-service && pip install -r requirements.txt && pytest tests/ -v

  # TypeScript API backend tests (12 tests)
  pnpm --filter api test

  # Turborepo orchestrated (when configured)
  pnpm test
  ```

### 2) Test Layout

- Test file placement pattern:
  - **Python:** `apps/ai-service/tests/test_{module}.py` (alongside the app package at `apps/ai-service/`)
  - **TypeScript:** `apps/api/src/__tests__/{module}.test.ts` (alongside source in `src/`)
- Naming convention:
  - **Python:** `test_{module}.py` with `test_{function}()` prefixed test functions
  - **TypeScript:** `{module}.test.ts` with `describe('ModuleName')` / `it('should ...')` blocks
- Setup files:
  - **Python:** `apps/ai-service/tests/conftest.py` — shared fixtures (`mock_env`, `sample_code`, `sample_rebuild`, `sample_class_code`, `quiz_code`)
  - **TypeScript:** `jest.clearAllMocks()` in `beforeEach` blocks; no global setup file

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit (Python) | Yes (28 tests) | `llm_client.py` — LLM client error/retry logic; `prompt_manager.py` — template loading; `ast_differ.py` — AST comparison; route validation | All 4 route files + 3 service files tested indirectly |
| Unit (TypeScript) | Yes (12 tests) | `ai-client.ts` — all 4 API methods, retry logic, health check | `ai-client.test.ts` covers normal + error + retry paths |
| Integration (Python) | Yes (included in 28) | FastAPI routes via `httpx.AsyncClient` + `ASGITransport` | Tests run in-process without needing a server |
| Integration (TypeScript) | No | — | No cross-service integration tests |
| E2E | No | — | No Playwright, Cypress, or other E2E tooling |
| Web frontend | No | — | No component or page tests |

### 4) Test File Inventory

| File | Tests | What it covers | Run command |
|------|-------|----------------|-------------|
| `apps/ai-service/tests/conftest.py` | fixtures | Shared test fixtures: mock env, sample code data | Loaded by pytest automatically |
| `apps/ai-service/tests/test_generate.py` | 3 tests | POST /generate/ endpoint — success, missing fields, different languages | `pytest tests/test_generate.py -v` |
| `apps/ai-service/tests/test_quiz.py` | — | POST /quiz/generate endpoint | `pytest tests/test_quiz.py -v` |
| `apps/ai-service/tests/test_diff.py` | — | POST /diff/ endpoint — AST comparison, identical code, different code | `pytest tests/test_diff.py -v` |
| `apps/ai-service/tests/test_defend.py` | — | POST /defend/respond endpoint — ask mode, evaluate mode, error handling | `pytest tests/test_defend.py -v` |
| `apps/api/src/__tests__/ai-client.test.ts` | 12 tests | AIClient — all 4 methods, mapResponse, retry logic, health check | `pnpm --filter api test` |

### 5) Mocking and Isolation Strategy

- **Python (AI service):**
  - `conftest.py` sets `OPENROUTER_API_KEY=sk-or-v1-placeholder-test-key-disabled` for every test via `@pytest.fixture(autouse=True)`
  - The `has_llm_key` config property returns `False` for placeholder keys, causing routes to return 503 with "API key not configured" — this avoids real LLM calls in tests
  - Tests use `httpx.AsyncClient(app=app, ...)` with `ASGITransport` — no server process needed
  - Sample code data is defined as module-level constants in `conftest.py` for reuse across test files
- **TypeScript (API backend):**
  - `jest.spyOn(global, 'fetch')` replaces the real fetch with controlled responses
  - `mockResolvedValue()` returns fake Response objects; `mockRejectedValue()` simulates network errors
  - `jest.clearAllMocks()` resets spies between tests via `beforeEach`
  - Client errors (4xx) are tested as non-retryable; server errors (5xx) test retry path
- Isolation guarantees:
  - Python tests are fully isolated via env var fixture (autouse) — no state leaks between tests
  - TypeScript tests create a fresh `AIClient` instance per test via `beforeEach`
  - Both test suites are completely offline — no external network calls

### 6) Coverage and Quality Signals

- Coverage tool + threshold: **Not configured.** No `pytest-cov` or Jest `--coverage` thresholds set.
- Current reported coverage: **Not measured.**
- Known gaps:
  - **No backend route/tRPC tests** — `apps/api/src/index.ts` and any future tRPC routers have zero test coverage
  - **No web frontend tests** — zero component, page, or E2E tests
  - **No integration tests** that test the TypeScript ↔ Python bridge end-to-end
  - **No Prisma/migration tests**
  - **Python AST differ** has less exhaustive edge-case coverage (e.g., deeply nested AST, async functions, match statements)

### 7) Evidence

- `apps/ai-service/requirements.txt` — pytest, pytest-asyncio, httpx
- `apps/ai-service/tests/conftest.py` — shared fixtures and sample data
- `apps/ai-service/tests/test_generate.py` — route validation tests
- `apps/ai-service/tests/test_quiz.py` — quiz generation tests
- `apps/ai-service/tests/test_diff.py` — AST diff tests
- `apps/ai-service/tests/test_defend.py` — defend Q&A tests
- `apps/api/jest.config.ts` — Jest configuration
- `apps/api/src/__tests__/ai-client.test.ts` — AIClient test suite
- `apps/api/src/services/ai-client.ts` — source code under test
- `apps/ai-service/app/services/ast_differ.py` — source code under test (heaviest test surface)
