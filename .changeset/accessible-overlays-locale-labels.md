---
'@greypan/web-ui': minor
---

Keep the dialog and drawer Tab loop inside the dialog instead of letting focus wrap to `<body>`.
Associate an open tooltip with its trigger through `aria-description`.
Forward `aria-label` to the segmented control's internal listbox.
Unify the built-in accessible names behind one fixed-English fallback table with `aria`-prefixed override props (ADR-0029):

- Every icon-only control now has an accessible name: the hardcoded English literals in `badge`, `image-preview` and `textarea` move into the shared table, joining `dialog`, `drawer`, `input`, `input-number`, `back-top` and `layout`.
- The fallback no longer follows the document `lang`, and the `LocaleController` observer is gone. Pages that need another language set the override props: `aria-close-label` / `aria-dialog-label` (dialog, drawer), `aria-clear-label` (input, textarea), `aria-decrease-label` / `aria-increase-label` (input-number), and the host `aria-label` (back-top, badge — the latter with `{count}` interpolation across its dot / count / zero states).
- `image-preview` takes an `ariaLabels` option covering close / previousImage / nextImage / zoomIn / zoomOut / resetZoom; `layout` takes an `ariaLabels` property covering collapseSidebar / expandSidebar / resizeSidebar / openNavigationMenu / mainNavigation.
- `close-label`, `clear-label`, `decrease-label` and `increase-label` were added in this release and ship under their `aria-`-prefixed names directly.
- `dialog-label` (shipping since 11.1.0) is renamed to `aria-dialog-label`; the old attribute stays as a deprecated alias that forwards to the new property, to be removed in the next major.
