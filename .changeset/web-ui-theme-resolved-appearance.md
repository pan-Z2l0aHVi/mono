---
'@greypan/web-ui': minor
---

Expose `<web-ui-theme>`'s resolved color scheme as the read-only reflected `resolved-appearance` attribute and `resolvedAppearance` property. The value is always `light` or `dark`: explicit appearances pass through, `system` follows `prefers-color-scheme` and updates live on OS flips, and a missing `appearance` reports the default `light`. The component owns and restores the attribute, so consumers can bind CSS selectors or Tailwind custom variants to it without maintaining a second theme state; existing View Transition behavior is unchanged.
