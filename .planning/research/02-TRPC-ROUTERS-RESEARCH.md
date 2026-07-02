# Phase 2: tRPC Routers — Research

**Researched:** 2026-07-01
**Domain:** tRPC v10 router construction, Zod input validation, Prisma query patterns, BullMQ job enqueuing
**Confidence:** HIGH

## Summary

Phase 2 implements 7 tRPC routers for the UnVibe API, organized as child routers merged into a single `appRouter` in `apps/api/src/index.ts`. Each router follows a consistent pattern: import `router`/`publicProcedure`/`protectedProcedure` from `../trpc`, define Zod input schemas inline, use typed Prisma queries from `ctx.prisma`, and throw `TRPCError` with appropriate codes on failures. The dependency chain is: **auth → tracks → modules → submissions → irs**, with **warRoom** and **profile** being independent leaves.

The routers are implemented in parallel waves: Wave 1 (auth + tracks) first because they have no internal dependencies and are required by the frontend mock-data hooks that need replacement. Waves 2–4 build up the submission pipeline, and Wave 5 (profile) aggregates everything. Testing uses `createCallerFactory` with a mock context containing a real Prisma instance or a mocked `ctx` object.

**Primary recommendation:** Build 7 child routers in `apps/api/src/routers/`, merge them into the existing `appRouter` in `index.ts`, and test with `createCallerFactory` + jest + `@prisma/client` mock.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Sign-in/sign-up public procedures | Auth router uses `publicProcedure` for signIn/signUp; Zod validates email format; session token generation via Prisma `Session.create()` |
| AUTH-02 | Session management | `getSession` uses `protectedProcedure` which already reads `ctx.session` from context.ts; `signOut` deletes Session record |
| TRACKS-01 | Public track listing | `tracks.getAll` uses Prisma `findMany` with `where: { published: true }`; module count via `_count: { select: { modules: true } }` |
| TRACKS-02 | Track progress tracking | `tracks.getProgress` joins Submission and IRSScore; requires auth (protectedProcedure) |
| MODULES-01 | Module content publicly readable | `modules.getById` and `modules.getContent` use publicProcedure; content is the code-to-rebuild |
| MODULES-02 | Submission creation with async scoring | `modules.submitDecode` creates `Submission` record with `status: 'pending'`, enqueues BullMQ job with submissionId; returns immediately for polling |
| SUBS-01 | Submission history | `submissions.getHistory` queries by userId with optional moduleId filter |
| SUBS-02 | Polling for scored results | `submissions.getById` returns feedback when status is 'scored' or 'failed' |
| IRS-01 | IRS score reading | `irs.getScore` reads latest `IRSScore` record for user; recalculation happens in worker |
| IRS-02 | Blindspots identification | `irs.getBlindspots` analyzes low-scored submissions to identify weak concepts |
| WARROOM-01 | Room CRUD | `warRoom.getRoom`/`getMessages`/`getLeaderboard` are public; `joinRoom` is protected |
| PROFILE-01 | Aggregate user data | `profile.getProfile` joins User + Submission + IRSScore + DefendSession |
| PROFILE-02 | Stats computation | `profile.getStats` computes completed modules, total submissions, avg score, streak |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth sign-in/sign-up | API (tRPC) | — | Creates/reads Session records in DB; cannot be client-side |
| Session validation | API (context.ts) | — | Already implemented in Phase 1's `createContext`; routers consume `ctx.session` |
| Track listing | API (tRPC) | — | Reads from Prisma; public data |
| Module content | API (tRPC) | — | Reads from Prisma; public content |
| Submission creation | API (tRPC) + BullMQ | — | tRPC creates record, BullMQ worker scores asynchronously |
| IRS score aggregation | API (submission-worker.ts) | tRPC reads result | Worker recalculates; tRPC reads latest IRSScore |
| War Room messaging | Socket.io (real-time) | tRPC (CRUD) | Socket.io handles live; tRPC handles RESTful CRUD |
| Profile aggregation | API (tRPC) | — | Reads from User, Submission, IRSScore, DefendSession |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trpc/server` | ^10.45.2 | tRPC server framework | Already in API's package.json; provides router(), publicProcedure, middleware, createCallerFactory |
| `zod` | ^3.22.4 | Input validation | Already in API's package.json; tRPC's default validator; provides `.input()` schema inference |
| `@prisma/client` | ^5.12.1 | Database queries | Already in API's package.json; ctx.prisma provides typed access to all 9 models |
| `bullmq` | ^5.7.0 | Async job queue | Already in API's package.json; submissionQueue is injected in ctx |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ts-jest` | ^29.x | Test runner | Already configured in `jest.config.ts` for testing routers with createCallerFactory |
| `jest` | ^29.x | Test framework | Already configured; testMatch: `**/__tests__/**/*.test.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Child routers (router({ auth: authRouter })) | mergeRouters() flat namespace | Child routers are accessed as `trpc.auth.getSession()` vs flat `trpc.getSession()`; hierarchical namespacing reduces naming collisions and is more self-documenting |
| Inline routers in index.ts | Separate router files | Separate files keep each router under 100 lines; easier to test independently |
| tRPC v11 | tRPC v10 | v11 uses `@trpc/tanstack-react-query` with different API; upgrading both API and web would be scope creep |

**Installation:** No new packages needed — all dependencies are already in `apps/api/package.json`.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (Next.js 14)                        │
│  ┌─────────────────────┐    ┌──────────────────────────────┐ │
│  │ tRPC Client Hooks   │    │  Socket.io Client             │ │
│  │ (createTRPCReact)   │    │  (real-time War Room msgs)   │ │
│  └────────┬────────────┘    └──────────────┬───────────────┘ │
└───────────┼───────────────────────────────┼──────────────────┘
            │ httpBatchLink                  │ WebSocket
            ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│                  Express Server (port 3001)                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  tRPC Express Middleware (/trpc)                          │ │
│  │                                                           │ │
│  │  appRouter ──┬── authRouter (signIn/signUp/getSession)   │ │
│  │              ├── tracksRouter (getAll/getById/Progress)  │ │
│  │              ├── modulesRouter (getById/submitDecode)    │ │
│  │              ├── submissionsRouter (create/history)      │ │
│  │              ├── irsRouter (getScore/getHistory/find)    │ │
│  │              ├── warRoomRouter (getRoom/getLeaderboard)  │ │
│  │              └── profileRouter (getProfile/getStats)     │ │
│  │                                                           │ │
│  │  createContext ──→ { prisma, logger, io, queue, session }│ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                              │                                 │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │  BullMQ Queue (submissions)                              │  │
│  │  submissionQueue.add({ submissionId, userId, moduleId }) │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │ worker picks up job             │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │  BullMQ Worker (submission-worker.ts)                     │  │
│  │  ┌─ aiClient.diffCode() ──→ AI Service (FastAPI :8000)  │  │
│  │  └─ prisma.submission.update({ status: "scored" })       │  │
│  │  └─ triggerIRSRecalculation()                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Socket.io Server                                         │  │
│  │  - emit submission scored events                          │  │
│  │  - War Room real-time messaging                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma Client → PostgreSQL (unvibe)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/api/src/
├── index.ts                        # MODIFY — replace appRouter with merged routers
├── trpc.ts                         # EXISTING — exports router, publicProcedure, protectedProcedure
├── context.ts                      # EXISTING — exports createContext, Context type
├── routers/                        # NEW — all router files
│   ├── auth.ts                     # NEW — signIn, signUp, getSession, signOut
│   ├── tracks.ts                   # NEW — getAll, getById, getProgress
│   ├── modules.ts                  # NEW — getById, getContent, getByTrack, submitDecode, getProgress
│   ├── submissions.ts              # NEW — create, getHistory, getById
│   ├── irs.ts                      # NEW — getScore, getHistory, getBlindspots
│   ├── warRoom.ts                  # NEW — getRoom, getMessages, getLeaderboard, joinRoom
│   └── profile.ts                  # NEW — getProfile, getRecent, getStats
├── services/
│   ├── ai-client.ts                # EXISTING
│   └── submission-worker.ts        # EXISTING
└── __tests__/
    ├── ai-client.test.ts           # EXISTING
    ├── auth.test.ts                # NEW
    ├── tracks.test.ts              # NEW
    ├── modules.test.ts             # NEW
    ├── submissions.test.ts         # NEW
    ├── irs.test.ts                 # NEW
    ├── warRoom.test.ts             # NEW
    └── profile.test.ts             # NEW
```

### Pattern 1: Child Router Structure (tRPC v10)

**What:** Each domain gets its own router file exporting a named router. The appRouter merges them as child properties under namespaced keys.

**When to use:** For every Phase 2 router. This is the standard tRPC v10 pattern documented in the official docs [VERIFIED: trpc.io/docs/v10/server/merging-routers].

**Example:**
```typescript
// apps/api/src/routers/auth.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  signIn: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      // create session, return user
      return user;
    }),
});

// apps/api/src/index.ts — merge into appRouter
// import { authRouter } from "./routers/auth";
// const appRouter = router({
//   health: publicProcedure.query(() => ({ status: "ok" })),
//   auth: authRouter,
//   tracks: tracksRouter,
//   // ...
// });
```

### Pattern 2: Zod Input + TRPCError

**What:** Every procedure that takes input uses a Zod schema inline. Error cases throw `TRPCError` with semantic codes.

**When to use:** For all procedures with input parameters. [VERIFIED: trpc.io/docs/server/error-handling]

**Example:**
```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const myProcedure = publicProcedure
  .input(z.object({ id: z.string().cuid() }))
  .query(async ({ ctx, input }) => {
    const record = await ctx.prisma.module.findUnique({
      where: { id: input.id },
    });
    if (!record) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }
    return record;
  });
```

### Pattern 3: BullMQ Enqueuing from tRPC Procedure

**What:** A mutation creates a DB record, then enqueues a BullMQ job for async processing. Returns immediately so the frontend can poll.

**When to use:** In `modules.submitDecode` and `submissions.create`.

**Example:**
```typescript
.submitDecode: protectedProcedure
  .input(z.object({ moduleId: z.string().cuid(), code: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Get module to obtain original content for diff
    const module = await ctx.prisma.module.findUnique({
      where: { id: input.moduleId },
    });
    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    // 2. Create Submission record with status 'pending'
    const submission = await ctx.prisma.submission.create({
      data: {
        userId: ctx.session.user.id,
        moduleId: input.moduleId,
        code: input.code,
        status: "pending",
      },
    });

    // 3. Enqueue BullMQ job (if queue available)
    if (ctx.submissionQueue) {
      await ctx.submissionQueue.add("process-submission", {
        submissionId: submission.id,
        userId: ctx.session.user.id,
        moduleId: input.moduleId,
        code: input.code,
        originalCode: module.content,
      });
    } else {
      ctx.logger.warn("BullMQ unavailable — submission queued without processing");
    }

    // 4. Return submission ID so frontend can poll
    return { submissionId: submission.id };
  }),
```

### Pattern 4: Testing with createCallerFactory

**What:** Create a server-side caller for the router with a mock context to test procedures without HTTP. [VERIFIED: trpc.io/docs/server/server-side-calls]

**When to use:** In all router test files.

**Example:**
```typescript
// apps/api/src/__tests__/helpers.ts
import type { Context } from "../context";

export function createTestContext(overrides?: Partial<Context>): Context {
  return {
    prisma: {} as any, // or use prisma-mock / real test DB
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
    io: {} as any,
    submissionQueue: null,
    session: { user: { id: "test-user", email: "test@test.com", name: "Test" } },
    ...overrides,
  };
}

// apps/api/src/__tests__/tracks.test.ts
import { createCallerFactory } from "../trpc";
import { tracksRouter } from "../routers/tracks";
import { createTestContext } from "./helpers";

const createCaller = createCallerFactory(tracksRouter);

describe("tracksRouter", () => {
  it("should return published tracks", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    // Mock Prisma
    ctx.prisma.track = {
      findMany: jest.fn().mockResolvedValue([
        { id: "1", title: "Test Track", description: "Desc", published: true, _count: { modules: 3 } },
      ]),
    } as any;

    const result = await caller.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Track");
  });
});
```

### Anti-Patterns to Avoid

- **Sharing caller across tests:** Each test should create a fresh caller with a fresh context to avoid state leakage between tests.
- **Calling procedures from within other procedures:** Extract shared logic into service functions instead of creating nested callers. [VERIFIED: trpc docs — "createCaller should not be used to call procedures from within other procedures"]
- **Mutating context between calls:** Context is created per-request and should be treated as immutable within a procedure.
- **Nullable session checks inside protectedProcedure:** The `protectedProcedure` middleware already guarantees `ctx.session` is non-null (type narrowed). Don't re-check inside protected procedures.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation | Manual type guards or if/else chains | Zod schemas with `.input()` | tRPC + Zod provides automatic type inference, structured error responses via `errorFormatter`, and zero-boilerplate validation |
| Error codes | Custom error classes | `TRPCError` with semantic codes | Maps automatically to HTTP status codes; client receives consistent error shape; `getHTTPStatusCodeFromError()` for external API handlers |
| Session auth | Custom middleware in each file | `protectedProcedure` | Already implemented in `trpc.ts`; one middleware guards all protected routes with consistent UNAUTHORIZED behavior |
| Async job queue | Inline setTimeout/retry logic | BullMQ via `submissionQueue.add()` | Already implemented in `index.ts`; provides retry, concurrency, observability; graceful fallback when Redis is down |

**Key insight:** tRPC v10's `createCallerFactory` is the most natural way to test routers — it avoids HTTP transport entirely, provides full type safety, and works with any mock context. Do not use supertest or HTTP-level testing for router unit tests.

## Router Specification

### Router 1: auth (`apps/api/src/routers/auth.ts`)

**Dependencies:** None. Builds first.
**Namespace key in appRouter:** `auth`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `signIn` | mutation | public | `{ email: z.string().email(), password: z.string().optional() }` | `{ user: { id, name, email } }` | Creates `Session` record via Prisma |
| `signUp` | mutation | public | `{ name: z.string().min(1).max(100), email: z.string().email() }` | `{ user: { id, name, email } }` | Creates `User` + `Account` records |
| `getSession` | query | protected | none | `{ user: { id, name, email } }` | None — reads from `ctx.session` |
| `signOut` | mutation | protected | `{ }` | `{ success: true }` | Deletes `Session` record where `sessionToken = ctx.session.sessionToken` |

**Error cases:**
- `signIn`: Email not found → `NOT_FOUND`
- `signUp`: Email already exists → `CONFLICT` (code: "CONFLICT")
- `getSession`: No session → handled by `protectedProcedure` → `UNAUTHORIZED`

**Prisma queries:**
- `signIn`: `prisma.user.findUnique({ where: { email } })` → `prisma.session.create({ data: { sessionToken: crypto.randomUUID(), userId: user.id, expires: ... } })`
- `signUp`: `prisma.user.findUnique({ where: { email } })` (check) → `prisma.user.create({ data: { name, email } })` + `prisma.account.create({ data: { userId, type: "credentials", provider: "credentials", providerAccountId: user.id } })`
- `signOut`: `prisma.session.delete({ where: { sessionToken } })`

**Testing:** Mock `prisma.user.findUnique` and `prisma.session.create`. Test that `signIn` with non-existent email throws. Test that `signOut` calls `prisma.session.delete`.

### Router 2: tracks (`apps/api/src/routers/tracks.ts`)

**Dependencies:** auth (for protectedProcedure). Build second.
**Namespace key in appRouter:** `tracks`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `getAll` | query | public | none | `Array<{ id, title, description, published, moduleCount }>` | None |
| `getById` | query | public | `{ id: z.string().cuid() }` | `{ id, title, description, modules: Module[] }` | None |
| `getProgress` | query | protected | none | `Array<{ id, title, completedModules, totalModules, score }>` | None |

**Error cases:**
- `getById`: Track not found → `NOT_FOUND`
- `getProgress`: No user → handled by `protectedProcedure`

**Prisma queries:**
- `getAll`: `prisma.track.findMany({ where: { published: true }, include: { _count: { select: { modules: true } } } })`
- `getById`: `prisma.track.findUnique({ where: { id }, include: { modules: { orderBy: { order: "asc" } } } })`
- `getProgress`: Complex — join Track → Module → Submission where userId matches, group by track

### Router 3: modules (`apps/api/src/routers/modules.ts`)

**Dependencies:** tracks (module has trackId reference). Build third.
**Namespace key in appRouter:** `modules`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `getById` | query | public | `{ id: z.string().cuid() }` | `{ id, title, content, trackId, order }` | None |
| `getContent` | query | public | `{ id: z.string().cuid() }` | `{ content: string }` | None |
| `getByTrack` | query | public | `{ trackId: z.string().cuid() }` | `Array<Module>` ordered by `order` asc | None |
| `submitDecode` | mutation | protected | `{ moduleId: z.string().cuid(), code: z.string() }` | `{ submissionId: string }` | Creates Submission + enqueues BullMQ job |
| `getProgress` | query | protected | `{ moduleId: z.string().cuid() }` | `{ submitted, status, score, defendStatus }` | None |

**Error cases:**
- `getById/getContent`: Module not found → `NOT_FOUND`
- `submitDecode`: Module not found → `NOT_FOUND`
- `submitDecode`: Already submitted (optional check) → `CONFLICT`

**Prisma queries:**
- `getById`: `prisma.module.findUnique({ where: { id } })`
- `getContent`: `prisma.module.findUnique({ where: { id }, select: { content: true } })`
- `getByTrack`: `prisma.module.findMany({ where: { trackId }, orderBy: { order: "asc" } })`
- `submitDecode`: See Pattern 3 above — creates Submission, enqueues job
- `getProgress`: Queries latest Submission + DefendSession for the module+user pair

### Router 4: submissions (`apps/api/src/routers/submissions.ts`)

**Dependencies:** modules (submission has moduleId). Build fourth.
**Namespace key in appRouter:** `submissions`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `create` | mutation | protected | `{ moduleId: z.string().cuid(), code: z.string() }` | `{ submissionId: string }` | Creates Submission + enqueues BullMQ job |
| `getHistory` | query | protected | `{ moduleId: z.string().cuid().optional() }` | `Array<Submission>` | None |
| `getById` | query | protected | `{ id: z.string().cuid() }` | `Submission` with feedback parsed | None |

**Error cases:**
- `create`: Module not found → `NOT_FOUND`
- `getById`: Submission not found → `NOT_FOUND`
- `getById`: Submission belongs to another user → `FORBIDDEN`

**Prisma queries:**
- `create`: Same pattern as `modules.submitDecode`
- `getHistory`: `prisma.submission.findMany({ where: { userId, moduleId }, orderBy: { createdAt: "desc" } })`
- `getById`: `prisma.submission.findUnique({ where: { id } })` → verify `submission.userId === ctx.session.user.id`

### Router 5: irs (`apps/api/src/routers/irs.ts`)

**Dependencies:** submissions (reads scored submissions). Build fifth.
**Namespace key in appRouter:** `irs`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `getScore` | query | protected | none | `{ id, score, details, createdAt }` or null | None |
| `getHistory` | query | protected | none | `Array<IRSScore>` ordered desc | None |
| `getBlindspots` | query | protected | none | `Array<{ concept, avgScore, count }>` | None |

**Error cases:** None — returns null/empty instead of throwing for missing data.

**Prisma queries:**
- `getScore`: `prisma.iRSScore.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })`
- `getHistory`: `prisma.iRSScore.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })`
- `getBlindspots`: Query all scored submissions → parse dimension scores from feedback → aggregate by dimension name → return concepts where avgScore < threshold

### Router 6: warRoom (`apps/api/src/routers/warRoom.ts`)

**Dependencies:** auth (for joinRoom). Build independently (any time after auth).
**Namespace key in appRouter:** `warRoom`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `getRoom` | query | public | none | `WarRoom` or null | None |
| `getMessages` | query | public | `{ roomId: z.string().cuid().optional() }` | `Array<Message>` (from in-memory or Prisma) | None |
| `getLeaderboard` | query | public | none | `Array<{ userId, name, score }>` | None |
| `joinRoom` | mutation | protected | `{ roomId: z.string().cuid() }` | `{ success: true }` | Socket.io event emit |

**Error cases:**
- `getRoom`: No active room → returns null (not an error)
- `joinRoom`: Room not found → `NOT_FOUND`

**Prisma queries:**
- `getRoom`: `prisma.warRoom.findFirst({ orderBy: { createdAt: "desc" } })`
- `getLeaderboard`: Query latest IRSScore per user → `prisma.iRSScore.groupBy({ by: ["userId"], _max: { score: true } })` then join User for names

**Socket.io integration:** `joinRoom` should emit a socket event to notify other participants. The Socket.io server is available at `ctx.io`.

### Router 7: profile (`apps/api/src/routers/profile.ts`)

**Dependencies:** auth, submissions, irs. Build last — aggregates across other domains.
**Namespace key in appRouter:** `profile`

| Procedure | Type | Auth | Input Zod Schema | Output | Side Effects |
|-----------|------|------|-----------------|--------|-------------|
| `getProfile` | query | protected | none | `{ user: User, stats: Stats }` | None |
| `getRecent` | query | protected | none | `Array<{ moduleId, moduleTitle, trackId, submittedAt, score }>` | None |
| `getStats` | query | protected | none | `{ completedModules, totalSubmissions, avgScore, currentStreak, defendSessions }` | None |

**Error cases:** None — logged-in user always has a profile.

**Prisma queries:**
- `getProfile`: `prisma.user.findUnique({ where: { id } })` + aggregate Submission/IRSScore
- `getRecent`: `prisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, include: { module: { select: { title: true, trackId: true } } } })`
- `getStats`: Multiple Prisma queries:
  - Completed modules: `prisma.submission.count({ where: { userId, status: "scored" }, distinct: ["moduleId"] })`
  - Total submissions: `prisma.submission.count({ where: { userId } })`
  - Avg score: aggregate from IRSScore
  - Streak: query submissions ordered by date and compute consecutive days

### Index.ts Modification

The existing `appRouter` in `apps/api/src/index.ts` must be updated:

```typescript
// Current (line 113-117):
const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date() };
  }),
});

// After Phase 2:
import { authRouter } from "./routers/auth";
import { tracksRouter } from "./routers/tracks";
import { modulesRouter } from "./routers/modules";
import { submissionsRouter } from "./routers/submissions";
import { irsRouter } from "./routers/irs";
import { warRoomRouter } from "./routers/warRoom";
import { profileRouter } from "./routers/profile";

const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok", timestamp: new Date() })),
  auth: authRouter,
  tracks: tracksRouter,
  modules: modulesRouter,
  submissions: submissionsRouter,
  irs: irsRouter,
  warRoom: warRoomRouter,
  profile: profileRouter,
});
```

## Dependency Graph

```
auth ─────────────────────────────────────────► warRoom
  │
  ├──► tracks ──► modules ──► submissions ──► irs
  │                                            │
  └────────────────────────────────────────────┴──► profile
```

**Build order:** auth → tracks → modules → submissions → irs → warRoom (independent of 2-5 chain) → profile

**Recommended wave grouping for parallel execution:**
- **Wave 1** (parallel): auth + tracks + warRoom
- **Wave 2** (parallel, after auth): modules + irs
- **Wave 3** (after modules): submissions
- **Wave 4** (after submissions + irs): profile

## Common Pitfalls

### Pitfall 1: Not Checking `ctx.submissionQueue` Is Null

**What goes wrong:** The `submitDecode` procedure calls `ctx.submissionQueue.add()` without checking if the queue is null. When Redis is unavailable, this crashes the procedure with a TypeError.

**Why it happens:** BullMQ initializes asynchronously — if Redis is down, `submissionQueue` remains null and the graceful fallback in `index.ts` sets it to null. The tRPC procedure bypasses the check.

**How to avoid:** Always guard: `if (ctx.submissionQueue) { await ctx.submissionQueue.add(...) }` else log a warning. Don't throw — the submission record is already created and can be processed later.

**Warning signs:** "Cannot read properties of null (reading 'add')" in Sentry.

### Pitfall 2: Exposing Internal Error Messages

**What goes wrong:** Prisma errors contain SQL and stack traces. If uncaught, the error formatter exposes internal details to the client.

**Why it happens:** Prisma throws errors like `Prisma.PrismaClientKnownRequestError` with messages containing database internals. The default tRPC error formatter passes the message through.

**How to avoid:** Wrap all Prisma calls in try/catch. For known errors (NOT_FOUND, unique constraint), throw semantic TRPCError. For unexpected Prisma errors, log the original and throw `INTERNAL_SERVER_ERROR` with a generic message.

### Pitfall 3: Session Token Not Injected for Test Context

**What goes wrong:** Router tests using `createCallerFactory` pass a mock context without a session token. The `protectedProcedure` middleware works, but the tester forgets to set `ctx.session` to a valid mock.

**How to avoid:** Create a `createTestContext()` helper that returns a valid session by default. Override with `{ session: null }` for testing unauthorized scenarios.

### Pitfall 4: Forgetting User Ownership Check on `submissions.getById`

**What goes wrong:** A user can call `submissions.getById({ id: "another-user-submission" })` and see another user's code and feedback, which violates privacy expectations.

**How to avoid:** After fetching the submission, check: `if (submission.userId !== ctx.session.user.id) { throw new TRPCError({ code: "FORBIDDEN" }) }`

## Code Examples

### 1. Complete Test Helper

```typescript
// apps/api/src/__tests__/helpers.ts
import type { Context } from "../context";

export function createTestContext(overrides?: Partial<Context>): Context {
  return {
    prisma: {} as any,
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      silent: jest.fn(),
      child: jest.fn().mockReturnThis(),
    } as any,
    io: { emit: jest.fn(), to: jest.fn().mockReturnThis() } as any,
    submissionQueue: null,
    session: {
      user: { id: "test-user-id", email: "test@example.com", name: "Test User" },
    },
    ...overrides,
  };
}
```

### 2. Auth Router Implementation Pattern

```typescript
// apps/api/src/routers/auth.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";

const signInSchema = z.object({
  email: z.string().email(),
});

const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const authRouter = router({
  signIn: publicProcedure
    .input(signInSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with this email",
        });
      }

      const sessionToken = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await ctx.prisma.session.create({
        data: { sessionToken, userId: user.id, expires },
      });

      return { user: { id: user.id, name: user.name, email: user.email } };
    }),

  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      const user = await ctx.prisma.user.create({
        data: { name: input.name, email: input.email },
      });

      await ctx.prisma.account.create({
        data: {
          userId: user.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: user.id,
        },
      });

      return { user: { id: user.id, name: user.name, email: user.email } };
    }),

  getSession: protectedProcedure.query(async ({ ctx }) => {
    return { user: ctx.session.user };
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    // Note: Context doesn't have sessionToken on the Session object yet.
    // We need to either: (a) add sessionToken to the Session type in context.ts
    // or (b) use a different approach like requiring the token in input.
    // For now, the frontend handles sign-out by clearing the cookie.
    ctx.logger.info({ userId: ctx.session.user.id }, "User signed out");
    return { success: true };
  }),
});
```

### 3. Tracks Router Implementation Pattern

```typescript
// apps/api/src/routers/tracks.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const tracksRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const tracks = await ctx.prisma.track.findMany({
      where: { published: true },
      include: { _count: { select: { modules: true } } },
      orderBy: { createdAt: "desc" },
    });

    return tracks.map((track) => ({
      id: track.id,
      title: track.title,
      description: track.description,
      published: track.published,
      moduleCount: track._count.modules,
    }));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const track = await ctx.prisma.track.findUnique({
        where: { id: input.id },
        include: { modules: { orderBy: { order: "asc" } } },
      });

      if (!track) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      }

      return track;
    }),

  getProgress: protectedProcedure.query(async ({ ctx }) => {
    // Get all tracks with module counts
    const tracks = await ctx.prisma.track.findMany({
      where: { published: true },
      include: { _count: { select: { modules: true } } },
    });

    // Get user's completed modules (scored submissions)
    const submissions = await ctx.prisma.submission.findMany({
      where: { userId: ctx.session.user.id, status: "scored" },
      select: { moduleId: true },
      distinct: ["moduleId"],
    });

    const completedModuleIds = new Set(submissions.map((s) => s.moduleId));

    return tracks.map((track) => ({
      id: track.id,
      title: track.title,
      totalModules: track._count.modules,
      completedModules: 0, // would need module-to-track mapping
    }));
  }),
});
```

### 4. Submission Enqueue Pattern

```typescript
// apps/api/src/routers/submissions.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

const createSubmissionSchema = z.object({
  moduleId: z.string().cuid(),
  code: z.string(),
});

export const submissionsRouter = router({
  create: protectedProcedure
    .input(createSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const module = await ctx.prisma.module.findUnique({
        where: { id: input.moduleId },
      });
      if (!module) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Module not found",
        });
      }

      const submission = await ctx.prisma.submission.create({
        data: {
          userId: ctx.session.user.id,
          moduleId: input.moduleId,
          code: input.code,
          status: "pending",
        },
      });

      if (ctx.submissionQueue) {
        await ctx.submissionQueue.add("process-submission", {
          submissionId: submission.id,
          userId: ctx.session.user.id,
          moduleId: input.moduleId,
          code: input.code,
          originalCode: module.content,
        });
      } else {
        ctx.logger.warn(
          { submissionId: submission.id },
          "BullMQ unavailable — submission will not be processed",
        );
      }

      return { submissionId: submission.id };
    }),

  getHistory: protectedProcedure
    .input(z.object({ moduleId: z.string().cuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.submission.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input?.moduleId ? { moduleId: input.moduleId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const submission = await ctx.prisma.submission.findUnique({
        where: { id: input.id },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this submission",
        });
      }

      // Parse feedback JSON if present
      return {
        ...submission,
        feedback: submission.feedback
          ? (JSON.parse(submission.feedback) as Record<string, unknown>)
          : null,
      };
    }),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock data hooks in web app | Real tRPC routers with Prisma queries | Phase 2 | All frontend data becomes live and type-safe |
| Single `health` procedure | 7 domain routers with 20+ procedures | Phase 2 | Full API surface available for frontend consumption |
| Inline appRouter in index.ts | Modular child routers in routers/ | Phase 2 | Each router independently testable and maintainable |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `createCallerFactory` can test a child router independently (without the full `appRouter`) | Testing | If tRPC v10 requires the full router hierarchy, we need to import appRouter instead |
| A2 | `ctx.submissionQueue` is nullable and procedures should guard against null | BullMQ Enqueuing | If queue is null when a submission is created, the job never processes — the worker needs to be restarted once Redis is available |
| A3 | Session token is `crypto.randomUUID()` format | Auth Router | If Auth.js expects a specific session token format, our manual Session.create() may produce incompatible tokens |
| A4 | `signOut` procedure can be implemented by deleting the session record | Auth Router | The frontend auth flow may handle sign-out differently (clearing cookies vs server-side deletion) |

## Open Questions

1. **What is the exact session token format expected by Auth.js?**
   - What we know: Auth.js stores sessions in the `Session` table with `sessionToken` as unique key. The `context.ts` resolves sessions by looking up this token.
   - What's unclear: Does Auth.js generate a specific token format (e.g., a signed JWT vs random string) that we must replicate for manual session creation?
   - Recommendation: Check Auth.js session callback configuration in `apps/web/src/app/api/auth/[...nextauth]/route.ts`. If Auth.js generates its own session tokens, our manual `signIn` may produce incompatible tokens. In that case, defer to Auth.js's built-in sign-in flow and only build `getSession`/`signOut`.

2. **Should `signOut` receive the session token as input or rely on cookie-based detection?**
   - What we know: The context resolves session from the request cookie/header. The protected procedure guarantees a session exists.
   - What's unclear: Does `ctx` carry the raw session token so we can delete the specific Session record? Currently `Session` type in `context.ts` only has `{ user: SessionUser }` — no `sessionToken`.
   - Recommendation: Add `sessionToken` to the `Session` type in `context.ts` so `signOut` can delete the correct record. Without this, `signOut` would need the token passed as input.

## Testing Strategy

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29+ with ts-jest |
| Config file | `apps/api/jest.config.ts` |
| Quick run command | `pnpm --filter api test` |
| Full suite command | `pnpm --filter api test -- --coverage` |

### Router Test Pattern
Each router test file follows the same structure:
1. Import the router + `createCallerFactory`
2. Create a `createTestContext()` helper (shared across all test files)
3. Mock specific Prisma model methods on the context
4. Test each procedure: success case → error case → auth rejection

### Wave 0 Gaps
- [ ] `apps/api/src/__tests__/helpers.ts` — shared test context factory (NEW)
- [ ] `apps/api/src/__tests__/auth.test.ts` (NEW)
- [ ] `apps/api/src/__tests__/tracks.test.ts` (NEW)
- [ ] `apps/api/src/__tests__/modules.test.ts` (NEW)
- [ ] `apps/api/src/__tests__/submissions.test.ts` (NEW)
- [ ] `apps/api/src/__tests__/irs.test.ts` (NEW)
- [ ] `apps/api/src/__tests__/warRoom.test.ts` (NEW)
- [ ] `apps/api/src/__tests__/profile.test.ts` (NEW)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Jest | Router testing | ✓ (jest.config.ts exists) | 29.x | — |
| ts-jest | TypeScript test compilation | ✓ (in jest.config.ts) | — | — |
| Prisma Client | All routers | ✓ (in package.json) | 5.12.1 | — |
| BullMQ | Submission processing | ✓ (in package.json) | 5.7.0 | Graceful null fallback |
| PostgreSQL | Data persistence | ✓ (via Docker) | — | — |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `protectedProcedure` middleware enforces session validation |
| V3 Session Management | yes | Session token in `Session` table; `signOut` deletes record |
| V4 Access Control | yes | Ownership check (`submissions.getById` verifies userId) |
| V5 Input Validation | yes | Zod schemas on every procedure |
| V8 Data Protection | yes | Feedback JSON may contain scoring data — ownership check required |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated access to protected endpoints | Spoofing | `protectedProcedure` middleware; returns UNAUTHORIZED |
| Horizontal privilege escalation (view another user's submission) | Information Disclosure | Ownership check `submission.userId !== ctx.session.user.id` → FORBIDDEN |
| Input injection via code field in submission | Tampering | Code stored as string, never executed by API; AI service handles sanitization |
| Session token theft via leaked response | Information Disclosure | Session cookie is HttpOnly (handled by Auth.js); Bearer token only in Authorization header |

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] — `apps/api/src/index.ts` has only `health` procedure (lines 113-117)
- [VERIFIED: codebase] — `apps/api/src/trpc.ts` exports `router`, `publicProcedure`, `protectedProcedure` with auth middleware
- [VERIFIED: codebase] — `apps/api/src/context.ts` provides `{ prisma, logger, io, submissionQueue, session }` context
- [VERIFIED: codebase] — `apps/api/prisma/schema.prisma` has all 9 models with exact field names
- [VERIFIED: codebase] — `apps/api/package.json` has `@trpc/server@^10.45.2`, `zod@^3.22.4`, `bullmq@^5.7.0`
- [VERIFIED: codebase] — `apps/api/jest.config.ts` configured with ts-jest, testMatch `**/__tests__/**/*.test.ts`
- [VERIFIED: codebase] — `apps/api/src/services/submission-worker.ts` processes BullMQ jobs and calls `triggerIRSRecalculation`
- [CITED: trpc.io/docs/v10/server/merging-routers] — Child router pattern for merging routers
- [CITED: trpc.io/docs/server/server-side-calls] — `createCallerFactory` for testing

### Secondary (MEDIUM confidence)

- [CITED: trpc.io/docs/server/error-handling] — TRPCError codes: NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, BAD_REQUEST, INTERNAL_SERVER_ERROR
- [CITED: trpc.io/docs/server/server-side-calls] — "createCaller should not be used to call procedures from within other procedures"

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json and node_modules
- Architecture: HIGH — patterns verified from tRPC official docs and codebase inspection
- Pitfalls: HIGH — all based on observed code patterns in the existing codebase
- Testing: MEDIUM — `createCallerFactory` test pattern verified from tRPC docs but not yet tested with this specific codebase's context structure

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (tRPC v10 is stable; only the approach to `signOut` and `sessionToken` type needs user confirmation)
