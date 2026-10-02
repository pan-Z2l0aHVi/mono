# Recovery

Every interruption has the same shape: read the ledger, ask herdr what is alive, re-ring the
doorbell for anything with no ack, and hand an ambiguous case to a human instead of
replaying work. `cos poll <slug>` is the entry point — there is no resume command, because
recovery is what a poll does when the fleet has been away.

## Which branch you are in

| what you see | meaning | what to do |
|---|---|---|
| `no ledger at …` | this root has no such fleet: temp cleanup, or a different `$TMPDIR` | stop. If the fleet exists elsewhere, point `HERDR_COS_HOME` at that root and poll again. Never `cos new` the same slug to "get it back" — that would make a second, empty ledger |
| `lives in … but this process resolves …` | two roots, one slug | pick the root that has `members/`; the other is not the fleet |
| `send refused` | `manifest.v` is newer than this program | keep reading and acking; allocate nothing new |
| `is closed` | the `closed` marker is set | start a new slug; the old ledger stays readable, which is the point |
| `already claimed` | `manifest.json` is written, **and** `members/` holds any `*.json` or a `peer-contract.md` already sits there | take a new slug. The one case you may re-run: `manifest.json` exists while `members/` holds no `*.json` at all *and* `peer-contract.md` is absent — your own earlier `cos new` died mid-claim, so this call finishes it instead of burning the name. The test is by suffix, not by label shape: any file named `*.json` under `members/` counts as a member, even one a human made by hand, so a stray `notes.json` there claims the fleet. Either half present is a claim: an empty `peer-contract.md` counts as rendered, and `cos` refuses rather than overwriting it. None of this applies with no `manifest.json` at all — that is the fresh-root case, and `cos new` proceeds |
| `acked … as MISSING` | a doorbell named a number this channel never held | redo nothing. That line is the report, and it prints whether or not the fleet is open. While the fleet is open it also files `{"missing":true}` under `acks/<to>~<from>/missing/`, beside the acks rather than among them, so it consumes no record and cannot block a number a later record claims; a closed fleet files nothing, because nothing there retries |
| `MEMBER <label> creating` | the pane lives, herdr has not listed its agent yet | wait one poll cycle — the second pass that makes no progress reports it as `failed`, which is the same fact with a verdict on it (`PROTOCOL.md` defines a no-progress pass); if it persists, look in that pane yourself — herdr `pane read` shows an approval dialog. `cos` never reads pane output: screen text is not evidence here, and clearing an approval is a human act |
| `MEMBER <label> gone` | no such pane, terminal replaced, or `unknown` | its unacked records turn `dead` and are listed; the pane needs re-adding (`cos join`), not a rewrite. The line still carries the `role=` and `kind=` it was joined with — a member whose `agent start` failed has the role but no `kind=`, which is the half-built case below — so the replacement starts the same way, and a `gone` member is a report rather than a retirement (see Retiring a member) |
| `MEMBER <label> failed … no-progress=2` | two passes in a row with no progress from that member: for a `creating` one, an agent herdr has never listed; for a `ready` one, a record still owed to it past the ack deadline | it is a line printed by `cos poll` and `cos reconcile`, not a file you have to go look for, and not by the other five commands. A `ready` member with nothing owed to it is never `failed`; a `gone` one is never counted. The count stops *filing* at 2 — it is a threshold, not a tally — but that ceiling is on writing, not on reading: a marker made by hand prints its own number. Go at it by hand: `herdr pane read` that pane for an approval dialog. `cos` never starts or restarts an agent for you, and one ack from that member clears the markers |
| `UNANSWERED …` | acked, no reply, and the debtor is gone | report it to a human. Redoing it would replay work another agent already did |
| `NEW … <body MISSING at …>` | the record survived; the artifact it points at did not | report that line and do **not** redo the work on the strength of a missing file. The record's own ack is still what settles it |
| `this pane is not in the roster` | `HERDR_PANE_ID` matches no `ready` member — or matches two, which is refused rather than guessed | run `cos reconcile <slug>` and read the `MEMBER` lines. If two members name one pane id, one `members/<label>.json` is wrong: a human fixes the roster, no pane acks as a label it does not hold |
| `two members resolve to pane …` | the same pane id is claimed by two labels (a recycled id, or a stale member file) | stop and correct `members/` before either pane sends or acks: an ack from the wrong label consumes the other one's messages |
| `WARN … no ack line, because …` | a file was named by hand where `cos` would have issued its own name: either a `channels/` directory whose label no `cos` command can produce, or a record file whose number is outside what `cos ack` reads — below 1, or past the largest integer a Number holds exactly | the record still stands, but no `RUN` line is printed for it, because handing a peer a command `cos ack` would refuse is a dead end. Fix the name — the directory in the first case, the `<seq>.json` in the second; `cos` never renames a published channel or record for you. Three things about how such a record behaves, all measured. `poll` shows only numbers above the reader's cursor, and the cursor is a cache `cos` itself pushes around: the reconcile step — run by `poll` and by `reconcile` alike — clamps it to one below the oldest record still owed an ack, which for a channel whose oldest owed record is 0 is -1, so a reader that holds a cursor there does get shown the zero record, and the two commands keep trading the cursor back and forth while the record stays unconsumable. On a channel **you** sent on, the bell is blind at both bounds: an over-cap record and a zero record are each re-rung once at their deadline. What the recipient then sees is not symmetric *until it holds a cursor on that channel*: with no cursor file yet — the state a bell into a fresh pane arrives in — the over-cap record is printed by its `poll` as `NEW` with this same `WARN`, while the zero record is not printed at all (0 is not above the default 0), so that bell is rung into silence and the record's only sighting is `reconcile`'s `PENDING` line; once the reader holds any cursor there, the clamp pulls it under zero and its `poll` does print `NEW … 0` with this `WARN` |
| `WARN … not rung — "…" is not a label this program issues` | the same hand-made name, caught at the bell instead of at the printed line | nothing was delivered on that channel and nothing was typed into any pane. The record stands; rename the member file or channel directory to a label `cos` issued (`lead`, `m1`, …) and reconcile re-rings |
| `holds characters a doorbell line cannot carry` (or `must be an absolute path`) | `HERDR_COS_HOME` has a space, a quote or a shell metacharacter in it, or is relative | pick a plain absolute path. The root goes inside a line a shell reads, so this is refused at the door rather than escaped |
| `dead (…)` | past the deadline, re-rung once, still no ack | report; the record still exists, so nothing is lost by stopping |

## After an agent crash, in your own pane

`cos poll <slug>` lists what is addressed to you regardless of how you got here: the doorbell
may have been consumed by a process that died mid-turn, and only your ack decides whether it
counts. Re-ring is idempotent for you because a duplicate doorbell names the same `seq`, and
`cos ack` on an already-acked record says `already acked` and changes nothing — as a repeated
phantom bell reprints its `as MISSING` report and files nothing new. No ack attempt is silent.
Expect to see the
same `NEW` line again on the next poll: your read cursor is clamped back to just below the
oldest record you have not acked, so an unacked record stays offered until you ack it. That is
the safe direction — being shown owed work twice costs a duplicate ack attempt, hiding it would
cost the message.

## After a herdr server restart

The ledger is not herdr's, so nothing here needs rebuilding. `cos reconcile <slug>` recomputes
every member from the live agent list, asking `pane get` about anyone that list does not name, and
what it finds depends on what came back:

- The same agent answering under a **new pane id** (a pane move, a re-parented pane) is
  re-bound by its recorded name `cos-<label>-<slug>`: the state says `ready` and names the
  successor pane, with no file edited. A pane id is herdr's to hand out; the name is the
  ledger's handle on the same agent.
- A **bare pane** member has no name to match on, so it is `gone` and needs `cos join` again.
- A restart that dropped every pane and relaunched nothing has no successor to find. `cos`
  never starts agents on its own — a second `agent start` would open a duplicate — so the
  members stay `gone` until a human brings them back. Unacked records are meanwhile listed,
  not lost.

Whatever resolves next gets its bell re-rung, and records keep their sequence numbers: a
number a peer already acked is never handed out again, because the ack directory is part of the
allocation floor — reports of numbers that never existed live under `missing/` and are not — so a
recycled record cannot make the next message look consumed.

## After the ledger root is wiped

Nothing recovers a wiped `channels/`: `cos poll` fails with `no ledger at` rather than
pretending the fleet is empty, which is the difference between "lost" and "silently lost". If
the fleet must outlive temp cleanup, copy `<root>/fleets/<slug>` somewhere durable — `cos close`
prints the path for exactly that, and there is no export command because a second copy of the
ledger would be a second source of truth.

## Half-built topology

`cos join` publishes `members/<label>.json` and, on a failed `agent start`, exits 1 saying
`not retrying agent start` and naming the branch below — the line asks whether herdr stopped at an
approval prompt, tells you to `cos join` a fresh member, and a test pins both that advice and the absence
of a "then run cos reconcile". The member is registered with **no agent binding**, which means
reconcile treats its pane as a bare pane: `ready`, reachable, and every doorbell to it is
written with `pane run` — which a shell *does* execute, and answers with "command not found"
because `cosa` is a marker, not a program. `cos` says so out loud (`… as a notice, not consumed`)
and does not count it as a delivery. Its
records stay unacked and retryable, so nothing is lost while a human sorts it out. Clear the
approval, then `cos join` a fresh member and hand that work to it again. The records already filed
under the old label stay addressed to it — reconcile keeps ringing that pane, and a new member does
not inherit its channels. Do **not** plan on
starting the agent in that pane and having reconcile re-bind it: the member file was written with
`agent: null`, nothing prints a `cos-<label>-<slug>` name for a start that failed, and a null binding
is what reconcile reads forever — the member stays a bare-pane recipient even after a human puts an
agent there, so its bells keep arriving by `pane run` and keep printing `not consumed`. A ledger file
is never rewritten to fix that, which is the cost of the write-once rule and the reason the branch is
a new member rather than a repair.
Never re-run `agent start` blindly: the retry opens a second agent in a second pane.
A join that dies one step earlier — `pane split` or `pane move` refused, before any member was
registered — is tidier: `cos` itself rolls the just-carved worktree and branch back (the checkout is
seconds old and bare, nothing to lose) and prints the stray pane id sitting in your tab, to close by
hand. Fix herdr and re-run the same `cos join`: the label was never claimed, so nothing else moved.

## A member's worktree

`cos` carves each member a worktree at `join` and never looks at it again: no pass reconciles a
tree, so every failure here is silent to the ledger and repaired by hand with plain git.

- **The pane lives but its tree is gone** (a temp sweep took `<root>/worktrees/`, or someone removed
  it): the pane's `--cwd` now dangles. `cos` does not notice, and the member still polls and acks.
  The branch survives in the repo, so re-attach it where the member file says —
  `git worktree add <worktree-from-the-member-file> <branch>` — and the member is whole again. Read
  both paths out of `members/<label>.json`; do not guess.
- **The ledger root is wiped**: the worktrees under `<root>/worktrees/` go with it, but the branches
  stay in the repo. The fleet itself is `no ledger at` (above) and is not recovered; if a branch held
  work worth keeping, `git worktree add` it somewhere of your choosing before the repo is cleaned.
- **A member is re-added** (`cos join` after a `gone`): the new join takes a *new* label, so it
  carves a *new* worktree and branch. The old member's tree and branch are left exactly as they were —
  `cos` removes nothing. Decide by hand whether that branch still matters.
- **A `--no-worktree` member has none**: its file records `worktree: null`, and it worked in the
  lead's tree all along. There is nothing to recover; the risk is the one isolation was meant to
  avoid.

To retire a tree, close or re-home the pane first, then `git worktree remove <path>` (add `--force`
only if it holds uncommitted work you have decided to discard) and `git branch -d <branch>` if the
work is merged. `cos` never runs either.

## Retiring a member

`gone` is a report, not a cleanup. The member file stays, so that member is printed `gone` on every
pass and keeps counting toward the recommended six — the count runs over `members/*.json`, and a file
for a dead pane is still a file. To actually retire one, **close its pane first, then delete
`members/<label>.json`**.

The order is load-bearing. `nextLabel` (`cos.mjs:125`) numbers a new member as one past the highest
number still on disk, so deleting the highest-numbered file frees its number for reuse: delete that one —
say `m3.json`, with `m1` and `m2` still on disk and `m3`'s agent still alive — and the next `cos join`
claims `m3` again and tries to start the same name `cos-<label>-<slug>`, which herdr refuses because names
must be unique among live agents — the join then exits 1 with `agent start returned herdr …`, the branch
above. Close the pane first and the name is already free when the number comes around. Deleting a
lower-numbered file frees nothing, since `nextLabel` takes the maximum, but then that label is simply
missing from the roster and the numbering has a hole — `cos` does not care, and `m4` never becomes `m3`.

Retiring the member does not retire its mail. Records already filed in `channels/<from>-><label>/` stay
in the ledger, addressed to a label rather than to a pane. If that number is reused, the new member claims
the label and inherits them — the ladder resolves a label to whatever pane holds it now, so it re-rings
and consumes mail the retired member never read. If the number is never reused, nothing re-rings them and
nothing consumes them: they sit owed to a label no pane speaks for, and their numbers are never re-issued.
Either way, ack what was really done before you retire; `cos` collects nothing, and a retired label is not a
reason to edit the ledger. Deleting the member file retires nothing about its tree either — the worktree and
branch it was joined into outlive the file; clean those up by hand as in `## A member's worktree`.
