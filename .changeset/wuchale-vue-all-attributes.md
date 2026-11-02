---
'@greypan/wuchale-vue': minor
---

Translate all SFC attribute literals and controlled `v-bind` expressions by default, excluding structural and machine attributes with a built-in denylist. `componentAttributes` now overrides that denylist per component tag. The denylist matches names only, so business enums and `<meta content>` still rely on consumer heuristics.
