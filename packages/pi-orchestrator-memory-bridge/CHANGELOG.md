# @greypan/pi-orchestrator-memory-bridge

## 0.0.1

### Patch Changes

- 7841264: Add a private Pi extension that turns a Herdr lead session into the orchestration coordinator and
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
- 4fa3add: Recover orchestration side effects that were previously lost with a timed-out
  `herdr_dispatch` / `herdr_review`, and harden board hygiene:
  
  - In-flight registry: dispatch and review calls are registered at `tool_call`
    (after the concurrency gate) and reconciled at `agent_before_settle` by
    matching `herdr agent list` entries by agent name. A pane that is still live
    gets relocated to its own tab, a self-settled worker (done/idle) lands its
    board task in `in_review`, a still-running one gets an `in_progress` task, and
    a live reviewer is re-registered against the concurrency gate. Model-readable
    notes for all recovery outcomes are injected via `agent_before_settle`.
  - A dispatch whose prompt wait already settled the worker (`details.status`
    done/idle) now creates the board task directly in `in_review` instead of
    leaving it in `in_progress` when no `herdr_watch` follows.
  - `ensureSharedBoard` recomputes the shared `task-board.json` counters
    (`nextTaskId`, `nextPanelId`) as `max(existing id) + 1` on every successful
    path, so migrated or merged boards stop allocating colliding task ids.
  - Pane relocation outcomes are appended to the `tool_result` as a
    `[bridge]` note (without flipping `isError`), so the lead model no longer
    depends on UI-only notifications.
