---
'@greypan/web-ui': patch
---

feat(web-ui): add three icons to `@greypan/web-ui/icons`

`biCheckLg`, `akarIconsCircleCheck` and `fluentTagSearch24Regular` join the generated icon
set. All three are additive exports — nothing is renamed or removed, so existing consumers
are unaffected.

They are the icon bodies the Interweave library surface needs: a roomier check mark for
confirm actions, a filled circle-check for the same action in the add dialog, and a
tag-search glyph to prefix the tag filter input.

The new devDependency `@iconify-json/fluent` (catalog `^1.2.58`) is read only by the
generator at build time. Icon bodies are inlined into the emitted modules, so no extra
dependency reaches the published bundle.
