---
'@greypan/monorepo-kit': patch
---

Add `skipWorktreeFiles()` to `GitApi` (the `S` entries of `git ls-files -v`) and a `defineFullCheckout({ remedy })`
check unit. On a cone-sparse worktree the tracked files outside the cone are absent from disk, so gates that
enumerate tracked files or walk directories silently scan a subset and still report a pass; this unit refuses
instead, and the restore command enters through options because it is a consuming-repository fact.
`defineScriptTests` now requires every `*.test.mjs` to print its own
`<repo-relative path>: all assertions passed` line: an exit code alone cannot tell "no assertion ran" from a pass.
