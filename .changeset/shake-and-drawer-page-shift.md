---
'@greypan/web-ui': minor
---

Add the imperative `shake()`, which swings a target and settles it back where it started, making a "blocked / handle this first" signal visible. It shakes the whole page by default and takes an optional `target`. The two axes have their own amplitudes, both defaulting to `12px`: `xDistance` (`--wui-shake-x-distance`) and `yDistance` (`--wui-shake-y-distance`), plus a shared `--wui-shake-duration` (default `420ms`); all three can be overridden per call. Both axes stay in phase, so the composite path is a straight line rather than an orbit. Zeroing one axis only removes that axis and the other keeps swinging; the effect is inert only when both amplitudes or the duration are `0`. Repeat calls restart the swing instead of stacking into a larger displacement, and reduced-motion tiers produce no movement.

Add `page-shift` to `<web-ui-drawer>`: while the drawer is open, the background page slides aside in the drawer's entering direction, vacating the viewport edge for it. The distance follows viewport size changes live, and there is no tunable token. Layers are ordered by opening time, whether nested or sibling: the first steps aside the most and each layer after it steps aside less. Closing any layer re-ranks the survivors and the page falls back to the new total. Neither drag gestures nor reduced motion move the page.

The mobile sidebar Drawer inside `<web-ui-layout>` enables `page-shift` as well, so opening the navigation on a narrow viewport pushes the page aside.

The shake amplitude tokens accept viewport units and `calc()`; percentages are not accepted and fall back to the default amplitude.
