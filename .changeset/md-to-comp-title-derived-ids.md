---
'@greypan/md-to-comp': minor
---

Derive each sample's id from its `###` heading (`titleSlug`: lowercase, non-alphanumeric runs folded to `-`), so `## Samples` headings are English terms in both locales and the `{#id}` suffix is no longer written anywhere. Generation now fails when a heading still carries an anchor, when the derived id is not a legal kebab-case slug (an empty id is the only shape `titleSlug` itself can produce; a custom `anchor` function can produce others), or when two headings in one document derive to the same id. Every sample emits a demo file: the `requireDemo` option and the "shows code, no demo file" case are gone, and `id` / `demoKey` are non-nullable strings.
