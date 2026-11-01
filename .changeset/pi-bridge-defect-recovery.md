---
'@greypan/pi-orchestrator-memory-bridge': patch
---

Recover orchestration side effects that were previously lost with a timed-out
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
