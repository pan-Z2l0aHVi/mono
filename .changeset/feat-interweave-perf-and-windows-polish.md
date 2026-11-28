---
'@greypan/interweave': patch
---

- Serve local media over a loopback HTTP server on Windows and upgrade video thumbnail capture to a 2-way concurrent viewport-first offscreen queue with a 250ms delayed loading spinner.
- Batch resource store upserts during bulk import and recovery, preserve scanned items on stop, add batch ETA messaging, and add separate file/folder pickers on Windows.
- Support macOS-style click-then-hover top menu switching, `Cmd/Ctrl + click` multi-selection, global referrer stripping, iframe-blocked URL fallback, mono-digit 12-hour relative timestamps, accent-colored detail actions, and a `"暂无备注"` note placeholder.
- Generate a macOS-style continuous squircle multi-DPI `windows/icon.ico` (16–256px) and reuse it for the Windows system tray icon.
