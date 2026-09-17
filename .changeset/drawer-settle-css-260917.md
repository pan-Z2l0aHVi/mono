---
'@greypan/web-ui': minor
---

Move the drawer's post-release settle animation (rebound to open, or slide out to closed) from a JS spring driven by WAAPI `element.animate()` sampling to a CSS transition (issue #123).

- Dragging still writes an inline `transform` with `transition: none`; on release the final value is written and `transform` is handed back to CSS entirely, so the rebound is one single transition — no `element.animate()`, no `fill`, no `onfinish` anywhere in the path.
- Release velocity no longer samples a spring trajectory; it only estimates the transition duration (180–420ms). The overshoot feel is approximated by easing curves matching the old spring's damping ratio: no overshoot towards closed, roughly 3% overshoot on rebound.
- No JS→CSS handoff boundary is left, so the implementation is immune to Safari not honouring WAAPI fill overrides when it computes the before-change style; the reflow-baking patch introduced in r3 to work around that quirk is removed.
- The public API and event contract are unchanged. Two internal variables, `--wui-internal-settle-duration` and `--wui-internal-settle-easing`, are added for the settle transition and are not part of the public token contract.
