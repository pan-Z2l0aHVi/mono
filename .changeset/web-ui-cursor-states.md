---
'@greypan/web-ui': patch
---

fix(web-ui): align cursor behavior with Tailwind v4 and gesture states

- Use default cursors for action, selection, and gesture-control hover and pressed states.
- Switch slider, switch, and segmented cursors to grabbing only after dragging starts.
- Align slider with switch and segmented gesture intent thresholds.
- Propagate segmented gesture cursors through the trigger shadow boundary.
