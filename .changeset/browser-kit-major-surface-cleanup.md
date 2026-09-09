---
'@greypan/browser-kit': major
---

Clean up duplicated and transport-specific public utilities.

- Rename `maxBeaconSize` to `maxBatchKB`.
- Remove `sleep`, `sleepSync` and `defer`.
- Move `getFileExtension` and `formatFileSize` to `@greypan/js-kit`.
