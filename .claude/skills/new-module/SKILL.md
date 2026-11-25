---
name: new-module
description: Step-by-step workflow for adding a new finance module (domain, application, SQL/RLS, route, feature UI, docs, tests) to Financial Manager following the existing layered architecture. Use when asked to add or extend a module such as Income, Savings, Investments, Funds or Goals.
---

# Add a finance module

Source of truth: `docs/11-source-maintenance.md` ("Thêm module tài chính"). Mirror an existing module — `income` is the smallest; `investments` is the most complete. Read it end-to-end for the layer you are touching before writing.

1. **Rules first.** Confirm business rules and the HTTP contract with the user before coding. Create `src/domain/<m>/` (types, zod schema, engine, report) as pure TS with BigInt money; move to `domain/shared` only primitives with identical meaning.
2. **Application.** `src/application/` use case + repository interface: preview never writes; version check + idempotency; use the shared command fingerprint (do not touch the backup fingerprint).
3. **SQL.** New file in `supabase/migrations/` (named `YYYYMMDDNNNN_name.sql`, never edit applied ones) with RLS/owner policies and archive triggers; runtime role stays separate from migration role. Do not apply to cloud or seed from UI. Add `tests/<m>-postgres.test.ts` and run `npm run test:db`.
4. **Server.** Thin route under `src/app/api/v1/<m>/` using the shared HTTP helpers (origin check, JSON read, error mapping); repository in `src/server/<m>-repository.ts` using `withOwnerTransaction`/`lockOwner` from `src/server/owner-transaction.ts`, with its own owner/schema checks and lock order.
5. **Feature UI.** `src/features/<m>/`: `editor-config`, `editor-action`, `use-…-editor`, `editor-fields`, `editor-preview`, `editor`, `use-…-workspace`, `workspace`. Reuse Modal, form feedback, inputs, tables, StatusBadge, MonthYearSelect. Page at `src/app/(app)/<m>/page.tsx` must `await pageAccess("/<m>")` in the default function.
6. **Product surface.** Register in `src/features/catalog.ts`; update landing/preview (fixed data), Help content, i18n VI/EN, backup/report/CSV integration if the module holds user data, README and `docs/features/<m>.md` — run the `docs-sync` skill.
7. **Verify.** Unit + Postgres + browser tests for the flow, then the `check` skill. Compare geometry/screenshots when CSS or DOM changed (`ui-verify`). Report what was and was not verified; source status does not prove cloud or device validation.
