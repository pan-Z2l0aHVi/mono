---
'@greypan/web-ui': major
---

Add a `sport` progress mode and remove `indeterminate`.

**Breaking:** the `indeterminate` prop, the `--wui-progress-indeterminate-duration` custom property, and the `wui-progress-indeterminate` keyframes (previously reachable through the public `indicator` part) are removed; custom animations must use `wui-progress-sport` instead. A `progressbar` only expresses known progress; for work whose percentage cannot be calculated yet, use a loading indicator such as `web-ui-spinner`. This is a major bump because `indeterminate` shipped in 12.4.0. Remove any leftover `indeterminate` attribute from templates: it is now ignored and, without an explicit `value`, silently degrades to 0% instead of an unknown-progress state. The host always exposes `aria-valuenow`; `show-value` no longer shows an ellipsis and displays the percentage when enabled.

`sport` turns the completed portion into a square-cornered bar sized by `value / max` that loops from left to right with non-linear easing. The default period is 1s (1.25 times the theme's spinner token) and slows to 2s under a theme's reduced-motion setting. `--wui-progress-sport-duration` and `--wui-progress-sport-easing` allow tuning; `aria-valuenow` and `show-value` are retained.
