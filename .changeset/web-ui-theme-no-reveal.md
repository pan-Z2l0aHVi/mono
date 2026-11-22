---
'@greypan/web-ui': minor
---

`web-ui-theme` gains a `no-reveal` attribute: when present, appearance changes commit directly through the existing no-animation path without starting the circular view-transition reveal. It targets host-driven first-appearance applications at boot, such as applying the real appearance from an async settings snapshot before the startup layer dismisses. Presence is the whole contract — dynamic bindings must toggle the attribute itself (`:no-reveal="cond ? '' : null"` in Vue); binding `false` serializes to `no-reveal="false"`, which reads as present and permanently kills the reveal.
