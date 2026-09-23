---
'@greypan/web-ui': patch
---

Register the view-transition capture cleanup of `web-ui-theme` before writing `document.adoptedStyleSheets`, and let the restore step tolerate a setter that rejects the write (issue #146).

- A synchronous throw from the `adoptedStyleSheets` setter used to reach the appearance setter's `.catch` with an undefined cleanup: the inline `view-transition-name` and `display` written for the nested-theme capture box stayed on the host and poisoned every later view transition. The cleanup is now registered before the write, so the failure path restores the capture state and still commits the final appearance.
- The restore step no longer lets a rejected `adoptedStyleSheets` write abort the host inline-style recovery.
- A jsdom regression test covers the throwing-setter path, including a guard that the transition really reached the write.
