---
'@greypan/monorepo-kit': patch
---

Keep literal `pnpm-workspace.yaml` package patterns in `readPnpmWorkspaceDirectories` (a pattern without a glob segment names the workspace directory itself, so dropping it let that workspace escape the container-rooted boundary and corpus checks), reject a literal root workspace pattern (`'.'`) instead of silently widening the scan face to the whole repository, and cover literal workspace directories in `context-corpus` entry/README checks plus `no-mutual-links` shallow files.
