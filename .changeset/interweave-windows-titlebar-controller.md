---
'@greypan/interweave': patch
---

Evaluate `WailsMenuStateRuntime.isAvailable` dynamically to avoid static freeze before runtime injection, and extract `WindowsTitleBarController` with unmount race protection.
