---
'@greypan/web-ui': minor
---

feat(layout): add mobile toggle inset variable and glass variant

- The mobile header toggle renders as a glass button and gains an 8px left inset by default, so it no longer sits flush against the viewport edge.
- Consumers can align the toggle with their own header padding via `--wui-layout-mobile-toggle-inset`.
