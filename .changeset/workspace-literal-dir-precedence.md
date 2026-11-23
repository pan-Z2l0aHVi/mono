---
'@greypan/monorepo-kit': patch
---

Two changes to workspace scanning. First, `defineWorkspaceDepBoundaries` no longer treats a literal workspace directory's own `dist`/`build`/`coverage`/`__tests__` subdirectories as workspaces: the artifact-name skip now starts from whether the scanned root is itself a package, so build output under a literal workspace stays out of the dependency graph (containers keep scanning those names at their first level, where such directories are real packages). A container directory that itself carries a `package.json` is treated as a package, so its children are no longer scanned. Second, `readPnpmWorkspaceDirectories` documents that it returns container and literal directories without distinguishing them, leaving consumers to decide by the presence of `package.json`.
