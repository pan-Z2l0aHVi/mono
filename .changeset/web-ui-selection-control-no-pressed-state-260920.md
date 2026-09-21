---
'@greypan/web-ui': patch
---

Radio and checkbox no longer have a pressed state. The shared selection-control shell tinted the indicator's state layer 15% while the pointer was down, on top of the 6% hover tint; that rule is gone, so pressing either control no longer changes its surface. Hover keeps its layer, still with no transition and only on `(hover: hover) and (pointer: fine)` devices, and checked and disabled controls are unaffected. Touch devices are where this reads strongest: they never matched the hover layer either, so a tap now changes the check itself and nothing else on the control. `--wui-color-state-layer-active` is untouched and still backs the pressed states of `button`, `input-number` and `segmented-trigger`.
