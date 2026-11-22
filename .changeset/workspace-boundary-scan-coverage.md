---
'@greypan/monorepo-kit': patch
---

Keep literal `pnpm-workspace.yaml` package patterns in `readPnpmWorkspaceDirectories` (they map to the workspace directory itself), apply `IGNORED_DIRECTORIES` name skipping only inside packages during workspace manifest collection so real packages named `build`/`dist`/`coverage`/`__tests__` are no longer skipped whole, and fail with an error on duplicate workspace package names instead of silently overwriting the earlier manifest.
