---
'@greypan/web-ui': patch
---

fix(web-ui): align the value model of slider, input, input-number, switch and the groups

- slider clamps again after rounding, so `max=100` with `step=15` no longer yields `105`.
- input emits `change` when the clear button empties the field, matching a manual clear.
- input-number keeps the raw value and applies `precision` in the `value` getter, and restores the
  last valid value when an edit is left empty or out of range on blur.
- radio-group and checkbox-group decide selection by element identity, so duplicate values no longer
  select the wrong member; a member is pruned only after it has actually disappeared.
- switch follows the native input activation path and handles `Enter` as well as `Space`.
