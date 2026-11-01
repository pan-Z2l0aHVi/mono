---
'@greypan/pi-orchestrator-memory-bridge': patch
---

Add a private Pi extension that turns a Herdr lead session into the orchestration coordinator and
gives it an orchestration memory that outlives the session.

- Activation keys off the `name` field of `herdr agent list`, so worker and reviewer panes register
  nothing at all.
- Two write anchors: an approved `herdr_plan` writes a decision memory, a rejected `herdr_review`
  writes a rejection memory. Keys are `orchestration.<repo-key>.<kind>.<slot>`, with the slot
  derived from a content hash so a replay is idempotent. The `project.` prefix is deliberately
  avoided, because `pi-memory` scopes that prefix by `.git` directory name and would split one
  repository's memories per linked worktree.
- Repository identity comes from the Git common directory, so a repository and all of its worktrees
  resolve to the same key.
- `slices/<slice>.review.md` is re-read to correct a verdict-parsing bug in the orchestrator, where
  the template enumeration matched before the verdict and pinned `details.verdict` to APPROVE.
- Dispatch and review sync into `pi-task-board`: dispatch opens an `in_progress` task, APPROVE moves
  it to `in_review`, REJECT returns it to `todo` with the reason, and repeated slices for one board
  merge instead of piling up duplicate tasks.
- Injection goes through `systemPromptOptions.sections.orchestration` with historical/untrusted
  markers and a token budget; it writes no transcript and leaves `pi-memory`'s `sections.memory`
  untouched.
- Every checkout gets its `.pi` symlinked to `~/.pi/task-boards/<repo-key>/`, so the board lives
  outside the repository, and a link that reached that directory through another checkout's `.pi` is
  rewritten to point at it directly.
- No external runtime dependencies: the Pi host API types are declared inside the package and
  `typebox` is replaced by plain JSON Schema literals.
