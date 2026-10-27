---
'@greypan/web-ui': minor
---

Keep the dialog and drawer Tab loop inside the dialog instead of letting focus wrap to `<body>`.
Associate an open tooltip with its trigger through `aria-description`.
Localize built-in accessible names (close, clear, decrease, increase, back to top, sidebar toggle and main navigation) from the document language, with `close-label`, `clear-label`, `decrease-label` and `increase-label` overrides.
Forward `aria-label` to the segmented control's internal listbox.
