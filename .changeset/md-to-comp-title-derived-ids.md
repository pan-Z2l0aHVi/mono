---
'@greypan/md-to-comp': minor
---

Derive each sample's id from its `###` heading (`titleSlug`: lowercase, non-alphanumeric runs folded to `-`), so `## Samples` headings are English terms in both locales and the `{#id}` suffix is no longer written anywhere. A heading that still carries an anchor, folds to an illegal kebab-case id, or collides with an earlier heading in the same document now fails generation. Every sample emits a demo file: the `requireDemo` option and the "shows code, no demo file" case are gone, and `id` / `demoKey` are non-nullable strings.
