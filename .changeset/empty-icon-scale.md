---
'@greypan/web-ui': patch
---

Enlarge the default `web-ui-empty` glyph and close the gap left by the retired icon tile:

- The default glyph is now `round(size * 5 / 7)` instead of `round(size * 3 / 7)`, so the default 56 slot draws a 40px icon instead of 24px. The 40 and 72 slots follow to 29px and 51px.
- The icon box is now exactly as large as the glyph. Without the rounded-rectangle surface the old box kept an invisible `size / 7` inset on each side, which pushed the visible icon 32px away from the title; the distance is now the `--wui-empty-title-margin-top` value (16px) on its own.
- `--wui-empty-icon-size` still overrides the box, but its fallback is the derived glyph size, so it no longer reports a `56px` default that no longer exists.
