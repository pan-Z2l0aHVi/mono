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

**Drawer visual language (breaking visual, no API change):**

- Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges (see ADR-0036); elastic drag distances read as margin changes instead of gaps
- New token `--wui-drawer-radius` (default `28px`); closed-state transforms compensate the inset so the drawer always exits the viewport fully
- `headless` geometry unchanged (consumer-owned visuals)
