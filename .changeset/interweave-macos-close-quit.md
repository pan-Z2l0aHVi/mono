---
'@greypan/interweave': patch
---

Fix macOS quit behavior on window close: `ApplicationShouldTerminateAfterLastWindowClosed` is now disabled so that minimize-to-tray keeps working, and closing the window with minimize-to-tray turned off now quits the app explicitly.
