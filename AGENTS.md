<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product and documentation consistency

- When changing a feature, user flow, authentication boundary or visible UI, review and update the module catalog, landing copy, illustrative preview, README and affected feature/architecture/UX docs in the same change.
- `src/features/catalog.ts` is the shared source for module names, summaries and `implemented` / `partial` / `planned` status. A source implementation status is not proof of cloud deployment or physical-device validation.
- Keep public preview data fixed and illustrative. Never read account financial APIs or reuse a signed-in user's data in the landing preview. Keep amounts, labels and preview behavior consistent with the actual product.
- All application pages, including planned module pages, must await the shared server page-access check before rendering. A layout or client-only check is insufficient. Public `/` remains accessible regardless of session.
- Preserve dated validation history; add current evidence with its environment and limitations. Do not claim unsupported banking, offline entry, net-worth reporting or deployment readiness.
- This is a development workflow, not a background content updater. Include the documentation review in the completion report for product changes.
