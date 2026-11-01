---
'@greypan/web-ui': minor
---

Add `sidebar-collapsible` to `<web-ui-layout>` and render the desktop collapse toggle only when opted in; make the imperative spinner non-modal and pointer-transparent so loading feedback no longer blocks the page; widen vertical button groups to at least one control size.

Add `trigger="icon"` to `<web-ui-select>` for a left icon slot that keeps the right arrow, forward `aria-label` from `<web-ui-segmented-trigger>` to its inner option, and export `antDesignSyncOutlined`, `icBaselinePhonelink`, `icOutlineMotionPhotosOn`, `icOutlineMotionPhotosOff`, `lucideContrast`, `lucideLanguages`, `lucideList`, `lucideMoon`, and `lucideSun`.
