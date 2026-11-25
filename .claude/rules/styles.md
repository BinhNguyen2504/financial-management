---
paths:
  - "src/app/**/*.css"
  - "src/features/**/*.css"
---

# CSS

- `src/app/experience.css` imports the files in `src/app/styles/experience/` in a deliberate order. Preserve file order and selector specificity when moving or editing rules; do not merge "similar" rules (that changes the cascade).
- Use existing design tokens and the five visual themes (`visual-themes.css`), each with light and dark; never hard-code a colour that only works in one mode. Guest landing (`marketing.css`) has its own fixed identity and ignores saved theme.
- Respect `prefers-reduced-motion`, mobile layouts (no horizontal page scroll) and dialog viewport limits.
- Status tags use the shared `components/status-badge`; context classes may position but not recolor or resize it.
- After CSS/DOM changes, verify visually with the `ui-verify` skill; update `docs/04-ux-direction.md` or the relevant `docs/features/*.md` if conventions change.
