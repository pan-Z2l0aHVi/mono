---
'@greypan/web-ui': minor
---

Align observable token fallbacks with the theme definitions.

These fallbacks are observable when host theme variables are absent, so the value changes ship separately from the internal consolidation patch:

- Dialog backdrop: `rgb(0 0 0 / 0.1)` → `rgb(0 0 0 / 0.12)`
- Dialog surface overlay: `rgb(246 246 246 / 0.88)` → `rgb(246 246 246 / 0.82)`
- Text tertiary (input/textarea clear color): `rgb(27 27 27 / 0.35)` → `color-mix(in srgb, var(--wui-color-text) 35%, transparent)`
- Glass border: `rgb(51 51 51 / 0.12)` → `transparent`
- Glass shade: `rgb(0 0 0 / 0.2)` → `rgb(0 0 0 / 0.06)`
