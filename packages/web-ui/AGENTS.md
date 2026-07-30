# web-ui Package Instructions

Read [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md) before changing a component, theme token, overlay, form behavior, or framework type wrapper.

- Preserve the documented public component contract: properties, defaults, events, slots, methods, accessibility semantics, and form behavior.
- Use the public `--wui-*` semantic tokens. The values in `src/components/theme/style.css` are the source of truth; standalone fallbacks must match its light theme values.
- Reuse the shared overlay presence lifecycle and the semantic layer tokens. Do not inject component styles into `document.head`.
- Add or update focused public-contract tests. Use browser-mode tests for browser-native behavior, and perform the root browser verification required by `AGENTS.md` for UI changes.
- Keep `README.md` and `README.CN.md` structurally aligned when a public component API changes.
