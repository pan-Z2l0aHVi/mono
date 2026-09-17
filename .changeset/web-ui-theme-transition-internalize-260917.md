---
'@greypan/web-ui': minor
---

Internalize theme transitions into `web-ui-theme`.

- Adds the `transition` attribute with `off` / `on`; it stays `off` by default and reflects invalid values back to `off`.
- Root themes reveal the whole page with a circular View Transition. Nested themes assign a temporary capture name and reveal only their own box.
- Reads `--wui-theme-transition-duration` and `--wui-theme-transition-easing`, keeps one flight at a time, and falls back to an immediate appearance update when View Transitions or reduced-motion behavior makes animation unavailable.
- Replaces the duplicated demo-side transition CSS/logic.
