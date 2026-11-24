---
'@greypan/interweave': minor
---

Add desktop wallpaper, system-proxy-aware URL fetching, direct image URL classification, and markdown/code preview.

The resource context menu gains "set as desktop wallpaper" for image resources: file sources are set from their original path (macOS via NSWorkspace per screen, Windows via SystemParametersInfoW, Linux via GNOME/Cinnamon/MATE/KDE/XFCE desktop dispatch); URL sources are streamed through `backend/remote` into an app cache directory first. Go outbound HTTP now follows the OS proxy settings (macOS CFNetwork per-URL resolution, Windows WinINET static proxy with per-protocol and bypass parsing, Linux gsettings for GNOME-family desktops), so imports no longer stall for the full probe budget when a system proxy is required for reachability. URL metadata records the response content type, and the display-layer kind classifies direct image URLs (extension first, content-type fallback) as `image`, driving thumbnails (`<img>` against the original link), the preview drawer (image mode instead of an iframe), and the wallpaper entry.

The preview drawer renders markdown (same parser and `.mdm-*` styling as the web-ui demos via `@greypan/md-to-meta/runtime` and a build-time theme plugin) and code files with line numbers and syntax highlighting (shiki, whitelisted languages, inputs above 128 KB / 5000 lines fall back to plain text). All markdown inline content is treated as untrusted and rebuilt through an allowlist sanitizer; links open in the system browser instead of navigating the WebView; relative targets are dropped.
