---
'@greypan/web-ui': patch
---

Turn the radio and checkbox host box into a declared selection-control box. The host is now inline-flex and its height comes from `--wui-selection-control-hit-size` instead of the inherited page line-height, so the 18px indicator is vertically centered and both components sit identically next to text and to each other. Radio and checkbox share one layout stylesheet (`src/assets/selection-control.css`) plus new `--wui-selection-control-*` tokens, and checkbox now suppresses its focus ring after pointer interaction the way radio already did.
