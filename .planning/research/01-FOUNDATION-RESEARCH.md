# Phase 1: Foundation — Research

**Researched:** 2026-07-01
**Domain:** Monorepo infrastructure, Docker, code formatting, database seeding, tRPC client setup
**Confidence:** HIGH

## Summary

UnVibe is a pnpm-based Turborepo monorepo with three apps (Next.js 14 web, Express/tRPC API, Python FastAPI AI service) and one shared types package. The codebase currently runs on mock data and local-only infrastructure. Phase 1 establishes the production foundation: code formatting standards, containerized local development, Vercel deployment config, seed data, and a proper tRPC client to replace all mock-data hooks.

**Key tension to resolve:** The API currently listens on port 4000 by default, but the Docker Compose requirement specifies port 3001 for the API service. The research recommends keeping local dev on port 4000 (no breaking change to existing dev workflow) and only using 3001 inside Docker Compose, with `NEXT_PUBLIC_API_URL` handling the routing difference.

**Primary recommendation:** Execute the 6 sub-items in dependency order: Prettier → Seed data (blocks nothing) → Docker Compose + Dockerfiles (parallel) → Vercel config → tRPC client (depends on knowing the API URL from Docker Compose).

## Architectural Responsibility Map

| Capability              | Primary Tier                | Secondary Tier | Rationale                                                                             |
| ----------------------- | --------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| Code formatting         | Root monorepo               | —              | Prettier must be consistent across all apps; enforced via turbo.json                  |
| Container orchestration | Infrastructure              | —              | Docker Compose lives at `infra/`; not part of any app                                 |
| Container builds        | Each app                    | —              | `apps/api/Dockerfile` and `apps/ai-service/Dockerfile` owned by their respective apps |
| Vercel deployment       | Web app                     | —              | `apps/web/vercel.json` is web-only; Vercel auto-detects Next.js                       |
| Database seeding        | API app                     | Prisma ORM     | Seed script lives in `apps/api/prisma/` and uses Prisma Client                        |
| tRPC client hooks       | Web app                     | Shared types   | Hooks created via `@trpc/react-query` in web; types imported from `@unvibe/types`     |
| Data fetching           | Web app (Client Components) | API app        | Client components call tRPC via httpBatchLink to the API                              |

## Standard Stack

### Core

| Library           | Version  | Purpose                  | Why Standard                                                           |
| ----------------- | -------- | ------------------------ | ---------------------------------------------------------------------- |
| Prettier          | 3.9.4    | Code formatting          | Zero-config, all-language formatter; required for monorepo consistency |
| Docker Compose    | v3.8+    | Local orchestration      | Industry standard for multi-container dev environments                 |
| judge0/judge0     | 1.13.1   | Sandboxed code execution | Mature open-source code execution engine, 60+ languages, Docker-native |
| @trpc/react-query | ^10.45.2 | tRPC React hooks         | Must match API's `@trpc/server` ^10.45.2 for type compatibility        |
| @trpc/client      | ^10.45.2 | tRPC HTTP transport      | Already in API; needs to be in web too for `httpBatchLink`             |

### Supporting

| Library                     | Version | Purpose                | When to Use                                                               |
| --------------------------- | ------- | ---------------------- | ------------------------------------------------------------------------- |
| prettier-plugin-tailwindcss | —       | Tailwind class sorting | If Tailwind classes are used (they are — install as dev dep)              |
| superjson                   | —       | tRPC data transformer  | If you need Date/Map serialization through tRPC (deferred to later phase) |

### Alternatives Considered

| Instead of                     | Could Use                               | Tradeoff                                                                                  |
| ------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| tRPC v10 (`@trpc/react-query`) | tRPC v11 (`@trpc/tanstack-react-query`) | API is on v10; upgrading both to v11 is Phase 1 scope creep. Stay on v10 for consistency. |
| Root `.prettierrc`             | Per-app prettier configs                | Monorepo consistency demands a single source of truth; per-app would cause drift          |

**Installation (tRPC client packages):**

```bash
pnpm --filter web add @trpc/react-query@^10.45.2 @trpc/client@^10.45.2
```

**Installation (Prettier):**

```bash
pnpm add -Dw prettier@^3.9.4 prettier-plugin-tailwindcss
```

**Version verification:**

```bash
npm view prettier version          # 3.9.4 [VERIFIED: npm registry]
npm view @trpc/react-query version # 11.18.0 BUT we need ^10.45.2 [VERIFIED: npm registry]
```

> **CRITICAL NOTE:** `@trpc/react-query` latest is 11.18.0. We MUST pin to ^10.45.2 to match the API. The v10 and v11 APIs are incompatible (`trpc.x.useQuery()` in v10 vs `useQuery(trpc.x.queryOptions())` in v11).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js 14)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Client Components           Server Components             │  │
│  │  ┌──────────────────────┐   ┌──────────────────────────┐  │  │
│  │  │ tRPC React Hooks     │   │ Server Actions / RSC     │  │  │
│  │  │ (useQuery/useMutate) │   │ (direct Prisma via       │  │  │
│  │  │                      │   │  createCallerFactory)    │  │  │
│  │  └──────────┬───────────┘   └──────────────────────────┘  │  │
│  │             │                                                │  │
│  └─────────────┼─────────────────────────────────────────────┘  │
└────────────────┼────────────────────────────────────────────────┘
                 │ http://localhost:3000/api/trpc (if embedded)
                 │   OR http://localhost:4000/trpc (standalone Express)
                 │
┌────────────────┼────────────────────────────────────────────────┐
│   Docker Compose / Local Dev                                   │
│                                                                │
│  ┌──────────────┴──────────────┐  ┌───────────────────────────┐ │
│  │  API (Express + tRPC)      │  │  AI Service (FastAPI)     │ │
│  │  Port 3001 (Docker)        │  │  Port 8000                │ │
│  │  Port 4000 (local dev)     │  │  /generate, /quiz,        │ │
│  │  /trpc endpoint            │  │  /diff, /defend           │ │
│  │  /health endpoint          │  │  + /health                │ │
│  └────────────┬───────────────┘  └───────────┬───────────────┘ │
│               │                               │                 │
│               ▼                               │                 │
│  ┌──────────────────────────┐                │                 │
│  │  PostgreSQL (Postgres)   │                │                 │
│  │  Port 5432               │                │                 │
│  │  DB: unvibe              │                │                 │
│  └──────────────────────────┘                │                 │
│               ▲                              │                 │
│  ┌────────────┴──────────────┐               │                 │
│  │  Redis                    │               │                 │
│  │  Port 6379                │               │                 │
│  └───────────────────────────┘               │                 │
│                                              │                 │
│  ┌───────────────────────────────────────────┴───────────────┐ │
│  │  Judge0 (sandboxed code execution)                        │ │
│  │  Port 2358                                                │ │
│  │  POST /submissions → execute code → return token/result   │ │
│  │  Requires: own postgres, own redis, privileged mode       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 1 additions)

```
.
├── .prettierrc                          # NEW — root prettier config
├── turbo.json                           # MODIFY — add prettier task
├── infra/
│   └── docker-compose.yml               # MODIFY — add api, ai-service, judge0
├── apps/
│   ├── api/
│   │   ├── Dockerfile                   # NEW — multi-stage slim Node build
│   │   └── prisma/
│   │       └── seed.ts                  # NEW — Prisma seed script
│   ├── ai-service/
│   │   ├── Dockerfile                   # NEW — multi-stage slim Python build
│   │   └── requirements.txt             # EXISTING — verify uvicorn is present
│   └── web/
│       ├── vercel.json                  # NEW — Vercel deployment config
│       ├── package.json                 # MODIFY — add @trpc/react-query, @trpc/client
│       └── src/
│           ├── lib/
│           │   └── trpc/
│           │       ├── client.ts        # REWRITE — full createTRPCReact setup
│           │       └── provider.tsx     # NEW — TRPCProvider component
│           └── app/
│               ├── providers.tsx        # MODIFY — wrap with TRPCProvider
│               └── (page files)         # MODIFY — replace mock-data imports
└── packages/
    └── types/
        └── src/
            └── index.ts                 # EXISTING — may need new types for tRPC responses
```

### Pattern 1: tRPC Client Setup (v10 with Express backend)

**What:** Create a type-safe tRPC client that connects to the standalone Express API.

**When to use:** In `apps/web/src/lib/trpc/client.ts` — this is the single file that provides typed hooks for the entire frontend.

**Pattern (tRPC v10 with separate Express backend):**

```typescript
// apps/web/src/lib/trpc/client.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@unvibe/api"; // or a shared router type

export const trpc = createTRPCReact<AppRouter>();
```

The API currently exports `AppRouter` from `apps/api/src/index.ts`. However, since the web app shouldn't import server-side code, the recommended approach is to create a shared type package with the router type, or re-export it from a dedicated types entry point in the API package.

**Provider pattern:**

```tsx
// apps/web/src/lib/trpc/provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/trpc`,
          // Forward auth cookies automatically (credentials: "include" not needed
          // for same-origin; the API reads authjs.session-token cookie directly)
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Pattern 2: Multi-stage Dockerfile (Node.js — pnpm)

**What:** Build the API app in a multi-stage Dockerfile using pnpm.

**When to use:** For `apps/api/Dockerfile`.

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter api build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Pattern 3: Multi-stage Dockerfile (Python — FastAPI)

**What:** Build the AI service in a multi-stage Dockerfile.

**When to use:** For `apps/ai-service/Dockerfile`.

```dockerfile
# Stage 1: Install dependencies
FROM python:3.11-slim AS builder
WORKDIR /app
COPY apps/ai-service/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production runtime
FROM python:3.11-slim AS runner
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY apps/ai-service/ .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Anti-Patterns to Avoid

- **Creating QueryClient outside useState:** In Next.js App Router, creating `new QueryClient()` outside a component leads to cache sharing between users on SSR. Always use `useState`.
- **Importing API server code in web app:** `import type { AppRouter } from "@unvibe/api"` pulls server dependencies. Instead, create a shared router type or use a dedicated export path.
- **Judge0 without its own database:** Judge0 requires its own PostgreSQL and Redis instances — sharing them with the app's instances causes conflicts and data mixing.

## Don't Hand-Roll

| Problem                     | Don't Build                              | Use Instead                | Why                                                                                                         |
| --------------------------- | ---------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Code formatting config      | Custom ESLint formatting rules           | Prettier                   | Prettier auto-formats 20+ languages; ESLint formatting rules are brittle and slow                           |
| Sandboxed code execution    | Custom Docker-in-Docker runner           | Judge0                     | Judge0 handles sandboxing, language detection, timeouts, memory limits; countless edge cases in custom impl |
| tRPC HTTP transport         | Custom fetch wrapper with error handling | @trpc/client httpBatchLink | Batch link deduplicates requests, handles retries, provides proper TypeScript inference                     |
| Data fetch state management | Custom loading/error state tracking      | TanStack React Query       | Caching, refetching, stale-while-revalidate, suspense support, devtools                                     |

**Key insight:** Every item in this table represents a class of problems where the ecosystem has already solved edge cases that would take weeks to rediscover. Judge0 in particular is critical — building a secure code execution sandbox involves container escape prevention, resource accounting, timeout enforcement, and language-specific compilation — all of which Judge0 ships out of the box.

## Common Pitfalls

### Pitfall 1: tRPC v10 vs v11 Package Mismatch

**What goes wrong:** Installing the latest `@trpc/react-query` (v11) while the API uses `@trpc/server` v10. The v11 package is `@trpc/tanstack-react-query` with a completely different API (`createTRPCContext` instead of `createTRPCReact`, `useQuery(trpc.x.queryOptions())` instead of `trpc.x.useQuery()`).
**Why it happens:** `npm view @trpc/react-query version` shows 11.18.0 as latest. The v10 package is still installable but unpinned installs grab v11.
**How to avoid:** Pin to `@trpc/react-query@^10.45.2` in `apps/web/package.json` — match the API's version exactly.
**Warning signs:** TypeScript errors about missing `createTRPCReact`, or `trpc.x.useQuery is not a function`.

### Pitfall 2: Judge0 Docker Privileged Mode

**What goes wrong:** Judge0 containers crash or fail to execute code because they run in privileged mode but the Docker Compose file doesn't set `privileged: true`.
**Why it happens:** Judge0 uses `isolate` (a Linux sandbox) which requires `--privileged` or specific seccomp profiles. Windows Docker Desktop handles this differently.
**How to avoid:** Set `privileged: true` on both the `server` and `worker` Judge0 services. On Windows, ensure WSL2 backend is enabled for Docker Desktop.
**Warning signs:** Judge0 returns HTTP 500 on submission, container logs show "Operation not permitted", or the worker crashes on startup.

### Pitfall 3: Seed Script Runs Before Prisma Migration

**What goes wrong:** `pnpm db:seed` fails with "relation does not exist" because the database hasn't been migrated yet.
**Why it happens:** The seed script uses Prisma Client which queries actual tables. If migrations haven't run, tables don't exist.
**How to avoid:** Ensure `turbo.json` `db:seed` task depends on `db:migrate`. Chain: `db:migrate` → `db:seed`.
**Warning signs:** Prisma error `P2021: The table does not exist in the current database`.

### Pitfall 4: Monorepo Type Import for AppRouter

**What goes wrong:** `import type { AppRouter } from "@unvibe/api"` fails because the API package may not export its types or the import pulls server-side code into the browser bundle.
**Why it happens:** The API's `package.json` may not have a `types` export for the router, or TypeScript resolves to the actual runtime code.
**How to avoid:** Either (a) add a `types` re-export in API's package.json, (b) create a shared `@unvibe/trpc-types` package, or (c) if the API is in the same monorepo, use a tsconfig path alias.
**Warning signs:** Webpack error about importing `express` in browser code, or TypeScript "cannot find module" errors.

## Code Examples

### 1. Root `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 2. `turbo.json` with Prettier task

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false,
      "dependsOn": ["db:migrate"]
    },
    "format": {
      "dependsOn": ["^format"]
    },
    "format:check": {
      "dependsOn": ["^format:check"]
    }
  }
}
```

### 3. `apps/web/vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npx turbo build --filter=web",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "rootDirectory": ".",
  "ignoreCommand": "npx turbo-ignore"
}
```

### 4. Seed script (`apps/api/prisma/seed.ts`)

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create or find a sample user
  const user = await prisma.user.upsert({
    where: { email: "demo@unvibe.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@unvibe.dev",
    },
  });

  // Create tracks with modules
  const frontendTrack = await prisma.track.upsert({
    where: { id: "frontend-systems" },
    update: {},
    create: {
      id: "frontend-systems",
      title: "Frontend Systems",
      description: "State, data fetching, auth surfaces, and editor-heavy product screens.",
      published: true,
      modules: {
        create: [
          {
            id: "auth-guard-rebuild",
            title: "Auth guard rebuild",
            content: "Decode a session guard and rebuild its branching logic from memory.",
            order: 1,
          },
          {
            id: "query-cache",
            title: "Query cache policy",
            content: "Reason about stale time, optimistic data, and recovery states.",
            order: 2,
          },
        ],
      },
    },
  });

  const aiTrack = await prisma.track.upsert({
    where: { id: "ai-workflows" },
    update: {},
    create: {
      id: "ai-workflows",
      title: "AI Workflows",
      description: "Prompt contracts, diff scoring, quiz generation, and defend sessions.",
      published: true,
      modules: {
        create: [
          {
            id: "diff-score-contract",
            title: "Diff score contract",
            content: "Compare code intent instead of matching text line by line.",
            order: 1,
          },
          {
            id: "quiz-generation",
            title: "Quiz generation pipeline",
            content: "Understanding how AI generates quiz questions from code context.",
            order: 2,
          },
        ],
      },
    },
  });

  const backendTrack = await prisma.track.upsert({
    where: { id: "backend-foundations" },
    update: {},
    create: {
      id: "backend-foundations",
      title: "Backend Foundations",
      description: "tRPC procedures, Prisma access patterns, queue jobs, and socket events.",
      published: true,
      modules: {
        create: [
          {
            id: "trpc-health",
            title: "tRPC health procedure",
            content: "Trace a thin procedure from client call to Express middleware.",
            order: 1,
          },
        ],
      },
    },
  });

  console.log("Seed data created:", {
    user: user.id,
    tracks: [frontendTrack.id, aiTrack.id, backendTrack.id],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 5. Complete Docker Compose (`infra/docker-compose.yml`)

The existing file covers postgres + redis. The new file adds:

- `api` service (builds from `apps/api/Dockerfile`, port 3001, depends on postgres + redis)
- `ai-service` service (builds from `apps/ai-service/Dockerfile`, port 8000)
- `judge0-server` service (image `judge0/judge0:1.13.1`, port 2358, privileged, depends on judge0's own postgres + redis)
- `judge0-worker` service (same image, `command: ["./scripts/worker"]`, privileged)
- `judge0-db` (postgres:13 for Judge0)
- `judge0-redis` (redis:6 for Judge0)

### 6. tRPC Client Hook Usage Pattern (v10)

```typescript
// In a client component page:
"use client";

import { trpc } from "@/lib/trpc/client";

export default function DashboardPage() {
  const { data: dashboard, isLoading } = trpc.health.useQuery();
  // ... render
}
```

## State of the Art

| Old Approach                              | Current Approach                 | When Changed | Impact                                       |
| ----------------------------------------- | -------------------------------- | ------------ | -------------------------------------------- |
| Mock data hooks (`@/lib/mock-data/hooks`) | tRPC hooks (`trpc.x.useQuery()`) | Phase 1      | All data fetching becomes type-safe and real |
| Local-only infra                          | Docker Compose with all services | Phase 1      | One command to start everything              |
| Manual code formatting                    | Prettier enforced via turbo      | Phase 1      | Consistent style across monorepo             |
| No deployment config                      | Vercel.json for web              | Phase 1      | Enables Vercel deployment of web app         |

**Deprecated/outdated:**

- `callTrpcHealth()` function in `apps/web/src/lib/trpc/client.ts` — replaced by full tRPC client. Keep file but rewrite contents.

## Assumptions Log

| #   | Claim                                                                                                            | Section        | Risk if Wrong                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| A1  | The API `AppRouter` type can be imported by the web app without pulling server-side code into the browser bundle | tRPC Client    | Could cause webpack errors; workaround is to create a separate types export       |
| A2  | Judge0's `X-Auth-Token` is not required when running locally                                                     | Docker Compose | If Judge0 requires auth even locally, we need to generate and configure a token   |
| A3  | The `db:seed` script uses `@auth/prisma-adapter` compatible user creation                                        | Seed Data      | If `authjs.session-token` format doesn't match, sign-in won't work for seed users |
| A4  | We're using `@trpc/react-query` v10 (not v11 `@trpc/tanstack-react-query`)                                       | Standard Stack | Must confirm this decision with user — latest ecosystem has shifted to v11        |

## Open Questions

1. **Should we upgrade to tRPC v11?**
   - What we know: API is on v10.45.2, latest is v11.18.0. The v11 API (`createTRPCContext`, `useTRPC`, `useQuery(trpc.x.queryOptions())`) is the current recommended pattern in tRPC docs. v10 uses `createTRPCReact` and `trpc.x.useQuery()`.
   - What's unclear: Whether upgrading the API to v11 is in scope for Phase 1. The API's `trpc.ts` uses `initTRPC.context<Context>().create()` which is compatible with both v10 and v11.
   - Recommendation: **Stay on v10 for Phase 1.** The same packages are used across API and web. Upgrading both to v11 adds migration risk. Defer v11 upgrade to a future phase.

2. **What should the unified API port be?**
   - What we know: Currently 4000 (index.ts default). User plan says 3001 for Docker. Web's `trpcEndpoint` defaults to `http://localhost:4000`.
   - What's unclear: Should we change the default in `index.ts` to 3001 for consistency?
   - Recommendation: Change API default PORT env var to 3001 in `index.ts` (`const PORT = process.env.PORT || 3001`). Update `NEXT_PUBLIC_API_URL` default to `http://localhost:3001`. This unifies the default port across local dev and Docker.

3. **How should the web app import the AppRouter type?**
   - What we know: `apps/api/src/index.ts` exports `AppRouter = typeof appRouter`. The web app needs this type for `createTRPCReact<AppRouter>()`.
   - What's unclear: Importing directly from the API package may pull server-side deps (Express, Prisma) into the browser bundle.
   - Recommendation: Either (a) add a `"trpc-types"` export in API's package.json that only exports the type, or (b) add a tsconfig path alias in web's `tsconfig.json`. Approach (a) is cleaner for production but more work. For Phase 1, use tsconfig path: `"@unvibe/api-types": ["../../api/src/index.ts"]`.

## Environment Availability

| Dependency     | Required By    | Available | Version | Fallback                                        |
| -------------- | -------------- | --------- | ------- | ----------------------------------------------- |
| pnpm           | Monorepo       | ✓         | 10.18.0 | —                                               |
| Node.js        | API, Web       | ✓         | 20.x    | —                                               |
| Python 3       | AI Service     | ?         | —       | Skip containerized AI service                   |
| Docker Desktop | Docker Compose | ?         | —       | Run services natively                           |
| PostgreSQL     | Database       | ?         | —       | Use .env DATABASE_URL pointing to local install |
| Redis          | Queue + Cache  | ?         | —       | API gracefully degrades when Redis is absent    |

**Missing dependencies with no fallback:**

- Docker Desktop — if absent, the entire Docker Compose + Judge0 setup is blocked. Install Docker Desktop for Windows.

**Missing dependencies with fallback:**

- Redis — API has fallback (`submissionQueue = null`). Judge0 however requires its own Redis.
- PostgreSQL — can run locally instead of Docker, but seed data and migrations require it. The dev experience is poor without Docker.

## Security Domain

> `security_enforcement` is not set in config — treating as enabled.

### Applicable ASVS Categories

| ASVS Category       | Applies | Standard Control                               |
| ------------------- | ------- | ---------------------------------------------- |
| V5 Input Validation | yes     | Zod schemas in tRPC procedures                 |
| V6 Cryptography     | no      | Phase 1 doesn't handle secrets beyond env vars |

### Known Threat Patterns

| Pattern                 | STRIDE                 | Standard Mitigation                                                     |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Insecure sandbox escape | Elevation of Privilege | Judge0 with privileged mode and Isolate sandbox (upstream handles this) |
| tRPC type confusion     | Tampering              | TypeScript strict mode + Zod validation on inputs                       |

For Phase 1, the main security concern is ensuring Judge0 runs in its standard secure configuration (resource limits, sandboxed execution). The seed data user is for development only and should have a non-privileged role.

## Sources

### Primary (HIGH confidence)

- [VERIFIED: npm registry] — Prettier 3.9.4, @trpc/react-query latest 11.18.0
- [VERIFIED: npm registry] — @trpc/server ^10.45.2 in API's package.json
- [VERIFIED: codebase grep] — Current tRPC client at `apps/web/src/lib/trpc/client.ts` with only `callTrpcHealth()`
- [VERIFIED: codebase grep] — 13 files import from `@/lib/mock-data/*`
- [VERIFIED: codebase grep] — `seed.ts` does NOT exist at `apps/api/prisma/seed.ts`
- [VERIFIED: file system] — No `.prettierrc`, no Dockerfiles, no `vercel.json`
- [CITED: docs.judge0.com] — Judge0 API requires `X-Auth-Token` if auth is enabled
- [CITED: awesome-docker-compose.com/judge0] — Judge0 Docker Compose pattern with server + worker + db + redis, privileged mode required

### Secondary (MEDIUM confidence)

- [CITED: ce.judge0.com/docs] — Submission API endpoint at `POST /submissions`, language IDs, status codes
- [CITED: trpc.io/docs/client/react/setup] — tRPC v10 React setup pattern with `createTRPCReact`

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions verified from npm registry and package.json
- Architecture: HIGH — all patterns verified from codebase inspection + official docs
- Pitfalls: MEDIUM — Judge0 behavior on Windows Docker Desktop needs runtime verification

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (configs are stable; only tRPC version pattern may shift)
