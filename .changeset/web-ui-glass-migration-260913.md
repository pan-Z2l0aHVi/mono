---
'@greypan/web-ui': patch
---

Finish the two-layer glass migration: the frosted-glass **background** now lives on the surface layer, not on the panel itself.

Root cause (same family as the earlier blur-switch fix, confirmed by pixel sampling): the blur child layer's `backdrop-filter` samples everything painted behind it. When the panel still drew its own semi-transparent glass background, the blur layer sampled that background _plus_ the page, `brightness(1.06)` brightened the composite, and the panel background never faded with the surface — leaving a white afterimage while closing. The design already required the background to live on the surface layer; this change actually moves it there:

- `.wui-floating-panel` is now guaranteed `background: transparent`; `.wui-floating-panel-surface` carries the glass background (and `border-radius: inherit`) and fades it together with the content.
- The shared overlay portal and the menu portal move the `wui-glass` class from the panel onto the surface at build time; the local (non-portal) templates of popover, tooltip, select and autocomplete do the same. Per-component background/padding rules move to the surface-scoped selector so the visual is equivalent (background covers the same rounded rect, including padding). The surface also neutralizes the `backdrop-filter` that `wui-glass` carries (same mechanism as `.wui-dialog-surface`), so the blur comes only from the blur layer instead of stacking twice and over-brightening; the panel shadow config (`--wui-shadow-panel`) is bridged on the surface scope, where the glass element can actually consume it.
- Toast moves its background and padding from `.toast` to `.toast-surface`; `.toast` is transparent.
- Dialog and image-preview were already correctly migrated (transparent dialog, background on `.wui-dialog-body` inside the surface; scrim/surface layers in image-preview) and are now covered by regression assertions.

Tune the pressed handle shadow down to the final values (`web-ui-switch`: `0 1px 6px rgb(0 0 0 / 0.2)`, `0 6px 16px rgb(0 0 0 / 0.16)`, `0 14px 28px rgb(0 0 0 / 0.1)`; `web-ui-segmented`: `0 0 1px rgb(0 0 0 / 0.1)`, `0 5px 14px rgb(0 0 0 / 0.16)`, `0 12px 28px rgb(0 0 0 / 0.1)`). The direct-value `box-shadow` (no custom-property indirection) is unchanged, so iOS Safari still transitions it reliably.

Make carousel swipe thresholds stage-relative and robust for fast flicks: the distance threshold is now 15% of the stage width (rounded) instead of a fixed 48px, so the gesture feels consistent across screen sizes. A fast flick whose sampled velocity reaches 320px/s still commits even below that distance, and a new fallback commits when the direction is clear (a small distance) and the sampled velocity is at least half the speed threshold — real touch event streams can be merged/delayed (measured in CDP: a 40px flick spread over ~167ms is under-sampled to ~164px/s by the 100ms velocity window), which previously made quick flicks bounce back. Slow drags keep the strict distance rule. The shared drag-gesture velocity guard also stops zeroing out ultra-short flicks under 8ms.
