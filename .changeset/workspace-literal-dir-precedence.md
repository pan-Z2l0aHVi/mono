---
'@greypan/monorepo-kit': patch
---

Document that `readPnpmWorkspaceDirectories` returns container and literal workspace directories without distinguishing them, so consumers decide by the presence of `package.json` (a directory that is a package contributes only its own root files), and cover the literal-directory path of `defineWorkspaceDepBoundaries` with a test.
