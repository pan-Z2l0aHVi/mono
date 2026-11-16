---
'@greypan/web-ui': minor
---

Stop clipping the `<web-ui-collapse>` content area once the expand transition has finished. A fully expanded panel now behaves like a plain container: focus rings, shadows and intentional horizontal overflow of its content stay visible instead of being cut at the panel edge. The clipping the height animation needs is unchanged — it is only lifted when the track has settled at its final height, and it comes back as soon as a collapse starts.
