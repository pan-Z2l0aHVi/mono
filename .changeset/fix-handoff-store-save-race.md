---
'@greypan/pi-rex-orchestrator': patch
---

Fix `HandoffStore.saveRegistry` rejecting with `ENOENT` when concurrent writes raced over the shared fixed-name `.tmp` file: each write now uses a unique temporary name and cleans it up on failure. Concurrent snapshot writes are also serialized so the registry persists in call order and a later snapshot always wins.
