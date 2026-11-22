---
'@greypan/interweave': patch
---

The library scrollbar thumb no longer drifts from the real scroll position after bulk imports in the WKWebView host. OverlayScrollbars drives the thumb through a WAAPI ScrollTimeline when the engine provides one, and WebKit does not recompute the implicit timeline range after dynamic content-height changes, so a list scrolled to its end kept the thumb short of the track end with blank track below (and the add-dialog queue pinned its thumb at the top). The frontend now clears `window.ScrollTimeline` before the overlayscrollbars module evaluates, keeping the thumb position on the library's JS-variable path consistent with its cached geometry on every engine.
