---
'@greypan/web-ui': minor
---

Anchor every `imagePreview()` zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility `click` that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (`attachPinchGesture`, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component.
