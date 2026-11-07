# @greypan/doc-demo-kit

## 0.1.0

### Minor Changes

- 53fa534: Remove `observeToastTopOffset`, `ToastTopOffsetHandle` and `TOAST_TOP_OFFSET_PROPERTY`. The demo shells used them to write
  the header's bottom edge into `--wui-toast-top-offset`, which pushed every top-anchored toast below the header even though
  the toast containers are already `position: fixed` against the viewport. Both demo shells now keep toasts on the viewport
  edge for every position. `--wui-toast-top-offset` remains a public opt-in token on `@greypan/web-ui` with a default of `0px`.
  
  The toast docs gain a positions example that opens all six positions at once.

### Patch Changes

- Updated dependencies [85b5052]
  - @greypan/md-to-meta@0.1.0
