---
---

Internal change: the Interweave add dialog now breaks its supported-kind caption onto its
own second line instead of letting a seven-item enumeration wrap mid-phrase, and both the
dialog max height and its two-column grid shrink so the pane sits lower in the viewport.

The preview drawer drops the "open in system browser" button along with the prop, emit and
wiring that only served it — sandboxed iframes blocked by X-Frame-Options are now left to
the user to reopen elsewhere. Its drag hit zone widens to 32px and the content padding goes
back to the drawer's default 20px, which together move the 4px drag bar off the panel edge
and into a comfortable grab area; a side effect is that web previews now render as a framed
viewport instead of edge to edge. No published package version changes.
