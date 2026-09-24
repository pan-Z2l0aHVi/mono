---
'@greypan/web-ui': minor
---

fix(web-ui): size a size-less Iconify icon on the spec's 16×16 canvas

`<web-ui-icon>` derived its `viewBox` from `icon.width`/`icon.height` and fell back to `24` when the data object declared neither. Iconify's own default canvas is 16×16 (`@iconify/types` README), so the fallback was the one value the spec does not allow: a size-less 16-unit icon was squashed into the top-left quarter of a 24-unit box instead of filling it. The fallback is now `16`, and generated assets no longer rely on it — `scripts/generate-icons.ts` resolves the merge chain (icon → icon set → spec default) before writing, so `@iconify-json/bi`, which publishes no root canvas for any of its 2084 icons, now emits `width: 16, height: 16` rather than leaving the size to the renderer.

The published behavior difference is for consumers who hand a raw `IconifyIcon` object to `.icon` and declare no canvas on it: such an icon renders at a different scale than before. Every icon object that declares its `width`/`height` renders as it did, which covers all assets exported from `@greypan/web-ui/icons` in the previous release — `biCheck` is new on this branch and had never rendered at the right scale.
