---
phase: "04"
plan: "wave1"
subsystem: "fullstack"
tags: ["sentry", "error-boundaries", "empty-states"]
requires: ["phases-1-3-complete"]
provides: ["sentry-dsn-config", "error-boundary-pages", "empty-state-handling"]
affects:
  - ".env.example"
  - "apps/ai-service/requirements.txt"
  - "apps/web/src/components/app/error-fallback.tsx"
  - "apps/web/src/app/app/*/error.tsx"
  - "apps/web/src/app/app/tracks/page.tsx"
  - "apps/web/src/app/app/blindspot-map/page.tsx"
tech-stack:
  added: ["sentry-sdk (Python/AI service)"]
  patterns: ["Next.js App Router error boundaries", "Empty state guard pattern"]
key-files:
  created:
    - apps/web/src/components/app/error-fallback.tsx
    - apps/web/src/app/app/dashboard/error.tsx
    - apps/web/src/app/app/tracks/error.tsx
    - apps/web/src/app/app/tracks/[trackId]/modules/[moduleId]/error.tsx
    - apps/web/src/app/app/war-room/error.tsx
    - apps/web/src/app/app/blindspot-map/error.tsx
    - apps/web/src/app/app/profile/error.tsx
    - apps/web/src/app/auth/signin/error.tsx
  modified:
    - .env.example
    - apps/ai-service/requirements.txt
    - apps/web/src/app/app/tracks/page.tsx
    - apps/web/src/app/app/blindspot-map/page.tsx
decisions:
  - "Use re-export pattern for error.tsx files to avoid duplication"
  - "Sentry DSNs use example placeholder values matching real format"
  - "Empty states preserve PageHeader for consistent UX even when no data"
metrics:
  duration: "~5 min"
  completed-date: "2026-07-02"
---

# Phase 4 Wave 1: Production Hardening — Sentry Configuration and Error Boundaries

Production hardening: added Sentry DSN configuration for all services, created a reusable ErrorFallback component with error boundary files for 7 Next.js App Router pages, and added empty state handling for Tracks and Blindspot Map pages.

## Summary

3 commits implementing Sentry DSN configuration, error boundary infrastructure, and empty state guards. All TypeScript compilation checks pass (API + web), working tree clean.

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

| Decision                             | Rationale                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Re-export pattern for `error.tsx`    | Single source of truth in `error-fallback.tsx`; no duplicated markup across 7 boundaries      |
| Sentry DSNs use example placeholders | Prevents accidental use of real DSNs in development; documented format matches real structure |
| Empty states preserve PageHeader     | Users see the page title/description even when no data exists, consistent with loading states |

## Task Completion

| Task | Name                                | Status | Commit    |
| ---- | ----------------------------------- | ------ | --------- |
| 1    | Sentry DSN configuration            | ✅     | `60112fe` |
| 2    | Error boundaries for frontend pages | ✅     | `1a5dfd2` |
| 3    | Empty states for tRPC queries       | ✅     | `3c09120` |

## Commits

```
60112fe chore(config): add Sentry DSN entries for AI service and web, add sentry-sdk to ai-service requirements
1a5dfd2 feat(web): add ErrorFallback component and error boundary files for all app pages
3c09120 feat(web): add empty state handling for tracks and blindspot-map pages
```

## Verification Results

| Check                                 | Result                       |
| ------------------------------------- | ---------------------------- |
| `pnpm --filter=web exec tsc --noEmit` | ✅ Passed                    |
| `pnpm --filter=api exec tsc --noEmit` | ✅ Passed                    |
| `git status --short`                  | ✅ Clean (no modified files) |
| Post-commit deletion check            | ✅ No accidental deletions   |

## Known Stubs

None detected — all modifications are complete implementations with no placeholder code.

## Threat Flags

No new threat surface introduced — all changes are error handling and configuration with no new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- ✅ `.env.example` includes `SENTRY_DSN_API`, `SENTRY_DSN_AI`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_API_URL`
- ✅ `apps/ai-service/requirements.txt` includes `sentry-sdk>=2.0.0`
- ✅ `apps/web/src/components/app/error-fallback.tsx` exists
- ✅ 7 error boundary files exist at specified paths
- ✅ `apps/web/src/app/app/tracks/page.tsx` has empty state guard
- ✅ `apps/web/src/app/app/blindspot-map/page.tsx` has empty state guard
- ✅ Commit `60112fe` exists
- ✅ Commit `1a5dfd2` exists
- ✅ Commit `3c09120` exists
- ✅ All TypeScript verification checks pass
