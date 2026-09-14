---
'@greypan/web-ui': minor
---

Add a `peek` property to `web-ui-collapse` so the closed state reveals a fixed slice of the content along the animation axis instead of collapsing to zero. The revealed area ends in an alpha-gradient fade whose length is derived from `peek` (`calc(peek * ratio)`), so there is no second attribute to set — tune it via the `--wui-collapse-peek-edge-ratio` (default `0.4`), `--wui-collapse-peek-edge-max` (default `112px`), `--wui-collapse-peek-edge` (explicit length, wins over the derived value) and `--wui-collapse-peek-edge-color` CSS variables. The gradient is a four-stop ease-out curve (opaque body, 60% alpha at 30% into the band, 26% at 65%, edge color at the end) so the fade reads clearly from its start instead of only softening the last sliver. Set the ratio to `0` to disable the fade.
