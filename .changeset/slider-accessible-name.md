---
'@greypan/web-ui': patch
---

Fix accessible naming for `web-ui-slider` by forwarding host `aria-label` and `aria-labelledby` attributes to its internal slider. Sliders no longer receive a shared default name, so consumers should provide a distinguishable name for every instance.
