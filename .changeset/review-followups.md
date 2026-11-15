---
'@greypan/doc-demo-kit': patch
'@greypan/interweave': patch
---

Drop `COPY_FEEDBACK_DURATION`, which lost its last consumer when the demo copy feedback moved to `PressDrawIcon`, and align the availability docs with what `ApplyFileAvailability` actually does on every `available=true` call. `TestRecoveryCancelled` now cancels after the walk starts and asserts `context.Canceled`, so it covers the interruption path that `ServiceShutdown` relies on.
