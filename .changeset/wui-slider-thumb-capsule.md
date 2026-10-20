---
'@greypan/web-ui': major
---

Change the `<web-ui-slider>` thumb shape. It is now a circle at rest and elongates into a capsule along the track while pressed or dragging, matching the switch thumb recipe. A vertical slider elongates in the height direction instead of the width direction.

The public size tokens are renamed to match what they now control, with no compatibility layer for the old names:

- `--wui-slider-thumb-height` becomes `--wui-slider-thumb-thickness` (the thumb's thickness, and the resting circle's diameter).
- `--wui-slider-thumb-width` becomes `--wui-slider-thumb-length` (the capsule's long edge along the track, used while pressed or dragging).
- `--wui-slider-height` is removed. It never controlled the slider's height — that is `--wui-slider-vertical-height` — but the track's thickness, which `--wui-slider-track-size` already names.

Set the new names instead: `--wui-slider-thumb-thickness` and `--wui-slider-thumb-length` on the slider, and `--wui-slider-track-size` for the track.
