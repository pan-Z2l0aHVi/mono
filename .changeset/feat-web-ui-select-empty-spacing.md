---
'@greypan/web-ui': minor
---

In the empty state, a description without a title now keeps the icon-to-first-segment gap (`--wui-empty-title-margin-top`, 16px) instead of the 4px title-to-description gap. Demo docs cover all eight title/description/action slot combinations, no longer crush the action gap to 4px, and state that the component carries no outward margin; the variable table now reflects the shipped defaults (16px title margin, 0.72 icon opacity).
