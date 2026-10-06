---
'@greypan/interweave': patch
---

Five mobile and overlay fixes.

The filter panel no longer loses its left edge: a -56px negative margin pushed it 4px outside the viewport, and the layout ancestor clipped the left half of every filter control.

Controls are 40px tall on touch devices. The 36px default came from a `:host` rule inside the theme shadow, so the override is declared on `web-ui-theme` rather than `:root` — an author declaration on `:root` has equal specificity and the winner would depend on stylesheet order. Menu rows keep their fixed 32px.

The settings dialog keeps a fixed height when switching between its three tabs. Its close button is now the one the dialog component renders, instead of one drawn in the title slot and a second in the footer.

Long-pressing a resource row on a touch device opens its context menu, which until now was reachable by mouse and keyboard only.
