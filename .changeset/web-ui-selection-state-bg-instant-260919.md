---
'@greypan/web-ui': patch
---

Radio and checkbox hover and pressed feedback now switches in one frame. The shared selection-control shell transitioned the indicator's own `background-color` (and a `border-color` neither indicator ever gave a width), so the idle 6% hover and 15% pressed tints ramped in over `--wui-duration-focus` (200ms) while every other component's state layer swaps instantly — `button` has no background transition at all — and the README motion section promises "hover/active background feedback switches instantly with no transition". The tints move to a dedicated overlay (`::before`, clipped to the indicator radius and stacked between the control surface and the dot/checkmark), which carries no transition, so pressing and releasing read as one frame.

The indicator background keeps its own transition for the checked fill, now at `--wui-duration-trigger` (160ms) to match the radio dot and the checkbox checkmark, and it fades in **and** out: checking eases the circle or box up to `--wui-color-accent`, unchecking eases it back to `--wui-color-surface-control`. Previously that fade ran on the focus duration, and the two needs — instant state-layer feedback and a fading checked fill — could not both be met by one property on one element.

The checkbox checkmark now draws with the default linear easing instead of `ease-out`. The curve was the problem, not the length: `ease-out` spent most of the window on the first stroke, so the long up-stroke arrived all at once, while a constant-speed reveal spreads evenly across the whole path. The icon's own opacity fade and the unchecked fade-out stay at 160ms. Reduced-motion themes are unaffected: `web-ui-svg-draw-lines` skips playback inside a `motion="reduced"` scope.
