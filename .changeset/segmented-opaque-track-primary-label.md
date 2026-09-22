---
'@greypan/web-ui': patch
---

`<web-ui-segmented>` gains a `variant` attribute/property (`inset` | `raised`, default `inset`; illegal values fall back to `inset`):

- `inset` ("sunken") renders the track as an opaque surface (`--wui-color-surface-raised`, no backdrop filter); its 1px ring and drop shadow stay constant across rest, press and drag. The indicator rests as a solid `--wui-color-surface-segmented` pill with all glass output off.
- `raised` ("raised") restores the classic flat `--wui-color-surface-segmented` track (no ring, no shadow) with a solid `--wui-color-surface-selected` resting indicator carrying a soft shadow.

In both variants the pressed/dragged indicator is fully transparent glass — backdrop blur, ring and highlight — with a 1.5x scale, easing back to the resting surface on release. Every label keeps `--wui-color-text-secondary`, checked or not, in both variants and through a press or drag; selection is carried by the indicator alone.
