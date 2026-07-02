---
status: diagnosing
trigger: "Debug a `npm run dev` error - Redis ECONNREFUSED when Docker containers not running"
created: 2026-06-30T00:00:00.000Z
updated: 2026-06-30T00:00:00.000Z
---

## Current Focus

root_cause: "BullMQ Queue and Worker are instantiated synchronously at module-level in index.ts (lines 43-47) without error handling. Both constructors immediately attempt to connect to Redis. When Docker is not running, Redis is unavailable, and BullMQ's built-in reconnection logic repeatedly retries the connection, spamming ECONNREFUSED errors."
next_action: "Return structured diagnosis with root cause and recommended fix"

## Symptoms

expected: "npm run dev starts api and web without errors"
actual: "api:dev throws AggregateError [ECONNREFUSED]: connect ECONNREFUSED 127.0.0.1:6379 repeatedly"
errors: "AggregateError [ECONNREFUSED]: connect ECONNREFUSED 127.0.0.1:6379"
reproduction: "Run npm run dev while Docker Desktop is not running"
started: "Always broken when Docker containers are not running"

## Eliminated

## Evidence

- timestamp: 2026-06-30T00:00:00.000Z
  checked: apps/api/src/index.ts lines 37-47
  found: BullMQ Queue('submissions') and createSubmissionWorker() are instantiated synchronously at module level, before Express server starts. connectionOpts derived from REDIS_URL env var.
  implication: Redis connection is attempted immediately on module load, not lazily

- timestamp: 2026-06-30T00:00:00.000Z
  checked: apps/api/src/services/submission-worker.ts lines 42-113
  found: createSubmissionWorker constructs a new Worker('submissions', processor, { connection }) — Worker constructor attempts Redis connection immediately
  implication: Both Queue and Worker try to connect to Redis at module load time, causing duplicate ECONNREFUSED errors

- timestamp: 2026-06-30T00:00:00.000Z
  checked: infra/docker-compose.yml
  found: redis:7-alpine service defined on port 6379, with healthcheck
  implication: Redis is meant to be provided via Docker

- timestamp: 2026-06-30T00:00:00.000Z
  checked: Docker Desktop service status
  found: com.docker.service is Stopped; docker ps fails with pipe error; docker compose binary exists (v5.1.4) but daemon not running
  implication: Docker containers cannot be started until Docker Desktop is running

- timestamp: 2026-06-30T00:00:00.000Z
  checked: apps/api/src/index.ts lines 37-47
  found: BullMQ Queue('submissions') and createSubmissionWorker() are instantiated synchronously at module level, before Express server starts. connectionOpts derived from REDIS_URL env var.
  implication: Redis connection is attempted immediately on module load, not lazily

- timestamp: 2026-06-30T00:00:00.000Z
  checked: infra/docker-compose.yml
  found: redis:7-alpine service defined on port 6379, with healthcheck. Docker Desktop is not running (pipe not available).
  implication: Redis is not available, but code doesn't handle this gracefully

## Resolution

root_cause: "BullMQ Queue('submissions') and Worker('submissions') are instantiated at module-level in apps/api/src/index.ts (lines 43-47) without any error handling. Both constructors immediately attempt to connect to Redis at redis://localhost:6379. When Docker containers are not running (Docker Desktop service stopped), Redis is unreachable, and BullMQ's internal reconnection logic causes repeated ECONNREFUSED errors that spam the console. The API server still starts because these async connection failures don't crash the process (Express listen continues), but the console noise is disruptive."
fix: "Option C: Both — (1) Start Docker containers to provide Redis, AND (2) Make Redis/BullMQ initialization lazy and resilient so the API can start without Redis (wrap in try-catch with optional flag, defer connection to first use)"
verification: ""
files_changed:

- apps/api/src/index.ts
