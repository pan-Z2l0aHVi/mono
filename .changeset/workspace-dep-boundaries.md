---
'@greypan/monorepo-kit': minor
---

Add the `defineWorkspaceDepBoundaries` policy plugin and the `deps:` attribution prefix to enforce manifest-level workspace dependency boundaries (zero circular dependencies across all workspace dependency fields, no runtime/peer/optional dependencies from published packages to private workspace packages, and unidirectional layering forbidding non-application workspaces from depending on application workspaces).
