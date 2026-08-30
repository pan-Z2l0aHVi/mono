---
'@greypan/web-ui': minor
---

Add collapse component family: `web-ui-collapse`, `web-ui-collapse-trigger`, `web-ui-collapse-content`.

- Strictly controlled `open` contract aligned with dialog/drawer/popover: `open-change` (`CustomEvent<{ open: boolean }>`) fires only on user-originated trigger clicks; `show()`/`close()`/`toggle()` and programmatic writes never emit.
- Height/width animation via CSS grid `0fr ↔ 1fr` transition — content-adaptive, zero JS measurement, interruptible (ADR-0038). New `horizontal` attribute switches the axis (default vertical).
- Three-state closed semantics; consumer light DOM is never moved: default closed state sets `hidden` on `web-ui-collapse-content`, `keep-mounted` keeps it measurable inside the collapsed track with `inert` (scroll position preserved).
- `web-ui-collapse-trigger` renders a native `<button>` wrapping arbitrary slot content with `aria-expanded`/`aria-controls`; `disabled` lives on the root and is inherited via family context.
- New global tokens `--wui-duration-collapse-enter: 200ms` / `--wui-duration-collapse-exit: 160ms`, included in the reduced-motion zeroing lists; ADR-0038 documents the grid-transition selection and the three-state closed semantics.
