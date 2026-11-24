---
'@greypan/interweave': patch
'@greypan/web-ui': minor
---

On Windows, Interweave now uses a frameless integrated title bar that renders the top menu in the frontend instead of the native Win32 menu bar. The menu snapshot is pushed through the `menu:tree-changed` event and invoked through the menu service, while macOS and Linux keep the native application menu. `web-ui-layout` adds `--wui-layout-sticky-top` so sticky sidebar and header offset cleanly below custom title bars.
