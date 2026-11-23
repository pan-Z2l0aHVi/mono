---
'@greypan/monorepo-kit': patch
---

Keep literal `pnpm-workspace.yaml` package patterns in `readPnpmWorkspaceDirectories` (a pattern without a glob segment names the workspace directory itself, so dropping it let that workspace escape the container-rooted boundary and corpus checks), normalize `./` segments and treat `?`/`[]`/`{}` as glob metacharacters in those patterns, reject a literal root workspace pattern (`'.'`) and patterns whose first segment is a glob instead of silently dropping them (both left workspaces outside the container-rooted checks while the manifest view still matched them), and cover literal workspace directories in `context-corpus` entry/README checks plus `no-mutual-links` shallow files (container directories without their own `package.json` are untouched).
