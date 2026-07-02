---
status: resolved
trigger: "web#build failing: 'useState' is defined but never used. @typescript-eslint/no-unused-vars in apps/web/src/components/features/code-submission.tsx"
created: 2026-07-02T10:00:00.000Z
updated: 2026-07-02T10:00:00.000Z
---

## Current Focus

hypothesis: "useState is imported but genuinely unused — the component uses Zustand (useEditorStore) and tRPC mutation state instead"
test: Remove useState from import, run build to verify
expecting: Build passes without the no-unused-vars error
next_action: Apply fix and run pnpm run build in apps/web

## Symptoms

expected: web#build passes without errors
actual: ESLint error — 'useState' is defined but never used
errors: "3:10  Error: 'useState' is defined but never used.  @typescript-eslint/no-unused-vars"
reproduction: Run any build command that invokes ESLint on code-submission.tsx
started: Likely since the component was written without using useState

## Eliminated

- hypothesis: useState might be needed but was forgotten
  evidence: Component uses useEditorStore for code state and trpc.useMutation for submission lifecycle — all state needs are met without useState
  timestamp: 2026-07-02T10:00:00.000Z

## Evidence

- timestamp: 2026-07-02T10:00:00.000Z
  checked: apps/web/src/components/features/code-submission.tsx lines 1-63
  found: useState imported on line 3 but never called in component body. Component uses useEditorStore (line 11) and trpc.modules.submitDecode.useMutation() (line 12).
  implication: useState is genuinely unused — removing it is the correct fix

## Resolution

root_cause: Unused import of useState in code-submission.tsx component — the component uses Zustand (useEditorStore) for state management and tRPC mutation state for submission lifecycle, with no need for local React state
fix: Remove useState from the React import on line 3
verification: Build passes cleanly — "Compiled successfully", 0 ESLint errors, 13 static pages generated
files_changed:
  - apps/web/src/components/features/code-submission.tsx
