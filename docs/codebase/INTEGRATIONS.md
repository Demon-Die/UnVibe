# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| PostgreSQL 16 | Database (relational) | Primary data store for all application data | Password via `DATABASE_URL` connection string | Critical | `infra/docker-compose.yml`, `apps/api/prisma/schema.prisma` |
| Redis 7 | Cache + Queue + Pub/Sub | BullMQ job queue, Socket.io pub/sub, general caching | None (local, no password configured) | Critical | `infra/docker-compose.yml`, `apps/api/src/index.ts` |
| OpenRouter API | External API (LLM gateway) | Unified access to 200+ models for code gen, quiz gen, defend Q&A | API key (`OPENROUTER_API_KEY`) | Critical | `.env.example`, `apps/ai-service/app/services/llm_client.py` (IMPLEMENTED) |
| GitHub OAuth | External API (Auth) | OAuth sign-in for users | Client ID + Secret (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) | High | `apps/web/src/auth.ts` |
| Google OAuth | External API (Auth) | OAuth sign-in for users | Client ID + Secret (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | High | `apps/web/src/auth.ts` |
| Cloudflare R2 | Object Storage | Store code snapshots, PDF reports, assets (planned) | Account ID + Access Key + Secret Key (`R2_*` env vars) | Medium | `.env.example` (not yet used in code) |
| Resend | External API (Email) | Transactional emails (digest, notifications) — planned | API key (`RESEND_API_KEY`) | Medium | `.env.example` (not yet used in code) |
| Sentry | Monitoring | Error tracking across web + api | DSN via `SENTRY_DSN_WEB`, `SENTRY_DSN_API` env vars | Low (local dev) | `apps/web/sentry.client.config.ts`, `apps/api/src/index.ts` |
| PostHog | Analytics | Product analytics | Public key via `NEXT_PUBLIC_POSTHOG_KEY` | Low (local dev) | `.env.example` (not yet used in code) |
| Judge0 | Self-hosted service | Sandboxed code execution (planned) | [TODO] — self-hosted, not yet deployed | Low (not implemented) | `README.md` tech stack mentions |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| PostgreSQL 16 | Primary database — all users, tracks, modules, submissions, defend sessions, IRS scores, war rooms | Prisma ORM via `apps/api` | No connection pooling configured; single `PrismaClient` singleton; no migrations committed | `apps/api/prisma/schema.prisma`, `apps/api/src/index.ts` |
| Redis 7 | Job queue (BullMQ), real-time pub/sub (Socket.io), caching | `ioredis` via BullMQ + Socket.io adapter | No auth or TLS configured for local dev; no persistence policy set for cache use | `infra/docker-compose.yml`, `apps/api/src/index.ts` |
| Cloudflare R2 | Object storage for code snapshots, PDF reports — planned | [TODO] — SDK not yet imported | [TODO] — not yet implemented | `.env.example` (env vars defined) |

### 3) Secrets and Credentials Handling

- Credential sources: All secrets and credentials are read from environment variables (`.env` file at repo root).
- Hardcoding checks: No hardcoded secrets found. All API keys, OAuth secrets, and database passwords reference env vars.
- Rotation or lifecycle notes: **Unknown.** No secrets manager configured. No credential rotation mechanism in place.

### 4) Reliability and Failure Behavior

- Retry/backoff behavior:
  - **BullMQ:** Built-in retry mechanism for job queue — `submission-worker.ts` retries on `AIClientError` up to BullMQ's configured limit
  - **AI Service (OpenRouter):** Exponential backoff implemented — `llm_client.py` retries up to 2 times with `2^attempt` second delays for rate limits (`RateLimitError`) and transient API errors (`APIError`, `APITimeoutError`, `APIConnectionError`)
  - **TypeScript AIClient:** Exponential backoff — `ai-client.ts` retries up to 2 times with `2^attempt * 500ms` delays for server errors (5xx); client errors (4xx) are NOT retried
  - **Database:** Prisma has no explicit retry configured in the codebase
- Timeout policy:
  - **AI Service (LLM):** 30-second total timeout with 10-second connect timeout (`Timeout(30.0, connect=10.0)` in `llm_client.py`)
  - **TypeScript AIClient:** 10-second timeout per request (configurable via `timeoutMs` option)
  - **Express:** No global timeout configured
  - **Socket.io:** Default timeout (no custom configuration found)
- Circuit-breaker or fallback behavior:
  - **Redis fallback:** API backend uses TCP health check before initializing BullMQ — if Redis is unavailable, the server starts without the queue subsystem
  - **Health check:** `ai-client.ts` has a `healthCheck()` method with 5-second timeout for detecting AI service availability
  - No circuit breaker (e.g., opossum) or additional fallback patterns implemented

### 5) Observability for Integrations

- Logging around external calls:
  - **AI Service (Python):** `loguru` logger with `logger.info()` / `logger.warning()` / `logger.error()` calls in all 4 routes, the LLM client, prompt manager, and AST differ — structured logging with prompt length, model name, token usage, retry attempts
  - **API (TypeScript):** `pino` logger with structured context in `ai-client.ts` and `submission-worker.ts` — endpoint names, attempt numbers, job IDs, submission IDs
  - **Sentry:** Conditional Sentry initialization in Express — request/error handlers
- Metrics/tracing coverage: **None found.** No metrics collection (Prometheus, OpenTelemetry) or distributed tracing.
- Missing visibility gaps: No instrumentation on database queries, BullMQ job durations, or WebSocket events.

### 6) Evidence

- `apps/web/src/auth.ts` — GitHub + Google OAuth provider config
- `apps/api/src/index.ts` — PrismaClient, BullMQ, Socket.io, Sentry setup
- `apps/api/src/services/ai-client.ts` — typed HTTP client with retry + timeout + health check
- `apps/api/src/services/submission-worker.ts` — BullMQ worker with job processing
- `apps/ai-service/app/services/llm_client.py` — OpenRouter client with exponential backoff + timeout
- `apps/ai-service/app/routes/generate.py` — real LLM code generation route
- `apps/ai-service/app/routes/quiz.py` — real LLM quiz generation route
- `apps/ai-service/app/routes/diff.py` — offline AST diff (no external API)
- `apps/ai-service/app/routes/defend.py` — real LLM Socratic Q&A route
- `apps/ai-service/requirements.txt` — Python dependencies (openai, not anthropic)
- `.env.example` — all expected environment variables
- `infra/docker-compose.yml` — PostgreSQL and Redis configuration
