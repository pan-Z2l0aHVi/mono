---
'@greypan/web-ui': minor
'@greypan/md-to-comp': patch
---

Give the dark `segmented` raised indicator the invariant light already has — the resting chip is the page colour, floating in a track that sinks one step below it — instead of the brighter gray it shipped with. `--wui-color-surface-selected` therefore moves from `#5c5c5e` to `#242628` in dark, the same value as `--wui-color-page` there, and the convex track gets its own token, `--wui-color-surface-segmented-track` (`#e5e5ea` in light, `#17191a` in dark), opened below the page rather than above it; `--wui-color-surface-segmented` keeps naming the inset indicator face. The convex reading survives because the chip stays lighter than the track in both appearances (WCAG luminance ratio 1.26:1 in light, 1.16:1 in dark), and the two variants no longer collapse onto one gray pair in dark: `inset` keeps its pressed-in `#3a3a3c` chip on a `#2c2c2e` track. Because the chip is pinned to the page tier rather than to whatever container holds it, a raised segmented placed on a `--wui-color-surface` card reads one step darker than that card in dark.

Generated Markdown body text follows `--wui-font-size` instead of Notion's hard-coded pixel sizes, and tables take that size by inheritance, so a documentation page is no longer set larger than the components it documents.
