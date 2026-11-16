---
'@greypan/web-ui': minor
---

Clicking a tick point on a `<web-ui-slider>` with `marks` enabled now selects the nearest tick, exactly like clicking the track. The tick row is no longer pointer-transparent: each 4px dot gets a transparent hit area along the track, and clicks between two ticks round to the closer one.
