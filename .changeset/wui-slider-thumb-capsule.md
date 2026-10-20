---
'@greypan/web-ui': minor
---

Change the `<web-ui-slider>` thumb shape. It is now a circle at rest and elongates into a capsule along the track while pressed or dragging, matching the switch thumb recipe: the thickness stays `--wui-slider-thumb-height` and the long edge is `--wui-slider-thumb-width`. A vertical slider elongates in the height direction instead of the width direction.

Also rewrite the `<web-ui-toast>` documentation in the command-call style of `<web-ui-image-preview>`: every example calls `toast()`, and the API sections list the command options and entry points alongside the element's own props, events, and methods.
