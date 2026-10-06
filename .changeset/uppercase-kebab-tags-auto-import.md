---
'@greypan/unplugin-web-components': patch
---

Fix uppercase and mixed-case kebab web component tags in module sources not being auto-imported

The transform fast path used a case-sensitive substring check for the tag prefix, so
`<WEB-UI-BUTTON />` in `.vue`/`.jsx`/`.tsx` sources never reached the (already
case-insensitive) tag regex and silently produced no imports. The fast path now
pre-filters with the same regexes used for matching, so all case variants are
recognized and their imports normalized to the lowercase component directory.
