---
'@greypan/interweave': minor
---

Add a tray light mode that destroys the WebView while keeping backend services and the tray running, with platform-specific tray icons and a right-click menu for restoring the main window, toggling light mode, and quitting.

Make tray and window transitions deterministic by serializing close, hide, and restore operations on the Wails main queue. Recover a window hidden to the tray when the setting is disabled, keep Dock visibility in sync on macOS, and use a PNG tray icon on Linux.

Use the Wails runtime as the only library data source and report operation failures through toasts instead of inline error banners.
