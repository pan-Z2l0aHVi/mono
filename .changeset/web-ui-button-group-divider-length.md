---
'@greypan/web-ui': minor
---

Add `--wui-button-group-divider-length` to `<web-ui-button-group>`. The divider between adjacent grouped buttons was a fixed 24px line with no way for a consumer to reach it — it lives in the child button's shadow root and that span is not exposed as a part — so the only alternative was dropping the group entirely and losing the shared glass pill.

The token sets the divider's long edge and defaults to 20px, so every grouped button pair gets a shorter rule than the 24px line it drew before; its cross axis stays 1px. Because it drives the long edge rather than a fixed axis, one value works for both `direction="horizontal"` and `direction="vertical"`.
