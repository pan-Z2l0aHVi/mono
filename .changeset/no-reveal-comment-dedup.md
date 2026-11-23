---
'@greypan/web-ui': patch
---

Collapse the repeated `no-reveal` presence rationale into a single authoritative copy. The rationale
now lives with `useStartupRevealSuppression`'s docblock in the private interweave app and the public
`theme.md` docs; `theme/index.ts` points at the docs for per-framework binding, and `App.vue` reduces
its script and template comments to one pointer line each.

Comment-only change: no behavior, API, DOM attribute, or shipped CSS value changes. The private app
is not released, so it carries no version entry.
