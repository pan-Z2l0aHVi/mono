# Protocol

The rules `scripts/cos.mjs` implements and the semantics its output lines carry. Edit the
program to these; when a rule here changes, `tests/cos.test.mjs` changes in the same commit.
`herdr-cos` keeps `herdr-centralization`'s shape but not its line cap: the worktree isolation and the
role contracts broaden `cos.mjs`, so the hard cap is its own — **800 lines**, up from the ancestor's 600.
Cutting a rule to hit a prose budget would leave an implementer free to break it, so the cap is a
budget for the program, and `cos.mjs` sits well under it. Only `cos.mjs` has a hard cap; the three
prose files are sized by what they must say.

## Layout

```
<root>/fleets/<slug>/
  manifest.json                {slug, v, root, repo} — written once, never modified; `repo` is the
                               git toplevel `cos new` resolved, or null outside a repo
  members/<label>.json         {label, pane_id, terminal_id, agent, role, kind, worktree, branch} —
                               written once, per member; the last four are what its `join` recorded
                               (see Member state and Worktrees)
  channels/<from>-><to>/<seq>.json   one record; the channel has exactly one writer
  artifacts/<from>-><to>#<seq>.md    bodies over 1500 bytes
  acks/<to>~<from>/<seq>.json        empty = consumed; {"re":…} = a reply was acked and is
                                     durably remembered
  acks/<to>~<from>/missing/<seq>.json  a report: a doorbell named a number this channel never
                                     held. Outside the ack namespace, on purpose (see Publishing)
  cursors/<to>~<from>.r        {c} — how far this pane has read, per inbound channel
  cursors/<from>~<to>.s        {q,b,t,r} — sender slot: head record, baseline, delivery time, retries
  failures/<label>/<n>         {label, n, acks} — no-progress marker, watermark in `acks`
  closed                       cos close's marker
  peer-contract.md             rendered by cos new; absolute paths in it, never rewritten
<root>/worktrees/<slug>/<label>/    each member's git worktree, on branch cos/<slug>/<label> — the
                                isolation unit; outside fleets/ on purpose, so the branch a member
                                checks out never sits inside the ledger (see Worktrees)
```

`root` is resolved once by `cos new` and then read back from `manifest.json`: `$TMPDIR` is a
per-process variable, so a peer that re-resolves it can land on a different root and be
greeted by an empty fleet. `openFleet` compares `manifest.root` against what this process
resolves and stops on a mismatch rather than starting a second ledger. `members/` *is* the
roster — no file lists members, because a list would be a second copy to keep in sync.
Write-once means write-once-by-content: a name is never edited after it exists, and deleting
a superseded entry is a different act (see Publishing). `cos new` may finish a claim that a
previous call interrupted — that is publishing names that do not exist yet, not rewriting.
Every command line this program prints or renders carries `HERDR_COS_HOME=<root>` so the
copied line re-resolves to the recorded root instead of guessing.

## Worktrees

`cos join` isolates each member in its own git worktree, so two members never write one working
tree. It resolves the repo with `git rev-parse --show-toplevel` from the lead's cwd, then runs
`git worktree add -b cos/<slug>/<label> <root>/worktrees/<slug>/<label> HEAD`, and opens the member's
pane with `--cwd` set to that path. The worktree lives under the ledger root, not inside the repo,
so the branch a member checks out never lands inside the ledger and the ledger is untouched by any
branch. The member file records both `worktree` and `branch`, write-once with the rest of its
identity, so recovery can name the tree again.

Two cases fall back to the lead's own working tree, and neither is an error: `cos join … --no-worktree`
skips git entirely, and a lead whose cwd is not inside a repo gets a `note:` and shares its tree. In
both the member file records `worktree: null`. A `git worktree add` that *fails* is different — the
join stops before any pane is split and says so, because a half-joined member with no tree is worse
than no member. A failure one step later is rolled back instead: if `pane split` or `pane move` is
refused after the carve, the seconds-old bare checkout is removed and its branch deleted — the only
`git worktree remove` and `git branch -d` `cos` ever runs; a *member's* tree is still removed only by
a human — and the stray split pane is named for a human to close, because closing panes is not one of
this program's two ports. There is otherwise no automatic cleanup: a member's worktree is removed by
`git worktree remove` when a human decides the branch is spent, and `cos` never runs it.

## Publishing

Write the bytes to a same-directory temp file `<name>.<pid>.<rand>.tmp`, then `link(2)` it
to the final name. `link` fails with `EEXIST` instead of replacing, so a collision is a
signal, and a numbered publisher re-scans for `max+1` and retries. Two rules follow from
that:

- A published name never changes content. Entries are deleted wholesale once superseded
  (`recycle`), which is not overwriting: the ack that justified the deletion still exists.
- Temp and target share a directory, always. Copying to another filesystem would be the
  non-atomic fallback that this design refuses to have.
- A number is never re-handed out. The next sequence is `max(records, acks)+1`, not
  `max(records)+1`, because recycling deletes the record and leaves the ack: without the ack
  as a floor, the next message would arrive under a number the peer already consumed and
  would be deleted as superseded before anyone read it. That is also why a `missing` report is
  filed under `acks/<chan>/missing/` rather than beside the acks: an ack file's *name* is
  floor material, so a report that names a number must never be able to read as consumption
  of the record that later claims it — nor, on the other hand, ratchet every later message up
  on a typo's word. `<seq>` in `cos ack` is validated as plain digits for the same reason:
  `1e308` and `2**53+2` round-trip through JSON as integers and would wedge that floor.
- A record's `link` is the commit point for its own body. The artifact is written inside the
  allocator, immediately before the record is released, so a kill between the two strands an
  orphan body in `artifacts/` rather than publishing a record whose `file` points at nothing.
  A body whose name is taken means a sibling sender already holds that number, so the
  allocator goes round again instead of failing the send — and a candidate is never
  reconsidered, so the stranded body is not argued over twice.
- A channel temp older than the ack deadline is unlinked by that channel's writer, so a kill
  between staging and `link` does not litter the channel forever. Anything newer is left
  alone, so a slow publish is never raced. No other directory is swept: those temps are
  harmless, and sweeping them would mean deleting a file another process may be linking.

`cursors/` is the one exception, and it is deliberate: a cursor is a reading position, not
evidence. Deleting it must not lose a record, must not consume anything twice, must not
reuse a sequence number — it may cost at most one extra doorbell, which the ack check
absorbs. If deleting `cursors/` ever changes anything else, that is a bug: the exemption
only holds while the caches really are caches. One consequence of it is intended, not a
leak: a reader's `.r` is clamped back to just below the *oldest record still owed an ack* —
not to the highest acked one, which would let a later ack hide an earlier record nobody
consumed. So an unacked record it was already shown is re-printed as `NEW` on every poll
until it acks. Showing owed work again is the safe direction; hiding it is not.

## Records

`{v, fleet, seq, from, to, type, re, text, file}`. `type` is `send` or `reply` — an ack is
never a record, only a file under `acks/`, so consumption has one home. `re` is
`<from>-><to>#<seq>`, channel-qualified because sequence numbers are only unique per
channel. `text` is empty when `file` is set: bodies over 1500 bytes live in `artifacts/` and
the doorbell carries no body at all. A record's identity is `(fleet, channel, seq)`, so no
clock, boot id, or random token is needed to deduplicate one.

An ack is a file, never a record, and its body carries either nothing (this seq was consumed)
or `{"re":…}` — the `re` of the reply being acked, copied out of that record. The copy exists
because `acks/` outlives `channels/`: after the writer recycles the answer, the ack is all that
still proves it was ever given, and without it `unanswered` would keep reporting an answer that
was already delivered. A third thing `cos ack` can write is not an ack at all: when the doorbell
named a number the channel never held, it files `{"missing":true}` under `missing/` beside the
acks and says so, on an open fleet. Nothing is redone, nothing is consumed, and the number stays
free; a repeated phantom bell prints the same lines again rather than going silent.
Polling a record whose `file` has vanished prints `<body MISSING at …>` and says not to redo
the work on the strength of an absent file: the record is evidence, the body is not.

## Doorbell

`herdr agent prompt <pane_id> "cosa <abs>/fleets/<slug>/peer-contract.md <label> <seq>"`, or
`herdr pane run <pane_id> …` for a member pane whose agent never got registered. `cosa` is a
marker, not a command: `agent prompt` types the line into an agent's composer, so a
recognised agent reads it and acts; `pane run` hands a shell the whole line, and a shell finds
no command named `cosa` — the program says so out loud and counts it as a notice, not a delivery.
Slugs match `[a-z0-9][a-z0-9_-]{0,39}` and labels `[a-z][a-z0-9_-]{0,31}`. That is not only so
the line survives quoting and space-splitting: since the line is handed to a shell, a name that
fails these patterns is refused *at the bell*, before any token of a directory name reaches it.
A member file or channel made by hand therefore rings nothing — it gets `not rung`, and the
record stands. The root is held to `[A-Za-z0-9._:/-]+` and must be
absolute and not `/`: it is embedded in a line a shell will read, so a space, a quote, a `$`,
a backtick or a `;` in `HERDR_COS_HOME` is refused at `cos new` rather than typed onward. A registered agent is named `cos-<label>-<slug>` truncated to 32 characters, label
first so two members cannot truncate onto the same name; that name is the member's identity
across a pane-id change (see Member and observation state). It is an accelerator: it names
the contract, which tells the recipient what to pull. Delivery is proven by nothing except
the ack.

## Message states

| state | test | action |
|---|---|---|
| `acked` | `acks/<to>~<from>/<seq>.json` exists | terminal; writer recycles the record and its artifact |
| `unanswered` | acked, no `reply` record in the reverse channel carrying that `re`, no ack of such a reply holding its copy, and the acking pane is no longer `ready` | report to a human; never auto-redo — that would replay someone else's side effects. The record is held, not recycled, while the answer is owed: deleting it would delete the only evidence of the debt. |
| `queued` | recipient observed `working` | nothing; a `working` pane must not be poked again |
| `blocked` | recipient observed `blocked` | hand the approval dialog to a human; the record already stands |
| `pending` | within the deadline, or not the channel head, or you are the reader | nothing |
| `unproven` | past 240s (a pre-measurement estimate, see `cos.mjs` constants), no ack, and `state_change_seq` unmoved since the baseline | re-ring the **same** `seq` once, re-baseline, restart the deadline |
| `dead` | the triple no longer resolves, or a re-ring still drew no ack | report; no further retry, no file written *about that message*. Whether the pass files `failures/<label>/<n>` is decided by the member, on a fleet that is still open: a `gone` member is never counted (its report is the whole story), while one that still resolves is counted as soon as it is `creating` or has a record addressed to it at `unproven` or `dead`. A closed fleet files none at all. That marker counts members, never records |

`unanswered` is a fleet-wide scan, not a query about your own channels: any `cos reconcile` reports
every owed answer it finds, including other members' debts, because the output is a report to a
human and triggers no action. A peer that discharged your question by answering a *third* member —
the peer-to-peer relay this protocol allows — leaves your reverse channel with no reply, so once
that pane is gone you get the report even though the work was done. It is a report, not a redo:
check the other channel before anyone repeats the task.

`state_change_seq` is a negative-only *proof*: unmoved proves nothing ran in that pane, and nothing it
shows ever counts as delivery. Its opposite is read, though — a moved counter is taken to prove only
that *something* ran, which is enough to re-baseline and hold the record `pending` rather than escalate
it, a use that can delay a judgement but never fake a consumption. It cannot prove delivery — upstream documents no such field, and a counter
that any activity in a pane advances cannot separate "my prompt ran" from "it did something
else". The baseline lives in the sender's `cursors/<from>~<to>.s`, under the same exemption as
the cursor, so losing the cache may buy one extra idempotent re-ring and nothing more. A moved
counter restarts the deadline, and either reading of the field is survivable there: if it moves
only for prompts, what moved was the delivery; if it moves for unrelated activity too, a busy
peer's record stays `pending` instead of escalating to `dead` — the safe direction, since the
ack still ends it and `unanswered` catches the case where the debtor vanished.
A member pane with no registered agent has no counter at all, so there the deadline alone is
the trigger and the ack check absorbs the extra ring.

A round trip is not instant and nothing here claims it is. The expected shape of one
lead→idle-peer→answer exchange is about 4–8 tool calls across 2 model turns — two to eight
minutes by eye: the bell has to be typed, the peer's model has to take a turn to read the
contract and run its ack line, and the answer then waits on your next pull at the 30s cadence.
Those are estimates read off the protocol's own step count. One live fleet has now run (2026-09-30, a
named session on herdr 0.9.1, private protocol 22): its peer was scripted rather than a model, and the
scripted half — read the rendered contract, `poll`, run the ack line the contract printed — took about a
second end to end. That is a floor for the transport and the ledger, not a median for a round trip, so the
minutes above stay an estimate of the model's turn and `240s` stays a pre-measurement value. What has machine backing is
narrower than the three numbers suggest: the dispatch cost (one `agent list` plus N prompts once every
member is already resolved, plus one `pane get` for each member that list left unnamed — the bell batch
is not the whole command, because `cos send` opens with the reconcile pass. Only the batch is asserted,
by the test titled `dispatch costs one agent list plus N doorbells and no wait flag` — which pins that
path's *whole* post-`agent list` sequence to N `agent prompt` calls, so on it the `pane get` count is
zero and a test says so; what no test bounds is how many `pane get` a reconcile pass makes when members
are unnamed or moved), the `1500`-byte threshold (the code branches on it, a test
checks both sides), and the `240s` *rule* — reached by feeding `cos` an injected clock 300s ahead,
so the deadline logic is proven while the value itself stays an unmeasured guess. The `30s`
cadence is enforced by nothing: `cos poll` prints it as advice and no code path reads a clock to
check it, and no test times it either — `cos` cannot enforce a caller's interval, and the harness that
would observe one has not run. So the plan's row asking for a scripted assertion on the pull interval
is **not met** and stays unmet rather than being renamed. `cos` enforces no latency claim of any kind.

## Member and observation state

Member state (`creating`, `ready`, `failed`, `gone`) is recomputed per call from
`members/*.json` plus `herdr agent list`, cross-checked with `herdr pane get` — the agent
list omits a pane stuck at `agent_not_ready` and a pane that was moved may carry a new id,
so neither source alone is enough. It is never stored. The only trace is the no-progress
counter behind `failed`, and it is bounded. A pass is *unproductive* for a member that still
resolves in one of two ways: it is `creating` (so there is no agent that could have run anything),
or a record addressed to it sits at `unproven` or `dead` (so a `ready` one has work owed past its
deadline). Any other pass clears the counter, which is why a `ready` member with nothing owed to it
is never `failed` — and one new ack filed under `acks/<label>~*` since the last marker clears it too.
Two unproductive passes in a row is what makes `failed`, and the count then stops filing — a member
that never comes back would otherwise add one file per pass for a fact already told, so `2` is the
highest number `cos` files. That is a ceiling on writing, not on reading: the count is the highest
marker name in `failures/<label>/`, so a `failures/<label>/7` made by hand prints `no-progress=7`. It
stops printing on either of the two branches that clear an ordinary count — the first productive pass,
or the first ack that member files past the marker's watermark, which can happen while it is still
stuck — and the directory goes with one `rmSync` on either, never edited, only removed whole. A
hand-made marker must also parse as JSON, because the newest marker's `acks` watermark is read out of
it (`cos.mjs:203`); an empty file is a `cos <name>: unexpected SyntaxError: …` line and exit 1, not a
count. On a fleet that is still open that stops six subcommands rather than one — every command but
`new` opens with this pass — and `close` is among the six, so that fleet cannot be closed until a human
edits the file: `cos` never repairs a marker, and either hand repair works — delete it, or make it parse,
since the one field read out of it is the `acks` watermark and an absent field counts as `0`. A closed
fleet reads no markers (`:361`), so the same file stops nothing there and a late `ack` still lands. What
neither case changes is the marker itself: no pass rewrites or removes a file it cannot read, because the
`rmSync` above sits behind that read. A
`gone` member's are skipped by that same guard, so an unreadable one filed under an absent pane stays
silent. And `cos ack` is not its own pass: its body never touches `failures/`, while the reconcile pass
that opened the call does (`cos.mjs:361,657`), so an ack a member files is what makes the *next* pass
clear that member's count.
A `gone` member files nothing, because its absence is already the report and herdr will keep
saying so; a closed fleet files nothing either. `failed` is that count and nothing else, so it
reaches a member whose agent herdr never listed as well as one that resolved and then went quiet;
the `(<reason>)` on the line is whatever the resolution said on that pass — `the agent is not visible
to herdr yet` for the never-listed one, nothing at all (or a `re-bound from pane …` note) for the one
that went quiet — and `cos` never restarts an agent on the
strength of either. When the declared pane id is gone but a *named*
agent answers to the recorded name in another pane, that is the same member: herdr owns pane ids, the ledger owns names, so the
state is re-bound to the successor without editing the ledger. Two limits on that, stated
plainly: it works only for members with a registered agent, and only while the name is
unique — a bare pane that vanished is `gone`, and a name herdr reused for a different pane
would re-bind wrongly.

One deviation from the plan, recorded because it moves who is on the hook. The plan made "the
member's pane has `node`" a precondition of taking a member, and a refusal when it fails — without
naming which subcommand would check. `cos` neither performs nor can perform it: checking a member's
pane means running a command *in that pane*, which only herdr can do, and the program's two ports are
`herdrExec` and `gitExec` — the second runs git locally with a fixed argv, so neither is a general
shell and the claim read off "two fixed-argv ports and no third" stays true. So the check belongs to
the lead, and `SKILL.md`'s gate
says so; what compensates inside the ledger is the ack ladder, and it compensates only partially. A
member whose agent cannot run `node`, in a pane where nothing else runs either, never acks: its record
goes `unproven`, is re-rung once, then `dead`, and the report names the channel and sequence that are
owed (`cos.mjs:340`) — a slow, loud failure rather than a quiet one. But an agent that takes the bell
and fails *visibly* moves `state_change_seq`, and each pass that catches the counter at a new value
re-baselines the stall clock (`:233-236`), so a row whose pane keeps producing stays `pending` and is
never reported `dead`. One visible failure followed by silence is not that: the re-baseline is spent,
the next pass past the deadline reaches `:237`, and the row walks `unproven` → one re-ring → `dead`
like any other. What the lead keeps either way is the owed row in its own `OUT` batch, not a verdict. The plan's refusal was the cheap-sounding version of the same
information; this is the version that keeps the two fixed-argv ports and says which half of the check is not covered.

A pane addresses itself as exactly one `ready` member, matched on `HERDR_PANE_ID`. Two
members resolving to one pane id — a recycled id, or a wrong `members/*.json` — means neither
of them is that pane: `send` and `ack` then refuse with "this pane is not in the roster" and
reconcile warns, because answering as the wrong label would let one pane burn another one's
messages with its acks. Ambiguity is refused, never broken by picking the first match.

Observation state (`idle`, `working`, `blocked`, `done`, `unknown`) belongs to herdr and is
read, never written; `unknown` is treated as `gone`, because an unclassifiable pane is not
safe to count as a consumer. The two tables are orthogonal and never merge: `working` says
nothing about whether the triple resolves, `failed` says nothing about what that pane is
doing, and no member state is derived from an observation alone.

The stall clock has exactly one owner per channel: the sender, and only for the head record.
A pane that is neither endpoint reads the ladder but never writes the slot, and a newer send
cannot take the slot from an older unacked one — that would hand the stalled record a fresh
deadline and let it be belled twice.

Each member file also carries the `role` and `kind` its `join` was given — write-once like the rest
of the identity, and riding along on every state a member can be reported in, `gone` included, whose
line still names the identity and the CLI a replacement should be started with. One gap: a `join`
whose `agent start` failed records the role and leaves the kind null, because no CLI was ever bound,
so that line shows no `kind=` and names nothing to start it with — the half-built branch, not a
recovery hint. `cos` reads either field back
only to print it: there is no role-to-channel table and no permission anywhere, so a role is a name
for humans rather than a capability, and a member holding one is not thereby restricted to it. The
same file carries `worktree` and `branch` (see Worktrees) — write-once too, but these are *not* on the
`MEMBER` line: they are printed once at `join` and read back only by a human or a recovery, because no
pass reconciles a tree and a member's worktree is only ever removed by hand.

## Output lines

The lines a peer must act on are token-prefixed; the headers and tallies around them are for a
human. `cos send` prints one `sent <from>-><to>#<seq>` per target, with ` (body in artifacts/)`
appended when the body went to a file. That line proves the record was published, not that a bell
rang. **Five** `WARN` wordings mean "no bell was handed to a registered agent": `not rung` (the name
is not a label this program issues), `nothing sent` (the member is not `ready`), `doorbell withheld`
(it sits at an approval dialog), `doorbell failed (herdr …)` (the call itself failed), and `… as a
notice, not consumed` — the fifth of these, the only one where the line *did* reach the pane: a shell
ran it looking for a command named `cosa` and found none, so nothing was consumed even though the text
is on screen. `cos send` prints its whole batch of `sent` lines first and then one `WARN` block, so a
warning *follows* its `sent` rather than sitting beside it, and that block carries the warnings of the
reconcile pass which opened the call as well as this call's own. Only three of the five wordings can
come from a retry at all, and a retry runs in the pass that opens every command but `new` — `poll` and
`reconcile` included, where there is no `sent` line to follow: `not rung` (the doorbell carries a label
outside the pattern given under Doorbell above — the label patterns defined at `cos.mjs:24` refuse a name that does not begin with a
lowercase letter, or runs past 32 characters, as firmly as one carrying a stray character — which only a hand-made `members/<label>.json` can produce — and one such file is
enough, because a pane matching it speaks as that label, so `cos send` publishes the channel itself and
then refuses to bell its own rows: `cos send` checks the *target* against the roster it issues
(`cos.mjs:543`), while the check that fires here rejects a bad label on either end of the row, `from`
or `to` (`:309`)), `doorbell failed`, and
the bare-pane notice. `nothing sent` and `doorbell withheld` cannot, because the ladder never calls a
row retryable while its recipient is unready or sits at an approval dialog — those read `dead` and
`blocked` instead (`cos.mjs:221-222`) and only `unproven` is re-rung. `cos send` closes with its own count — `doorbells N of M`, M
records this call published and N bells **this call** handed to a registered agent (a bare-pane
notice is in `M`, not in `N`) — so a withheld delivery is stated by the program rather than inferred
from a missing line. The N is deliberately narrower than the whole command's ringing: `send` opens
with a reconcile pass, and a pass can re-ring some *other*, older owed record. Those retries appear as
their own `WARN … unproven — re-sent the doorbell once` and are counted by `cos reconcile`'s
`doorbells N` (every bell that pass handed to a registered agent, which for `reconcile` can only be
retries) with `re-sent N` the retries among it — a retry that landed on
a bare pane counts as re-sent but not as a bell. `cos poll` prints neither tally; it prints
`NEW <from> <seq> <type> <preview>` for work owed to you,
each followed by a `RUN …` line that *is* the ack command — copy it verbatim — except on a channel
whose name *or* record number `cos ack` would refuse, where a `WARN` takes that line's place and the
`NEW` above it still prints, because hiding a record is worse than a peer finding it cannot be acked. Then `OUT
<channel>#<seq> <state>` for your own unacked sends, then an unprefixed tally, then — only if that
`OUT` batch was non-empty — `pull again in 30s; ack deadline 240s`, which is where the program itself
speaks those two written estimates: the only *printed* line carrying them, and only while something is
actually owed. The rendered contract carries them too — the deadline once and the cadence twice, in
its own words (`cos.mjs:399,446`).
`cos reconcile` opens with `fleet <slug> at <root>/fleets/<slug>` and prints `self: <label>` second,
naming whose ladder it evaluated — or that this pane is not in the roster. That header only ever
prints for a fleet that is still open: on a closed one the refusal at `is closed` (below) is the whole
output, printed before the command body runs. Past the recommended member
count `cos join` adds one `note: <n> members, over the recommended 6 counting the lead` line, and the
four passes that report the fleet — `poll`, `send`, `ack`, `reconcile` — repeat the same fact as a
`WARN <n> members exceeds the recommended 6`, and in `ack`'s case not on every exit: the `as MISSING`
line and the `already acked: <label> consumed …` line return before the warning block
(`cos.mjs:597,607`, against that block at `:617`), while the *other* `already acked` wording — the
`already acked: <channel>#<seq>` of a race that lost after the record was read — is printed at `:615`
and falls straight through to `:617`, so it does repeat the warning; `join` prints no such warning and `close` prints neither
wording. Nothing refuses either. `cos ack` prints
`acked: <label> consumed <channel>#<seq>` when it files an ack; for a number it already holds,
`already acked: <label> consumed <channel>#<seq>` if the ack file was there before it read the
record, or `already acked: <channel>#<seq>` if the record turned out to be published but consumed.
A phantom doorbell earns two lines: `acked <channel>#<seq> as MISSING: …` then `nothing was
redone …`. `cos reconcile` prints no `NEW`, `RUN` or
`OUT` (it does not consume a read position) but does print `PENDING <channel>#<seq> <state>`, with
` (<detail>)` appended whenever there is a reason to give, from anyone. Both print `MEMBER <label> <state>
[role=…] [kind=…] [observed=…] [no-progress=<n>] [(<reason>)]`, `UNANSWERED <ref> owed by <label>` and `WARN
<message>`. A `<body MISSING at …>` preview is a statement about the ledger rather than an
instruction to work: report that line, redo nothing.

One printed line is exactly one line: every C0 control character and DEL is replaced with a space at
the single `out` sink, which `die`, a thrown error and every tally also pass through. A channel
directory is a POSIX name and a POSIX name may contain a newline, so without
that, a hand-made directory could forge a printed line — including a `RUN …` a peer would copy and
run, filing consumption proof for a record it never read. The class is C0 plus DEL and nothing wider:
`U+2028` and `U+0085` are **not** replaced, so a reader that split a line on Unicode breaks would see
two. Independently of that, a `RUN` line is emitted only for a `from` matching
`[a-z][a-z0-9_-]{0,31}` **and** a `seq` of at least 1 and no larger than the biggest integer a Number
holds exactly — the label test is the one `cos ack` makes, and the two bounds are that subcommand's floor
and cap seen from the number side rather than from the digits string it tests, so the two agree on every
name that reaches here — a name whose number does not round-trip contributes no new number: either it
resolves to a path that is not there and is skipped, or it resolves to a plain file beside it, whose
record is then read twice. A
name that could be read as two lines therefore never becomes a runnable line at all.

## Errors

`cos` exits 0 on success, 1 on a refused or failed operation (`cos <cmd>: <message>` on
stdout), 2 on a usage error — the seven-name `usage: cos <new|join|…>` line when the
subcommand itself is missing or unknown, `cos <cmd>: <what>` when it is the slug that is
absent or malformed. A crash that is not a refusal still prints one line —
`cos <command>: unexpected <code>: <message>`, the command name filled in by the catch wrapped around
the dispatch (a refusal printed from that same catch carries no `unexpected`; the only lines formatted
outside it are the three usage lines printed before a dispatch is attempted — unknown subcommand,
missing slug, malformed slug) — because a stack trace in a pane
is noise a peer cannot act on. Herdr failures reach the line as `herdr reported <code>` — `spawn_failed`,
`cli_usage_error`, `exit_<n>`, or whatever code the JSON envelope carried. Refusals that must
be read as protocol statements: `already claimed` (the guard runs only when `manifest.json` is already
written, and then fires if the slug has any `*.json` under `members/`, or a contract already; a claim
interrupted before either exists is *finished* by the next `cos new`, so a herdr hiccup does not burn the
name — and a directory with no manifest is not a claim at all, which is the fresh-root case `cos new`
exists for), `no ledger at` (this root has no such fleet — recovery
never invents one), `lives in … but this process resolves` (two roots), `send refused`
(newer `v`: reading and acking old records stays safe, allocating sequence numbers does
not), `is closed` (nothing is sent or reconciled any more; `ack` and `close` are the two
subcommands still accepted, since an ack is evidence rather than work), `must be an absolute
path` / `holds characters a doorbell line cannot carry` (the root), `ack needs: <from> <seq>`
(a sequence number that is not plain digits cannot be recorded without poisoning the
allocation floor), `published but unreadable` (an ack is refused for a record that will not
parse: consuming what cannot be read would let it be deleted).

## Invariants to keep when editing cos.mjs

1. `linkSync` is the only means of publishing a final name; no `writeFileSync`/`renameSync`
   onto an existing published path. Only `cursors/` is written in place, and only by the
   label named in the cursor's own filename.
2. Exactly two processes start, each behind one port and no other: herdr through `herdrExec(argv)`,
   and `git` through `gitExec(argv, cwd)`, the latter used only to carve a member's worktree — and to
   roll that carve back when a join dies before any member is registered. Both
   ports take a fixed argv array and never a shell string, so neither can run what a name carries.
   Tests replace both. (`node` appears in the contract's rendered lines because the peer's shell runs
   them, not because anything here spawns it.)
3. Sequence numbers and labels are claimed by failed `link()` retries, never by a clock, and
   never re-handed out — the ack directory is part of the allocation floor.
4. `acks/` and `manifest.json` are never recycled. A doorbell pointing at a record that is not
   there is reported, filed under `missing/` on an open fleet, never written as an ack and never
   redone — absence is not evidence of consumption in either direction.
5. A record's `link` is the last thing that happens to it: the artifact is staged and released
   before the record is committed, so no published record can name a body that was never
   written. An orphan body is the accepted failure; an orphan record is not.
6. A pane may act only as the one `ready` label whose pane id it holds. Two claimants is an
   error, not a tie to break.
7. Only the channel's own writer recycles it, only that writer sweeps its temp files, and a
   record still owed an answer is held.
8. A published file that will not parse is reported and skipped: never deleted, never
   counted as consumed, never silently treated as an empty channel — and an ack of it is
   refused.
9. Every subcommand but `new` opens the ledger and reconciles before it acts. A closed fleet
   still reconciles for reading, and a peer's `ack` is still accepted there — evidence, not
   work — but the fleet itself produces none: no doorbell, no retry, no recycled record, no
   `failures/` marker, and a phantom doorbell there is printed but not filed, since nothing there
   retries and a filing with no reader would be a write for its own sake. Cursor writes (the clamp,
   the `.r` an ack advances, and the sender's `.s` slot the ladder fills while reading) and the
   stale-temp sweep do still happen: one touches only caches, the other only unlinks a file nothing
   published.
10. A doorbell carries the contract's absolute path, the recipient's label and the sequence number, and
   nothing else — no sender, no channel, no body. The path is the one unavoidable token: a peer with no
   way to find the ledger cannot read the rules it is being asked to follow. What the invariant protects
   is everything *past* that pointer: the root, the slug, who sent it, its own label come from the ledger
   and `HERDR_PANE_ID`, never from the line a shell typed.
11. Every line `cos` prints for someone to run is a line `cos` would accept: the root and slug are
   charset-checked, the label in an ack line is checked before that line is printed, and this
   program's own path is the one token quoted. A peer must never be handed a command its own
   program rejects. The same charset guard runs a second time, earlier: at the bell itself, before
   the line is built, because `pane run` hands a shell the whole line and a shell executes it. A
   ledger file *named* by hand, outside the name patterns `cos` issues names from (character set *and*
   first character *and* length), therefore rings nothing
   and prints `not rung`; its record stands, and someone renames the file. Neither sink may be
   trusted to cover the other.
   A *numbered* hand-made name has its own wall, and it is worth spelling out because two of its four
   shapes look safe. A record is read back by the name its number prints as, so `007.json` and a
   30-digit name resolve to a path that is not there: the pass says `published but unreadable: skipped,
   not deleted, and nothing was acked for it` and prints no ack line for either. Note the fold that comes
   with that — a plain `7.json` beside the `007.json` is read *twice*, because both names resolve to it
   and the hand-made file's own body is never opened. The two shapes that *do* round-trip are the
   interesting ones: `0.json` names a number `cos` never issues (its own allocation starts at 1) and
   `9007199254740992.json` (= 2^53) is past the largest integer a Number holds exactly, and `cos ack`
   refuses both — the first on its digits pattern, the second on its cap. So the printing path tests what
   that subcommand tests, and either record becomes a `WARN … no ack line` instead of an instruction no
   reader can run. Say plainly that the floor was a hole: the cap was already there and the floor was not.
   Say equally plainly that two earlier accounts of it were wrong. The first claimed a lone `0.json`
   printed a runnable `RUN` line; it does not print one of its own accord, because `cos poll` reports only
   inbound records *above* its own read cursor (the record does show in `reconcile` as `PENDING
   m1->lead#0 pending`, which names nothing to run, and `cos ack` refuses to clear it, so it sits in every
   later report). The second claimed a hand-edited cursor was the only input that surfaces it, and that
   is refuted too: the clamp that backs a read position up to one below the oldest record still owed an
   ack is this program's own, and one below a record numbered 0 is **-1** — so a reader that already holds
   a cursor for that channel, which any poll of it that found a readable record gives it, is pushed under
   zero by the next pass (`poll`
   runs the same clamp `reconcile` does), with no hand-edited file anywhere. Measured on that sequence:
   `poll` prints `NEW m1 0` and the floor's `WARN`, then advances the cursor to the highest number it
   reported; the next pass clamps it to -1 again; and the two take turns for as long as the record is
   unacked, which is forever, because `cos
   ack` refuses seq 0. A hand-edited `cursors/` file — that directory is the ledger's single in-place one
   — reaches the same state, but it is not needed. The floor is therefore not decoration: it is what
   stands between a cursor one function away and a line a peer copies and cannot run.
   Two tests carry this, and the split is the point. The inbound one writes the four names into a channel
   whose reader already holds a cursor, so the clamp supplies the reach; it pins a `published but
   unreadable` warning *present* (not that each skipped name warns once), the cap's `WARN` and the floor's
   `WARN` each printing with its own reason, and — the sharp form of "no ack line the reader cannot run" —
   that every `RUN` line in that output names the one ordinary record and nothing else, while `cos ack` on
   the zero exits 1. Its two no-bell assertions are the weak ones: a reader's own channel rings nothing
   whatever the number. The outbound test is the one that measures the bell, and the bell is
   **number-blind at both bounds**: with `lead->m1/0.json` and `lead->m1/9007199254740992.json` each aged
   past the deadline, each is re-rung once, and the text handed to the pane ends `… m1 0` and `… m1
   9007199254740992`. What the recipient's own `poll` then shows differs by bound *until the recipient
   holds a cursor on that channel*, and a bell into a fresh pane arrives before any such cursor exists:
   the over-cap record is printed as `NEW` with the `WARN` in place of an ack line, while the zero record
   produces **no line at all** — `unreadInbound` wants numbers strictly above a cursor that, with no file
   yet written, defaults to 0 — so that bell is rung into silence and the record's only sighting is
   `reconcile`'s `PENDING` line, which names no command. The silence belongs to the missing cursor, not to
   the number: once a reader holds any cursor there, the clamp pulls it to -1 and its own `poll` prints
   `NEW lead 0` with the floor's `WARN` like any other record — which is why the inbound test above, whose
   reader has a cursor, does see it. Either way the record stands, unacked. The rule
   governs what this program *invites someone to run*, not what it rings.
12. One printed line is exactly one line: control characters are replaced at the single output
   sink, so no file or directory name can forge a line.
13. A herdr call is judged by its **exit status**, never by whether its stdout looked useful: exit 0 is
   success even when it printed nothing, nonzero is failure even when it printed a parseable body.
   `pane run` prints nothing at all on success (measured on a live 0.9.1 server, 2026-09-30: the first doorbell of the first live fleet was
   reported `doorbell failed` by a port that read empty stdout as a failure, while the line had in fact
   been typed into the pane), and upstream makes the status the whole verdict — server errors are JSON on
   stderr with exit 1, syntax errors exit 2. Read stdout for the fields, never for the answer.
   Two corollaries, and they sit on opposite sides of the seam: the port at `cos.mjs:75` owns the first,
   every caller owns the second. The first is that the verdict is `status 0` **and** the parsed body
   names no `error` — so a body that reports failure is not accepted because the exit code was
   friendly. The second is that a caller may read a field only off a response it has already branched
   on `ok` for. One caller did not: `selfPane` took a `pane get` envelope straight off `.result`. Its
   `$HERDR_PANE_ID` arm now goes through `paneLives`, which checks; the `--current` fallback always
   branched on `ok` inline, so the helper is one arm's guard, not the function's. A test pins that a
   failed `pane get` cannot name this pane.

## Rejected framings

- *Screen output as evidence.* A pane's visible text is not a consumption record; herdr can
  render a pane the agent already moved past. Only `acks/` counts.
- *`state_change_seq` as a delivery proof.* `arronKler/herdr-dispatch` treats it that way;
  this design rejected the same reading without measuring it, because it does not have to:
  upstream `herdr` never documents the field, and a counter that a pane's own turn-end can
  advance could not distinguish "my prompt ran" from "it did something". It survives only as
  the negative signal above, and if even that reading is wrong the ladder costs one extra
  idempotent re-ring — never a lost record or a false claim of consumption.
- *File output as a fallback.* Upstream `herdr` positions writing files as a last resort for
  agent-to-agent exchange. Here the ledger is the primary medium, because the requirement is
  "survive an interruption", and a screen does not.
