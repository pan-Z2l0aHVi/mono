---
'@greypan/web-ui': minor
---

feat(web-ui): redefine borderless inputs as ghost form with normal-variant focus ring

- `borderless` on input, textarea, and autocomplete now removes only surface decoration (border, glass background/blur, shadow, and glass outline ring) while keeping padding, height metrics, and the focus ring.
- The borderless focus ring is the same double box-shadow as the normal variant (1px inset accent + focus-ring halo, 200ms transition) and shows on mouse and programmatic focus as well as keyboard focus; the previous `:focus-visible`-gated outline is removed.
- Compatibility note: consumers that suppressed the focus ring with `[--wui-color-focus-ring:transparent]` now only hide the outer halo — the 1px inset accent line remains visible on focus.
