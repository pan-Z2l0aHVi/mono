---
'@greypan/web-ui': patch
---

fix(overlay): an anchored panel now stays registered for the whole exit transition instead of dropping out of the registry the moment `open` flips to false. While it is still on screen it keeps swallowing Escape rather than letting the key fall through, and re-opening mid-exit hands arbitration to the new session. When the transition has already finished but the host still reports open, the layer hands arbitration back so Escape reaches the host's close entry instead of being swallowed by an invisible panel forever. When another overlay is open that one still takes the Escape, so one Escape still closes exactly one layer (issue #138).

fix(overlay): open-overlay layers whose panel and host are both detached from the document are now reclaimed lazily, so a component that never releases its handle no longer pins the layer registry or the document keydown listener forever. Reclamation runs before a new layer is built rather than after, so claiming a panel that is not mounted yet no longer deletes the layer on the spot — it keeps its place and joins arbitration once attached (issue #139).
