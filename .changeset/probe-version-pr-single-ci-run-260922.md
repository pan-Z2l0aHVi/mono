---
'@greypan/interweave': patch
---

Probe release whose only purpose is to exercise the version pull request path: on the resulting version commit `CI` must run exactly once, from its own `pull_request` event, and `Verify Wails Desktop` must still be reached through the `apps/interweave/**` path filter rather than by the dispatch that was removed. This is not a product change, and the version pull request it opens is expected to be closed without merging.
