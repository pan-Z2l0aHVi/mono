---
'@greypan/web-ui': patch
---

Fix `web-ui-layout`'s `header-glow` bleeding the colour above the top of the page into the header's top edge in Safari. The blur layer no longer extends above the header box (WebKit samples the backdrop outside the viewport, so that overhang pulled the browser's own dark chrome — or content scrolled above the viewport — into the header), and its mask stop is adjusted so the feather below the header stays equivalent.
