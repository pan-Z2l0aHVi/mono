---
---

Internal change: fix a race that could corrupt the library list context menu, and reorder
two of its entries. Opening the menu on an available row and then immediately opening it
on an unavailable row could leave the menu missing entries, and once that happened the
menu could no longer be opened at all until the page was reloaded. The cause was a
timing window in which the menu had already marked itself closed but had not yet moved
its items back, so the list's conditional rendering added and removed nodes on the
menu's own panel at the same time the menu was rearranging its item anchors, and the
`v-if` anchors were left detached from their items. The items now sit in a single wrapper
element, so the menu moves the wrapper and its anchors as one unit and ordering is left
entirely to the list. The wrapper carries the `context-menu-hidden` slot the menu uses to
hide its items while closed, which it needs because slot assignment only applies to the
host's direct children.

The "details" and "open with" entries swap places, and a divider is added above "rename"
so the two groups read apart.

Verified in the browser by alternating between available and unavailable rows across the
full window from no delay up to 128ms, and against the same loop run with the wrapper
flattened to confirm the failure it prevents. No published package version changes.
