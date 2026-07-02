# Contributing to UnVibe

Thank you for your interest in contributing to UnVibe! This guide helps you set up the development environment and get started.

## Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js**: `20.x` or higher (we recommend version `22.x`)
- **pnpm**: `9.x` or higher
- **Python**: `3.12.x` or higher
- **Docker & Docker Compose**: For local databases and caches

## 5-Step Quickstart

Follow these steps to spin up the local development environment:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Demon-Die/UnVibe.git
   cd UnVibe
   ```

2. **Install project dependencies**:

   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   Copy the example environment file to local configuration:

   ```bash
   cp .env.example .env
   ```

4. **Spin up local infrastructure (PostgreSQL & Redis)**:
   Ensure Docker is running, then start the services:

   ```bash
   docker-compose -f infra/docker-compose.yml up -d
   ```

5. **Start the development servers**:
   Run the monorepo dev script:
   ```bash
   pnpm dev
   ```
   This will simultaneously run:
   - Next.js web application on `http://localhost:3000`
   - Express API backend on `http://localhost:4000`
   - FastAPI AI service on `http://localhost:8000`

---

## Branch Naming Convention

We use structural prefixing for branch names:

- `feat/feature-name` for new features or capabilities
- `fix/bug-description` for bug fixes and patches
- `chore/task-name` for updates to config files, dependencies, or tasks

---

## Commit Message Format

We follow the conventional commits specification:

- `feat(scope): add user profile editor`
- `fix(web): resolve Monaco editor resizing bug`
- `chore(deps): update prisma client dependency version`
- `docs(readme): update build commands`
