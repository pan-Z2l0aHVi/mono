---
'@greypan/web-ui': patch
---

Tune the pressed handle shadow down: `web-ui-switch` and `web-ui-segmented` keep the pressed-glass structure (solid white at rest, frosted glass + 1.5x scale + lifted shadow while pressed/dragging) but the press shadow is now slightly lighter and tighter — lower opacity on all three layers and smaller blur radii/spread. The direct-value `box-shadow` (no CSS custom-property indirection) is unchanged, so iOS Safari still transitions it reliably.

Roll the two-layer glass blur out to every component that fades opacity on or around a frosted-glass surface. The root cause is the same as the dialog fix: an element with `opacity < 1` becomes a backdrop root, which disables the `backdrop-filter` of any glass element inside it (or around it) during the transition, so the blur pops in/out at the opacity endpoints instead of fading. The glass surface itself no longer transitions its own opacity and no longer carries `backdrop-filter`; a dedicated blur layer (`.wui-floating-panel-blur`, `.toast-blur`) and a content layer (`.wui-floating-panel-surface`, `.toast-surface`) each fade their own opacity, which keeps the blur continuous on every engine.

- Floating panels (popover, tooltip, select, autocomplete, dropdown, context-menu via the shared menu portal): the shared `.wui-floating-panel` keeps `opacity: 1` and only animates `transform`; the two-layer structure is built by the shared overlay portal and the menu portal, so every consumer is covered.
- Toast: `.toast` keeps `opacity: 1` and only animates `transform`; content and blur fade through `.toast-surface` / `.toast-blur`.
- Image preview: the fullscreen dialog no longer fades its own opacity (that made the dialog a backdrop root and disabled the glass toolbar/counter blur). The scrim fades through a dedicated `.wui-image-preview-backdrop` layer, the image stage fades through `.wui-image-preview-surface`, and the glass controls (toolbar, counter, close, nav) each fade their own opacity — the counter/toolbar are the glass elements themselves, and the glass close/nav buttons fade through a newly exposed `part="button"` on `web-ui-button`'s native button (the element that actually carries `backdrop-filter`), so no control sits inside an opacity-fading ancestor and their blur stays continuous while the fade-in/out is restored.
- Audit-only (no discrete blur switch, left unchanged): drawer (its dialog only animates transform), and the always-on glass surfaces in avatar, button, button-group, input, input-number, textarea, layout, slider, switch, segmented and theme.

Reduced-motion behavior is preserved: blur/content layers keep a short opacity fade under `prefers-reduced-motion: reduce`, and the floating-panel family keeps the same enter/exit durations from the float tokens.
