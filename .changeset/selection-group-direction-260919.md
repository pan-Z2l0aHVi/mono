---
'@greypan/web-ui': minor
---

`<web-ui-radio-group>` and `<web-ui-checkbox-group>` now take a `direction` property and attribute — `'horizontal' | 'vertical'`, defaulting to `'vertical'`, so a group that never sets it keeps laying its members out in a column. An invalid value falls back to the default instead of throwing. The property reflects, so every group now carries a `direction` attribute — `vertical` even when nothing sets it — which matters if you assert on rendered DOM or select on `[direction]`.

Member spacing is now per component: `--wui-radio-group-gap` and `--wui-checkbox-group-gap` replace the shared `--wui-selection-group-gap` that the unreleased selection-control change introduced, so a page can widen one group's rhythm without touching the other. Both default to `8px`, matching the previous value.
