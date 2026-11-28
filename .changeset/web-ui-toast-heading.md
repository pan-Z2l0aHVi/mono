---
'@greypan/web-ui': major
---

In `<web-ui-toast>`, the string passed to `toast()` or to any shortcut is written to `heading` instead of `message`. `message` is now optional and carries the body line, `toast()` accepts a plain string as `{ heading }`, and the shortcuts take the heading as their first argument with body text in `options.message`. The heading renders as a single line, so multi-line details belong in `message`.

Migration: `toast('Body text', { heading: 'Title' })` becomes `toast('Title', { message: 'Body text' })`. Callers that only ever passed one short line need no change.
