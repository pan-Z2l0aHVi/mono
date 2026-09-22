---
'@greypan/web-ui': patch
---

`<web-ui-segmented>` gains a `variant` attribute/property (`inset` | `raised`, default `inset`; illegal values fall back to `inset`):

- `inset` ("sunken") renders the track as an opaque surface (`--wui-color-surface-raised`, no backdrop filter); its 1px ring and drop shadow stay constant across rest, press and drag. The indicator rests as a solid `--wui-color-surface-segmented` pill with all glass output off.
- `raised` ("raised") restores the classic flat `--wui-color-surface-segmented` track (no ring, no shadow) with a solid `--wui-color-surface-selected` resting indicator carrying a soft shadow.

In both variants the pressed/dragged indicator is fully transparent glass — backdrop blur, ring and highlight — with a 1.5x scale, easing back to the resting surface on release. Checked labels, and during a press or drag whichever label the indicator currently covers, now render in `--wui-color-accent` instead of `--wui-color-text-secondary`; the covered label follows the indicator in real time and the marking clears on release.
