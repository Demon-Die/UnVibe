# UnVibe

> "Don't use AI as a crutch. Use it as a benchmark."

UnVibe is an open-source AI-powered learning platform that trains developers to deeply understand code — not just generate it. The platform gives AI the hardest version of a problem, then makes you decode it, rebuild it simpler, and defend your understanding under pressure.

---

## Table of Contents

- [What is UnVibe](#what-is-unvibe)
- [How the Learning Loop Works](#how-the-learning-loop-works)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup — Step by Step](#local-setup--step-by-step)
- [Running the Apps](#running-the-apps)
- [Environment Variables](#environment-variables)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Who Owns What](#who-owns-what)
- [How to Contribute](#how-to-contribute)
- [Versioning Roadmap](#versioning-roadmap)
- [Feature List](#feature-list)
- [License](#license)

---

## What is UnVibe

Most developers today prompt AI, paste output, and ship without understanding. UnVibe exists to reverse that.

The platform's goal is simple: you should be skilled enough that no company can replace you with a prompt. It does this through the **Decode → Rebuild → Defend** loop — a repeatable cycle that forces real understanding, not surface familiarity.

Your progress is tracked through an **Irreplaceability Score (IRS)** — a dynamic metric that measures how deeply you understand code versus how much you depend on AI.

---

## How the Learning Loop Works

Every module on UnVibe follows three mandatory phases in order.

**Phase 1 — Decode**

AI generates a production-grade solution to a real problem. You read it line by line, annotate what each part does, and answer a comprehension quiz auto-generated from the code. You cannot move forward until you pass the quiz.

**Phase 2 — Rebuild**

You rewrite the same solution from scratch without AI help. A diff engine compares your version to the AI's — not to reward copying the style, but to measure whether you understood the outcome. Your submission is scored on correctness, readability, and simplicity.

**Phase 3 — Defend**

A scheduled session where the system picks a random past rebuild and asks you to explain it, modify it under a time constraint, or debug a broken version of it. This is what prevents shallow learning from accumulating.

---

## Project Structure

The repository is a Turborepo monorepo with three apps and two shared packages.

```
unvibe/
├── apps/
│   ├── web/                        # Next.js 14 frontend (App Router)
│   │   ├── app/                    # Pages and layouts
│   │   │   ├── (auth)/             # Login, signup
│   │   │   ├── (dashboard)/        # User dashboard
│   │   │   ├── tracks/             # Learning tracks and modules
│   │   │   ├── war-room/           # Weekly group challenges
│   │   │   ├── profile/            # Public profile + IRS card
│   │   │   └── defend/             # Live defend sessions
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn base components
│   │   │   ├── editor/             # Monaco code editor, diff viewer
│   │   │   ├── decode/             # Annotation editor, quiz UI
│   │   │   ├── rebuild/            # Code submission UI
│   │   │   ├── defend/             # Q&A interface
│   │   │   ├── war-room/           # Real-time challenge UI
│   │   │   ├── irs/                # Score card, radar chart
│   │   │   └── dashboard/          # Streak, blindspot map, progress
│   │   └── lib/
│   │       ├── trpc/               # tRPC client
│   │       ├── auth/               # NextAuth config
│   │       └── store/              # Zustand state stores
│   │
│   ├── api/                        # Node.js + Express backend
│   │   └── src/
│   │       ├── routers/            # tRPC route handlers
│   │       │   ├── auth.ts
│   │       │   ├── modules.ts
│   │       │   ├── submissions.ts
│   │       │   ├── irs.ts
│   │       │   ├── warRoom.ts
│   │       │   └── profile.ts
│   │       ├── services/
│   │       │   ├── irs-engine.ts   # IRS score calculation
│   │       │   ├── defend-scheduler.ts
│   │       │   ├── pdf-generator.ts
│   │       │   └── socket-server.ts
│   │       ├── db/
│   │       │   ├── schema.prisma   # Database schema
│   │       │   └── migrations/
│   │       └── middleware/
│   │           ├── auth.ts
│   │           ├── rate-limit.ts
│   │           └── logger.ts
│   │
│   └── ai-service/                 # Python FastAPI — all AI logic
│       └── app/
│           ├── routes/
│           │   ├── generate.py     # Code generation via Claude
│           │   ├── quiz.py         # Quiz generation from code
│           │   ├── defend.py       # Defend Q&A generation
│           │   ├── diff.py         # AST-based diff engine
│           │   └── autopsy.py      # Concept autopsies (v1.5+)
│           ├── prompts/            # Versioned Claude prompt templates
│           │   ├── v1/
│           │   └── v2/
│           └── services/
│               ├── claude_client.py
│               ├── judge0_client.py
│               └── ast_differ.py
│
├── packages/
│   ├── types/                      # Shared TypeScript types (used by web + api)
│   ├── config/                     # Shared ESLint, Prettier, tsconfig
│   └── ui/                         # Shared UI primitives (optional)
│
├── infra/
│   ├── docker-compose.yml          # Spins up Postgres + Redis locally
│   ├── docker-compose.prod.yml
│   └── scripts/
│       ├── seed.ts                 # Seeds DB with starter modules and tracks
│       └── migrate.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Runs lint + tests on every PR
│       └── deploy.yml              # Deploys on merge to main
│
├── .env.example                    # Copy this to .env and fill in values
├── turbo.json
└── package.json
```

---

## Prerequisites

Install these before doing anything else.

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 or higher | https://nodejs.org |
| pnpm | 9 or higher | `npm install -g pnpm` |
| Python | 3.12 or higher | https://python.org |
| Docker Desktop | Latest | https://docker.com |

Verify your versions:

```bash
node -v        # should print v20.x.x or higher
pnpm -v        # should print 9.x.x or higher
python3 --version  # should print 3.12.x or higher
docker -v      # should print Docker version x.x.x
```

---

## Local Setup — Step by Step

Follow these steps in order. Do not skip any step.

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-org/unvibe.git
cd unvibe
```

### Step 2 — Install all dependencies

This installs dependencies for all three apps and both packages at once.

```bash
pnpm install
```

### Step 3 — Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values. See the [Environment Variables](#environment-variables) section below for what each one is and where to get it. At minimum for local development you need:

- `DATABASE_URL`
- `REDIS_URL`
- `ANTHROPIC_API_KEY`
- `NEXTAUTH_SECRET`

### Step 4 — Start the database and Redis

This uses Docker to start PostgreSQL and Redis locally. You do not need to install them manually.

```bash
docker-compose -f infra/docker-compose.yml up -d
```

Wait about 10 seconds for both services to be healthy. You can verify they are running with:

```bash
docker ps
```

You should see two containers: one for `postgres` and one for `redis`.

### Step 5 — Run database migrations

This creates all the tables in your local database using the Prisma schema.

```bash
pnpm db:migrate
```

### Step 6 — Seed the database

This populates your database with starter tracks, modules, and test data so the app is usable immediately.

```bash
pnpm db:seed
```

### Step 7 — Set up the Python AI service

The AI service runs in its own Python virtual environment.

```bash
cd apps/ai-service
python3 -m venv venv

# On Mac / Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
cd ../..
```

---

## Running the Apps

Once setup is complete, start everything with one command from the repo root:

```bash
pnpm dev
```

This starts all three apps simultaneously using Turborepo.

| App | URL | Description |
|---|---|---|
| Web (frontend) | http://localhost:3000 | The main Next.js application |
| API (backend) | http://localhost:3001 | The Node.js + tRPC API server |
| AI Service | http://localhost:8000 | The Python FastAPI AI service |
| AI Service Docs | http://localhost:8000/docs | Auto-generated FastAPI endpoint docs |

If you only want to run one app at a time:

```bash
pnpm --filter web dev        # frontend only
pnpm --filter api dev        # backend only
cd apps/ai-service && uvicorn app.main:app --reload --port 8000  # AI service only
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values below.

```env
# -------------------------------------------------------
# DATABASE
# -------------------------------------------------------
# Local default — works as-is if you used docker-compose
DATABASE_URL=postgresql://user:password@localhost:5432/unvibe

# -------------------------------------------------------
# REDIS
# -------------------------------------------------------
# Local default — works as-is if you used docker-compose
REDIS_URL=redis://localhost:6379

# -------------------------------------------------------
# AUTH
# -------------------------------------------------------
# Generate a random string: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth — create an app at https://github.com/settings/developers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth — create credentials at https://console.cloud.google.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# -------------------------------------------------------
# AI
# -------------------------------------------------------
# Get your key at https://console.anthropic.com
ANTHROPIC_API_KEY=

# -------------------------------------------------------
# OBJECT STORAGE (Cloudflare R2)
# -------------------------------------------------------
# Create a bucket at https://dash.cloudflare.com → R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# -------------------------------------------------------
# EMAIL (Resend)
# -------------------------------------------------------
# Get your key at https://resend.com
RESEND_API_KEY=

# -------------------------------------------------------
# MONITORING (optional for local dev)
# -------------------------------------------------------
SENTRY_DSN_WEB=
SENTRY_DSN_API=
NEXT_PUBLIC_POSTHOG_KEY=
```

For local development, only `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, and `NEXTAUTH_SECRET` are strictly required. The rest can be left blank until you need to test those specific features.

---

## Architecture Overview

```
CLIENT (Browser)
  Next.js App · Monaco Editor · Socket.io Client
        |
        v
API GATEWAY
  Next.js API Routes + tRPC
  Rate Limiting · Auth Middleware · Logging
        |
   _____|____________________
  |           |              |
  v           v              v
Core API    AI Service    Real-time
(Node.js)   (Python)      (Socket.io)
  |           |              |
  |    Claude API            |
  |           |              |
  v           v              |
PostgreSQL   Redis  <---------
(primary DB) (cache + pub/sub)
  |
  v
Cloudflare R2
(code snapshots, PDF reports, assets)
```

**How a module session flows end to end:**

1. User selects a module in the browser
2. Frontend calls the API, which calls the AI Service
3. AI Service sends a problem to Claude and receives production code back
4. Code and metadata are stored in PostgreSQL
5. User annotates the code in the Decode phase — saved in real time via debounced API calls
6. Claude generates a quiz from the annotations — user must pass to continue
7. User writes their own solution in the Rebuild phase using the Monaco editor
8. On submit, code is sent to the AI Service, which runs the AST diff engine and scores the submission
9. Score is stored; IRS Engine recalculates the user's Irreplaceability Score
10. A Defend session is scheduled via BullMQ — when it fires, Claude generates questions from the user's own rebuilt code

---

## Tech Stack

### Frontend (apps/web)

| What | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Code editor | Monaco Editor |
| Animations | Framer Motion |
| State management | Zustand |
| Server state + caching | TanStack Query |
| Real-time | Socket.io Client |
| Forms + validation | React Hook Form + Zod |
| Charts | Recharts |
| Diff viewer | react-diff-viewer-continued |
| Error tracking | Sentry |

### Backend (apps/api)

| What | Tool |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| API contract | tRPC |
| Auth | NextAuth.js v5 |
| Database ORM | Prisma |
| Job queue | BullMQ (Redis-backed) |
| Real-time server | Socket.io |
| PDF generation | Puppeteer |
| Logging | Pino |

### AI Service (apps/ai-service)

| What | Tool |
|---|---|
| Language | Python 3.12 |
| Framework | FastAPI |
| LLM | Anthropic Claude API |
| Code execution (sandboxed) | Judge0 (self-hosted) |
| Diff engine | Python difflib + custom AST scorer |

### Data + Infrastructure

| What | Tool |
|---|---|
| Primary database | PostgreSQL 16 |
| Cache + pub/sub | Redis 7 |
| Object storage | Cloudflare R2 |
| Monorepo tooling | Turborepo |
| Package manager | pnpm |
| Frontend hosting | Vercel |
| Backend hosting | Railway or Render |
| CI/CD | GitHub Actions |
| Error tracking | Sentry |
| Product analytics | PostHog |
| Email | Resend |

---

## Who Owns What

Understanding who is responsible for what will help you pick the right area to contribute to.

### UI / Design

Owns the visual design system, component specs, and user experience flows.

Responsible for the Figma design system, brand tokens exported to Tailwind config, responsive specs for mobile and desktop, accessibility compliance (WCAG 2.1 AA), and dark/light mode token definitions.

### Frontend

Owns the Next.js application and everything the user sees and interacts with.

Responsible for implementing all pages and components from design specs, the Monaco editor integration, the diff viewer in the Rebuild phase, real-time War Room UI using Socket.io, IRS score visualizations using Recharts, TanStack Query setup for all server state, and frontend performance (Core Web Vitals, code splitting, lazy loading).

Key pages and what they do:

- `/` — Landing page
- `/dashboard` — Personal hub: streak, IRS score, recent modules
- `/tracks` — Browse learning tracks
- `/tracks/[track]/[module]` — The module player (all three phases live here)
- `/war-room` — Active War Room listing
- `/war-room/[id]` — War Room detail and leaderboard
- `/profile/[username]` — Public profile and shareable IRS card
- `/defend/[sessionId]` — Live Defend session room
- `/blindspot` — Full Blindspot Map view

### Backend

Owns the core API, authentication, database, and business logic.

Responsible for all tRPC routers, the NextAuth.js auth setup, the Prisma database schema and migrations, the IRS Engine algorithm, module and submission storage, the BullMQ job queue for scheduling Defend sessions, PDF generation for employer IRS reports, and the Socket.io server for real-time rooms.

### AI Service

Owns all Claude API integrations and code evaluation logic.

Responsible for the code generation endpoint, quiz generation from annotated code, Defend Q&A generation from a user's rebuild, Defend answer evaluation, the AST-based diff engine that scores rebuilds, sandboxed code execution via Judge0, and prompt versioning so all Claude prompts are version-controlled and A/B testable.

### DevOps / Infrastructure

Owns CI/CD, deployment, and infrastructure.

Responsible for Docker Compose for local dev, GitHub Actions pipelines, Vercel and Railway/Render config, PostgreSQL and Redis provisioning, Cloudflare R2 setup, secrets management, Sentry and PostHog configuration, and uptime monitoring.

---

## How to Contribute

**Before writing any code**, look at the open issues on GitHub and comment on one to claim it. This avoids duplicate work.

### Step 1 — Fork and branch

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/your-username/unvibe.git
cd unvibe

# Create a branch for your work
git checkout -b feat/your-feature-name
```

Branch naming conventions:

- `feat/` — new feature
- `fix/` — bug fix
- `chore/` — maintenance, dependency updates
- `docs/` — documentation only

### Step 2 — Make your changes

Keep changes focused. One branch, one purpose. If you discover something unrelated that needs fixing, open a separate issue.

### Step 3 — Commit your changes

Follow this commit message format:

```
feat: add IRS radar chart to dashboard
fix: quiz not advancing after correct answer
chore: update Prisma to 5.x
docs: add AI service setup instructions to README
```

### Step 4 — Check your work before pushing

```bash
pnpm lint      # must pass
pnpm test      # must pass
```

### Step 5 — Open a pull request

Push your branch and open a PR to `main`. Fill out the PR template completely. All PRs require one review before merge. The CI pipeline runs lint, type-check, and tests automatically on every PR — your PR cannot be merged if CI fails.

---

## Versioning Roadmap

### Version 1.0 — Foundation (MVP)

Core learning loop is live. Users can sign up, pick a track, and complete full Decode → Rebuild → Defend cycles for JavaScript and Python.

What ships: authentication, 3 learning tracks (Web Dev, Backend Dev, DSA), AI code generator, Decode phase with annotation editor and quiz, Rebuild phase with Monaco editor and diff engine, async text-based Defend phase, personal dashboard with streak tracking, 30 starter modules (10 per track), light/dark mode.

### Version 1.1 — The Score

Introduces the Irreplaceability Score as UnVibe's core differentiator.

What ships: IRS algorithm calculated from Decode accuracy + Rebuild quality + Defend performance, shareable public IRS profile card, employer-facing IRS report (PDF export), code quality scoring by readability and simplicity, weekly email digest, 75 total modules.

### Version 1.2 — Community

Adds social and competitive mechanics to drive retention.

What ships: War Rooms (weekly group challenges), War Room leaderboard, peer review system, user profiles with activity feed, comment threads on modules, referral system, mobile-responsive UI overhaul.

### Version 1.5 — Interview Layer

Makes UnVibe the go-to interview prep platform for AI-era engineering roles.

What ships: Concept Autopsies (visual breakdowns of AI tradeoffs), Live Defend sessions with AI voice interviewer, timed rebuild-under-pressure mode, mock interview simulation based on IRS weak spots, Blindspot Map, company-specific prep tracks.

### Version 2.0 — Platform

Opens UnVibe to instructors, companies, and more languages.

What ships: instructor portal, company portal with private War Rooms, multi-language support (TypeScript, Go, Rust, Java, C++), AI tutoring layer, PWA offline mode, localization in 5 languages, partner API access.

### Version 2.5 — Ecosystem

Full enterprise product and creator economy.

What ships: UnVibe Marketplace for community modules, white-label option for bootcamps and universities, cohort-based learning, VS Code and JetBrains plugins, B2B enterprise licensing.

---

## Feature List

| Feature | Added in | Tier |
|---|---|---|
| Authentication (Email + OAuth) | 1.0 | Free |
| Learning Tracks (Web, Backend, DSA) | 1.0 | Free |
| AI Code Generator | 1.0 | Free |
| Decode Phase (Annotation + Quiz) | 1.0 | Free |
| Rebuild Phase (Editor + Diff Engine) | 1.0 | Free |
| Defend Phase (Async Text Q&A) | 1.0 | Free |
| Personal Dashboard + Streak | 1.0 | Free |
| Irreplaceability Score (IRS) | 1.1 | Free |
| Employer IRS Report (PDF) | 1.1 | Pro |
| Shareable IRS Profile | 1.1 | Free |
| War Rooms (Weekly Challenges) | 1.2 | Free |
| Peer Review System | 1.2 | Free |
| Concept Autopsies | 1.5 | Pro |
| Live Defend (AI Voice Interviewer) | 1.5 | Pro |
| Blindspot Map | 1.5 | Pro |
| Interview Simulation | 1.5 | Pro |
| Company-Specific Prep Tracks | 1.5 | Pro |
| Instructor Portal | 2.0 | Instructor |
| Company Portal + Private War Rooms | 2.0 | Enterprise |
| Multi-language Support | 2.0 | Free/Pro |
| PWA / Offline Mode | 2.0 | Pro |
| Localization (5 languages) | 2.0 | Free |
| Marketplace | 2.5 | Marketplace |
| VS Code / JetBrains Plugin | 2.5 | Pro |
| White-label | 2.5 | Enterprise |

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

Built for developers who want to be irreplaceable.

UnVibe — Stop vibing. Start understanding.
