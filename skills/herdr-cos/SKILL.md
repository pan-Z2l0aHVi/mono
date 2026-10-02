---
name: herdr-cos
description: One shared ledger so several herdr panes can hand work to each other without losing a message.
disable-model-invocation: true
---

# herdr-cos

A lead pane and N worker panes — each a herdr pane holding one agent — sharing one ledger directory
on disk. A message is a file. Delivery is a one-line doorbell herdr types into the recipient's pane.
Consumption is an ack file, and for a message the ack file is the only proof. Whether a pane is
alive is herdr's to say, not the ledger's. No pane ever waits on another. Each member is joined into
its own git worktree, and each may hold a named **role** from the contracts in `roles/`.

`PROTOCOL.md` holds field semantics, the message and member state tables and the invariants to keep
when editing `scripts/cos.mjs`; `RECOVERY.md` holds the interruption branches; `roles/*.md` are the
role contracts a member reads once it is told which role it holds. The program is
`scripts/cos.mjs`, run as `node <this skill dir>/scripts/cos.mjs`, with nothing behind it but node
stdlib, `herdr`, and `git`.

## Gate

- `herdr status` first: the server must be running. Most commands and flags named here came off
  the upstream [`herdr` skill](../herdr/SKILL.md); two did not, and they are named here because a reader cannot tell a
  documented surface from a borrowed one otherwise. `pane move --new-tab` has no upstream line carrying
  the flag, and **`pane get` is not in the 214-line upstream doc at all**. `cos` reaches for it in two
  shapes: once in `cos new`, where it *is* the lookup for this pane, and per member during reconcile,
  where it runs only after `agent list` has left that pane unnamed — which is the ordinary case for a
  bare pane, and the pass that separates "still launching" from "gone". Both were read off `strings` of
  the installed herdr 0.9.1 binary on 2026-09-29 and both shapes were answered by a live 0.9.1 server on
  2026-09-30, in a full loop run in a named session of its own — `new`, two `join`s, `send`, a peer
  acking from the rendered contract, `reconcile`, `close`, `poll`. Every member in that fleet was a bare
  pane (its `join` line reads `agent (bare pane)`), which is why its reconcile reported `ready` off
  `pane get` rather than off the agent list. Undocumented means
  unfrozen: on any other version read `herdr pane get --help` before trusting a member state that
  reconcile printed. The measured baseline is **herdr 0.9.1, private protocol 22**, read from
  `herdr --session <name> status server` on 2026-09-30 — of those two numbers only 0.9.1 is still
  reopenable here (the Homebrew install path says it); the protocol reading was printed once and not
  saved, so treat it as reported rather than as an artifact. On any other version, read
  each command's own help before trusting a flag.
- `command -v node` must succeed in every pane you mean to make a member: a peer runs the same
  program to ack. `cos join` does not check this, so check it yourself.
- `git` must be on `PATH` and `cos new` run from inside a git repo if you want the worktree
  isolation described below; outside one, `cos join` shares your tree and says so.
- `cos new` registers the calling pane as lead; with `HERDR_PANE_ID` unset it falls back to the focused
  pane, which may be a human's, so read the `lead pane` line it prints.
- Ledger root: each command resolves a candidate from `HERDR_COS_HOME` (absolute, and only
  `[A-Za-z0-9._:/-]`, because the doorbell line goes straight into a shell) or
  `$TMPDIR/herdr-cos`. Only `cos new` *records* it; every other call compares against that
  record and stops on a mismatch, so a peer whose `$TMPDIR` differs cannot quietly open a second empty
  fleet. Hence every line printed or rendered here carries `HERDR_COS_HOME=<recorded root>` — copy
  it, do not retype it.

## Steps

1. **Claim the fleet.** `cos new <slug>` prints `claimed fleet … at <abs>`; that path is the ledger and
   the rendered `peer-contract.md` beside it is what a worker needs. You are member `lead`: your
   records say `from: lead`, replies arrive on `channels/<worker>->lead/`. A second `cos new` exits 1 —
   unless nothing was claimed yet (manifest present, no `*.json` under `members/`, no contract), when it finishes
   that interrupted claim instead of burning the name.
2. **Add members.** When you need one, run `herdr agent` (no subcommand) to see the installed kinds,
   ask your user which to use, then `cos join <slug> <right|down> <kind> [role]` per worker, up to about
   six counting the lead; past that `cos` warns and keeps going. Ask only when a new member is needed —
   reuse an idle member of the same kind rather than spawning one, because the question parks your
   dispatch on a human round trip (the rest of the fleet keeps working). The optional fourth word is
   that member's role: one of `manager`, `planner`, `coder`, `supervisor`, `tester` — the contracts in
   `roles/`, loaded by the member when it reads its file. The role is recorded with the kind and shown
   on `MEMBER` lines, and nothing else — it is a name for humans, not a permission (`PROTOCOL.md` has
   the semantics). Each split a pane, moves it to
   its own tab, starts an agent named `cos-<label>-<slug>`, publishes `members/<label>.json`, and assigns
   the label itself — `m1`, `m2`, … in join order, printed on the `joined` line, not chosen by you. **It
   also carves the member its own git worktree** at `<root>/worktrees/<slug>/<label>` on branch
   `cos/<slug>/<label>` and opens the pane there, so two members never share a working tree; the join
   prints `worktree <path> (branch <branch>)`. Pass `--no-worktree` to share your tree instead (outside
   a git repo it does this anyway, with a note). The
   kind goes verbatim to `herdr agent start --kind`, so an unspellable kind fails at herdr: the member
   stays registered with no binding, `join` exits 1, the pane reads as a bare one, and a bell to it is
   typed into a shell that runs it and finds no command named `cosa`. That binding is write-once, so
   reconciling repairs nothing: `cos join` a fresh member and hand the work to it again. A failure one
   step earlier — the split, or the move that takes the pane to its own tab — rolls the freshly carved
   worktree and branch back and names the stray pane to close, with nothing registered, so the same
   `cos join` can simply be re-run.
3. **Send work.** `cos send <slug> m1,m2 "<text>" [re]` publishes one record per recipient and rings
   each bell — *one body to N recipients*, so N different briefs are N `cos send` calls; a single
   fan-out costs one `agent list` plus N prompts, plus one `pane get` for every member that list did
   not name — which is how a launching member is told from a vanished one. To hand over a file rather
   than type it: `cos send
   <slug> m1 - < report`. That copy is verbatim, not a summary or a link; a body over 1500 bytes
   lands in `artifacts/` and the record carries the path, so the doorbell stays one short line.
4. **Observe.** `cos poll <slug>` reconciles and prints `NEW <from> <seq> <type> <preview>` for what
   awaits this pane and `RUN …` — the ack line, runnable verbatim. Pull about every 30s: the bell is
   the accelerator, the pull is the correctness source. A pane that only dispatches is where this
   stalls, so keep pulling until your own `OUT …` lines are gone, which is also how a `MEMBER …
   failed` or `UNANSWERED …` report reaches you. A round trip costs minutes and several tool calls, not
   instants (estimates off the protocol's own steps: the one live round trip's peer was scripted, and its
   own work — read the contract, poll, ack — took about a second, so the minutes belong to the model turn
   and not to the ledger; shape in
   `PROTOCOL.md`). `sent …` proves publication only: `cos send` closes with `doorbells N of M` — M
   records that call published, N bells it handed to a registered agent (a bare-pane notice is in M,
   not N), so a retry of some older owed record counts in neither — `cos reconcile` with
   `doorbells N, re-sent N` for its whole pass, and `cos poll` prints neither.
5. **Ack.** Run the `RUN` line after the work actually happened, with `<seq>` as plain digits. The ack
   is the only positive proof of consumption: it stops retries, lets your writer recycle the record,
   and until you run it the same `NEW` line keeps coming back.
6. **Reply where it arrived.** `cos send <slug> <from> "<answer>" "<from>-><me>#<seq>"`. Peers talk to
   peers directly; the lead owns no relay.
7. **Close.** `cos close <slug>` stops doorbells, retries and recycling, and every command but `ack`
   and `close` then refuses the slug — a late peer can still prove it consumed something, because an
   ack is evidence rather than work. The ledger stays readable and `close` prints where it sits, so
   copy it somewhere durable if you want it past temp cleanup. There is no export command: a second
   copy would be a second source of truth.

## The seven commands

```
cos new       <slug>                                     claim a fleet, render the contract
cos join      <slug> <right|down> [agent-kind] [role] [--no-worktree]   add a member pane, in its own worktree
cos send      <slug> <to>[,<to>...] <text|-> [re]        publish, then doorbell each
cos poll      <slug>                                     reconcile, print NEW and RUN lines
cos ack       <slug> <from> <seq>                        consumption proof
cos reconcile <slug>                                     recompute states, retry what is due
cos close     <slug>                                     stop ringing, retrying, recycling; poll refuses
```

Positional only, except `join`'s trailing `--no-worktree`. `re` is `<from>-><to>#<seq>`. `-` as the
text reads the body from stdin.

## Member state, recomputed every call

`creating` — `members/<label>.json` exists, the pane lives, herdr does not list its agent yet. `ready`
— the triple resolves, as an agent herdr classifies or as a live bare pane; a *named* agent answering
under a different pane id is the same member and is re-bound, which works only while that name is
unique. `gone` — no such pane, the terminal id changed, the recorded name matches nothing and no
successor holds it, herdr reports `unknown`, or the member file will not parse. `failed` — two
passes in a row with no progress from a member that still resolves: for a `creating` one that is the
agent never appearing, for a `ready` one a record still owed to it past its ack deadline, never a
`ready` member with nothing owed and never a `gone` one (whose absence is already the report), and
only while the fleet is open; its `(<reason>)` tail is whatever the triple said on that pass, so
`the agent is not visible to herdr yet` is the never-appeared case and no tail (or a re-binding note)
is one that resolved and went quiet. The count stops *filing* at `no-progress=2` — a ceiling on
writing, not on reading, so a marker someone made by hand prints higher.
Reported by `cos poll` and `cos reconcile`; nowhere else prints a `MEMBER` line. A pane acts as the one
`ready` label holding its pane id: two claimants resolve to no label at all, so `send` and `ack`
refuse and `reconcile` says so, rather than a pass guessing which file owns the pane. Nothing is
stored for any of it, so a reboot needs no bookkeeping.

## Non-blocking

Never `--wait`, never a blocking read: one waiting dispatch stalls the fleet. Dispatch is one
`agent list` plus N prompts, plus one `pane get` per member that list left unnamed. A bell to a `working` member is submitted anyway — upstream documents a
text-plus-Enter submission, not a queue, so what is guaranteed is the record and the ack, not when the
agent looks up — and `cos` rings it no second time while it works. One to a `blocked` member is
withheld because the approval dialog would swallow it; one to a `creating` or `gone` member is
withheld with the record standing until a human brings that pane back. `failed` is a name on that
count, not a lock: a member that still resolves keeps receiving bells, and one that never did stays
`nothing sent` until its pane is fixed. While your own pane is busy nothing pulls, so poll after long
foreground work.

## herdr surface this skill uses

`agent` (bare, for the installed kind list — the lead runs it, `cos` never does), `agent list`, `agent
prompt`, `agent start`, `pane get`, `pane run`, `pane split`, `pane move` — plus `status` and `pane
read`, which only a human runs (the gate check, clearing an approval). Two things are started here,
each behind its own fixed-argv port and nothing else: `herdr`, and `git` for the worktree a member is
joined into. This program is started by `node`.

## Roles

`roles/` holds five contracts — `manager`, `planner`, `coder`, `supervisor`, `tester` — in one format:
`Identity`, `Mission`, `Responsibilities`, `Boundaries`, `Collaboration`, `Done when`. A member reads
the one whose name is on its `members/<label>.json`; `cos` itself never reads them and enforces
nothing by role (the file spells that out), so the contract binds only as far as the member holds to
it. `manager` is normally the `lead` pane.
