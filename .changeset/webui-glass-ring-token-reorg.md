---
'@greypan/web-ui': major
---

Group the glass tokens by the layer that paints them, and give the light scheme a real base tint for the 1px glass ring.

**Breaking renames:** three public custom properties on `<web-ui-theme>` are renamed. No compatibility aliases are kept.

| Before                     | After                          | Layer                             |
| -------------------------- | ------------------------------ | --------------------------------- |
| `--wui-color-glass-border` | `--wui-color-glass-ring`       | base tint of the 1px ring         |
| `--wui-color-glass-corner` | `--wui-color-glass-ring-sheen` | corner sheen, painted on the ring |
| `--wui-color-glass-shade`  | `--wui-color-glass-ring-shade` | corner shade, painted on the ring |

`--wui-color-glass-highlight` is unchanged and stays out of the `ring` group: it is an inset `box-shadow` on the element itself, not part of the ring that `.wui-glass::before` masks out.

**Visual change, light scheme only:** `--wui-color-glass-ring` was `transparent` and is now `rgb(0 0 0 / 0.05)`, so every glass surface in the light scheme gains a subtle but real 1px outline. This is a restyle, not an invisible gap fix. Measured against a ring-free baseline of the same box, the maximum delta of the light-scheme ring goes from 4–7/255 to 13–17/255; the exact figures move with each surface's size and corner radius. The part that was genuinely missing is the edge midpoint: with the old transparent base, any edge longer than about `3R` (`R` being that surface's `--wui-glass-corner-radius`) had a stretch that matched the ring-free baseline pixel for pixel — a delta of exactly 0 — and it now reads 13/255. The dark scheme already used `rgb(255 255 255 / 0.05)` and is unchanged, as are `--wui-color-glass-ring-sheen` and `--wui-color-glass-ring-shade` in both schemes.

The base layer is load-bearing rather than decorative. The ring is a `background-color` base with four corner-anchored `radial-gradient`s on top; the radials use a fixed radius (`2R` for sheen, `R` for shade, where `R` is `--wui-glass-corner-radius`), so any edge longer than about `3R` leaves a stretch that no radial covers. With a transparent base nothing painted that stretch. How much of the ring this affects depends on the surface's aspect ratio, since `R` is driven by each component's own radius.

The same value is now also the literal fallback in `glass.css`, so a `<web-ui-theme>` without `appearance` — or no theme at all — keeps the ring closed. Every other glass token in that file already falls back to its light-scheme value; this one was the sole exception.

To make the light ring lighter, lower `--wui-color-glass-ring` rather than setting it back to `transparent`, and keep it above the shade alpha (`0.03`) so the edge midpoint does not fall below the corner shading.

Consumers that read or override the three old names must update them before upgrading. No workspace in this repository overrides any of the four tokens.
