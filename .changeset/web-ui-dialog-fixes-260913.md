---
'@greypan/web-ui': patch
---

Fix modal dialog positioning regression and unscaled image-preview mask.

- Dialogs (dialog, image-preview, drawer) now declare `position: fixed` explicitly. The single-layer refactor had introduced `position: relative` on the dialog, overriding the UA `dialog:modal` default; a modal dialog in the top layer then laid out in document flow — rendered at the top of the page ("ghost" artifact) and scrolled with the page instead of staying centered. The explicit `fixed` is defensive against any future author rule overriding the UA default.
- Image preview no longer scales the full-viewport mask: the enter scale (`scale(0.97)` → `1`) moved from the dialog element (which previously scaled the dedicated backdrop layer together with its content) to a new `.wui-image-preview-content` wrapper that contains the stage and the glass controls. The dialog and mask stay transform-free, so the mask fades in without scaling while the content still performs its subtle zoom-in. The dialog still never fades its own opacity, so glass control blur stays continuous.
