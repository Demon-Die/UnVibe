---
status: investigating
trigger: "Debug TypeScript build errors in UnVibe monorepo (pnpm build fails with api#build exiting code 2)"
created: 2026-06-30T21:47:00.000Z
updated: 2026-06-30T21:47:00.000Z
---

## Current Focus

hypothesis: Three independent root causes causing tsc build failure — (1) prisma generate not run, (2) tsconfig includes test files without jest types, (3) untyped catch param
test: Verify each root cause by checking node_modules/.prisma/client existence, tsconfig include/exclude, and TypeScript strict mode behavior
expecting: All three confirmed
next_action: Present completed diagnosis with fix steps

## Symptoms

expected: `pnpm build` completes with zero TypeScript errors
actual: `api#build` task exits with code 2 — three error groups
errors: |
Error Group 1 — TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'
src/index.ts(8,10): error TS2305
src/services/submission-worker.ts(13,10): error TS2305

Error Group 2 — Test globals not found (30+ errors)
src/**tests**/ai-client.test.ts(30,1): error TS2582: Cannot find name 'describe'
src/**tests**/ai-client.test.ts(33,3): error TS2304: Cannot find name 'beforeEach'
src/**tests**/ai-client.test.ts(35,5): error TS2304: Cannot find name 'jest'
... (describe, it, expect, jest, beforeEach all unrecognized)

Error Group 3 — TS7006: Parameter 'e' implicitly has an 'any' type
src/services/submission-worker.ts(100,19): error TS7006
reproduction: Run `pnpm build` in repo root (or `pnpm --filter api build`)
started: First build attempt — never successfully built

## Eliminated

- hypothesis: @prisma/client not installed as dependency
  evidence: @prisma/client is listed in dependencies of apps/api/package.json at line 17, and node_modules/@prisma/client exists
  timestamp: 2026-06-30T21:47:00.000Z

- hypothesis: Missing @types/jest is the full fix for Error Group 2
  evidence: The real fix is to exclude test files from the build tsconfig. Adding @types/jest would only mask the problem — test files shouldn't be compiled during a production build. Test runner (jest.config.ts uses ts-jest) handles compilation separately.
  timestamp: 2026-06-30T21:47:00.000Z

## Evidence

- timestamp: 2026-06-30T21:47:00.000Z
  checked: apps/api/tsconfig.json
  found: `"include": ["src/**/*"]` — this includes `src/__tests__/ai-client.test.ts`
  implication: Test files are compiled during `tsc build`. This is the cause of Error Group 2.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: apps/api/node_modules/@prisma/client/index.d.ts
  found: `export * from '.prisma/client/default'` — re-exports from generated client
  implication: Requires `.prisma/client/` generated directory to exist.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: node_modules/.prisma/client/ and apps/api/node_modules/.prisma/client/
  found: Neither exists anywhere in the repo
  implication: `prisma generate` has never been run. This is the cause of Error Group 1.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: apps/api/tsconfig.build.json
  found: Does not exist
  implication: No separate build tsconfig exists to exclude test files.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: apps/api/node_modules/@types/jest
  found: Does not exist (neither in apps/api/node_modules nor root node_modules)
  implication: Even if tests were included, jest type definitions are not available.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: apps/api/src/services/submission-worker.ts line 100
  found: `.catch((e) => logger.error(...))` — `e` is an untyped arrow function parameter in a `.catch()` callback
  implication: `useUnknownInCatchVariables` (strict mode) only applies to `catch(e)` in try/catch blocks, NOT to `.catch((e) => ...)` promise callbacks. The param `e` is a regular parameter defaulting to `any`. This is Error Group 3.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: tsconfig.base.json line 9 — `"strict": true`
  found: strict mode is enabled
  implication: `noImplicitAny` is enabled, which catches any untyped parameter.

- timestamp: 2026-06-30T21:47:00.000Z
  checked: turbo.json
  found: build task has `"dependsOn": ["^build"]` but no dependency on `db:generate`
  implication: Even if `prisma generate` were a script, it wouldn't automatically run before build

- timestamp: 2026-06-30T21:47:00.000Z
  checked: apps/api/package.json build script
  found: `"build": "tsc"` — uses the default tsconfig.json which includes test files
  implication: No separate build tsconfig is used

## Resolution

root_cause: |
Three independent root causes:

1. **PrismaClient not found (Error Group 1):** `prisma generate` has never been run. The `@prisma/client` package is installed but its generated client code in `.prisma/client/` only materializes after `prisma generate`. TypeScript resolves the import declaration to `@prisma/client/index.d.ts` which re-exports from `.prisma/client/default` — a file that doesn't exist, so there are no exports to resolve.

2. **Test files compiled during build (Error Group 2):** `tsconfig.json` uses `"include": ["src/**/*"]` which matches `src/__tests__/ai-client.test.ts`. This file uses Jest globals (`describe`, `beforeEach`, `jest`, `expect`, `it`) but `@types/jest` is not installed. The fix is to exclude test files from the build tsconfig (standard practice), NOT to install jest types (which would only allow test code to compile into the production dist).

3. **Implicit any on catch param (Error Group 3):** Line 100 of `submission-worker.ts` has `.catch((e) => logger.error(...))`. The `useUnknownInCatchVariables` flag (implied by `strict: true`) only applies to `catch` clause variables in try/catch blocks, NOT to `.catch()` promise method callbacks. The parameter `e` is a regular untyped arrow function parameter, which strict mode's `noImplicitAny` flags as an error.

fix: |

1. Run `pnpm --filter api exec prisma generate` before build (or add `"prebuild": "prisma generate"` to apps/api/package.json)
2. Create a `tsconfig.build.json` that excludes `src/__tests__`, update build script to `"build": "tsc -p tsconfig.build.json"`
3. Add explicit type annotation `e: unknown` on line 100 of submission-worker.ts
   verification: Not yet applied
   files_changed:

- apps/api/tsconfig.build.json (create)
- apps/api/package.json (update build script)
- apps/api/src/services/submission-worker.ts (fix catch param type)
