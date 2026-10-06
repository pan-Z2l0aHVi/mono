---
'@greypan/web-ui': patch
---

Stop `<web-ui-dialog>` and the other scroll-locking overlays from zeroing the page scroll position while they are open. `lockScroll()` pinned the body with `position: fixed` and `top: -scrollY` to suppress iOS rubber-band scrolling, which pulled the body out of the document flow: `documentElement.scrollHeight` collapsed and `window.scrollY` was reported as `0`. Anything positioning itself from the window scroll offset — a `@tanstack/virtual-core` list, for instance — then rendered the wrong rows while keeping its old offset, so a long list showed a blank screen whenever an overlay opened over it.

The lock now only sets `overflow` and `overscroll-behavior` on the document element and leaves the body in flow. `scrollY` and `scrollHeight` stay intact for the whole time an overlay is open, so scroll-positioned content keeps rendering correctly. The restored scroll offset is no longer saved and replayed with `scrollTo`, because the position is never disturbed in the first place.

This changes an observable side effect of the scroll lock: the body no longer gets `position`, `top`, or `width` written to it. Nothing in the package relied on it. It also adds `overscroll-behavior: none` while locked, which additionally suppresses pull-to-refresh and overscroll chaining — expected for a modal, but new. Refcounted nesting, the public signatures, and the non-overridden default rendering are unchanged.
