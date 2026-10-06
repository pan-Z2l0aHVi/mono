---
'@greypan/web-ui': minor
---

feat(web-ui): draw the checkbox checkmark from akar-icons:check

`<web-ui-checkbox>` now strokes `akar-icons:check` where it drew `tabler:check`. Both are
round-capped 24-unit glyphs with `stroke-width="2"`, so the render path is untouched; what
changes is the geometry — `m4 12l6 6L20 6` starts its tail a unit further left and lifts the
tip a unit higher than `m5 12l5 5L20 7`, which reads as a longer, more open tick inside the
18px indicator.

The swap keeps the precondition the draw animation depends on: the asset stays `fill: none` +
`stroke: currentColor`, so `<web-ui-svg-draw-lines>` animates a stroke instead of revealing a
solid mark. `checkbox.motion.browser.spec.ts`, which pins that, still passes.

`@greypan/web-ui/icons` loses `tablerCheck` and gains `akarIconsCheck`. `tablerCheck` was added
on this unreleased line and never shipped, so no published consumer sees a removal, and
`@iconify-json/tabler` stays a devDependency for `tabler:sort-ascending-letters`. The new
devDependency `@iconify-json/akar-icons` (catalog `^1.2.7`) is only read by the generator at
build time — icon bodies are inlined into the emitted modules, so nothing extra lands in the
published bundle.
