---
---

Retire the @greypan/ai-skill npm package: GitHub is the single distribution channel for the repo-authored skills (`npx skills add pan-Z2l0aHVi/mono`). The package never published a release, so nothing breaks downstream. `check-skills.mjs` and its tests move to the repo-root `scripts/` (tests converted to plain node:test) and drop the npm artifact sync; install docs move to `skills/README.md`. Pending changesets for the retired package are removed alongside it.
