---
paths:
  - "docs/**"
  - "README.md"
---

# Documentation

- Write in Vietnamese, matching the existing tone; keep file/command names in code formatting.
- Preserve dated validation history (`docs/07-validation.md` and dated feature notes). Add new entries with date, environment and limitations; do not rewrite earlier entries.
- Do not claim unsupported capabilities: bank sync, offline entry, net-worth reporting, cloud migration applied, deployment readiness or physical-device validation. Source status is not proof of cloud state.
- Keep README, `src/features/catalog.ts`, landing copy and the module doc consistent (see the `docs-sync` skill).
- Relative links must resolve; module specs live in `docs/features/<module>.md`.
