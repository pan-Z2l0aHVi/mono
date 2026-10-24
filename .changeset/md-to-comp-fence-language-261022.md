---
'@greypan/md-to-comp': patch
---

The `react` flavor's fence language is now `tsx` instead of `react`, so the corpus, the emitted demo file and the formatter all speak one name. ` ```react ` blocks were invisible to the formatter while the `.tsx` files they produced were governed by it, which left "the artifact equals the fence byte for byte" and "the artifact is formatted" only reconcilable by hand. `FLAVOR_LANG` is the single table behind the fence language, the shiki grammar id and the file extension, and the parser's error now names the language each flavor expects.

Breaking for consumers of the module surface: `flavorExtension` is no longer exported from `@greypan/md-to-comp`, because the extension it returned was the same value `FLAVOR_LANG` already holds. Read `FLAVOR_LANG[flavor]` instead. The package is private and has no importer for that name.
