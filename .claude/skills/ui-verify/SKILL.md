---
name: ui-verify
description: Verify a Financial Manager UI change in a real browser using the dev server and the Playwright MCP server (screenshots, light/dark, five themes, VI/EN, mobile). Use after changing components, CSS, layout, landing or dialogs.
---

# Verify UI in the browser

Prereqs: Google Chrome installed; `.mcp.json` provides the `playwright` MCP server (headless, 1440×900, isolated profile, output in git-ignored `artifacts/playwright/`). Check it is connected with `/mcp`.

1. Start the app with Node 22: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run dev` (run in background; serves http://127.0.0.1:3000). Without `.env.local` you still get landing + login-setup state.
2. For signed-in screens use the isolated review dataset instead of cloud: `npm run data:preview` prints a local URL; sign in with `review@example.test` / code `12345678`. Never use real credentials, `.env.local` or cloud data.
3. With Playwright MCP, navigate to the affected pages and check:
   - desktop 1440×900 and mobile (~390 wide, no horizontal page scroll);
   - light/dark and the five themes (Khu vườn, Dòng nước, Kim ngân, Lửa ấm, Đất lành) — guest landing is intentionally theme-independent;
   - Tiếng Việt and English; Privacy Mode (eye button) hides amounts;
   - dialogs: focus order, footer stays visible on scroll, draft preserved when opening Help and returning;
   - `prefers-reduced-motion` has no animation/scroll smoothing.
4. Read console errors (hydration diffs from the `cz-shortcut-listen` extension are known: `docs/08-troubleshooting.md`).
5. Save screenshots under `artifacts/playwright/` only. Stop the dev server when done.
6. Report what you actually looked at (page, viewport, theme, language) and what you did not. For regression coverage, add or run the matching `tests/browser/*.spec.ts` via `npm run test:e2e`.
