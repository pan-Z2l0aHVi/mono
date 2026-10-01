---
'@greypan/web-ui': minor
---

Add an opt-in `long-press` attribute to `<web-ui-context-menu>` so touch users can open the menu without a right-click. It is touch-only by design: a pointer with `pointerType === 'touch'` held for `long-press-delay` (default `500` ms, matching the platform long press) opens the menu at the press point, through the same `_openAt` path a right-click uses. Holding while moving more than 10px cancels it, so a scroll never opens a menu. Without the attribute nothing changes.

Absorbing the browser's follow-up events is the part that is easy to get wrong. Once the long press opens the menu, the engine still reports that same hold as a native gesture and emits a `contextmenu` (which would reopen) and, after `touchend`, a synthesised `click` (which would immediately light-dismiss the menu the long press just opened). Both are swallowed inside a short window that closes on the next `pointerdown`, so a genuine later right-click or click is unaffected.

Verified against Chromium's real touch pipeline via CDP `Input.dispatchTouchEvent` rather than synthetic events: synthetic pointer events produce none of the gesture recognition, and `touchscreen.tap()` releases immediately so it can never hold long enough to trigger a long press. That harness is what surfaced the trailing-`click` dismissal — synthetic-event tests had the menu opening and staying open, which was wrong.
