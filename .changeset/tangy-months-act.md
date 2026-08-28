---
'@greypan/web-ui': minor
---

Add Layout desktop sidebar drag-to-resize and Drawer drag-to-close features.

**Layout (`<web-ui-layout>`):**

- New props: `sidebar-resizable`, `sidebar-min-width`, `sidebar-max-width`
- New event: `sidebar-width-change`
- Accent resize handle on right edge (hidden when collapsed); keyboard-operable (WAI-ARIA splitter: arrows step, Home/End to bounds, Enter commits, Escape reverts)
- Real-time width follow with clamping; emits on release
- Built-in hard cap: the sidebar can never exceed half the viewport width, even if `sidebar-max-width` is configured higher

**Drawer (`<web-ui-drawer>`):**

- New prop: `draggable` (default `false`)
- Gray capsule drag bar on inner edge (placement-aware)
- Real-time follow + spring snap on release
- Closes when displacement > 1/3 of size OR flick > 500px/s; otherwise rebounds
- Native dialog renders nothing when closed ⇒ drag-to-open NOT supported
- Spring via WAAPI (no new `--wui-*` tokens)
- `prefers-reduced-motion` snaps instantly
- Request-only `open-change(false)` with writeback await + timeout rebound
- Declarative nested drawer stacking: open drawers below the top layer automatically scale down (0.95^depth) and shift towards the inner side to expose card edges; Escape and backdrop clicks dismiss only the topmost layer

**Drawer visual language (breaking visual, no API change):**

- Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges (see ADR-0036); elastic drag distances read as margin changes instead of gaps
- New token `--wui-drawer-radius` (default `28px`); closed-state transforms compensate the inset so the drawer always exits the viewport fully
- `headless` geometry unchanged (consumer-owned visuals)

**Glass variable isolation (bug fix):**

- `.wui-glass` now declares its own `--wui-internal-glass-shadow` / `--wui-internal-glass-focus-ring` defaults, cutting the flattened-tree inheritance path from ancestor glass containers (drawer/dialog bodies, overlay panels) into slotted content. Previously a glass-variant button or input inside a drawer/dialog silently picked up the huge overlay shadow instead of the soft glass fallback.
- Headless drawers explicitly zero `--wui-internal-drawer-inset` on their dialog: a headless drawer nested inside a non-headless one used to inherit the 8px inset, breaking the drag-close distance / request-only hover end-state math for edge-to-edge geometry.
- **Breaking visual:** `<web-ui-back-top>`'s default glass button now uses the glass fallback shadow (`--wui-shadow-glass`) instead of the small panel shadow (`--wui-shadow-panel`). The old `:host`-level `--wui-internal-glass-shadow` config could no longer reach the inner glass element under the new isolation and was removed; pass `--wui-shadow-glass` on the element if the previous look is required.
