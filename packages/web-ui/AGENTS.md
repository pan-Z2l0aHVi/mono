# web-ui Package Instructions

Read [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md) before changing a component, theme token, overlay, form behavior, or framework type wrapper.

- Preserve the documented public component contract: properties, defaults, events, slots, methods, accessibility semantics, and form behavior.
- Use the public `--wui-*` semantic tokens. The values in `src/components/theme/style.css` are the source of truth; standalone fallbacks must match its light theme values.
- Reuse the shared overlay presence lifecycle and the semantic layer tokens. Do not inject component styles into `document.head`.
- Choose shared overlay modules by interaction model: anchored panels, coordinate menus, or native dialog modals. Do not combine their trigger, focus, or dismissal semantics in a generic base class.
- Shared state modules use `definePlugin` factories named `defineXxx`; components create instances with `defineXxx(...).make(...)`.
- Organize component descendant states with native CSS nesting while keeping `:host(...)` selectors top-level.
- Follow the Lit binding conventions in [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md) (Shadow DOM and Lit): static literals and dynamic strings as plain attributes, dynamic non-string values as `.prop`, dynamic booleans as `?prop`, explicit ARIA strings; never use `:`-prefixed bindings.
- Add or update focused public-contract tests. Use browser-mode tests for browser-native behavior, and perform the root browser verification required by `AGENTS.md` for UI changes.
- Keep `README.md` and `README.CN.md` structurally aligned when a public component API changes.
- Treat the custom-element host as the public attribute boundary. Do not add generic attribute fallthrough: `data-*` stays on the host; native and ARIA attributes reach shadow controls only through a documented, component-specific mapping. Native interaction events cross the boundary through browser composition; state `*-change` events are reserved for user-originated changes.
