---
'@greypan/monorepo-kit': minor
---

Add the optional `requireWorkspaceEntry` flag to `ContextCorpusOptions` (defaulting to `true`) so repositories can opt out of requiring an `AGENTS.md` in every workspace while continuing to validate existing entries, and harden `defineWorkspaceDepBoundaries` to skip `dist`/`build`/`coverage`/`__tests__` only below package roots (`depth > 0`) and report duplicate workspace package names instead of silently overwriting earlier manifests.
