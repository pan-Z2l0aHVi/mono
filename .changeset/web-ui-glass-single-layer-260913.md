---
'@greypan/web-ui': patch
---

Revert the two-layer frosted-glass structure back to a single layer with interpolated `backdrop-filter`.

Dual-engine measurement (Chrome 153 + Safari 26.5) showed that `backdrop-filter` interpolates smoothly between `blur(0px)` and `blur(4px)`; the original "hard blur jump" was caused by animating `none` ↔ `blur(...)`, which cannot interpolate — not by `backdrop-filter` being non-animatable. The two-layer workaround (separate blur layer + content surface) introduced its own layer-interaction problems (brightened white cast, closing afterimage, double blur, shadow inheritance scoping), so it is removed:

- Floating panels (popover/tooltip/select/autocomplete/menu portal): `wui-glass` returns to the panel itself, which carries the glass background, shadow and `backdrop-filter`. Open/close now transitions `opacity` + `backdrop-filter` (`blur(0px)` ↔ `blur(4px)`) + `transform` together; `.wui-floating-panel-blur` / `.wui-floating-panel-surface` and the portal/menu-portal DOM construction and class-moving logic are deleted.
- Dialog: the glass card (`.wui-dialog-body`) fades its own opacity and interpolates its own blur; the dialog element itself still avoids an opacity transition so descendant blur is never disabled by a backdrop root.
- Toast: `.toast` carries the glass and transitions `opacity` + `backdrop-filter` + `transform`; `.toast-blur` / `.toast-surface` are removed.
- Reduced motion shortens the durations but keeps the `backdrop-filter` interpolation (reducing motion should not reintroduce a hard blur switch).
- Image preview keeps its dedicated full-viewport structure (constant-opacity dialog + separate backdrop/surface layers and per-control opacity fades): the whole-dialog fade would move its `backdrop-filter` sampling source from dialog content to the page texture mid-transition, so it is intentionally out of scope of this single-layer change.
