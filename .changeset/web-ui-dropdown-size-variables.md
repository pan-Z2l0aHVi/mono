---
'@greypan/web-ui': minor
---

feat(overlay): support dropdown size variables in portal and keep borderless keyboard focus rings

- Portal panels now mirror `--wui-overlay-min-width`, `--wui-autocomplete-max-width`/`--wui-autocomplete-max-height` and `--wui-select-max-width`/`--wui-select-max-height` from the host at portal creation.
- Dropdown default scroll max-height reduced from 320px to 240px; override via `--wui-autocomplete-max-height` / `--wui-select-max-height`.
- Borderless `input`, `textarea` and `autocomplete` keep a keyboard focus ring via `:focus-visible`; pointer focus stays borderless.
