---
'@greypan/web-ui': minor
---

Redesign collapse as a single element with two slots: trigger via the default slot, content via `slot="content"`. The `web-ui-collapse-trigger` and `web-ui-collapse-content` elements are removed before first release.

- Interaction semantics come from the slotted trigger element (native `<button>`, `<web-ui-button>`, etc.); the collapse writes `aria-expanded`/`aria-controls`/`aria-disabled` onto the first assigned trigger element. A plain-text trigger has no keyboard/focus semantics (documented limitation).
- Strictly controlled `open` contract unchanged: `open-change` (`CustomEvent<{ open: boolean }>`) fires only on user-originated toggles; `show()`/`close()`/`toggle()` and programmatic writes never emit.
- Height/width animation via CSS grid `0fr ↔ 1fr` transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from ADR-0038; superseded by ADR-0039 for the API shape). `horizontal` switches the axis (default vertical).
- Three-state closed semantics; consumer light DOM is never moved: default closed state sets `hidden` on the internal content container, `keep-mounted` (now on the root element) keeps content measurable inside the collapsed track with `inert` (scroll position preserved).
- Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer (new ADR-0039).
- Unchanged tokens `--wui-duration-collapse-enter: 200ms` / `--wui-duration-collapse-exit: 160ms`, included in the reduced-motion zeroing lists.
