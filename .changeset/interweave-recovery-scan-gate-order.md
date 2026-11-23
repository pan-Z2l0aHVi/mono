---
'@greypan/interweave': patch
---

A finished recovery scan now releases its scan gate before Poll can report it as done, so starting another scan right after seeing completion no longer fails with "a recovery scan is already running".
