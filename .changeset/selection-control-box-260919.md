---
'@greypan/web-ui': patch
---

Turn the radio and checkbox host into a shared selection-control box. The host is now inline-flex with content-driven height, so the inherited page line-height can no longer inflate it or leave an uneven gap above and below the 18px indicator; radio and checkbox now sit identically next to text and to each other. Both components read one layout stylesheet (`src/assets/selection-control.css`) and share the `--wui-selection-control-size` token, while `<web-ui-radio-group>` and `<web-ui-checkbox-group>` accept `--wui-selection-group-gap` for member spacing. Checkbox also suppresses its focus ring after pointer interaction the way radio already did.

The checked states now animate: the radio dot scales from 0 to 1 (and back to 0 when the selection moves away), and the checkbox checkmark draws itself in from left to right through `<web-ui-svg-draw-lines>`. The checkmark is now the control's own stroked path rather than the filled `heroiconsCheck16Solid` icon, because drawing requires a stroke and the reveal starts at the path's first point, which also fixes the direction and the weight. Unchecking fades the checkmark out — `svg-draw-lines` only supports drawing on, not in reverse.

Unchecked controls gained idle hover and pressed backgrounds on the indicator. Because the label text is part of the same trigger row, hovering or pressing the text now tints the indicator exactly like hovering the indicator itself; hover is limited to fine-pointer devices, and checked or disabled controls keep their own surfaces.

The idle indicator surface moves from `--wui-color-surface-raised` to `--wui-color-surface-control`, the tier neutral buttons already use. In dark mode `surface-raised` (`#2c2c2e`) sat only ~8 luminance points above the page (`#242628`), leaving radio circles and checkbox boxes barely visible.
