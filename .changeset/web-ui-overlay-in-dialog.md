---
'@greypan/web-ui': patch
---

fix(web-ui): resolve overlays inside an open native dialog into that dialog

- Keep dropdown, context-menu, popover, tooltip, select and autocomplete panels above drawer or dialog content by joining the browser top layer.
- Bundle menu panel styles so panels render correctly when the dialog has no pre-injected overlay styles.
- Position context menus with a Floating UI virtual anchor so transformed dialog containing blocks keep viewport coordinates.
- Preserve fixed menu positioning when a global glass rule would otherwise reset it to relative.
