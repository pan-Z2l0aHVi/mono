---
'@greypan/monorepo-kit': patch
---

Two changes to workspace scanning. First, `defineWorkspaceDepBoundaries` no longer treats a literal workspace directory's own `dist`/`build`/`coverage`/`__tests__` subdirectories as workspaces: the artifact-name skip now starts from whether the scanned root is itself a package, so build output under a literal workspace stays out of the dependency graph. Containers keep scanning those names at their first level, where such directories are real packages.

Second, `readPnpmWorkspaceDirectories` now documents that it returns container and literal directories without distinguishing them, and that consumers decide by the presence of `package.json`. That decision changes each consumer's scan shape rather than the traversal: the boundary check stops descending into artifact-named subdirectories of a package, the corpus check keeps walking entry documents recursively but collects only a package's root-level `README.md`, and the link check collects only the package's root-level shallow files. A container directory that itself carries a `package.json` is consequently treated as a package, so its artifact-named subpackages and subdirectory READMEs drop out of those checks while entry documents are still collected; that layout is not supported.
