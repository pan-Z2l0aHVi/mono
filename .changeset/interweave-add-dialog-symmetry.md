---
---

Internal change: the two panels in the Interweave add dialog now read as an aligned pair.
Their geometry was already exact, but the drop card filled with `#f0f0f4` sat only 6/255
below the dialog's translucent gray body, so its bottom edge dissolved into the backdrop
and the panel read as misaligned against the white queue card. Both cards now carry the
same 1px hairline, which gives the two boundaries equal weight and lets the bottom edges
read as a single line. The queue card gets the border in both its populated and empty
forms. The pending count badge also takes a 56px minimum width so it no longer changes
width as the count goes from one to two digits. No published package version changes.
