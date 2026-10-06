---
---

Internal change: the Interweave library row no longer fades its focus ring in from near-black. The row root is a tab stop, and Tailwind's `transition-colors` also transitions `outline-color`, whose initial computed value is `currentcolor` — the near-black text color inherited from the theme. Tabbing onto a row therefore tweened the page-level focus ring from that near-black to the target light blue over 100ms, reading as a dark edge before it turned blue. The row now transitions `background-color` explicitly, matching the sidebar nav items, which already did. No published package version changes.
