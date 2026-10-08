---
'@greypan/interweave': patch
---

Frontend bindings are now generated through a single guarded entry, `apps/interweave/scripts/generate-bindings.mjs`, which the Wails Taskfile (`generate:bindings`) and the frontend `build` / `build:dev` scripts all call. It runs `wails3 generate bindings -clean=false` and wraps it in an "output set shrank" guard: it snapshots `frontend/bindings/**` before generation and, if the run produces fewer files than the snapshot, restores the directory exactly and exits non-zero.

`wails3`'s `-clean` is not "delete then rebuild": it generates into a sibling temp directory and syncs file by file, and the sync's delete phase drops every file this run did not produce — while package-load and type-check problems are only logged as warnings and the command still exits 0. That silent shrink is what deleted tracked bindings. `-clean=false` removes the write-time deletion entirely, and the guard catches the shape regardless of the exit code.

Cost: stale generated files (renaming or removing a Service leaves its old files behind — remove them with `git rm`), and writing directly into `bindings/` emits HMR events while a dev server is running (no delete-and-recreate loop, so chokidar's rename loop is not triggered). The guard only catches the shape where the tool deletes files; with `-clean=false` wails3 performs no deletion at all, so that branch is effectively a sentinel for a future change in wails3's semantics rather than a gate that misfires on intentional Service removals.
