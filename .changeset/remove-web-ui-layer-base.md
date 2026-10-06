---
'@greypan/web-ui': patch
---

Remove the unused `--wui-layer-base` custom property from `<web-ui-theme>`.

**Breaking removal:** `--wui-layer-base` was a public custom property. It has no consumers in this repository, and no compatibility alias is kept. External consumers that read or override the old property must remove those references before upgrading.
