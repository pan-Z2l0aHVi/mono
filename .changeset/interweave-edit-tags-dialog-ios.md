---
---

Internal change: the Interweave tag editor dialog is retitled to "标签" and both group
labels move to 14px, matching the detail drawer. The current-tag strip drops to a 36px
white 18px-radius card, and the tag field grows a primary check-mark suffix button that
confirms a typed tag without opening the suggestion panel.

Adding a tag is now a two-step commit. Picking a suggestion only writes it back into the
input, so a half-typed prefix never lands in the tag list; the tag joins the current tags
only on Enter, once the panel has closed, or through the check-mark button. The dialog's
Enter handler yields to the suggestion panel while it is open — the panel owns Enter to
select its highlighted row — and the host keydown listener it relies on is registered
before the autocomplete's own, so the open-state check always reads the pre-selection
panel state.

Edits also save as they happen instead of on a footer confirm. Each add and each removal
commits immediately, which retires the two-button footer down to a single secondary "完成"
that only closes the dialog. The cost is one full save round trip per mutation, and a
failed single mutation is still not rolled back: the draft stays as the user left it and
the dialog stays open so the change can be retried.

No published package version changes.
