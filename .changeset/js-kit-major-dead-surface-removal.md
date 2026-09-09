---
'@greypan/js-kit': major
---

Remove dead public surface and collapse the asynchronous call helper.

- Remove `asyncCompose`, the event-emitter plugin, the Go paradigm helper, the random utilities and the `nanoid` dependency.
- Change `safeCall(fn, options?)` from spreading arguments to calling a thunk and add an optional `onError` escape hatch so failures are no longer silently swallowed.
- Remove the dedicated `./go` subpath export.
