---
paths:
  - "src/app/(app)/**"
  - "src/app/(public)/**"
  - "src/server/page-auth.tsx"
---

# Pages and access

- Every `src/app/(app)/**/page.tsx` (planned modules included) default-exports an async function that directly does `const denied = await pageAccess("/path"); if (denied) return denied;` before creating any workspace. A layout or client-side check is not enough, and an `await` inside a nested callback does not count (the architecture check inspects the default function body).
- `pageAccess` takes an `AppPath` (`src/lib/auth-return.ts`), derived from the module slugs in `src/features/catalog.ts` plus `/profile`; a new page therefore needs its catalog entry first (this also bounds the login `next` parameter).
- Public `/` (landing) must render for anonymous, authenticated and Auth-unavailable states; the server decides guest vs member variant so first HTML is correct.
- Landing preview uses fixed illustrative data only — never call financial APIs or reuse signed-in data there.
- New or renamed pages: update `src/features/catalog.ts`, navigation, Help content, sitemap/SEO behaviour (`npm run test:seo` when relevant) and docs.
