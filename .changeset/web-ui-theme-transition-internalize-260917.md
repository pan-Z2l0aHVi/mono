---
'@greypan/web-ui': minor
---

Internalize theme transitions into `web-ui-theme`.

- Adds the boolean `transition` attribute; it is `false` by default and uses native HTML attribute-presence semantics.
- Root themes reveal the whole page with a circular View Transition. Nested themes assign a temporary capture name and reveal only their own box.
- Reads `--wui-theme-transition-duration` and `--wui-theme-transition-easing`, keeps one flight at a time, and falls back to an immediate appearance update when View Transitions or reduced-motion behavior makes animation unavailable.
- Replaces the duplicated demo-side transition CSS/logic.
