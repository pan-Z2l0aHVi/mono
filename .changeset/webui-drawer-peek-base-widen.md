---
'@greypan/web-ui': patch
---

fix(web-ui): widen the nested drawer reveal base at both breakpoints

`--wui-drawer-nested-peek-base` ships at `54px` on desktop instead of `36px`, and at `36px` instead of `24px` where the viewport is `640px` or narrower. A four-layer stack of `320px` drawers now reveals `37.43px` / `21.90px` / `15.53px` per step for a `74.86px` total on desktop, and `24.95px` / `14.60px` / `10.36px` for a `49.91px` total on narrow viewports.

The log curve compresses its deepest step hardest, because the fourth layer reveals only `A · ln(4/3)`, which is `0.288A`. At `A = 28`, a value tried during the visual pass, that step was `8.06px`, and at the `A = 36` this change starts from it was `10.36px`. Both sit in the same range as the hardcoded `12px` step the token replaced, so the innermost card of a four-layer stack did not read as a layer of its own. `A = 54` lifts that step to `15.53px`, where each card's edge and shadow stay distinguishable.

Narrow viewports scale by the same `1.5x` instead of adopting the desktop value. A `320px` drawer on a `390px` viewport has only `390 - 8 - 320 = 62px` of room to its left, so a `74.86px` total stack would push the innermost layer off screen. The `49.91px` total leaves its left edge at about `12px`, on screen.

The token name, the `A · ln(d + 1)` formula, the `640px` breakpoint, the scaling and width compensation, drag-to-close, reduced motion, headless, and inset are all unchanged. Setting the token on the host or any ancestor still overrides both defaults, and `0` still turns the reveal off.
