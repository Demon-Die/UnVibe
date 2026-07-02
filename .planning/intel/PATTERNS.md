# UnVibe Codebase — Implementation Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 36 source files across 4 areas
**Analogs found:** All patterns extracted from existing code (see File Classification)

---

## File Classification

| Area                         | Role                  | Data Flow              | Closest Analog                                     | Match Quality |
| ---------------------------- | --------------------- | ---------------------- | -------------------------------------------------- | ------------- |
| **AI Service — Routes**      | controller (FastAPI)  | request-response       | `apps/ai-service/app/routes/generate.py`           | exact (self)  |
| **AI Service — Services**    | service (Python)      | CRUD / LLM I/O         | No `.py` files exist (stubs in `__pycache__` only) | no analog     |
| **AI Service — Prompts**     | config/template       | static data            | No directory exists yet                            | no analog     |
| **AI Service — Tests**       | test (pytest)         | async request-response | No `.py` test files exist (`__pycache__` only)     | no analog     |
| **API — Services (ts)**      | service (BullMQ/tRPC) | event-driven / CRUD    | `apps/api/src/index.ts` (inline queue + worker)    | role-match    |
| **API — Tests**              | test (Vitest/Jest)    | unit / integration     | No test files exist                                | no analog     |
| **Web — Feature components** | component (React)     | render + data-fetch    | `apps/web/src/app/app/dashboard/page.tsx`          | role-match    |
| **Web — Zustand stores**     | store (state)         | client-state           | `apps/web/src/stores/ui-store.ts`                  | exact         |
| **Web — Mock data layer**    | service (mock)        | request-response       | `apps/web/src/lib/mock-data/api.ts`                | exact         |
| **Shared types**             | types (TS)            | static                 | `packages/types/src/index.ts`                      | exact         |

---

## Area 1: Python FastAPI — AI Service Routes

### Directory: `apps/ai-service/app/routes/`

**Files:** `generate.py`, `diff.py`, `defend.py`, `quiz.py`

#### File Naming Convention

- snake_case — one file per AI capability
- Single-word names matching the prefix: `generate.py` for `/generate`, `quiz.py` for `/quiz`, etc.

#### Import Pattern (all 4 route files follow exactly)

```python
# apps/ai-service/app/routes/generate.py (lines 1–4)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger
import os
```

```python
# apps/ai-service/app/routes/defend.py (lines 1–4) — uses typing imports
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from loguru import logger
```

#### Router Definition Pattern

```python
# apps/ai-service/app/routes/generate.py (line 6)
router = APIRouter(prefix="/generate", tags=["generate"])

# apps/ai-service/app/routes/quiz.py (line 6)
router = APIRouter(prefix="/quiz", tags=["quiz"])

# apps/ai-service/app/routes/diff.py (line 5)
router = APIRouter(prefix="/diff", tags=["diff"])

# apps/ai-service/app/routes/defend.py (line 6)
router = APIRouter(prefix="/defend", tags=["defend"])
```

**Rule:** `router = APIRouter(prefix="/<name>", tags=["<name>"])`

#### Pydantic Model Pattern

```python
# apps/ai-service/app/routes/generate.py (lines 8–13)
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1024

class GenerateResponse(BaseModel):
    text: str
```

```python
# apps/ai-service/app/routes/defend.py (lines 8–20) — nested models
class DefendMessage(BaseModel):
    role: str        # user or assistant
    content: str

class DefendSessionRequest(BaseModel):
    session_id: str
    messages: List[DefendMessage]
    code: str

class DefendResponse(BaseModel):
    next_question: str
    passed: bool
    feedback: str | None = None
```

**Rule:** Request/Response models named `<Endpoint>Request` / `<Endpoint>Response`. Placed in the same file above the route handler.

#### Route Handler Pattern

```python
# apps/ai-service/app/routes/generate.py (lines 15–28) — POST with request body
@router.post("/", response_model=GenerateResponse)
async def generate_text(req: GenerateRequest):
    logger.info(f"Generating content for prompt: {req.prompt[:50]}...")
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY is not set. Returning mock response.")
        return GenerateResponse(text=f"Mock response for prompt: {req.prompt}")
    return GenerateResponse(text=f"Successfully processed prompt on mock backend: {req.prompt}")
```

```python
# apps/ai-service/app/routes/quiz.py (lines 18–30) — POST with query params
@router.post("/generate", response_model=QuizGenerateResponse)
async def generate_quiz(topic: str, count: int = 5):
    logger.info(f"Generating quiz for topic: {topic} with {count} questions")
    questions = [
        Question(id=f"q-{i}", question=f"Sample question {i} about {topic}",
                 options=["Option A", "Option B", "Option C", "Option D"],
                 correct_option=0) for i in range(1, count + 1)
    ]
    return QuizGenerateResponse(title=f"{topic} Quiz", questions=questions)
```

```python
# apps/ai-service/app/routes/defend.py (lines 22–35) — POST with body + state
@router.post("/respond", response_model=DefendResponse)
async def respond_defend(req: DefendSessionRequest):
    logger.info(f"Processing defend response for session: {req.session_id}")
    if len(req.messages) >= 3:
        return DefendResponse(
            next_question="Defense completed.",
            passed=True,
            feedback="Great work defending your solution! You demonstrated strong conceptual understanding."
        )
    return DefendResponse(
        next_question="Why did you choose this specific data structure here?",
        passed=False
    )
```

**Handler Pattern Rules:**

1. All handlers are `async def` (even though currently mocked)
2. `response_model=` on the decorator matches the declared return type
3. `logger.info(...)` at top for tracing
4. Error case: log warning, return mock response (no `HTTPException` thrown in current mock implementations)
5. Return type matches the Pydantic response model (no manual dict construction)

#### Main App Registration Pattern

```python
# apps/ai-service/app/main.py (lines 1–27)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routes import generate, quiz, defend, diff

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../.env"))

app = FastAPI(title="UnVibe AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router)
app.include_router(quiz.router)
app.include_router(defend.router)
app.include_router(diff.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}
```

#### Async Pattern

- All route handlers declared `async def` even though current implementations are synchronous mocks
- No `await` calls exist yet (no real Anthropic client wired up)
- When implementing real Claude calls, the Anthropic SDK supports `await client.messages.create(...)`

#### Error Handling Pattern

- **Current:** No error handling — all routes return mock data without try/except
- **Imported but unused:** `HTTPException` is imported in all route files but never raised
- **Recommended pattern for implementation** (inferred from architecture docs):
  ```python
  try:
      result = await claude_client.messages.create(...)
      return GenerateResponse(text=result.content[0].text)
  except anthropic.APIError as e:
      logger.error(f"Claude API error: {e}")
      raise HTTPException(status_code=502, detail="AI service unavailable")
  except Exception as e:
      logger.exception(f"Unexpected error generating content")
      raise HTTPException(status_code=500, detail="Internal server error")
  ```

#### Env Var Access Pattern

```python
# apps/ai-service/app/routes/generate.py (line 18)
api_key = os.getenv("ANTHROPIC_API_KEY")
```

**Rule:** `os.getenv("VAR_NAME")` — env loaded once at startup via `load_dotenv()` in `main.py`

---

## Area 2: Python FastAPI — Services Layer

### Directory: `apps/ai-service/app/services/` (EMPTY — only `__pycache__`)

**No `.py` source files exist.** The `__pycache__` entries suggest the following modules existed previously:

- `prompt_manager`
- `llm_client`
- `claude_client`
- `ast_differ`

These represent **the intended service layer** but have been deleted or are in a stub state.

#### Inferred Pattern from Architecture Docs

Based on `ARCHITECTURE.md` and `STACK.md`, the expected service structure is:

```
apps/ai-service/app/services/
├── __init__.py
├── prompt_manager.py    # Versioned prompt templates
├── llm_client.py        # Abstract LLM client interface
├── claude_client.py     # Anthropic Claude implementation
└── ast_differ.py        # AST-based code diff scoring (Judge0 planned)
```

The architecture docs specify separation of concerns:

- **Routes** (`routes/`): Thin HTTP handlers, delegate to services
- **Services** (`services/`): Business logic, LLM calls, diff engine
- **Prompts** (`prompts/`): Versioned Claude prompt templates (planned)

---

## Area 3: TypeScript — API Backend Services

### Directory: `apps/api/src/`

**No dedicated `services/` directory exists.** All logic is inline in `apps/api/src/index.ts`.

#### Entry Point Pattern

```typescript
// apps/api/src/index.ts (lines 1–11)
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createServer } from "http";
import { Server } from "socket.io";
import pino from "pino";
import * as Sentry from "@sentry/node";
import { PrismaClient } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import { router, publicProcedure } from "./trpc";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
```

#### Logger Pattern

```typescript
// apps/api/src/index.ts (lines 15–22)
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});
```

**Rule:** Singleton logger instance. `pino-pretty` transport for dev.

#### Database Singleton Pattern

```typescript
// apps/api/src/index.ts (line 33)
const prisma = new PrismaClient();
```

**Rule:** Single PrismaClient instance at module scope.

#### BullMQ Queue + Worker Pattern

```typescript
// apps/api/src/index.ts (lines 37–57)
const connectionOpts = {
  host: redisUrl.split("://")[1]?.split(":")[0] || "localhost",
  port: parseInt(redisUrl.split(":")[2]) || 6379,
};

const submissionQueue = new Queue("submissions", {
  connection: connectionOpts,
});

const submissionWorker = new Worker(
  "submissions",
  async (job) => {
    logger.info({ jobId: job.id }, "Processing submission job");
    return { processed: true };
  },
  { connection: connectionOpts },
);

submissionWorker.on("error", (err) => {
  logger.error(err, "Submission worker error");
});
```

**Pattern Rules:**

1. Redis connection parsed from `REDIS_URL` env var
2. `Queue` and `Worker` from `bullmq` with matching queue name
3. Worker has `.on('error')` handler
4. Currently a stub — no real job processing

#### tRPC Router Pattern

```typescript
// apps/api/src/trpc.ts (lines 1–24)
import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";

export const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;
export const routerFactory = t.router;
```

#### tRPC Procedure Pattern

```typescript
// apps/api/src/index.ts (lines 60–66)
const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date() };
  }),
});

export type AppRouter = typeof appRouter;
```

#### tRPC Express Middleware Wiring

```typescript
// apps/api/src/index.ts (lines 94–100)
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({ prisma, logger, io, submissionQueue }),
  }),
);
```

**Pattern Rule:** Context passes all singletons (prisma, logger, io, queue) to tRPC procedures.

#### Socket.io Pattern

```typescript
// apps/api/src/index.ts (lines 72–83)
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected");
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Client disconnected");
  });
});
```

**Pattern Rule:** Socket.io server attached to httpServer (not app). Logger context binding with `{ socketId }`.

#### Health Check + Sentry Pattern

```typescript
// apps/api/src/index.ts (lines 89–109)
// Sentry request handler
if (process.env.SENTRY_DSN_API) {
  app.use(Sentry.Handlers.requestHandler());
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api" });
});

// Sentry error handler
if (process.env.SENTRY_DSN_API) {
  app.use(Sentry.Handlers.errorHandler());
}
```

**Pattern Rule:** Conditional Sentry init guarded by env var existence. Sentry request handler before routes, error handler after routes.

#### Server Start Pattern

```typescript
// apps/api/src/index.ts (lines 112–114)
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  logger.info(`Express API server running on port ${PORT}`);
});
```

---

## Area 4: TypeScript — Web Frontend (Patterns for AI Service Integration)

### tRPC Client Pattern

```typescript
// apps/web/src/lib/trpc/client.ts (lines 1–13)
export const trpcEndpoint = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/trpc`;

export async function callTrpcHealth() {
  const response = await fetch(`${trpcEndpoint}/health`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("tRPC health check failed");
  }
  return response.json();
}
```

**Rule:** URL base from `NEXT_PUBLIC_API_URL` env var. Simple fetch wrapper. Error thrown on non-ok response.

### Socket.io Client Pattern

```typescript
// apps/web/src/lib/socket/client.ts (lines 1–16)
"use client";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000", {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}
```

**Pattern Rule:** Singleton socket with lazy init. `autoConnect: false`. WebSocket-only transport.

### Mock Data Layer Patterns

**`api.ts` — Async data functions with simulated delay:**

```typescript
// apps/web/src/lib/mock-data/api.ts (lines 1–2)
import {
  annotations,
  blindspots,
  diffLines,
  leaderboard,
  quiz,
  radarData,
  tracks,
  warRoomMessages,
} from "./data";
const wait = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms));
```

**`hooks.ts` — React Query wrappers:**

```typescript
// apps/web/src/lib/mock-data/hooks.ts (lines 1–28)
"use client";
import { useQuery } from "@tanstack/react-query";
import { getBlindspots, getDashboard, getModule, getProfile, getTracks, getWarRoom } from "./api";

export function useDashboardQuery() {
  return useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
}
```

**Pattern Rule:** Each hook is `use<Name>Query()`, uses `useQuery` with `queryKey` matching the resource name, delegates to the corresponding `get<Name>()` API function.

### Zustand Store Patterns

```typescript
// apps/web/src/stores/ui-store.ts (lines 1–32)
"use client";
import { create } from "zustand";

interface UIStore {
  darkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  darkMode: getInitialDarkMode(),
  sidebarOpen: false,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem("unvibe-theme", next ? "dark" : "light");
      return { darkMode: next };
    }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

**Pattern Rules:**

1. Interface defines state + actions
2. `"use client"` directive
3. Actions are methods on the store, call `set()`
4. Side effects (localStorage) happen inside action setters
5. Defaults initialized via helper functions

### Page Component Patterns

```typescript
// apps/web/src/app/app/dashboard/page.tsx (lines 1–78)
"use client";
import Link from "next/link";
import { ArrowRight, Clock, Target, Trophy } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardQuery } from "@/lib/mock-data/hooks";
import { IRSRadarChart } from "@/components/features/irs-radar-chart";

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useDashboardQuery();
  if (isLoading || !dashboard) return <LoadingPanel />;
  // ... render with data
}
```

**Pattern Rules:**

1. `"use client"` for interactive pages
2. `@/` path alias for all imports
3. `LoadingPanel` for loading/empty states
4. Components organized: `@/components/app/` (layout), `@/components/ui/` (primitives), `@/components/features/` (domain-specific)
5. Data fetching via React Query hooks from `@/lib/mock-data/hooks` (or real API in future)

---

## Area 5: Shared Types — Python/TypeScript Boundary

### Directory: `packages/types/src/`

```typescript
// packages/types/src/index.ts (lines 1–66) — all interfaces
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}
// Track, Module, Submission, DefendSession, WarRoom, IRSScore follow same pattern
```

**Pattern Rules:**

1. PascalCase interface names
2. `null` unions for optional DB fields
3. `Date` type for timestamps
4. Barrel export from single `index.ts`
5. Used via `@unvibe/types` workspace package
6. **No Python equivalent exists** — AI service defines its own Pydantic models independently

---

## Area 6: Test Patterns (NONE EXIST — All Inferred)

### Current State (from TESTING.md)

```
❌ No test runner configured in any workspace
❌ No test files exist anywhere in the monorepo
❌ turbo.json has a `test` pipeline but no underlying script
❌ No coverage tool configured
```

### Inferred Test Patterns (from Project Requirements)

#### Python AI Service Tests (`apps/ai-service/tests/`)

Expected structure based on FastAPI conventions and the `__pycache__` evidence:

```
apps/ai-service/tests/
├── __init__.py
├── conftest.py          # Fixtures (test client, mock Claude, etc.)
├── test_generate.py     # Test generate endpoint
├── test_quiz.py
├── test_diff.py
└── test_defend.py
```

**Inferred patterns:**

- `pytest` with `pytest-asyncio` for async endpoint testing
- `TestClient` from `httpx` (FastAPI's `TestClient` is synchronous wrapper)
- Fixtures in `conftest.py` for `app` instance and mock API responses
- `monkeypatch` or `unittest.mock` for mocking `os.getenv` and Anthropic client
- File naming: `test_<route_name>.py`

#### TypeScript API Tests (`apps/api/src/__tests__/`)

Expected structure:

- `vitest` or `jest` (none selected yet — marked as `[ASK USER]` in CONCERNS.md)
- File naming: `<name>.test.ts` or `<name>.spec.ts`
- Mock tRPC caller via `createCallerFactory`
- Mock Prisma with `@prisma/client` mocking or `prisma-mock`

---

## Shared Patterns (Cross-Cutting)

### Authentication

| Area          | Pattern                             | Status         |
| ------------- | ----------------------------------- | -------------- |
| API (tRPC)    | Only `publicProcedure` exists       | ❌ Missing     |
| API (Express) | No auth middleware                  | ❌ Missing     |
| AI Service    | No auth on any endpoint             | ❌ Missing     |
| Web           | NextAuth.js (GitHub + Google OAuth) | ✅ Implemented |

**Source:** `apps/web/src/auth.ts` — NextAuth v5 with GitHub/Google providers

### Error Handling

| Area          | Pattern                                             | Status             |
| ------------- | --------------------------------------------------- | ------------------ |
| API (tRPC)    | `errorFormatter` in `trpc.ts` (ZodError flattening) | ✅ Implemented     |
| API (Express) | `Sentry.Handlers.errorHandler()`                    | ✅ Implemented     |
| AI Service    | `HTTPException` imported but never used             | ❌ Not implemented |
| Web           | Sentry client config exists                         | ✅ Implemented     |

### Validation

| Area        | Tool                                            | Status         |
| ----------- | ----------------------------------------------- | -------------- |
| AI Service  | Pydantic BaseModel (built-in validation)        | ✅ Implemented |
| API (tRPC)  | Zod (available but not yet wired to procedures) | ⚠️ Available   |
| Web (forms) | react-hook-form + @hookform/resolvers + Zod     | ✅ Implemented |

### Environment Variable Pattern

```typescript
// TypeScript: dotenv loaded at entry point
dotenv.config({ path: "../../.env" });

// Python: load_dotenv at module level
load_dotenv((dotenv_path = os.path.join(os.path.dirname(__file__), "../../../.env")));
```

**Rule:** `.env` file at repo root. Each app loads it relative to its own location.

### Logging Pattern

```python
# Python (loguru)
from loguru import logger
logger.info(f"Message with {context}")
logger.warning(f"Warning with {context}")
logger.exception(f"Exception context")  # for exception blocks
```

```typescript
// TypeScript (pino)
const logger = pino({ transport: { target: "pino-pretty" } });
logger.info({ contextKey: value }, "Message");
logger.error(err, "Error message");
```

---

## No Analog Found

These areas have no existing codebase analog and must reference external patterns:

| Area                                              | Reason                                         |
| ------------------------------------------------- | ---------------------------------------------- |
| `apps/ai-service/app/services/`                   | Directory exists but has no `.py` source files |
| `apps/ai-service/app/prompts/`                    | Directory does not exist yet                   |
| `apps/ai-service/tests/`                          | Directory exists but has no `.py` test files   |
| `apps/api/src/services/`                          | Directory does not exist yet                   |
| `apps/api/src/__tests__/`                         | Directory does not exist yet                   |
| `apps/api/src/routers/` (tRPC route organization) | Directory does not exist yet                   |

---

## Metadata

**Analog search scope:** `apps/ai-service/`, `apps/api/`, `apps/web/`, `packages/types/`, `docs/codebase/`
**Files scanned:** 36 files (Python: 7, TypeScript: 18, docs: 7, config: 4)
**Pattern extraction date:** 2026-06-30
