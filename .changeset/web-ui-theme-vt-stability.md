---
'@greypan/web-ui': patch
---

Keep theme view-transition reveals stable when the initiating pointer emits follow-up events during the first 100ms: ignore only same-pointer movement or release inside the pointer-down target, while any genuinely new pointer or wheel input still skips the active transition and restores hit-testing promptly.
