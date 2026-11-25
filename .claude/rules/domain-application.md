---
paths:
  - "src/domain/**"
  - "src/application/**"
---

# Domain and application layers

- `src/domain/**` is pure TypeScript: import only other `src/domain/**` files and `zod`. No React, Next, i18n, server or Node APIs. `scripts/check-architecture.mjs` fails on anything else, including type-only imports.
- `src/application/**` imports only `application` and `domain`.
- Money is `BigInt` or decimal strings. No `number` arithmetic on VND amounts or gold quantities; keep rounding rules identical to the existing engine and its tests.
- Preview functions never write. Commands carry version + idempotency data and use `application/shared/command-fingerprint.ts` (`localeCompare` ordering). The backup fingerprint has a different comparator on purpose — do not unify them.
- Put a primitive in `domain/shared` only if it means exactly the same thing in every module; keep legacy validation variants when messages or rules differ.
- Changing a calculation: update unit tests in `tests/<module>.test.ts` and the matching `docs/features/<module>.md`.
