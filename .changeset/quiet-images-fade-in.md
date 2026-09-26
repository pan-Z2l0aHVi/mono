---
'@greypan/web-ui': patch
---

Fix image preview staying invisible for relative image sources. Loaded images were tracked by
their resolved absolute URL while the rendered `is-loaded` state was looked up by the
caller-supplied source string, so the two never matched for a relative `src` and the image
remained at `opacity: 0` even though it had loaded. Images that fail to load now also fade in
so their alt text fallback is shown.
