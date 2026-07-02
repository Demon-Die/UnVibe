# Phase 1 — Foundation: SUMMARY

**Date:** 2026-07-01  
**Plan:** Phase 1 — Foundation

---

## One-Liner

Prettier config, Dockerfiles, Docker Compose, Vercel config, Prisma seed, and tRPC client architecture for the UnVibe monorepo.

---

## Sub-items Delivered

### 1. Prettier Config ✅

- Created `.prettierrc` with `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth`, and `prettier-plugin-tailwindcss`
- Added `format` and `format:check` tasks to `turbo.json`
- Added `format` / `format:check` scripts to root `package.json`
- Installed `prettier` and `prettier-plugin-tailwindcss` as root devDependencies

### 2. Dockerfiles ✅

- `apps/api/Dockerfile` — multi-stage Node.js 20 Alpine with pnpm frozen-lockfile, build, and runner stages. Exposes port 3001.
- `apps/ai-service/Dockerfile` — multi-stage Python 3.12 slim with pip install from `requirements.txt`. Exposes port 8000.

### 3. Docker Compose Update ✅

- Added `api` service (port 3001, depends_on postgres+redis, env vars `DATABASE_URL`, `REDIS_URL`, `AI_SERVICE_URL`)
- Added `ai-service` service (port 8000, depends_on api, env var `OPENROUTER_API_KEY`)
- Added Judge0 infrastructure: `judge0-db` (Postgres 16), `judge0-redis`, `judge0-server` (port 2358), `judge0-worker`
- Changed API default port from 4000 to 3001 in `apps/api/src/index.ts`
- Updated web tRPC client default URL to port 3001

### 4. Vercel Config ✅

- Created `apps/web/vercel.json` with Next.js framework, turbo build command, pnpm install

### 5. Seed Data ✅

- Created `apps/api/prisma/seed.ts` with 3 tracks (Frontend Systems, AI Workflows, Backend Foundations), 5 modules, and 1 demo user
- Added `"seed": "tsx prisma/seed.ts"` to `apps/api/package.json` prisma config

### 6. tRPC Client on Frontend ✅

- Installed `@trpc/react-query@^10.45.2`, `@trpc/client@^10.45.2`, `@trpc/server@^10.45.2` in web workspace
- Downgraded `@tanstack/react-query` to v4 (matching @trpc/react-query@10 peer dep)
- Created `apps/web/src/lib/trpc/client.ts` — `createTRPCReact<AppRouter>()` with type import via `@unvibe/api` path alias
- Created `apps/web/src/lib/trpc/provider.tsx` — `TRPCProvider` wrapping `QueryClientProvider` with `httpBatchLink`
- Created `apps/web/src/lib/trpc/hooks.ts` — 6 placeholder hooks (`useDashboardData`, `useTracksData`, `useModuleData`, `useWarRoomData`, `useProfileData`, `useBlindspotsData`) referencing `trpc.health.useQuery()`
- Updated `apps/web/src/app/providers.tsx` to use `TRPCProvider`
- Added `@unvibe/api` path alias in `apps/web/tsconfig.json`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Unused underscore-prefixed params flagged by ESLint**

- **Found during:** Sub-item 6 (tRPC hooks lint check)
- **Issue:** `_trackId` / `_moduleId` params marked unused by `@typescript-eslint/no-unused-vars`
- **Fix:** Added `// eslint-disable-next-line` comments before each param

**2. [Rule 1 — Bug] tRPC type parameter incompatible with `any`**

- **Found during:** Sub-item 6 (TypeScript compilation)
- **Issue:** `createTRPCReact<any>()` caused error string type due to tRPC v10 collision checks
- **Fix:** Added `@unvibe/api` tsconfig path alias to import the actual `AppRouter` type from `apps/api/src/index.ts`

**3. [Rule 1 — Bug] React Query v5 incompatible with @trpc/react-query@10**

- **Found during:** Sub-item 6 (package install)
- **Issue:** Peer dep mismatch — `@trpc/react-query@10` requires `@tanstack/react-query@^4`
- **Fix:** Downgraded `@tanstack/react-query` to `^4.18.0`

**4. [Rule 3 — Blocking] `@trpc/server` not available in web workspace**

- **Found during:** Sub-item 6 (TypeScript type resolution)
- **Issue:** `AnyRouter` type from `@trpc/server` not installed in web
- **Fix:** Added `@trpc/server@^10.45.2` to web workspace

---

## Verification Results

| Check                                 | Status                       |
| ------------------------------------- | ---------------------------- |
| `pnpm install`                        | ✅ Passed                    |
| `pnpm format:check`                   | ✅ Passed                    |
| `pnpm --filter=web lint`              | ✅ No warnings or errors     |
| `pnpm --filter=web exec tsc --noEmit` | ✅ Exit code 0 (zero errors) |
| `pnpm lint` (turbo)                   | ✅ 1 successful              |
| Seed file parse check                 | ✅ Parses correctly          |
| All created files exist               | ✅ 13/13 files confirmed     |

---

## Files Created/Modified

| File                                         | Action                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| `.prettierrc`                                | **Created**                                          |
| `.gitignore`                                 | Modified (added `*.tsbuildinfo`)                     |
| `turbo.json`                                 | Modified (added format/format:check)                 |
| `package.json` (root)                        | Modified (added format scripts)                      |
| `pnpm-lock.yaml`                             | Modified (new deps)                                  |
| `apps/api/Dockerfile`                        | **Created**                                          |
| `apps/ai-service/Dockerfile`                 | **Created**                                          |
| `infra/docker-compose.yml`                   | Modified (added api, ai-service, judge0 services)    |
| `apps/api/src/index.ts`                      | Modified (port 4000 → 3001)                          |
| `apps/web/vercel.json`                       | **Created**                                          |
| `apps/api/prisma/seed.ts`                    | **Created**                                          |
| `apps/api/package.json`                      | Modified (added prisma seed config)                  |
| `apps/web/package.json`                      | Modified (new deps, React Query downgrade)           |
| `apps/web/tsconfig.json`                     | Modified (added @unvibe/api path alias)              |
| `apps/web/src/lib/trpc/client.ts`            | Modified (replaced basic fetch with createTRPCReact) |
| `apps/web/src/lib/trpc/provider.tsx`         | **Created**                                          |
| `apps/web/src/lib/trpc/hooks.ts`             | **Created**                                          |
| `apps/web/src/lib/trpc/client.ts` (original) | Modified (URL changed to 3001 in first commit)       |
| `apps/web/src/app/providers.tsx`             | Modified (uses TRPCProvider)                         |

---

## Commits

| Hash      | Message                                                                      |
| --------- | ---------------------------------------------------------------------------- |
| `7921bd4` | chore(foundation): add prettier config with tailwind plugin                  |
| `74a7727` | chore(foundation): add multi-stage Dockerfiles for api and ai-service        |
| `aecfb51` | chore(foundation): update docker-compose with api/ai-service/judge0 services |
| `794472f` | chore(foundation): add vercel.json for web deployment                        |
| `25ca7b7` | chore(foundation): add prisma seed data and seed config                      |
| `ff5de77` | chore(foundation): add tRPC client, provider, and placeholder hooks          |
| `c3dcb3a` | style(foundation): apply prettier formatting across entire codebase          |
| `d181ae4` | fix(foundation): resolve tRPC TypeScript integration                         |
| `5e9289d` | chore(foundation): add tsbuildinfo to gitignore                              |

---

## Ready for Phase 2

The foundation is solid. Phase 2 can proceed with:

- Building tRPC routers in the API (health already exists)
- Wiring real data flows through the tRPC client
- Adding migrations and running the seed data
