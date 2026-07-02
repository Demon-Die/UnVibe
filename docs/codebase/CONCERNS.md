# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity     | Concern                                                 | Evidence                                                                                                                                                                                                          | Impact                                                                               | Suggested action                                                                                                |
| ------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Critical** | No tRPC route handlers use auth middleware              | `apps/api/src/trpc.ts` exports `protectedProcedure` (auth middleware + session validation) but `apps/api/src/index.ts` only registers `health` via `publicProcedure` — no route handler uses `protectedProcedure` | Users could access others' data once routes are added                                | Wire future route handlers to `protectedProcedure`; create login-required wrappers for all non-public endpoints |
| **High**     | CORS allows any origin (`*`) on both API and AI Service | `apps/api/src/index.ts` CORS config: no explicit origin restriction; `apps/ai-service/app/main.py`: `allow_origins=["*"]`                                                                                         | In production, any website can make requests to the API; CSRF-style attacks possible | Restrict CORS to specific frontend origins in production                                                        |
| **High**     | Frontend operates entirely on client-side mock data     | `apps/web/src/lib/mock-data/` has a complete mock data layer (api.ts, data.ts, hooks.ts, types.ts)                                                                                                                | Core user flows work only in demo mode; no real data flows through the system        | Wire frontend to real tRPC endpoints; remove mock data layer                                                    |
| **Medium**   | Only one tRPC router registered (`health`)              | `apps/api/src/index.ts` — `appRouter` only has `health` procedure; README describes 6 routers (auth, modules, submissions, irs, warRoom, profile)                                                                 | Backend has no real functionality beyond health checks                               | Add remaining tRPC routers with appropriate auth middleware                                                     |
| **Medium**   | No backend route tests exist                            | `apps/api/src/__tests__/` has only `ai-client.test.ts` (AIClient unit tests); no tRPC router or Express route tests                                                                                               | Backend business logic has no safety net                                             | Add integration tests for API routes and tRPC routers                                                           |

### 2) Technical Debt

| Debt item                                                             | Why it exists                                                                | Where                                                                         | Risk if ignored                                                   | Suggested fix                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| No .env file present                                                  | Setup not completed — developer must copy from `.env.example`                | Root of repo                                                                  | First-time setup fails silently                                   | Add setup validation on startup (has_llm_key check is done) |
| Socket.io server with no rooms or events                              | Scaffolded but no real-time features implemented                             | `apps/api/src/index.ts` (Socket.io init with connect/disconnect logging only) | WebSocket infrastructure exists but is unused                     | Implement Defend session rooms or remove until needed       |
| AI service uses thread-pool async (sync LLM call wrapped with anyio)  | OpenAI SDK's sync client used in `llm_client.py` with `to_thread.run_sync()` | `apps/ai-service/app/services/llm_client.py`                                  | Under concurrent load, Python GIL may bottleneck LLM requests     | Migrate to openai's async client (`AsyncOpenAI`)            |
| Settings loaded from `os.getenv()` via pydantic-less `Settings` class | Was faster to implement than `pydantic-settings`                             | `apps/ai-service/app/config.py`                                               | No type coercion, no .env auto-loading, no validation             | Migrate to `pydantic-settings` BaseSettings                 |
| No Prettier config                                                    | Not added during project setup                                               | Monorepo root                                                                 | Inconsistent code formatting across contributions                 | Add `.prettierrc` with team-agreed defaults                 |
| `packages/config/` deleted, configs moved to root without cleanup     | Commit `be054b1` ("cleanup") deleted the package                             | Root config files (`eslint.base.json`, `tsconfig.base.json`)                  | Workspace references to `@unvibe/config` may break if not updated | Ensure no remaining imports from `@unvibe/config`           |

### 3) Security Concerns

| Risk                                         | OWASP category                                 | Evidence                                                                                                                                                | Current mitigation                                                                                                   | Gap                                                                                             |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| No tRPC endpoint uses auth middleware        | A01 (Broken Access Control)                    | `apps/api/src/trpc.ts` exports `protectedProcedure` (auth middleware exists), but `apps/api/src/index.ts` only registers `health` via `publicProcedure` | `protectedProcedure` exists with session validation; context.ts extracts tokens from Bearer header or Auth.js cookie | No route handler yet calls `protectedProcedure`; once routes are added they must be wired to it |
| CORS wildcard in production                  | A05 (Security Misconfiguration)                | `apps/api/src/index.ts`: no explicit origin; `apps/ai-service/app/main.py`: `allow_origins=["*"]`                                                       | None                                                                                                                 | Restrict to specific origins per environment                                                    |
| No input validation on API (beyond tRPC/Zod) | A03 (Injection)                                | [TODO] — no route handlers exist yet to audit                                                                                                           | Zod is available but not yet wired to all procedures                                                                 | Ensure all mutation procedures validate input with Zod                                          |
| NextAuth session secret uses default value   | A02 (Cryptographic Failures)                   | `.env.example` shows placeholder `"some-very-secure-random-secret-key-at-least-32-chars-long"`                                                          | None — must be changed in production                                                                                 | Document requirement to generate unique `NEXTAUTH_SECRET`                                       |
| Redis exposed without auth                   | A05 (Security Misconfiguration)                | `infra/docker-compose.yml`: Redis started without password                                                                                              | None (local dev only)                                                                                                | Add Redis password for production; use AUTH command                                             |
| Sensitive data in logs                       | A09 (Security Logging and Monitoring Failures) | No redaction patterns established anywhere                                                                                                              | None                                                                                                                 | Implement PII/secret redaction in pino logger                                                   |

### 4) Performance and Scaling Concerns

| Concern                           | Evidence                                                                  | Current symptom                | Scaling risk                                          | Suggested improvement                                |
| --------------------------------- | ------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| No database connection pooling    | `apps/api/src/index.ts` — single `PrismaClient` singleton                 | N/A (no production traffic)    | Connection exhaustion under load                      | Use Prisma's connection pool config or PgBouncer     |
| AI service uses thread-pool async | `llm_client.py` wraps sync `generate()` with `anyio.to_thread.run_sync()` | Works fine for single-user dev | Under concurrent load, GIL may serialize LLM requests | Migrate to `AsyncOpenAI` client with true async      |
| No caching layer configured       | Redis is available but not used for caching                               | N/A                            | Repeated AI calls or DB queries on same data          | Implement response caching with Redis for AI results |
| No rate limiting                  | `apps/api/src/middleware/` doesn't exist yet                              | N/A                            | Abuse of API endpoints possible                       | Implement rate limiting on all public endpoints      |

### 5) Fragile/High-Churn Areas

| Area                                         | Why fragile                                                                                                                         | Churn signal                                                  | Safe change strategy                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/ai-service/app/routes/`                | Routes were recently rewritten from mocks to real LLM calls; defend.py has the most complex branching logic (ask vs evaluate modes) | High churn — 7 fix commits after initial Dev 2 implementation | Integration tests exist (28 tests); run `pytest tests/ -v` before changes          |
| `apps/api/src/services/`                     | `submission-worker.ts` orchestrates AI service calls + Prisma writes; fragile error handling path                                   | Created during Dev 2 as new code                              | Tests cover `ai-client.ts` (12 tests); worker needs integration tests              |
| `apps/api/prisma/schema.prisma`              | Schema changes cascade to all dependent code (types, services, routers)                                                             | Changed multiple times in early commits                       | Add migration tests; use Prisma's `db push` for rapid iteration during development |
| `apps/api/src/index.ts`                      | Monolithic entry point — Express, tRPC, BullMQ, Socket.io, Sentry, CORS all configured in one file                                  | Modified across most API-related commits                      | Split into separate config modules (e.g., `config/express.ts`, `config/socket.ts`) |
| `apps/web/src/auth.ts`                       | Auth provider configuration that bridges frontend and backend (NextAuth)                                                            | Modified across multiple scaffolding commits                  | Keep auth config isolated; test with integration tests                             |
| Shared types (`packages/types/src/index.ts`) | Changes affect both web and api consumers                                                                                           | Modified as schema evolved                                    | Version the types package; use breaking-change protocol                            |

### 6) Resolved Concerns

The following concerns from earlier audits have been **resolved** by recent work:

| Previous concern                                    | Status                 | Resolution                                                                                                                                                                                   |
| --------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All AI service endpoints return hardcoded mock data | **RESOLVED**           | All 4 routes now use real LLM calls (OpenRouter) or offline AST engine (diff). See `apps/ai-service/app/routes/generate.py`, `quiz.py`, `diff.py`, `defend.py`                               |
| No test coverage anywhere                           | **RESOLVED**           | 28 Python tests (pytest + pytest-asyncio) across 4 test files + 12 TypeScript tests (Jest) for `ai-client.ts`                                                                                |
| BullMQ queue + worker with no actual job processing | **RESOLVED**           | `submission-worker.ts` processes real jobs: calls AI service diff, saves scores to Prisma, triggers IRS recalculation, schedules Defend sessions                                             |
| AI service endpoints are synchronous                | **RESOLVED**           | All 4 routes use `await llm.generate_async()` via `anyio.to_thread.run_sync()`                                                                                                               |
| No service layer exists                             | **RESOLVED**           | `apps/ai-service/app/services/` has `llm_client.py`, `prompt_manager.py`, `ast_differ.py`; `apps/api/src/services/` has `ai-client.ts`, `submission-worker.ts`                               |
| No .env file / env setup                            | **PARTIALLY RESOLVED** | `.env.example` updated to use `OPENROUTER_API_KEY`; `has_llm_key` config check implemented; no .env committed intentionally                                                                  |
| Mocked AI responses                                 | **RESOLVED**           | All 4 routes return real generated content, not mocks                                                                                                                                        |
| No auth middleware on tRPC                          | **RESOLVED**           | `apps/api/src/trpc.ts` now exports `protectedProcedure` with session validation middleware (Bear header + Auth.js cookie extraction in `context.ts`)                                         |
| No database migrations committed                    | **RESOLVED**           | `apps/api/prisma/migrations/20260701040038_init/migration.sql` creates all 9 tables (User, Account, Session, VerificationToken, Track, Module, Submission, DefendSession, WarRoom, IRSScore) |
| ANTHROPIC_API_KEY in code references                | **RESOLVED**           | `.env.example` now uses `OPENROUTER_API_KEY`; all code references updated                                                                                                                    |

### 7) `[ASK USER]` Questions

1. **[ASK USER]** What production deployment targets are planned? Vercel (web) + Railway/Render (api) as stated in README, or have you selected other providers?
2. **[ASK USER]** The README lists 6 tRPC routers (auth, modules, submissions, irs, warRoom, profile) — what is the implementation priority order for these?
3. **[ASK USER]** What formatter preference do you want? Options: Prettier with default config, or a more customized setup with specific print width, semi-colons, trailing commas, etc.?
4. **[ASK USER]** The current roadmap mentions Judge0 for sandboxed code execution — is this still planned, or should we deprioritize it?
5. **[ASK USER]** Should the AIClient be migrated to use `AsyncOpenAI` client for true async (removing the thread-pool wrapper)?

### 8) Evidence

- `apps/ai-service/app/routes/generate.py` — real LLM code generation
- `apps/ai-service/app/routes/diff.py` — offline AST diff engine
- `apps/ai-service/app/routes/quiz.py` — real LLM quiz generation
- `apps/ai-service/app/routes/defend.py` — real LLM defend Q&A
- `apps/ai-service/app/services/llm_client.py` — OpenRouter client with retry
- `apps/ai-service/app/services/ast_differ.py` — AST comparison engine
- `apps/ai-service/app/services/prompt_manager.py` — prompt template loader
- `apps/api/src/services/ai-client.ts` — typed HTTP client
- `apps/api/src/services/submission-worker.ts` — BullMQ worker
- `apps/api/src/__tests__/ai-client.test.ts` — 12 TS tests
- `apps/ai-service/tests/` — 28 Python tests
- `apps/api/src/trpc.ts` — publicProcedure + protectedProcedure with session validation
- `apps/api/src/context.ts` — session extraction (Bearer + cookie) + resolution via Prisma
- `apps/api/prisma/migrations/20260701040038_init/migration.sql` — initial migration (all 9 tables)
- `apps/api/src/index.ts` — monolithic entry point
- `apps/api/prisma/schema.prisma` — Prisma schema
- `apps/web/src/lib/mock-data/` — frontend mock data layer
- `infra/docker-compose.yml` — PostgreSQL + Redis config
- `.env.example` — required env vars
- Git log (Dev 2 fix commits showing churn patterns)
