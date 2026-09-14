---
'@greypan/web-ui': minor
---

Add an imperative `imagePreview()` image viewer. It exposes a handle-only API (`next`/`prev`/`goTo`/zoom/`close`/`closed`), renders through the native `<dialog>` top layer with the shared presence and scroll-lock lifecycle, and supports keyboard navigation, wheel zoom, drag-to-pan, and reduced-motion tokens.
