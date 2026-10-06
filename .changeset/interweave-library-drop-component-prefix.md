---
---

Internal change: the eleven Vue components under `components/library/` drop the redundant
`Library` prefix from their filenames — `LibraryToolbar.vue` is now `Toolbar.vue`,
`LibraryResourceThumbnail.vue` is now `ResourceThumbnail.vue`, and so on. The files sit in a
directory that already says "library", so the prefix repeated what the path already stated.
Their colocated `.spec.ts` files and the local identifiers each component is imported under
were renamed to match, including the consumer in `pages/LibraryPage.vue`.

No behavior, markup, or public package version changes.
