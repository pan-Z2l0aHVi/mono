---
---

Internal change: only `apps/interweave/frontend` is touched, and `@greypan/interweave` stays unbumped because the page is a prototype surface that nothing published reads.

The shell prototype's selection mode now selects. Each list row renders a `web-ui-checkbox` at its far left while selection mode is on, with an `sr-only` label so the control carries an accessible name; clicking the row toggles that item instead of opening the detail drawer, and 全选 toggles the whole visible set. Leaving through 确认 clears the selection, so a re-entry starts empty.

批量操作 gates on what is checked: 删除 needs at least one item, and 找回 only lights up when every checked item is a broken resource — a mixed batch has nothing to restore. 删除 opens the same dialog the single-resource flow uses, with the body switched to a snapshot count (「删除选中的 3 个资源后无法恢复。」) so the copy cannot shift while the dialog animates out. The group also consumes `--wui-button-group-divider-length` at 16px, shortening the divider between the two icon buttons.
