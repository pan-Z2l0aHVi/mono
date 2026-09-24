---
---

Internal change: only `apps/interweave/frontend` is touched, and `@greypan/interweave` stays unbumped because the page is a prototype surface that nothing published reads.

The shell prototype's 页面导航 and 批量操作 button groups no longer set `--wui-button-group-divider-length`. They did so to pull their dividers back from the 24px line the token defaulted to; `<web-ui-button-group>` now defaults to 20px, so both groups render the same rule they were pinned to and the per-group override carries no information.

This supersedes the closing sentence of `proto-selection-invert`: the drawer action group never set the token, so it read 24px when that note was written and reads 20px now, like every other grouped button pair on the page.
