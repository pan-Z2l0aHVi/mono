---
'@greypan/web-ui': patch
'@greypan/interweave': patch
---

Hide the `prefix` slot while `<web-ui-button>` is `loading` so the spinner replaces the leading icon instead of rendering both side by side.

Polish Interweave restore and bulk-import dialogs: display cached source thumbnails (with icon fallback) in the pending restore list, swap "Found" and "Skipped" scan stats, double the spacing above the scan status card, and shorten the bulk-import confirmation title to "批量导入".
