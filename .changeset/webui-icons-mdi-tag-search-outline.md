---
'@greypan/web-ui': patch
---

feat(web-ui): add `mdiTagSearchOutline` to `@greypan/web-ui/icons`

`mdiTagSearchOutline` is the Material Design Icons tag-search glyph, added for the
Interweave library tag filter prefix. It is a new export: nothing is renamed or removed.

`fluentTagSearch24Regular` stays in the generated set. It arrived in the same unreleased
batch as `biCheckLg` and `akarIconsCircleCheck`, and this change leaves it without an
in-repo consumer, so it is kept only so both tag-search glyphs stay available to choose
from. Neither icon has shipped in a published version, so keeping it is not a
compatibility constraint.

The new devDependency `@iconify-json/mdi` (catalog `^1.2.3`) is read only by the icon
generator at build time. Icon bodies are inlined into the emitted modules, so no extra
dependency reaches the published bundle.
