---
'@greypan/web-ui': minor
'@greypan/interweave': minor
---

Add a `wordpress:dashboard` icon to the built-in icon registry.

Add "copy to clipboard" for library resources: local files and directories are written to the system clipboard as file objects (macOS `NSPasteboard`, Windows `CF_HDROP`, Linux `text/uri-list` via `wl-copy`/`xclip`), while links copy their URL as text. The Library page now persists its scroll position in the store and restores it across KeepAlive activation and route reloads, and the restore dialog scan status uses a surface shimmer instead of animating the text.
