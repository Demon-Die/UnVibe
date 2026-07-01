# UnVibe Architecture Map

**Analysis Date:** 2026-06-30
**Scope:** Full codebase audit (236 TypeScript/TSX/Python source files across 3 apps + 1 shared package)

---

## 1. OVERVIEW

UnVibe is a **Turborepo monorepo** containing three independent services:

| App            | Directory          | Runtime                  | Port | Purpose                                    | Status                                          |
| -------------- | ------------------ | ------------------------ | ---- | ------------------------------------------ | ----------------------------------------------- |
| Web (Frontend) | `apps/web/`        | Node.js (Next.js 14)     | 3000 | UI rendering, client state, routing        | **Demo-ready** — all pages built with mock data |
| API (Backend)  | `apps/api/`        | Node.js (Express + tRPC) | 4000 | tRPC endpoints, database, queue, real-time | **Scaffolded** — only `/health` works           |
| AI Service     | `apps/ai-service/` | Python (FastAPI)         | 8000 | Claude AI, code generation, quiz/diff      | **Stubbed** — all 4 routes return mock data     |

**Supporting packages:**

- `packages/types/` — Shared TypeScript interfaces (`@unvibe/types`), built once, consumed by both `web` and `api`

**Infrastructure:**

- `infra/docker-compose.yml` — PostgreSQL 16 + Redis 7 for local dev

---

## 2. INTENT vs. REALITY GAP

> **Critical finding:** The README describes a fully functional system. The actual codebase is in an early scaffolded state.

| Claim in README                                                      | Reality                                                                                         | Delta               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------- |
| "AI generates production-grade code via Claude"                      | `apps/ai-service/app/routes/generate.py` returns hardcoded mock, Claude client is commented out | **Not implemented** |
| "Diff engine scores submissions"                                     | `apps/ai-service/app/routes/diff.py` returns hardcoded string                                   | **Not implemented** |
| "Quiz generated from annotations"                                    | `apps/ai-service/app/routes/quiz.py` returns 5 dummy questions                                  | **Not implemented** |
| "Defend Q&A generation from rebuild"                                 | `apps/ai-service/app/routes/defend.py` returns generic questions                                | **Not implemented** |
| "BullMQ job queue schedules Defend sessions"                         | Queue + Worker created but no jobs dispatched or processed                                      | **Scaffolded only** |
| "Socket.io real-time rooms"                                          | Server created with connect/disconnect logging only                                             | **Scaffolded only** |
| "6 tRPC routers (auth, modules, submissions, irs, warRoom, profile)" | Only 1 exists: `health` procedure                                                               | **Not started**     |
| "Prisma schema with migrations"                                      | Schema defined, but `prisma/migrations/` directory does not exist                               | **Not started**     |
| 3 learning tracks with 30 starter modules                            | 3 tracks with 4 mock modules in `mock-data/data.ts`                                             | **Mocks only**      |
| "GitHub Actions CI pipeline"                                         | Only a Discord notification workflow exists                                                     | **Not started**     |
| "Charts + IRS radar"                                                 | `IRSRadarChart` component renders Recharts with mock data                                       | **UI only**         |
| "Email via Resend"                                                   | `.env.example` references it, no code exists                                                    | **Not started**     |
| "Cloudflare R2 storage"                                              | `.env.example` references it, no code exists                                                    | **Not started**     |

**Summary:** The frontend is roughly **70% complete** (all routes mocked, visual in place). The backend is **10% complete** (scaffolded infrastructure, no real endpoints). The AI service is **5% complete** (stubs only). Tests are **0%**.

---

## 3. SERVICE BOUNDARIES

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                       │
│  Next.js 14 App Router · Monaco Editor · Socket.io Client · Recharts    │
│  Zustand (client state) · TanStack Query (server cache)                 │
│  Port: localhost:3000                                                   │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │ HTTP/tRPC │           │ WebSocket
          ▼           │           ▼
┌─────────────────────┼─────────────────────────┐
│  EXPRESS API (Node.js)                         │
│  ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ tRPC      │ │ BullMQ   │ │ Socket.io     │  │
│  │ (1 route) │ │ (Queue)  │ │ (no rooms)    │  │
│  └─────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│        │            │               │           │
│  ┌─────▼────────────▼───────────────▼───────┐   │
│  │ Prisma ORM (singleton)                   │   │
│  │ Pino Logger · Sentry · Zod              │   │
│  └─────────────────────────────────────────┘   │
│  Port: localhost:4000                          │
└─────────┬──────────────────┬────────────────────┘
          │                  │
          ▼                  ▼
  ┌──────────────┐   ┌──────────────┐
  │ PostgreSQL   │   │ Redis 7      │
  │ (Port 5432)  │   │ (Port 6379)  │
  └──────────────┘   └──────────────┘
                      ▲
                      │ HTTP
                      │
          ┌───────────┴─────────────────────────┐
          │  PYTHON FASTAPI AI SERVICE            │
          │  ┌──────────┐ ┌───────┐ ┌─────────┐  │
          │  │ /generate│ │/quiz  │ │ /diff   │  │
          │  │ (MOCK)   │ │(MOCK) │ │ (MOCK)  │  │
          │  └──────────┘ └───────┘ └─────────┘  │
          │  ┌──────────┐                        │
          │  │ /defend  │                        │
          │  │ (MOCK)   │                        │
          │  └──────────┘                        │
          │  Port: localhost:8000                 │
          └──────────────────────────────────────┘
```

### Service Communication Matrix

| From → To               | Protocol    | How                                                             | Status                                                                |
| ----------------------- | ----------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Browser → API           | HTTP        | tRPC via Express middleware at `/trpc`                          | **Route exists** — only `health` procedure registered                 |
| Browser → API           | WebSocket   | Socket.io client → Socket.io server                             | **Wired** — client created, server accepts connections, no room logic |
| Browser → AI Service    | Direct HTTP | Frontend could call AI service directly (not gated through API) | **Possible but not wired** — no frontend-to-AI call exists in code    |
| API → AI Service        | HTTP        | API calls AI service endpoints                                  | **Not implemented** — no route handlers exist to orchestrate this     |
| API → PostgreSQL        | SQL         | Prisma ORM                                                      | **Configured** — PrismaClient singleton created, no queries executed  |
| API → Redis             | TCP         | BullMQ + Socket.io (via ioredis)                                | **Configured** — lazy-init with connectivity check                    |
| AI Service → Claude API | HTTPS       | anthropic Python SDK                                            | **Commented out** — SDK installed, not used                           |

### Boundary Rules (Enforced by Architecture)

1. **Web never touches PostgreSQL** — all database access goes through the Express API via tRPC
2. **AI Service never reads/writes the database** — it's stateless, receives all context in API requests
3. **API is the orchestration hub** — frontend calls API, API calls AI service, API stores results
4. **Real-time features only through Socket.io** — all Defend sessions and War Room events go through the API's WebSocket server

---

## 4. EXISTING ROUTES (Real vs. Mock)

### 4a. Frontend Routes (`apps/web/src/app/`)

| Route                                      | File                                                                | Type          | Auth? | Status                                                                |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------- | ----- | --------------------------------------------------------------------- |
| `/`                                        | `apps/web/src/app/page.tsx`                                         | Landing page  | No    | **Real UI** — Full landing page with feature cards                    |
| `/auth/signin`                             | `apps/web/src/app/auth/signin/page.tsx`                             | Sign-in page  | No    | **Real UI** — GitHub/Google/email buttons, mock `signIn()`            |
| `/auth/signup`                             | `apps/web/src/app/auth/signup/page.tsx`                             | Sign-up page  | No    | **Real UI** — Registration form, mock `signIn()`                      |
| `/app/dashboard`                           | `apps/web/src/app/app/dashboard/page.tsx`                           | Dashboard     | Mock  | **Real UI** — Streak, IRS, radar chart, leaderboard, all mock data    |
| `/app/tracks`                              | `apps/web/src/app/app/tracks/page.tsx`                              | Track listing | Mock  | **Real UI** — 3 tracks with progress bars                             |
| `/app/tracks/[trackId]/modules/[moduleId]` | `apps/web/src/app/app/tracks/[trackId]/modules/[moduleId]/page.tsx` | Module player | Mock  | **Real UI** — Decode/Rebuild/Defend phases, Monaco editor, quiz, diff |
| `/app/war-room`                            | `apps/web/src/app/app/war-room/page.tsx`                            | War Room      | Mock  | **Real UI** — Live chat, leaderboard, mock socket feed                |
| `/app/profile`                             | `apps/web/src/app/app/profile/page.tsx`                             | User profile  | Mock  | **Real UI** — IRS radar, streak, recent modules                       |
| `/app/blindspot-map`                       | `apps/web/src/app/app/blindspot-map/page.tsx`                       | Blindspot map | Mock  | **Real UI** — Concept weakness cards with severity                    |
| `/app` (redirects → dashboard)             | `apps/web/src/app/app/page.tsx`                                     | Redirect      | Mock  | **Real** — redirect only                                              |

**Real = visually complete, uses mock API hooks, no backend dependency**

### 4b. API Routes (`apps/api/src/index.ts` via tRPC)

| Route                 | Type  | Implementation                               | Status              |
| --------------------- | ----- | -------------------------------------------- | ------------------- |
| `/health` (Express)   | GET   | Returns `{ status: "ok", service: "api" }`   | **Real** — works    |
| `/trpc/health` (tRPC) | query | Returns `{ status: "ok", timestamp }`        | **Real** — works    |
| All other tRPC routes | —     | Don't exist — no other procedures registered | **Not implemented** |

### 4c. AI Service Routes (`apps/ai-service/app/routes/`)

| Route                  | File          | Signature                                             | Status   | Returns                                                       |
| ---------------------- | ------------- | ----------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `POST /generate/`      | `generate.py` | `GenerateRequest { prompt, max_tokens }`              | **Mock** | Hardcoded string: `"Mock response for prompt: ..."`           |
| `POST /quiz/generate`  | `quiz.py`     | `topic: str, count: int`                              | **Mock** | 5 dummy questions with all answers set to `correct_option=0`  |
| `POST /defend/respond` | `defend.py`   | `DefendSessionRequest { session_id, messages, code }` | **Mock** | After 3 messages returns "passed=true", else generic question |
| `POST /diff/`          | `diff.py`     | `DiffRequest { original_code, updated_code }`         | **Mock** | Hardcoded explanation + diff string                           |
| `GET /health`          | `main.py`     | None                                                  | **Real** | `{ "status": "ok", "service": "ai-service" }`                 |

**All AI routes return mock data.** The `anthropic` SDK is installed (`requirements.txt`) but unused. The Generate route has a commented-out example of the real Anthropic call.

### 4d. API Routes — Not Yet Started

The README describes these tRPC routers that don't exist:

- `auth` router
- `modules` router
- `submissions` router
- `irs` router
- `warRoom` router
- `profile` router

---

## 5. DATA FLOW ANALYSIS

### The Core Learning Loop (as designed)

```
User selects module
       │
       ▼
  [Frontend] calls /trpc/modules.getModule({ trackId, moduleId })
       │
       ▼
  [API] receives tRPC call
       ├── Fetches module from PostgreSQL via Prisma
       ├── Calls AI Service POST /generate/ with problem prompt
       │      └── AI Service calls Anthropic Claude API
       │      └── Returns generated production code
       ├── Stores code in PostgreSQL (Submission)
       └── Returns module + code to frontend
       │
       ▼
  [Frontend] renders Decode phase
       ├── User annotates code → saved via debounced tRPC calls
       └── User passes comprehension quiz → unlocks Rebuild
       │
       ▼
  [Frontend] renders Rebuild phase
       ├── User writes code in Monaco editor
       ├── On submit: calls API /trpc/submissions.submit({ code })
       │      └── API calls AI Service POST /diff/ with original + user code
       │             └── AI Service runs AST diff engine
       │             └── Returns score + feedback
       └── Score stored → IRS Engine recalculates
       │
       ▼
  [Frontend] renders Defend phase
       ├── API queues Defend session via BullMQ
       ├── When session fires: AI Service generates questions from user's rebuild
       └── User answers → AI evaluates → score updated
```

### Actual Current Data Flow

```
User visits landing page (/)
       │
       ▼
  [Frontend] renders static UI
       │
       ▼
  User clicks "Open mock dashboard" → /app/dashboard
       │
       ▼
  [Frontend] useDashboardQuery() → getDashboard() (mock-data/api.ts)
       │
       ▼
  Returns mock data from memory (no HTTP calls)
  User sees fake IRS score, fake modules, fake leaderboard
       │
       ▼
  User clicks "Resume module" → /app/tracks/.../modules/...
       │
       ▼
  [Frontend] useModuleQuery() → getModule() (mock-data/api.ts)
       │
       ▼
  Returns mock module, mock annotations, mock quiz, mock diff
  Monaco editor shows mock source code
  Quiz shows 2 mock questions
  Diff shows 6 mock diff lines
       │
       ▼
  User clicks "Unlock rebuild" → phase switches client-side
  User clicks "Start defend" → shows mock defend UI
```

**Key observation:** The entire frontend operates entirely on client-side mock data. There are zero network calls to the backend or AI service during any user flow. The `socket.io-client` connects to the server (if running) but events are also generated client-side via `setInterval` in `WarRoomLive`.

---

## 6. DATABASE MODEL

**File:** `apps/api/prisma/schema.prisma`

```
User (1) ──┬── (N) Account          [NextAuth adapter tables]
           ├── (N) Session
           ├── (N) Submission        [user's code submissions]
           ├── (N) DefendSession     [defend Q&A sessions]
           └── (N) IRSScore          [IRS score snapshots]

Track (1) ── (N) Module             [learning modules in a track]
Module (1) ── (N) Submission        [submissions for this module]
Module (1) ── (N) DefendSession     [defend sessions for this module]

WarRoom     [standalone — no relations defined]
```

**Current state:** Schema is defined but **no migrations exist** (`prisma/migrations/` is absent). The database cannot be created. Running `pnpm db:migrate` would generate the first migration.

**Missing models** compared to README:

- No `Annotation` model (annotations are client-side mock only)
- No `Quiz` model (quizzes are client-side mock only)
- No `DiffScore` or `Score` model (diff scoring is stubbed)

---

## 7. TECH STACK — ACTUAL vs. CLAIMED

### Frontend (`apps/web/`)

| Category       | Claimed (README)            | Actual                        | Status                              |
| -------------- | --------------------------- | ----------------------------- | ----------------------------------- |
| Framework      | Next.js 14 App Router       | Next.js 14.2.35               | ✅ Exact match                      |
| Language       | TypeScript                  | TypeScript ^5                 | ✅                                  |
| Styling        | Tailwind CSS                | Tailwind CSS 3.4.1            | ✅                                  |
| Components     | shadcn/ui                   | shadcn/ui (6 base components) | ✅ Partial                          |
| Code editor    | Monaco Editor               | `@monaco-editor/react` 4.6.0  | ✅                                  |
| Animations     | Framer Motion               | framer-motion ^11.0.24        | ✅ (installed, not used yet)        |
| State (client) | Zustand                     | Zustand ^4.5.2                | ✅ 3 stores                         |
| Server state   | TanStack Query              | @tanstack/react-query ^5.28.9 | ✅                                  |
| Real-time      | Socket.io Client            | socket.io-client ^4.7.5       | ✅                                  |
| Forms          | React Hook Form + Zod       | Both installed                | ✅ (not used yet — pages are basic) |
| Charts         | Recharts                    | Recharts ^2.12.3              | ✅                                  |
| Diff viewer    | react-diff-viewer-continued | **Not installed**             | ❌ (mock uses simple divs)          |
| Error tracking | Sentry                      | @sentry/nextjs ^7.109.0       | ✅                                  |

### Backend (`apps/api/`)

| Category         | Claimed (README) | Actual                      | Status                 |
| ---------------- | ---------------- | --------------------------- | ---------------------- |
| Runtime          | Node.js          | Node.js (via tsx)           | ✅                     |
| Framework        | Express          | Express ^4.19.2             | ✅                     |
| API contract     | tRPC             | @trpc/server ^10.45.2       | ✅                     |
| Auth             | NextAuth.js v5   | @auth/prisma-adapter ^1.6.0 | ✅ (adapter installed) |
| Database ORM     | Prisma           | @prisma/client ^5.12.1      | ✅                     |
| Job queue        | BullMQ           | bullmq ^5.7.0               | ✅                     |
| Real-time server | Socket.io        | socket.io ^4.7.5            | ✅                     |
| PDF generation   | Puppeteer        | **Not installed**           | ❌                     |
| Logging          | Pino             | pino ^8.20.0 + pino-pretty  | ✅                     |

### AI Service (`apps/ai-service/`)

| Category       | Claimed (README)                   | Actual              | Status                  |
| -------------- | ---------------------------------- | ------------------- | ----------------------- |
| Language       | Python 3.12                        | Python 3.12+        | ✅                      |
| Framework      | FastAPI                            | fastapi >=0.110.0   | ✅                      |
| LLM            | Anthropic Claude                   | anthropic >=0.21.0  | ✅ Installed, ❌ Unused |
| Code execution | Judge0                             | **Not installed**   | ❌                      |
| Diff engine    | Python difflib + custom AST scorer | **Not implemented** | ❌                      |

### Infrastructure

| Category         | Claimed (README) | Actual                                 | Status     |
| ---------------- | ---------------- | -------------------------------------- | ---------- |
| Database         | PostgreSQL 16    | PostgreSQL 16-alpine in docker-compose | ✅         |
| Cache/pub-sub    | Redis 7          | Redis 7-alpine in docker-compose       | ✅         |
| Object storage   | Cloudflare R2    | No SDK, no code                        | ❌         |
| Monorepo         | Turborepo        | Turborepo ^2.0.0                       | ✅         |
| Package manager  | pnpm             | pnpm 10.18.0                           | ✅         |
| Frontend hosting | Vercel           | Not configured                         | ❌         |
| Backend hosting  | Railway/Render   | Not configured                         | ❌         |
| CI/CD            | GitHub Actions   | Only Discord notification workflow     | ❌ Partial |
| Error tracking   | Sentry           | Sentry configured (mock DSN)           | ✅ Partial |
| Analytics        | PostHog          | No SDK imported, no code               | ❌         |
| Email            | Resend           | No SDK, no code                        | ❌         |

---

## 8. COMPONENT INVENTORY

### Web App Components (`apps/web/src/components/`)

**UI primitives** (shadcn):

| Component | File                         | Dependencies                         |
| --------- | ---------------------------- | ------------------------------------ |
| Badge     | `components/ui/badge.tsx`    | Radix Slot, class-variance-authority |
| Button    | `components/ui/button.tsx`   | Radix Slot, class-variance-authority |
| Card      | `components/ui/card.tsx`     | React                                |
| Input     | `components/ui/input.tsx`    | React                                |
| Progress  | `components/ui/progress.tsx` | Radix Progress                       |
| Textarea  | `components/ui/textarea.tsx` | React                                |

**App Shell components:**

| Component       | File                                  | Purpose                                                |
| --------------- | ------------------------------------- | ------------------------------------------------------ |
| AppShell        | `components/app/app-shell.tsx`        | Sidebar nav + top bar + mobile bottom nav + auth store |
| PageHeader      | `components/app/page-header.tsx`      | Consistent page title/description/action pattern       |
| ThemeController | `components/app/theme-controller.tsx` | Dark/light toggle button                               |
| ThemeProvider   | `components/app/theme-provider.tsx`   | CSS class toggle on `<html>`                           |
| LoadingPanel    | `components/app/loading-panel.tsx`    | Spinner with optional label                            |

**Feature components:**

| Component        | File                                        | Uses Real Backend?                       |
| ---------------- | ------------------------------------------- | ---------------------------------------- |
| ModulePlayer     | `components/features/module-player.tsx`     | ❌ — all Zustand + mock data             |
| CodeEditor       | `components/features/code-editor.tsx`       | ❌ — Monaco editor, local state only     |
| AnnotationEditor | `components/features/annotation-editor.tsx` | ❌ — local useState                      |
| QuizUI           | `components/features/quiz-ui.tsx`           | ❌ — local useState                      |
| CodeSubmission   | `components/features/code-submission.tsx`   | ❌ — local useState                      |
| DiffViewer       | `components/features/diff-viewer.tsx`       | ❌ — renders mock DiffLine data          |
| IRSRadarChart    | `components/features/irs-radar-chart.tsx`   | ❌ — Recharts with mock data             |
| Leaderboard      | `components/features/leaderboard.tsx`       | ❌ — mock leaderboard entries            |
| StreakTracker    | `components/features/streak-tracker.tsx`    | ❌ — mock streak number                  |
| WarRoomLive      | `components/features/war-room-live.tsx`     | ❌ — client-side intervals + mock socket |

### Zustand Stores

| Store            | File                     | State                                          |
| ---------------- | ------------------------ | ---------------------------------------------- |
| `useAuthStore`   | `stores/auth-store.ts`   | Mock user, signIn/signOut (no real auth check) |
| `useEditorStore` | `stores/editor-store.ts` | Phase, code, language, dirty flag              |
| `useUIStore`     | `stores/ui-store.ts`     | Dark mode toggle, sidebar state                |

### Mock Data Layer

| File                     | Purpose                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `lib/mock-data/types.ts` | All Mock* interfaces (MockTrack, MockModule, Annotation, etc.)                                          |
| `lib/mock-data/data.ts`  | 3 tracks, 4 modules, 2 annotations, 2 quiz questions, 6 diff lines, leaderboard, blindspots, radar data |
| `lib/mock-data/api.ts`   | Async mock API functions with 240ms delay                                                               |
| `lib/mock-data/hooks.ts` | TanStack Query hooks wrapping the mock API                                                              |

---

## 9. AUTH STATUS

| Layer           | Claimed                  | Actual                                                                                                                           |
| --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| NextAuth v5     | GitHub + Google OAuth    | Configured in `apps/web/src/auth.ts`, route handler at `apps/web/src/app/api/auth/[...nextauth]/route.ts`                        |
| Prisma adapter  | Database-backed sessions | `@auth/prisma-adapter` installed, schema has Account/Session/VerificationToken models                                            |
| Auth middleware | Protect routes           | `apps/web/src/middleware.ts` applies `auth` middleware to all routes except `/api`, `/_next/static`, `/_next/image`              |
| tRPC auth       | Protected procedures     | **Does not exist** — only `publicProcedure` is exported from `apps/api/src/trpc.ts`                                              |
| Session check   | Real session             | **Not implemented** — `apps/web/src/stores/auth-store.ts` uses mock user, sign-in buttons just call `set({ user: defaultUser })` |
| Sign-in flow    | OAuth redirect           | OAuth buttons exist but do nothing functional — mock `signIn()` sets a hardcoded user                                            |

**Auth gap:** The NextAuth configuration is correct, but the frontend's `auth-store.ts` bypasses it entirely with a hardcoded mock user. The API has no auth protection on any tRPC endpoint.

---

## 10. TEST COVERAGE

| Area                             | Files               | Tests                                                                            | Framework              |
| -------------------------------- | ------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| Web app (`apps/web/`)            | ~130 .ts/.tsx files | **0**                                                                            | Not configured         |
| API (`apps/api/`)                | 3 .ts files         | **0**                                                                            | Not configured         |
| AI Service (`apps/ai-service/`)  | 6 .py files         | **0** (source files deleted, only .pyc artifacts remain in `tests/__pycache__/`) | pytest artifacts found |
| Shared types (`packages/types/`) | 1 .ts file          | **0**                                                                            | Not configured         |

**The entire monorepo has zero tests.**

---

## 11. CI/CD STATUS

| Pipeline              | File                                               | Status                                           |
| --------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Discord notifications | `.github/workflows/discord.yml`                    | ✅ Working — issues/PRs/releases post to Discord |
| CI (lint + test)      | `.github/workflows/ci.yml` (claimed in README)     | ❌ Does not exist                                |
| Deploy                | `.github/workflows/deploy.yml` (claimed in README) | ❌ Does not exist                                |

---

## 12. DEPENDENCY LAYERING

```
packages/types
       │
       ▼
apps/web ──tRPC──► apps/api ──HTTP──► apps/ai-service
                       │
                       ▼
                 PostgreSQL + Redis
```

- `packages/types` is built first (the `^build` dependency in `turbo.json`)
- `apps/web` and `apps/api` both depend on `@unvibe/types`
- `apps/ai-service` is independent — communicates via HTTP only
- No circular dependencies detected

---

## 13. CONFIGURATION FILES

| File                               | Purpose                                                     | Status                     |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------- |
| `turbo.json`                       | Task pipeline (build, lint, test, dev, db:migrate, db:seed) | ✅ Complete                |
| `pnpm-workspace.yaml`              | Workspace definition (`apps/*`, `packages/*`)               | ✅                         |
| `tsconfig.base.json`               | Shared TS config (es2022, strict, bundler moduleResolution) | ✅                         |
| `eslint.base.json`                 | Base ESLint (eslint:recommended, es2022)                    | ✅                         |
| `apps/web/tsconfig.json`           | Web TS config + `@/*` path alias                            | ✅                         |
| `apps/web/next.config.mjs`         | Next.js config + Sentry                                     | ✅                         |
| `apps/web/tailwind.config.ts`      | Tailwind CSS with CSS variables                             | ✅                         |
| `apps/web/postcss.config.mjs`      | PostCSS with Tailwind plugin                                | ✅                         |
| `apps/web/sentry.client.config.ts` | Sentry client config                                        | ✅                         |
| `apps/web/sentry.server.config.ts` | Sentry server config                                        | ✅                         |
| `apps/web/sentry.edge.config.ts`   | Sentry edge config                                          | ✅                         |
| `apps/web/components.json`         | shadcn/ui config                                            | ✅                         |
| `apps/api/tsconfig.json`           | API TS config (CommonJS output)                             | ✅                         |
| `apps/api/prisma/schema.prisma`    | Database schema (PostgreSQL)                                | ✅ — no migrations         |
| `infra/docker-compose.yml`         | PostgreSQL + Redis for local dev                            | ✅ — includes healthchecks |
| `apps/web/.eslintrc.json`          | Web ESLint extends Next.js rules                            | ✅                         |

---

## 14. KEY FILE LOCATIONS

### Entry Points

| Service    | File                          | Start Command                               |
| ---------- | ----------------------------- | ------------------------------------------- |
| Web        | `apps/web/src/app/layout.tsx` | `pnpm --filter web dev`                     |
| API        | `apps/api/src/index.ts`       | `pnpm --filter api dev`                     |
| AI Service | `apps/ai-service/app/main.py` | `uvicorn app.main:app --reload --port 8000` |

### Configuration

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `package.json` (root) | Monorepo scripts, turbo dependency   |
| `.env.example`        | Required env vars with documentation |
| `turbo.json`          | Build/lint/test/dev pipeline         |
| `pnpm-workspace.yaml` | Workspace package discovery          |

### Core Files by Service

**Web (Frontend):**

- `apps/web/src/app/page.tsx` — Landing page
- `apps/web/src/app/layout.tsx` — Root layout with Geist fonts, providers, theme
- `apps/web/src/app/providers.tsx` — TanStack Query client
- `apps/web/src/auth.ts` — NextAuth config (GitHub + Google)
- `apps/web/src/middleware.ts` — Auth middleware on all routes
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — Auth API route handler
- `apps/web/src/stores/auth-store.ts` — Mock auth store
- `apps/web/src/stores/editor-store.ts` — Editor state (phase, code)
- `apps/web/src/stores/ui-store.ts` — Theme + sidebar state
- `apps/web/src/lib/mock-data/hooks.ts` — All TanStack Query hooks (mock)
- `apps/web/src/lib/mock-data/api.ts` — All mock API functions
- `apps/web/src/lib/mock-data/data.ts` — All mock data
- `apps/web/src/lib/trpc/client.ts` — tRPC client (only health endpoint)
- `apps/web/src/lib/socket/client.ts` — Socket.io client singleton
- `apps/web/src/components/app/app-shell.tsx` — Main app shell with sidebar

**API (Backend):**

- `apps/api/src/index.ts` — Express server, tRPC, BullMQ, Socket.io, Prisma, Sentry
- `apps/api/src/trpc.ts` — tRPC init, error formatting
- `apps/api/prisma/schema.prisma` — Database schema (9 models)

**AI Service:**

- `apps/ai-service/app/main.py` — FastAPI app, route registration
- `apps/ai-service/app/routes/generate.py` — Code generation (MOCK)
- `apps/ai-service/app/routes/quiz.py` — Quiz generation (MOCK)
- `apps/ai-service/app/routes/defend.py` — Defend Q&A (MOCK)
- `apps/ai-service/app/routes/diff.py` — Diff scoring (MOCK)

**Shared:**

- `packages/types/src/index.ts` — 7 TypeScript interfaces

---

## 15. RISK MAP

| Risk                                     | Severity     | Files                                                                       | Impact                                         |
| ---------------------------------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| All AI endpoints mocked                  | **Critical** | `apps/ai-service/app/routes/generate.py`, `quiz.py`, `defend.py`, `diff.py` | Core product loop doesn't work                 |
| No database migrations                   | **Critical** | `apps/api/prisma/` — no `migrations/` directory                             | `pnpm db:migrate` will fail, no tables created |
| Zero test coverage                       | **High**     | All files                                                                   | Every change is a blind deployment             |
| No auth on tRPC                          | **High**     | `apps/api/src/trpc.ts` — only `publicProcedure`                             | All endpoints are public by default            |
| CORS wildcard on both API + AI           | **High**     | `apps/api/src/index.ts`, `apps/ai-service/app/main.py`                      | CSRF-attack surface                            |
| No service layer (logic in routes)       | **Medium**   | `apps/api/src/index.ts`, all `apps/ai-service/app/routes/`                  | Untestable, unmaintainable as project grows    |
| BullMQ + Socket.io scaffolded but unused | **Low**      | `apps/api/src/index.ts`                                                     | Dead code, confusing to on-boarders            |
| Mock auth bypasses NextAuth              | **Medium**   | `apps/web/src/stores/auth-store.ts`                                         | Auth appears to work but is entirely fake      |
| Monolithic API entry point               | **Medium**   | `apps/api/src/index.ts` (115 lines, 7 responsibilities)                     | Hard to reason about, modify, or test          |

---

## 16. WHERE TO ADD NEW CODE

### New Frontend Page

- Page component: `apps/web/src/app/app/<page-name>/page.tsx`
- Add nav link: `apps/web/src/components/app/app-shell.tsx` (the `nav` array)
- If it needs data: Use `useQuery` with mock hook pattern from `lib/mock-data/hooks.ts`

### New API Endpoint

- tRPC procedure: `apps/api/src/index.ts` (add to `appRouter`)
- Auth wrapper: Create a `protectedProcedure` in `apps/api/src/trpc.ts` first

### New AI Endpoint

- Route file: `apps/ai-service/app/routes/<name>.py`
- Register: Add `app.include_router(<name>.router)` in `apps/ai-service/app/main.py`

### New Database Model

- Add model: `apps/api/prisma/schema.prisma`
- Migrate: `pnpm db:migrate` (generates initial migration)
- Update types: `packages/types/src/index.ts`

### New Shared Type

- Add interface: `packages/types/src/index.ts`
- Build: `pnpm --filter @unvibe/types build`

---

## 17. COMMIT HISTORY (Last 20)

```
ed4838c Merge pull request #13 — feat/frontend-app-shell
0241a23 feat: implement global dark/light mode system with gradient backgrounds
d508103 feat(web): add mock product pages (dashboard, tracks, war-room, profile, blindspot-map)
87baf3e feat(web): build interactive learning components (module-player, code-editor, etc.)
99c6ae1 feat(web): add mock data and client state (mock-data/*, stores/*)
168c293 feat(web): add command center UI foundation (app-shell, landing)
2c988c1 Merge pull request #12 from Yuvraj-Sarathe/main
747aca0 docs (moved docs/codebase/* to .planning/intel)
d380ed8 pkg (package.json fixes)
be054b1 cleanup (deleted packages/config/, moved configs)
d99aa79 Update discord.yml
a38047b Create discord.yml
b8a93a6 Add Code of Conduct
2c00638 chore: scaffold Turborepo workspace (initial structure)
e4170dd Add MIT License
b81a9bb Revise README
3f5100d Revise README with new branding
3e7f153 Initial commit
```

**Churn pattern:** Recent work is exclusively frontend (last 6 commits = web UI). The API and AI service were scaffolded once and largely untouched. Shared types have been stable since initial creation.

---

_This document supersedes the earlier docs/codebase/_ files with a single comprehensive view. Analysis date: 2026-06-30. Source: full codebase audit of 236 files across 3 apps + 1 shared package.*
