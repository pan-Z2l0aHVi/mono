---
'@greypan/web-ui': minor
---

Add presentation options to `imagePreview()`: `nav`, `toolbar`, `closable`, `indicator`, `swipe`, `noScrollLock` and `noBackdropClose`. Every presentation option defaults to `false`, so a preview renders only the image itself unless the consumer opts in. Also fix the preview closing when clicking the image itself.
