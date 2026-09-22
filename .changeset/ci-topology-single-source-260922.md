---
---

Internal change: no published package is affected, and `@greypan/interweave` is deliberately not bumped — a bump there would make the next merged version PR produce a desktop release.

Workflow topology now has one declaration: `.github/scripts/ci-topology.mjs` records every workflow's triggers, permissions, job `needs`/`if`, release-branch literal, desktop build matrix and declared install surface, and `scripts/ci-topology.test.mjs` reads the real YAML and compares field by field. `ci.yml` no longer triggers on `push` to `main` — the repository is squash-only with a strict required status, so that run re-validated a tree that `pull_request` had already validated; `workflow_dispatch` stays as the on-demand trunk check. `ci.yml` also gains explicit `permissions: contents: read`.

`.github/scripts/detect-versioned-packages.mjs` now passes `--find-renames` and reads the base manifest from the rename's old path. Git detects renames by default, so a package directory move arrived as `R` and the previous `--diff-filter=AM` dropped it silently: the new npm name was never published while CI stayed green. Publishing is now keyed on the `(name, version)` identity, so a renamed package is published once and a pure directory move produces nothing.
