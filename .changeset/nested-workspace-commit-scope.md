---
'@greypan/monorepo-kit': patch
---

Collapse nested workspaces into their nearest ancestor commit scope, so a nested workspace such as
`apps/interweave/frontend` is covered by the parent app scope instead of requiring its own entry.
