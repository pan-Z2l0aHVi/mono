---
'@greypan/web-ui': patch
---

fix(web-ui): align control baseline to 36px

- Move the shared `--wui-control-size` baseline from 40px to 36px across buttons, inputs, selects, autocomplete, textarea, segmented, and related demos/docs.
- Reduce switch track/thumb to 40x20/16x16 and adjust drag travel constants.
- Set slider thumb to 30x20, align segmented/textarea geometry, and keep marks consistent across axes.
