---
---

Internal change: only `apps/interweave/frontend` is touched, and
`@greypan/interweave` stays unbumped because the placeholder is a prototype surface that
nothing published reads.

The library tag filter placeholder now reads 「搜索标签」. The old 「标签/无标签」 used a
slash that read like two selectable values, but 无标签 was never a filter value:
`filterTag` only exact-matches existing `tagNames`, so typing it returned nothing. The new
wording states the action, matches the sibling 「搜索资源」 phrasing, and agrees with the
tag-search prefix icon.
