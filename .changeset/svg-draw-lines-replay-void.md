---
'@greypan/web-ui': patch
---

The svg-draw-lines duration-easing demos called `replay()` without handling the returned promise, which the corpus lint flags as a floating promise. The three `replayAll` fences now discard it with `void`, and the generated demo files were regenerated from the corrected corpus. No runtime behavior change.
