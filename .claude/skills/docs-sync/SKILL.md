---
name: docs-sync
description: Review and update product documentation after changing a feature, user flow, auth boundary or visible UI in Financial Manager (catalog, landing, preview, README, docs/features). Use for every product change, and to write the "documentation review" line of the completion report.
---

# Documentation sync (required by AGENTS.md)

Run this when a change affects a feature, flow, authentication boundary or visible UI. Pure tooling/refactor changes still get a one-line review result.

Checklist — review each item, update it if the change touches it:

1. `src/features/catalog.ts` — module names, summaries and `implemented` / `partial` / `planned` status. Source status is not proof of cloud deployment or physical-device validation.
2. Landing copy and the illustrative preview (`src/features/landing/`): fixed demo data only; never read account APIs or signed-in data; amounts/labels/behaviour must match the real product.
3. Page access: every `src/app/(app)/**/page.tsx`, including planned modules, awaits `pageAccess` in its default function; public `/` stays open for any session.
4. `README.md` — status paragraphs and links.
5. Affected `docs/features/<module>.md`, plus `docs/02-architecture.md`, `docs/04-ux-direction.md`, `docs/05-deployment.md` when architecture, UX or deployment text changes; `docs/features/landing.md` for landing/auth.
6. `docs/07-validation.md` — keep dated history. Append new evidence with its environment and limitations; never rewrite old entries or claim unsupported banking, offline entry, net-worth reporting or deployment readiness.
7. Vietnamese and English strings (`src/i18n/messages`) stay consistent with each other and with the docs.

Docs are Vietnamese. Do not run a background/automatic content updater; this is a manual development step.

Completion report must include, e.g.:

> Documentation review: updated `catalog.ts`, `README.md`, `docs/features/<x>.md`; checked landing/preview (no change); validation entry added with environment `<local/test double>` and limitation `<not cloud-verified>`.

or, for tooling-only work: "Documentation review: không thay đổi tính năng/catalog/landing."
