---
'@greypan/web-ui': patch
---

Consolidate open-overlay ownership into a single `open-overlay` module, so "this layer is open" has exactly one owner.

The escape-ownership change introduced one shared arbiter, but its state was still split across three modules — `composition` (which panels are registered), `escape-dismiss` (which registered panel receives the keystroke) and `lifecycle` (when a frame transaction stops being valid). None of them owned the invariant they shared, so each overlay component re-assembled it by hand: a missed unregister, or a panel reattached to the DOM while open, could leave a visible layer the arbiter no longer knew about.

- Claiming a panel now returns the handle that owns it; releasing is idempotent, and re-claiming starts a new session, which also resets the not-closable channel.
- Sub-layers (second-level menus) adopt into the claiming handle, so a root that re-claims takes its still-visible sub-layers with it instead of orphaning them. A sub-menu that is still animating out stays owned until its transition ends, so a click inside it is no longer read as a click outside the menu.
- A panel gives up its claim as it starts closing rather than after the exit animation, so it stops swallowing Escape while it fades out.
- The public API and event contract are unchanged; `composition`, `escape-dismiss` and `lifecycle` were internal and are now removed.
