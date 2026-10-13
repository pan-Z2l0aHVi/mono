---
'@greypan/interweave': patch
---

Merge focus row and current row into single state in interweave resource list.

- `activeIndex` in ResourceList is now derived from `activeResourceId` (previously independent ref)
- Keyboard navigation (ArrowDown, Home, End) and right-click menu now update `activeResourceId` via new `activate` event
- Focus ring (via roving tabindex) and active row background color are now always on the same row
- Active row background deepened from 5% to 8% black (light) / 8% to 12% white (dark)
- Checked row background raised to match active row level (8%/12%)
- Fixed incorrect comment in global.css about `:where()` override capability
