---
'@greypan/web-ui': patch
---

Fix drawer drag rebound firing twice on release below the close threshold.

- The rebound spring's WAAPI animation now uses `fill: 'both'`. Without it, the animation stopped applying at its end while the inline drag transform was still present: any frame rendered between the animation's finish and the `onfinish` cleanup (main-thread congestion, compositor scheduling) painted a jump back to the drag position, and the subsequent inline-style cleanup then triggered the 280ms CSS enter transition from that position — visible as a second rebound.
- `_springToClose()` gets the same `fill: 'both'` for the symmetric window (spring end → close pipeline takeover), keeping both gesture springs consistent.
- Regression tests assert exactly one `animate()` call per gesture (pointerup and pointercancel) with `fill: 'both'`, and that the final close offset settles below 0.5px with no remaining animations.
