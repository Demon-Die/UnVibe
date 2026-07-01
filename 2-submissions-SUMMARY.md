# Phase 2 Wave 3: Submissions Router Summary

**One-liner:** Submissions tRPC router with create mutation (module validation + BullMQ enqueue), getHistory query, and getById query with ownership guard.

## Files Created

| File | Action |
|------|--------|
| `apps/api/src/routers/submissions.ts` | Created (115 lines) |

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Added submissionsRouter import and appRouter registration |

## Commits

| Hash | Message |
|------|---------|
| `caf3fe7` | `feat(2-submissions): create submissions tRPC router` |
| `0800b81` | `feat(2-submissions): register submissionsRouter in appRouter` |

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter=api exec tsc --noEmit` | ✅ Passed (zero errors) |
| `pnpm --filter=api lint` | ⚠️ No lint script configured — tsc authoritative |

## Details

### `submissionsRouter.create`
- **Input:** `{ moduleId, code, originalCode? }`
- Validates module exists via `prisma.module.findUnique` → throws `NOT_FOUND` if missing
- Creates Submission record with `status: "pending"`
- Enqueues to BullMQ `submissionQueue` (null-safe guard — no crash if Redis down)
- Returns `{ id, status, queued: boolean }`

### `submissionsRouter.getHistory`
- **Input (optional):** `{ moduleId?, limit (1-50, default 20) }`
- Filters by `ctx.session.user.id` + optional `moduleId`
- Includes module title
- Parses `feedback` JSON into `parsedFeedback` field (null if unparseable)

### `submissionsRouter.getById`
- **Input:** `{ id }`
- Includes full module title + content
- Ownership guard: `submission.userId !== ctx.session.user.id` → throws `FORBIDDEN`
- Parses feedback into `parsedFeedback`

## Patterns Followed
- `ctx.session.user.id` pattern (confirmed from `irs.ts` and `warRoom.ts`)
- TRPC error handling (`TRPCError` from `@trpc/server`)
- Null-safe `submissionQueue` guard matches existing `initRedisDeps` architecture
- `tryParseFeedback` helper mirrors pattern used in `irs.ts` for blindspot calculation
