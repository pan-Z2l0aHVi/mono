---
'@greypan/web-ui': patch
'@greypan/doc-demo-kit': patch
'@greypan/interweave': patch
---

Preload route example docs and cache resolved demo modules before navigation commits so route demos can mount synchronously. Soften the light-mode `--wui-shadow-glass` token so `.wui-glass` surfaces cast a subtler outer shadow. Render Interweave dialog list tooltips through a portal so adjacent rows no longer clip or occlude them.
