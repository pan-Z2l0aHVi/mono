---
'@greypan/web-ui': patch
---

Keep theme view-transition reveals running through pointer movement: only `pointerdown` and wheel call `skipTransition()`, while `pointermove` and `pointerup` no longer end the reveal. This removes the source-box and pointer-id exemptions and preserves prompt hit-test recovery for deliberate press or scroll input.
