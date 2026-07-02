# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## unused-usestate-import — unused useState import in code-submission component
- **Date:** 2026-07-02
- **Error patterns:** useState, defined but never used, @typescript-eslint/no-unused-vars, code-submission
- **Root cause:** useState was imported but never used — the component uses Zustand (useEditorStore) and tRPC mutation state instead of local React state.
- **Fix:** Removed useState from the React import statement.
- **Files changed:** apps/web/src/components/features/code-submission.tsx
---

