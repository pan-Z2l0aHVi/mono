---
'@greypan/web-ui': minor
---

Align the drawer's drag-to-close decision with Base UI `useSwipeDismiss`: a flick is now judged by the average velocity over the whole gesture, so sweeping back towards the edge no longer closes the drawer.

- The flick test moves from "the 100ms sliding-window velocity at release" to "net displacement ÷ whole-gesture duration", with the denominator floored at 50ms to match `MIN_VELOCITY_DURATION_MS`. A sliding window only describes the last short stretch of the trace: after dragging out past the rubber-band range and sweeping quickly back, the window velocity at release is just as high, so a net displacement of barely a dozen pixels used to read as a flick and close the drawer. Under whole-gesture average velocity that same gesture cannot reach 500px/s without at least 25px of net displacement towards closed.
- Any gesture whose net displacement does not point towards closed (`<= 0`) rebounds, matching the `directionalDelta <= 0` guard in `useSwipeDismiss`; the old `displacement > 8px` fallback is removed with it.
- The distance threshold changes from one third of the drawer size to one half, via `max(size * 0.5, 10)` matching `getBaseSwipeThreshold()`'s `Math.max(size * 0.5, MIN_SWIPE_THRESHOLD)`. The 10px floor keeps the threshold non-zero when the size cannot be measured, so the drawer never closes on the slightest movement, and the trigger pill's accent feedback shares the same threshold as the actual decision.
- `DragEndInfo` gains a `duration` field (shared gesture layer, not part of the package's public export surface) so a consumer can judge intent by average velocity over the whole gesture.
- The public API and event contract are unchanged, as are the timing and count semantics of `open-change`.
