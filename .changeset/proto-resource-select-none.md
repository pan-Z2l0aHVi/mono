---
---

Internal change: only `apps/interweave/frontend` is touched, and `@greypan/interweave` stays unbumped because the page is a prototype surface that nothing published reads.

The shell prototype's resource list sets `user-select: none` on the container that holds its rows. The rows carry their own hover, selected and batch-selection states and are drag targets, so text painting inside them competes with the states the page is trying to show.

Renaming stays editable: the row's `<web-ui-editable-text>` re-declares `user-select: text`, which is what keeps the caret and the programmatic selection on entry working — `select-none` inherits, so without that one word the rename field would take focus and paint nothing.
