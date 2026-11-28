# @greypan/interweave

## 0.1.0

### Minor Changes

- a38fe7b: Batch link import: the add-link dialog now scans pasted text and clipboard HTML anchors for every http(s) link, shows an editable preview of the extracted list, and submits them in one batch. The backend imports the batch concurrently (8 workers by default), streams per-item progress, keeps failed items in the queue for retry, and can stop the remaining items mid-run.

### Patch Changes

- a2829f0: Persist desktop sidebar collapsed state, desktop sidebar width (160–320px), and library filter/sort panel open state across restarts via local storage.
- c1bd2ea: - Serve local media over a loopback HTTP server on Windows and upgrade video thumbnail capture to a 2-way concurrent viewport-first offscreen queue with a 250ms delayed loading spinner.
  - Batch resource store upserts during bulk import and recovery, preserve scanned items on stop, add batch ETA messaging, and add separate file/folder pickers on Windows.
  - Support macOS-style click-then-hover top menu switching, `Cmd/Ctrl + click` multi-selection, global referrer stripping, iframe-blocked URL fallback, mono-digit 12-hour relative timestamps, accent-colored detail actions, and a `"暂无备注"` note placeholder.
  - Generate a macOS-style continuous squircle multi-DPI `windows/icon.ico` (16–256px) and reuse it for the Windows system tray icon.
- 681a1ff: Enable Windows 11 Snap Layouts on the custom maximize button by turning on WebView2 composition hosting and declaring the button as a non-client maximize region. The experimental renderer path can be disabled with the `INTERWEAVE_DISABLE_WINDOWS_SNAP` environment variable.
- af01095: Fix in-app update checks and remote asset fetches failing with `proxyconnect tcp: EOF` when macOS system HTTPS proxy is enabled.
- 31ecd4e: Fix text selection across the app: resource titles and metadata are selectable in browse mode, while title bars, toolbars, navigation, drag handles, and selection-mode rows stay non-selectable. Rename editors restore the native touch callout, thumbnails no longer start a native image drag, and dragging a scrollbar handle no longer starts a text selection.
