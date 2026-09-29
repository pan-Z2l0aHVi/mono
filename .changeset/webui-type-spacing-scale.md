---
'@greypan/web-ui': minor
---

Add two scale families to `<web-ui-theme>` and route component styles through them.

**Typography tokens** are named by the role the text plays, not by scale position, matching
the radius decision in ADR-0006 §6.3: `--wui-font-size-caption` (12px), `--wui-font-size-readout`
(13px), `--wui-font-size` (14px), `--wui-font-size-title` (18px), `--wui-font-weight-medium`
(500), `--wui-font-weight-semibold` (600), and `--wui-line-height-tight/snug/normal/relaxed`
(1.2 / 1.4 / 1.5 / 1.6). Every `font-size`, `font-weight` and typographic `line-height` in the
component layer now resolves through a family token with a literal fallback, so the fallback path
still renders correctly with no theme present. `line-height: 1` and `0` and `font-size: 0` are
deliberately left as literals: they are single-line centering and inline-gap-collapse techniques,
not typographic values.

**Spacing tokens** are a six-step 4px scale, `--wui-space-1` through `--wui-space-6`
(4/8/12/16/20/24px). This is a documented departure from ADR-0006 §6.3's "no numeric scale"
rule: radius has a handful of strong role names, but spacing appears at more than fifty call
sites where one 8px serves as control gap, group gap and inline padding at once — role naming
there would duplicate a single number into several mutually drifting tokens. The family
does not replace the per-component override tokens (`--wui-button-px`, `--wui-dialog-padding`,
and the rest); it supplies their fallback default, so each component still owns its own padding
while the scale states where that value sits in the overall rhythm. Overriding a step therefore
acts as a density lever across every migrated call site. It is a lever over rhythm only: offsets
that align to the viewport edge or to the host's content edge are excluded by meaning even when
they land on the 4px grid, and the override has to sit inside the `<web-ui-theme>` scope for the
theme host to declare the step to its own subtree. The scale deliberately omits 1px, 2px, 6px,
7.5px, 10px and negative values: those are hairline widths, optical corrections, an off-grid half
step, and flex-gap cancellation respectively.

**One behavior change beyond pure addition:** `--wui-radio-group-gap` and
`--wui-checkbox-group-gap` now default to `var(--wui-space-2)` instead of the literal `8px`, so
they are coupled to that step — overriding `--wui-space-2` on the theme host now also moves the
gap between group members. Embedders are not broken: an explicit
`--wui-radio-group-gap: 12px` still wins, exactly as before. The release is minor rather than
patch because the new tokens widen the public surface; the retarget is a small, documented
coupling change on top of that.

**No rendered change.** Every migrated declaration keeps its original literal as the inner
fallback, so computed values are identical with or without a theme ancestor; only the token
reference is new.

Both families are appearance-independent and are declared in the theme's base `:host` block
rather than the light or dark blocks, so switching appearance never alters type metrics or
spacing.

`theme/__tests__/typography-spacing-scale.spec.ts` guards against drift from both directions:
component CSS may not reintroduce bare typography literals, and every token defined in either
family must have at least one consumer, so adding a step nobody uses fails the build instead of
silently becoming dead public API.
