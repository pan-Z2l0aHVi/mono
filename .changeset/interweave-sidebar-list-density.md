---
---

Internal change: the library sidebar's nav drops its 56px top inset, which left an empty
band above the first item while the collapse toggle sat at the bottom of the panel. The
inset becomes 8px so the nav starts near the top and lines up with the panel's own side
padding; 8px is also the smallest value that keeps the first pill clear of the panel's
24px corner radius, verified expanded, collapsed and in the mobile drawer. Library rows
pick up a 14px corner radius, up from 12px, and the long-name mock resource is now 60
characters so it exercises the two-line title clamp. No published package version
changes.
