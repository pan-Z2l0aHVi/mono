---
'@greypan/interweave': minor
---

The import dialog now accepts folders everywhere a file can enter the queue. The file picker allows mixed file-and-directory selection (NSOpenPanel on macOS; other platforms degrade gracefully), dropped folders and clipboard folder paths are expanded like picked ones, and directories are expanded into their contained files by the backend — hidden entries, symlinks and special files are filtered, while an explicitly selected hidden folder keeps its visible children. Any batch selection that expands to more than 20 files — multi-file picks, recursive folders or a mix of both — requires an explicit confirmation dialog whose copy names how many folders were expanded; its busy button shows the processed/total ratio, as does the add dialog's confirm button while resources are being created.
