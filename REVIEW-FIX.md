---
phase: direct-fix
fixed_at: 2026-06-30T16:22:00Z
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Redis/BullMQ ECONNREFUSED Fix Report

**Fixed at:** 2026-06-30T16:22:00Z
**Commit:** `5981d94`

## Summary

- **Finding:** BullMQ Queue and Worker instantiation at module level connects to Redis immediately. When Redis is unavailable (Docker Desktop not running), IORedis retries indefinitely, flooding the console with `AggregateError [ECONNREFUSED]`.
- **Fix:** Wrap Redis-dependent initialization behind a TCP connectivity check + async init pattern so the server starts cleanly without Redis.

## Fixed

### CR-01: Redis ECONNREFUSED spam on `npm run dev`

**File modified:** `apps/api/src/index.ts`

**Applied fix:**

1. Added `checkRedisReachable()` — a lightweight TCP connectivity test using Node's built-in `net` module (no extra dependencies). It attempts a socket connection to `host:port` with a 2-second timeout and returns a boolean.
2. Extracted BullMQ initialization into `async initRedisDeps()` that first checks if Redis is reachable:
   - **Redis reachable:** Creates Queue, awaits `waitUntilReady()`, creates Worker — same behavior as before.
   - **Redis unreachable:** Logs a single warning with instructions to start Docker. `submissionQueue` stays `null`, Worker is not created — zero BullMQ retry spam.
3. Uses fire-and-forget invocation (`initRedisDeps().catch(...)`) so the Express server starts immediately regardless of Redis status.

## Verification

| Check                     | Result                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`            | Passed — zero type errors                                                                         |
| `npm run dev` (no Docker) | API starts cleanly on port 4000, single "Redis unavailable" warning, **zero ECONNREFUSED errors** |
| Web dev (Next.js)         | Starts normally on port 3000                                                                      |

## How to Enable Redis (Optional)

Start Docker containers to enable the job queue and submission worker:

```powershell
docker compose -f infra/docker-compose.yml up -d
```

Then restart the dev server (`npm run dev`). The API will detect Redis and auto-enable BullMQ.

---

_Fixed: 2026-06-30T16:22:00Z_
