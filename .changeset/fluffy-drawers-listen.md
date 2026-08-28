---
'@greypan/web-ui': minor
---

Add `--wui-drawer-inset` token to control drawer floating-card viewport inset.

- New public token `--wui-drawer-inset` (default `8px`, non-headless drawers). Set to `0` for edge-to-edge geometry, typically paired with `--wui-drawer-radius: 0`.
- The token is registered via `@property` as `<length>`, so a unitless `0` from consumers is normalized to `0px` instead of silently breaking the closed-state `calc(100% + 0)` transform (exit animation would be dropped).
- ADR-0036 updated: the inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, request-only hover end-state) reads the same variable and follows the token automatically.
