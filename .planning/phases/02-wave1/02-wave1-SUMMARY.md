---
phase: "02"
plan: "wave1"
subsystem: "api"
tags: ["tRPC", "routers", "auth", "tracks", "warRoom"]
requires: ["foundation-phase1"]
provides: ["auth-router", "tracks-router", "warRoom-router"]
affects: ["apps/api/src/index.ts", "apps/api/src/context.ts", "apps/web/src/lib/trpc/client.ts"]
tech-stack:
  added: ["@trpc/server (routers)", "zod (input validation)"]
  patterns: ["child-routers-in-files", "namespace-merged-appRouter"]
key-files:
  created:
    - apps/api/src/routers/auth.ts
    - apps/api/src/routers/tracks.ts
    - apps/api/src/routers/warRoom.ts
  modified:
    - apps/api/src/index.ts
    - apps/api/src/context.ts
decisions:
  - "Child routers under namespaced keys (auth:, tracks:, warRoom:) rather than flat mergeRouters()"
  - "signOut deletes the Session record via sessionToken from context"
  - "getLeaderboard uses IRSScore model, top 20, desc order"
metrics:
  duration: "~3 min"
  completed-date: "2026-07-01"
---

# Phase 2 Wave 1: tRPC Routers — auth, tracks, warRoom

Implemented 3 tRPC child routers (auth, tracks, warRoom), registered them into the existing `appRouter` in `apps/api/src/index.ts`, and added `sessionToken` to the `Session` type for signOut session cleanup.

## Summary

5 commits implementing 3 router files plus wiring and session token support. All TypeScript compilation checks pass (API + web), lint passes, working tree clean.

## Deviations from Plan

None — plan executed exactly as written.

### Plan-Level Adjustments

1. **signOut implementation improved** — Instead of the placeholder "return success" from the original draft, the implementation actually deletes the session using `ctx.session.sessionToken` from the updated context. This is a Rule 2 (auto-add missing critical functionality) and makes signOut actually do something useful.
2. **Session token on context** — `resolveSession` now returns `sessionToken` alongside `user`, fulfilling the `Session` interface contract for signOut.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Namespaced child routers (`auth:`, `tracks:`, `warRoom:`) | Reduces naming collisions, self-documenting access pattern (`trpc.auth.getSession()`) |
| `signOut` deletes the Session record | Matches Auth.js expected behavior — invalidates the server-side session |
| `getLeaderboard` reads `IRSScore` model | Already seeded with IRS data; no separate leaderboard table needed |
| `getMessages` returns empty array | Socket.io handles real-time messaging; tRPC endpoint exists for REST convenience |
| `getProgress` aggregates via `reduce` over submissions | No separate progress tracking table — computed on-demand from Submission records |

## Task Completion

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | auth.ts router | ✅ | `0e5ad3b` |
| 2 | tracks.ts router | ✅ | `a7eabf5` |
| 3 | warRoom.ts router | ✅ | `e13b7aa` |
| 4 | index.ts router registration | ✅ | `160e996` |
| 5 | context.ts sessionToken fix | ✅ | `afb0924` |

## Commits

```
0e5ad3b feat(api): add auth router with signIn, signUp, getSession, signOut
a7eabf5 feat(api): add tracks router with getAll, getById, getProgress
e13b7aa feat(api): add warRoom router with getRoom, getMessages, getLeaderboard, joinRoom
160e996 feat(api): register auth, tracks, and warRoom routers in appRouter
afb0924 feat(api): add sessionToken to Session type for signOut support
```

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm --filter=api exec tsc --noEmit` | ✅ Passed |
| `pnpm --filter=web exec tsc --noEmit` | ✅ Passed (AppRouter type flows correctly) |
| `pnpm lint` | ✅ Passed |
| `git status --short` | ✅ Clean (no modified files) |

## Known Stubs

None detected — all routers have complete implementations. `warRoom.getMessages` returns an empty array intentionally (Socket.io handles real-time messaging), documented inline.

## Threat Flags

No new threat surface introduced — all routers operate within existing auth boundaries (publicProcedure / protectedProcedure) and use existing Prisma models.

## Self-Check: PASSED

- ✅ `apps/api/src/routers/auth.ts` exists
- ✅ `apps/api/src/routers/tracks.ts` exists
- ✅ `apps/api/src/routers/warRoom.ts` exists
- ✅ Commit `0e5ad3b` exists
- ✅ Commit `a7eabf5` exists
- ✅ Commit `e13b7aa` exists
- ✅ Commit `160e996` exists
- ✅ Commit `afb0924` exists
- ✅ All verification checks pass
