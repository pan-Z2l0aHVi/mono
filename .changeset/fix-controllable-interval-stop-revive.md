---
'@greypan/js-kit': patch
---

Fix `defineControllableInterval` so `stop()` called from inside the timer callback actually stops the timer.

The recursive `setTimeout` chain ran the user callback first and only then decided whether to schedule the next period, and that decision looked at `isPaused` alone. Because `stop()` resets `isPaused` to `false`, a `stop()` issued from within the callback was undone before the chain could observe it: the timer read the freshly reset `isPaused`, rescheduled, and kept firing every `interval` indefinitely. Calling `stop()` from the callback was therefore the one way to make the timer impossible to stop.

The chain now tracks its own liveness in a separate flag that `stop()` clears and that only the public `tick()` re-arms. Rescheduling re-reads that flag after the callback returns, so a `stop()` from inside the callback ends the chain for good.

Behaviour that did not change: `stop()` while paused still leaves the timer restartable via `start()`, an explicit `tick()` after `stop()` still schedules a callback and continues on the normal cycle, and `pause()`, `resume()` and manual `tick()` — including the guarantee that a manual tick during a pause leaves no leftover handle for `resume()` to double-schedule — keep their existing semantics.
