# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript (apps/web, apps/api), Python (apps/ai-service) | `apps/web/package.json`, `apps/api/package.json`, `apps/ai-service/requirements.txt` |
| Runtime + version | Node.js >=20; Python >=3.12 | `README.md` Prerequisites section |
| Package manager | pnpm 10.18.0 (monorepo), pip (Python AI service) | `package.json` (root), `apps/ai-service/requirements.txt` |
| Module/build system | Turborepo v2 (monorepo orchestration), Next.js 14 (web), tsc (API), Uvicorn (AI service) | `turbo.json`, `package.json` (root) |

### 2) Production Frameworks and Dependencies

#### apps/web (Frontend — Next.js 14)

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| next | 14.2.35 | React framework with App Router | `apps/web/package.json` |
| react / react-dom | ^18 | UI library and DOM renderer | `apps/web/package.json` |
| next-auth | 5.0.0-beta.25 | Authentication (Auth.js v5 beta) | `apps/web/package.json` |
| @tanstack/react-query | ^5.28.9 | Server state management / data fetching | `apps/web/package.json` |
| zustand | ^4.5.2 | Client-side state management | `apps/web/package.json` |
| framer-motion | ^11.0.24 | Animations library | `apps/web/package.json` |
| react-hook-form + @hookform/resolvers | ^7.51.2 / ^3.3.4 | Form handling with Zod validation | `apps/web/package.json` |
| zod | ^3.22.4 | Schema validation | `apps/web/package.json` |
| @monaco-editor/react | ^4.6.0 | Code editor component | `apps/web/package.json` |
| socket.io-client | ^4.7.5 | WebSocket client for real-time features | `apps/web/package.json` |
| recharts | ^2.12.3 | Charting library (IRS radar charts, etc.) | `apps/web/package.json` |
| @sentry/nextjs | ^7.109.0 | Error monitoring | `apps/web/package.json` |
| lucide-react | ^0.363.0 | Icon library | `apps/web/package.json` |
| tailwindcss | ^3.4.1 | Utility-first CSS framework | `apps/web/package.json` |
| tailwindcss-animate | ^1.0.7 | Tailwind animation plugin | `apps/web/package.json` |
| @radix-ui/react-slot | ^1.0.2 | Primitive for composable components | `apps/web/package.json` |

#### apps/api (Backend — Express + tRPC)

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| express | ^4.19.2 | HTTP server framework | `apps/api/package.json` |
| @trpc/server / @trpc/client | ^10.45.2 | Type-safe RPC framework | `apps/api/package.json` |
| @prisma/client | ^5.12.1 | Database ORM (PostgreSQL) | `apps/api/package.json` |
| @auth/prisma-adapter | ^1.6.0 | Prisma adapter for Auth.js | `apps/api/package.json` |
| bullmq | ^5.7.0 | Redis-backed job queue (Defend scheduling) | `apps/api/package.json` |
| socket.io | ^4.7.5 | WebSocket server for real-time rooms | `apps/api/package.json` |
| pino + pino-pretty | ^8.20.0 / ^11.0.0 | Logging | `apps/api/package.json` |
| zod | ^3.22.4 | Schema validation on API boundaries | `apps/api/package.json` |
| @sentry/node | ^7.109.0 | Error monitoring | `apps/api/package.json` |
| cors | ^2.8.5 | CORS middleware | `apps/api/package.json` |

#### apps/ai-service (AI Service — Python FastAPI)

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| fastapi | >=0.110.0 | Web framework for AI endpoints | `apps/ai-service/requirements.txt` |
| uvicorn | >=0.28.0 | ASGI server | `apps/ai-service/requirements.txt` |
| openai | >=1.0.0 | OpenAI SDK used as OpenRouter client (pointed at OpenRouter base URL) | `apps/ai-service/requirements.txt`, `apps/ai-service/app/services/llm_client.py` |
| httpx | >=0.27.0 | Async HTTP client (required by FastAPI test client) | `apps/ai-service/requirements.txt` |
| pydantic | >=2.6.4 | Request/response validation | `apps/ai-service/requirements.txt` |
| python-dotenv | >=1.0.1 | Environment variable loading | `apps/ai-service/requirements.txt` |
| loguru | >=0.7.2 | Logging | `apps/ai-service/requirements.txt` |
| anyio | >=4.3.0 | Async runtime bridge (used by `generate_async()`) | `apps/ai-service/requirements.txt` |
| pytest | >=8.0.0 | Test framework | `apps/ai-service/requirements.txt` |
| pytest-asyncio | >=0.23.0 | Async test support | `apps/ai-service/requirements.txt` |

#### Infrastructure

| Tool | Version | Role | Evidence |
|------|---------|------|----------|
| PostgreSQL | 16-alpine | Primary database | `infra/docker-compose.yml` |
| Redis | 7-alpine | Cache + BullMQ queue + Socket.io pub/sub | `infra/docker-compose.yml` |
| Cloudflare R2 | — | Object storage (code snapshots, PDF reports — planned) | `.env.example` |
| Turborepo | ^2.0.0 | Monorepo orchestration | `package.json`, `turbo.json` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| TypeScript ^5 | Type checking for web + api | `apps/web/package.json`, `apps/api/package.json` |
| ESLint ^8 (eslint:recommended) | Linting | `eslint.base.json` |
| eslint-config-next | Next.js-specific lint rules | `apps/web/.eslintrc.json` |
| PostCSS + Tailwind CSS | CSS processing + utility classes | `apps/web/postcss.config.mjs` |
| Prisma ^5.12.1 | Schema management + migrations | `apps/api/prisma/schema.prisma` |
| tsx ^4.7.2 | TypeScript execution for API | `apps/api/package.json` |
| Jest + ts-jest | TypeScript testing (API) | `apps/api/jest.config.ts` |
| pytest ^8 + pytest-asyncio | Python testing (AI service) | `apps/ai-service/requirements.txt` |
| Turborepo ^2.0.0 | Task orchestration across workspaces | `turbo.json` |

### 4) Key Commands

```bash
pnpm install              # Install all workspace dependencies
pnpm dev                  # Start all apps (Turborepo parallel)
pnpm build                # Build all apps
pnpm lint                 # Lint all workspaces
pnpm test                 # Run all workspace tests

# Python AI service (run from apps/ai-service/)
pip install -r requirements.txt     # Install Python deps
uvicorn app.main:app --reload       # Start AI service on port 8000
pytest tests/ -v                    # Run Python tests (28 tests)

# TypeScript API tests
pnpm --filter api test              # Run Jest tests (12 tests)

pnpm --filter web dev     # Frontend only (localhost:3000)
pnpm --filter api dev     # API only (localhost:4000)
```

### 5) Environment and Config

- Config sources: `.env` (root of repo), loaded by each app independently
- Required env vars: `DATABASE_URL`, `REDIS_URL`, `OPENROUTER_API_KEY`, `NEXTAUTH_SECRET`
- Optional env vars: `LLM_MODEL` (default: `google/gemini-2.0-flash-001`), `LLM_MAX_TOKENS` (default: 4096), `AI_SERVICE_PORT` (default: 8000), `OPENROUTER_BASE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `RESEND_API_KEY`, `SENTRY_DSN_WEB`, `SENTRY_DSN_API`, `NEXT_PUBLIC_POSTHOG_KEY`
- Deployment/runtime constraints: Vercel (frontend), Railway or Render (backend), Docker Compose for local dev

### 6) Evidence

- `package.json` (root)
- `pnpm-workspace.yaml`
- `turbo.json`
- `apps/web/package.json`
- `apps/api/package.json`
- `apps/ai-service/requirements.txt`
- `infra/docker-compose.yml`
- `.env.example`
