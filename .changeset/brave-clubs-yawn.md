---
'@greypan/web-ui': minor
'@greypan/md-to-comp': patch
---

Make the dark `segmented` raised indicator read as a button. Its resting face is now the same surface as a `secondary` button in that theme, so `--wui-color-surface-selected` changes from `#5c5c5e` to `#3a3a3c` in dark. Because the convex track has to sit one step below that face, it moves to a new token, `--wui-color-surface-segmented-track` (`#e5e5ea` in light, `#2c2c2e` in dark); `--wui-color-surface-segmented` keeps naming the inset indicator face. Light reads the other way round — there the convex face is the same white as the page and the track sinks below it, while dark puts the page at the bottom of the ladder. In dark the two variants therefore now share one gray pair and differ only by decoration: a constant ring and shadow versus a soft shadow.

Generated Markdown body text follows `--wui-font-size` instead of Notion's hard-coded pixel sizes, and tables take that size by inheritance, so a documentation page is no longer set larger than the components it documents.
