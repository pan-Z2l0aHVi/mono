---
'@greypan/web-ui': patch
---

Harden the toast auto-close timer and correct two README claims that no longer match the code.

- `resumeAutoClose()` now clears any timer still in flight before arming the resumed one. `startAutoClose()` already did this, and pause/resume is expected to stay strictly paired, so nothing observable changes today. If the call order is ever re-arranged, assigning `_closeTimer` over a live handle left two deadlines counting down, and the earlier one closed the toast before its remaining time was up.
- The READMEs described Escape arbitration as if `image-preview` were outside it. It registers its native `<dialog>` with the same arbiter, so layer order decides which surface closes, and the component's `cancel` handler only vetoes the native instant close so the exit transition still plays; both files now say so.
- `--wui-drawer-close-right` is documented as `20px` while the fallback has been `16px` since `2add3405`. English and Chinese tables now match `style.css`.
