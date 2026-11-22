---
'@greypan/interweave': minor
---

The import dialog now accepts folders everywhere a file can enter the queue. The file picker allows mixed file-and-directory selection (NSOpenPanel on macOS; other platforms degrade gracefully), dropped folders and clipboard folder paths are expanded like picked ones, and directories are expanded into their contained files by the backend — hidden entries, symlinks and special files are filtered, while an explicitly selected hidden folder keeps its visible children. Batches above 20 expanded files require an explicit confirmation dialog, whose busy button shows the processed/total ratio; the add dialog's confirm button shows the same ratio while resources are being created.
