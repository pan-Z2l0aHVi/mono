---
'@greypan/interweave': minor
---

Replace the default Wails menu with a fully Chinese native seven-menu tree (system menu bar on macOS, window menu bar on Windows) driven by a single menu-command event, report page-dependent menu availability from the frontend so library-only commands grey out, add plain-text clipboard commands backed by a three-platform Go clipboard, and move all application settings to a Go-owned settings service backed by an atomic temp-name+rename write.
