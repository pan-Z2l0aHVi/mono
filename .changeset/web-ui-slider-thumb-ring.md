---
'@greypan/web-ui': patch
---

The `<web-ui-slider>` thumb now draws a theme-aware hairline ring instead of the 5%-black glass ring, so its circular outline stays readable on light surfaces. On a vertical slider the white 20px thumb only overhangs a 6–8px track, and with an invisible edge it previously read as a vertical ellipse built from its downward shadow.
