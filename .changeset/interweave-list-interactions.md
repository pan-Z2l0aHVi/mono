---
---

Internal change: rework how the Interweave library list responds to the pointer. A left
click now opens the preview drawer instead of the detail drawer, and a right click still
opens the context menu, which gains a "details" entry right under "preview" for reaching
the detail drawer explicitly. The detail entry stays available for unavailable resources
too, because opening details is what probes a dead web source and what exposes the note,
metadata and source list. Selection state also grows a press-and-drag sweep: the row you
press fixes the direction, so dragging from a checked row unchecks everything it crosses
and dragging from an unchecked row checks everything it crosses. A crossed row is set to
that state rather than flipped, so crossing the same row twice does not undo itself, and
the click the browser appends after the gesture is swallowed instead of flipping the
landing row a second time. Touch waits for a brief hold before arming so a scroll that
starts on a row is not mistaken for a sweep. No published package version changes.
