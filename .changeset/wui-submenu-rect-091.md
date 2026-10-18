---
'@greypan/web-ui': patch
---

Fix which side `<web-ui-context-menu>` opens a submenu on. The left/right decision read the panel's `getBoundingClientRect()` width, but the panel is always measured before it has animated into place, while its presence `transform: scale(var(--wui-scale-enter))` is still applied — so the reading was a fraction of the real width, and a submenu that did not fit to the right could be judged as fitting and open on the wrong side. Both the fresh-open path and the reopen-while-closing path were affected.
