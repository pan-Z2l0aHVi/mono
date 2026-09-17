---
'@greypan/web-ui': patch
---

Fix modal dialog, drawer, and image preview not reconciling after being reattached to the DOM while open: the native `<dialog>` loses its top-layer membership when the host is detached (the `open` attribute remains, so `showModal` could never run again) and the scroll lock was not restored. Reconnecting now reconciles the native dialog presence (self-marked close + `showModal`), the scroll lock, and the nested drawer layer registration. The image preview also re-attaches its pinch-zoom gesture on remount, which was permanently lost after a detach because `firstUpdated` only runs once.
