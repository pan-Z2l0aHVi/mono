---
'@greypan/web-ui': major
---

Replace the toast imperative API's dedup-and-drop behavior with upsert semantics, and retire `toast.updateMessage()`.

Repeated calls that pass the same `id` now converge on one toast instead of silently discarding the update: supplied fields overwrite, omitted ones keep their value, and the call returns that toast's id in both cases. `duration` restarts the countdown only when passed explicitly; changing `position` moves the element to the new container and keeps the remaining time. `container` and `target` are read from the first call only.

A toast that is already exiting, or that a host pulled out of the DOM, no longer counts as mounted: the call creates a new toast instead of patching one that is about to disappear, and the exiting element keeps its own `toast-close` bookkeeping — a late `toast-close` can never remove a toast that reused the same id.

The `error` shortcut's 5000 ms default is applied at mount instead of being injected into every call, so it no longer counts as an explicit `duration`: repeated `toast.error(msg, { id })` calls keep the running countdown. As a side effect the generic `toast({ type: 'error' })` form now defaults to 5000 ms too, which is what the option table documented all along.

`toast.close(id)` and `toast.clear()` now also cover the states before a toast becomes visible. An id still queued in the current microtask is dropped before it mounts (nothing appears, no event is emitted), and a toast that is mounted but whose `show()` has not run yet emits `toast-close` immediately instead of ignoring the call. Both windows used to swallow the request silently, so the toast appeared anyway. A toast whose auto-close countdown elapsed while the main thread was blocked also closes on resume instead of staying open forever after a `position` upsert.

The old dedup checked only mounted toasts, so two calls inside one microtask both mounted (two elements sharing one `toastId`). The second element was unreachable from the manager: `removeToast()` returned early for ids it did not know, so neither `close()`, `clear()` nor the natural timeout could remove it, and it stayed in the `role="log"` container forever.

Migration:

```ts
toast.updateMessage(id, { message: 'new message', heading: 'new heading' }) // before
toast({ id, message: 'new message', heading: 'new heading' }) // after
```

`ToastMessageUpdateOptions` is removed.
