---
'@greypan/interweave': minor
---

Replace the default Wails menu with a fully Chinese native seven-menu tree (system menu bar on macOS, window menu bar on Windows) driven by a single menu-command event, report page-dependent menu availability from the frontend so library-only commands grey out, add plain-text clipboard commands backed by a three-platform Go clipboard, move all application settings to a Go-owned settings service backed by an atomic temp-name+rename write, make interface zoom a Go-owned four-level setting (90%, 100%, 110%, 120%) that the Display menu steps and the settings slider picks from, replace the coordinate-based mac title-bar drag band with explicit per-element drag regions so header controls never start a window drag, and gate the first render on the Wails runtime so the mac sidebar clears the traffic lights and startup bridge calls never run before the runtime is injected.
