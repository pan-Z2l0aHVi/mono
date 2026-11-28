---
'@greypan/web-ui': minor
---

- Add `drag-handle-only` prop to `web-ui-drawer` to restrict drag hit-testing and resize cursor to the drag handle area.
- Dispatch `sidebar-width-change` immediately on keyboard splitter adjustments (`ArrowLeft`/`ArrowRight`/`Home`/`End`) in `web-ui-layout`.
- Prevent `web-ui-textarea` with `autosize` from collapsing to `0px` height when mounted inside a hidden container.
