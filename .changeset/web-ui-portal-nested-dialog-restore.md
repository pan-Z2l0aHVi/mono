---
'@greypan/web-ui': patch
---

fix(web-ui): resolve nested portal overlays inside dialogs and support live framework rendering in open panels

- Portal container resolution now crosses shadow boundaries when walking up from the anchor, so a portal overlay hosted inside migrated panel content (e.g. a tooltip inside an open portal select/popover) resolves into an enclosing open native dialog's top layer instead of falling back to the document-level overlay root where it would be hidden behind the dialog.
- Portal panels now support live framework rendering while open (Vue `v-if`, reactive additions): content added to the host while the panel is open migrates into the panel automatically in template order (popover, tooltip, dropdown; select/autocomplete already reconciled via their option portal). Framework comment anchors stay in the host so subsequent patches keep working. Boundary: splicing or reordering a keyed `v-for` list while a panel is open is unsupported — Vue's keyed children diff resolves anchors against migrated nodes and items can be lost, regardless of compilation path. Apply such updates while the panel is closed and stick to tail appends/removals while open. React removals remain unsupported (see README).
- Popover and tooltip portal panels untrack nodes that the framework physically removes while the overlay is open, so closing no longer restores deleted nodes back into the host light DOM.
- Portal content is restored to its recorded original position (parent + following sibling) instead of being appended to the host, keeping framework fragment anchors intact for subsequent conditional rendering.
- Compatibility note: React-conditional children inside portal panel content remain unsupported for removal (React deletes nodes through its recorded insertion parent); see the React section of the README.
