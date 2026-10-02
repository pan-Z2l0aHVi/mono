# Evaluation notes: herdr-cos

`herdr-cos` is a copy of `herdr-centralization` with two changes: each member is joined into its own
git worktree, and a member may hold a named role from the contracts in `../roles/`. This file records
what has and has not been run for **this** copy. Read it before quoting any number from the two skills
as if it were the other's.

## What this directory inherits, and must not be read as this skill's own

- `scenarios.json` is inherited **unchanged in substance** from `herdr-centralization`: the same six
  scenarios, the same assertions, only the identity tokens renamed (`hc`→`cos`, `hca`→`cosa`,
  `HERDR_CENTRAL_HOME`→`HERDR_COS_HOME`). Its scenarios predate the worktree isolation and the role
  contracts — no scenario in it exercises either.
- The record of those scenarios actually running — the 40-trial batch (four scenarios × 5 trials × 2
  arms) on 2026-09-30, the live L3 loop in herdr session `hc-l3`, the mutation drivers in `/tmp/hc-mut`,
  the throwaway eval driver in `/tmp/hc-eval`, and the write-up of all of it — lives in
  `.agents/skills/herdr-centralization/evals/README.md`. Read that file for the inherited numbers.
- **Every one of those runs measured `hc.mjs`, whose bytes differ from `cos.mjs`.** They are not
  re-runnable against `herdr-cos` by copying a number across, and no number from them is claimed here.

## What has actually run for herdr-cos

One thing: the unit suite.

```bash
node --test .agents/skills/herdr-cos/tests/cos.test.mjs   # 78 cases, all green, 2026-10-01
```

Of those 78:

- **70 are the ancestor's cases**, renamed and otherwise unchanged in what they assert. They still
  cover the ledger: the five structural invariants, the six fault injections, the member-state ladder,
  the doorbell, the printing path's number bounds, and the four process-level cases (a peer driving the
  rendered contract in a second process, that peer under an install path with a space and an apostrophe,
  eight concurrent senders, and the bell into a bare pane judged on exit status alone).
- **8 are new**, written for the two borrowings:
  - **Worktree isolation, 6 cases.** Five inject a fake git port and assert what `cos join` does with
    it — the member's pane opens in `<root>/worktrees/<slug>/<label>`; two members get two trees; the
    member file records `worktree` and `branch`; a non-git lead gets a note and shares the tree; a
    `git worktree add` that fails stops the join before any pane is split. The sixth runs **real git**
    in a throwaway repo, so the argv `cos` passes is proven to be one git accepts and the pane is
    handed a directory that exists — a fake port alone would only prove `cos` calls it.
  - **Role contracts, 2 cases.** The rendered contract names `roles/<name>.md` for all five roles; and
    every shipped role file carries the fixed sections (`Identity`, `Mission`, `Responsibilities`,
    `Boundaries`, `Collaboration`, `Done when`) and restates that a role is a name the ledger records,
    not a permission it enforces.
  - **Join rollback, 2 cases.** A refused `pane move` (and one for a refused `pane split`) after the
    worktree is carved rolls the tree and branch back, names the stray split pane (move case),
    registers no member and starts no agent; the fake git port answers `worktree remove` and
    `branch -d` for these.
- The four process-level cases now pass `--no-worktree`, because they spawn the real program from the
  repo's own working directory and must not leave a real worktree or branch behind. Worktree creation
  is not exercised across a process boundary for that reason; the real-git case above is the one that
  runs real `git` — it makes a throwaway repo under `$TMPDIR`, adds a worktree and branch, and removes
  both, leaving only the throwaway repo directory in `$TMPDIR`.

## What is not covered (stated plainly)

- **No eval trial has run against `cos.mjs`.** The two new axes — worktree isolation and the role
  contracts — have unit tests and nothing else. No scenario exercises `cos join`'s worktree path end to
  end under an agent, and no scenario has a member read its role file and act on it. A claim about how
  an agent uses either belongs to no run recorded here.
- **No mutation testing has been done for the new code.** The ancestor's sixteen-driver
  (`/tmp/hc-mut/mutate-all.mjs`) and its role/kind driver (`mutate-role.mjs`) were built against
  `hc.mjs`; neither has been re-pointed at `cos.mjs`, so the eight new cases are pinned by nothing but
  their own assertions today.
- **No latency figure.** `240s` and `30s` are still pre-measurement estimates, exactly as in the
  ancestor — `cos` prints the cadence and enforces nothing.
- The ancestor's other caveats carry over unchanged: the `without` arm is not a clean control, the
  implementer is also the grader, and the peer-decision scenarios have no host that makes a peer
  decide. See the ancestor's README for the full statements.

## Citation lint

Every `cos.mjs:NNN` citation in `PROTOCOL.md`, `SKILL.md`, `RECOVERY.md` and this file is checked by a
throwaway lint (`/tmp/cos-cites.mjs`, not committed, same shape as the ancestor's `hc-cites.mjs`): it
extracts both the `cos.mjs:NNN` and bare `` `:NNN` `` forms and prints the line each points at. The run
after the worktree and role edits prints **22 citations, none out of range, against `cos.mjs` at 656
lines**. The join-rollback edit shifted six anchors again; the run after it prints the same 22
citations, none out of range, against `cos.mjs` at 673 lines. The worktree code shifted every anchor
the ancestor had, so all of them were recomputed rather than copied — the file is the same size class
as `hc.mjs` was, but no line number survived the move unchanged. The lint checks the numbers, not the
reading: a citation can sit on the right line and still be described wrong by the sentence around it.
