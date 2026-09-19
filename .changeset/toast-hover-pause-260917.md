---
'@greypan/web-ui': patch
---

Fix the toast hover pause so leaving resumes the remaining time instead of restarting the full duration, and make the pause impossible to leak.

Hovering a toast used to clear the auto-close timer without recording anything, and `pointerleave` restarted the full `duration`. The two halves disagreed with each other (the element already had a real pause/resume pair for node relocation), and clearing without recording left `pointerleave` as the only way back: one missed leave — pointer dragged out of the window, element relocated or removed while hovered, layout moving the toast away from a stationary cursor — parked the toast on screen forever with no fallback.

Hover now records the remaining time and resumes it, and a document-level `pointerover`/`pointerout`/`pointerleave` fallback releases the pause when the element's own `pointerleave` never arrives. A toast that is mounted while the pointer already sits over it stays paused instead of starting a countdown under the cursor.

Passing `duration` explicitly during a hover pause no longer starts the timer: the value is recorded and the countdown runs with it once the pointer leaves, so an upsert can no longer close a toast that is still hovered. `duration: 0` keeps meaning "never auto-close" instead of being read as "already expired".
