---
name: check
description: Run the Financial Manager CI gate (lint, architecture, format, unit tests, typecheck, build) with the correct Node version and summarize failures per step. Use before reporting a code change as done.
---

# Run the source gate

The gate is `npm run check` = `lint` → `check:architecture` → `format:check` → `test` → `typecheck` → `build`. Node must be 22.12+; the default shell Node on this machine is 18, so each Bash call needs the prefix:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && <command>
```

1. Run the steps individually (fastest feedback first) rather than only `npm run check`: `npm run lint`, `npm run check:architecture`, `npm run format:check`, `npm test`, `npm run typecheck`, then `npm run build`. Stop at the first failing step and fix it; for formatting only, `npx prettier --write <files>`.
2. If you changed anything under `supabase/`, SQL repositories or `src/server/`, also run `npm run test:db` (needs local PostgreSQL via `pg_config` or `PG_BIN`; it never touches `DATABASE_URL`). If you changed UI flows, run the relevant `tests/browser/*.spec.ts` via `npm run test:e2e` or use the `ui-verify` skill.
3. Report per step: pass/fail, and for failures the exact error output and file:line. Do not claim success for a step you did not run; say which steps were skipped and why.
4. Architecture violations (`Domain dependency`, `Application dependency`, `Client/server boundary`, `Runtime cycle`, `Missing awaited pageAccess`) are real design errors: fix the import direction, do not add exceptions to `scripts/check-architecture.mjs`.
5. Do not weaken ESLint rules, enable React Compiler, or alter effect scheduling to get lint green (see `docs/11-source-maintenance.md`).
