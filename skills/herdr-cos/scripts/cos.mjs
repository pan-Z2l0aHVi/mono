/**
 * cos.mjs — the only implementation of the herdr-cos ledger; PROTOCOL.md owns the
 * invariants. Five are asserted by tests/cos.test.mjs: a published name is never overwritten
 * (link(2) fails where rename(2) would replace in silence); a sequence number is never
 * re-handed out (the ack directory is the floor); cursors/ is the only path written in place,
 * and only by its owning label; a herdr call is judged by its exit status, so a failed
 * pane get cannot name this pane; every ack line printed is one cos ack accepts. Sixth is
 * structural: herdrExec() and gitExec() are the only two places a process starts, and tests
 * replace both.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// Tunables. Change the value here rather than adding a switch: HERDR_COS_HOME is the only env var read as config.
const TEXT_THRESHOLD_BYTES = 1500; // bodies over this land in artifacts/ instead of the record
const ACK_DEADLINE_MS = 240000; // no ack by here and nothing ran => re-ring once; not yet measured on a live fleet
const PROTOCOL_V = 1, LEDGER_DIR_NAME = 'herdr-cos', MEMBER_WARN = 6, FAILED_AFTER = 2;
const SELF_PATH = fileURLToPath(import.meta.url);
const SKILL_DIR = join(dirname(SELF_PATH), '..'); // roles/ lives beside this program's parent
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/, LABEL_RE = /^[a-z][a-z0-9_-]{0,31}$/, REF_RE = /^[a-z0-9_-]+->[a-z0-9_-]+#\d+$/;

// Args appended to `herdr agent start --kind <kind>` per kind, so a member runs under the
// permissions its role needs instead of the CLI's own defaults. A member has to reach the herdr
// socket (cos poll) and, for codex, that means it cannot sit behind an approval dialog it cannot
// answer -- an unanswered prompt reads as `blocked`, and blocked members get their doorbell
// withheld rather than delivered. Only kinds with a measured need are listed; an unlisted kind
// starts exactly as it did before, on that CLI's own defaults. `claude` is deliberately absent:
// `--dangerously-skip-permissions` bypasses the permission layer outright, which is the gap
// docs/research/monorepo-for-agents-benchmark-260918.md asks to close, not one to default into.
const AGENT_ARGS = {
  codex: ['--approve-for-me'] // keeps the workspace-write sandbox; auto-reviews rather than skips
};

class CosError extends Error {}
const die = (message) => { throw new CosError(message); };

// ------------------------------------------------------------------ file primitives
const unlinkQuiet = (file) => { try { unlinkSync(file); } catch { /* already gone */ } };
const readJsonAt = (file) => JSON.parse(readFileSync(file, 'utf8'));
const listSeqs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => /^\d+\.json$/.test(n)).map((n) => Number(n.slice(0, -5))) : []);
const high = (nums) => nums.reduce((a, b) => (b > a ? b : a), 0);
const CONTESTED = Symbol('number already taken');
const writeCache = (dir, name, value) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, name), `${JSON.stringify(value)}\n`); };
const readCache = (dir, name) => { try { return JSON.parse(readFileSync(join(dir, name), 'utf8')); } catch { return null; } };

function stageTmp(dir, base, content) { const tmp = join(dir, `${base}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`); writeFileSync(tmp, content); return tmp; }
/** Release tmp under target, failing loudly rather than replacing what is there. */
function release(tmp, target) { try { linkSync(tmp, target); unlinkSync(tmp); return true; } catch (e) { if (e.code !== 'EEXIST') throw e; unlinkQuiet(tmp); return false; } }
/** Write-once publish of a fixed name. false means the name was already taken. */
function publishOnce(dir, name, content) {
  if (existsSync(join(dir, name))) return false;
  mkdirSync(dir, { recursive: true }); return release(stageTmp(dir, name, content), join(dir, name));
}
/** Allocate the next number in a channel, retrying collisions, so two concurrent sends from
 *  one pane land on different numbers instead of overwriting. `floor` is what the channel no
 *  longer shows but the ledger still remembers: a recycled record leaves its ack behind, and
 *  re-handing that number would make the next message look already consumed. A candidate is
 *  never reconsidered, so a body stranded by a killed publish cannot be argued over twice. */
function publishNumbered(dir, factory, floor = 0) {
  mkdirSync(dir, { recursive: true });
  for (let attempt = 0, tried = floor; attempt < 64; attempt += 1) {
    const seq = Math.max(high(listSeqs(dir)), tried) + 1; tried = seq;
    try { if (release(stageTmp(dir, `${seq}.json`, factory(seq)), join(dir, `${seq}.json`))) return seq; }
    catch (e) { if (e !== CONTESTED) throw e; }
  }
  die(`could not allocate a sequence number in ${dir} after 64 collisions`);
}
/** A published name that will not parse is corruption, not an empty channel: it is skipped
 *  and said out loud, never deleted and never counted as consumed. */
function recordsIn(dir, warn) {
  if (!existsSync(dir)) return [];
  const at = (seq) => { const file = join(dir, `${seq}.json`); try { return { seq, file, record: readJsonAt(file), mtimeMs: statSync(file).mtimeMs }; } catch { warn?.(`${seq} at ${dir} is published but unreadable: skipped, not deleted, and nothing was acked for it.`); return null; } };
  return listSeqs(dir).sort((a, b) => a - b).map(at).filter(Boolean);
}

// ------------------------------------------------------------------ herdr port
/** The only place this program starts a process. Tests inject a replacement. */
export function herdrExec(argv) {
  const r = spawnSync('herdr', argv, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error) return { ok: false, code: 'spawn_failed', message: String(r.error.message), result: null };
  let parsed = null; try { parsed = JSON.parse(r.stdout); } catch { /* usage errors are not JSON */ }
  // Exit status is the verdict: `pane run` prints nothing on success (live herdr 0.9.1, 2026-09-30), so a silent bell still rang; a JSON body carrying `error` fails even at status 0.
  if (r.status === 0 && !(parsed && parsed.error)) return { ok: true, code: null, message: null, result: parsed?.result ?? null };
  return { ok: false, code: parsed?.error?.code ?? (r.status === 2 ? 'cli_usage_error' : `exit_${r.status}`), message: parsed?.error?.message ?? String(r.stderr || `herdr exited with status ${r.status}`), result: parsed?.result ?? null };
}
const need = (res, what) => { if (!res.ok) die(`${what}: herdr reported ${res.code} — ${res.message}`); return res.result ?? {}; };

// ------------------------------------------------------------------ git port
/** The second place a process starts: git, used only to put each member in its own worktree.
 *  Tests inject a replacement beside the herdr one. */
export function gitExec(argv, cwd) {
  const r = spawnSync('git', argv, { encoding: 'utf8', cwd, maxBuffer: 16 * 1024 * 1024 });
  if (r.error) return { ok: false, code: 'spawn_failed', message: String(r.error.message), stdout: '' };
  return { ok: r.status === 0, code: r.status === 0 ? null : `exit_${r.status}`, message: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim(), stdout: r.stdout ?? '' };
}
/** The repo this fleet branches from, or null when the lead's cwd is not inside one. */
const gitToplevel = (io, cwd) => { const r = io.gitExec(['rev-parse', '--show-toplevel'], cwd); return r.ok ? (r.stdout.trim() || null) : null; };
/** The role contracts shipped beside this program, read off disk so the list cannot drift from roles/. */
const shippedRoles = () => { const dir = join(SKILL_DIR, 'roles'); return existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3)).sort() : []; };

// ------------------------------------------------------------------ ledger layout
/** Each process resolves where it thinks the ledger is; `cos new` is the only one that records it,
 *  and openFleet refuses any process whose answer differs — re-resolution is harmless, but a peer
 *  must still be *told* the root: hence the env prefix on every rendered command. */
function resolveRoot(env) {
  const root = ((env.HERDR_COS_HOME ?? join(tmpdir(), LEDGER_DIR_NAME))).replace(/\/+$/, '');
  if (env.HERDR_COS_HOME !== undefined && !env.HERDR_COS_HOME.startsWith('/')) die('HERDR_COS_HOME must be an absolute path');
  if (!root) die('the ledger root cannot be the filesystem root');
  if (!/^[A-Za-z0-9._:/-]+$/.test(root)) die(`the ledger root "${root}" holds characters a doorbell line cannot carry into a shell. Set HERDR_COS_HOME to a plain path of letters, digits, . _ : / -`);
  return root;
}
function fleetPaths(root, slug) {
  const at = (...more) => join(join(root, 'fleets', slug), ...more);
  return { root, slug, base: at(), manifest: at('manifest.json'), contract: at('peer-contract.md'), closed: at('closed'), members: at('members'), failures: at('failures'), channels: at('channels'), cursors: at('cursors'), acks: at('acks'), artifacts: at('artifacts') };
}
const chanName = (from, to) => `${from}->${to}`;
const chanDir = (fp, from, to) => join(fp.channels, chanName(from, to));
const ackDir = (fp, owner, peer) => join(fp.acks, `${owner}~${peer}`);
const artifactName = (from, to, seq) => `${chanName(from, to)}#${seq}.md`;
/** Locate the fleet, then trust nothing else: the manifest's own root is the ledger's identity, so
 *  a pane whose TMPDIR resolves elsewhere fails here rather than opening a second empty fleet. */
function openFleet(fp) {
  if (!existsSync(fp.manifest)) die(`no ledger at ${fp.base}: manifest.json is missing. A wiped temp root is not resumed silently — if the fleet still exists elsewhere, set HERDR_COS_HOME. For a new fleet, run \`cos new\` with a new slug.`);
  const manifest = readJsonAt(fp.manifest);
  if (manifest.root !== fp.root) die(`fleet "${fp.slug}" lives in ${manifest.root}, but this process resolves ${fp.root}. Two roots would mean two ledgers: point HERDR_COS_HOME at the one that has the members, and do not start a second.`);
  if (typeof manifest.v !== 'number') die(`${fp.manifest} has no protocol version`);
  return manifest;
}
const memberFile = (fp, label) => join(fp.members, `${label}.json`);
const memberLabels = (fp) => (existsSync(fp.members) ? readdirSync(fp.members).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)).sort() : []);
const readMember = (fp, label) => { try { return readJsonAt(memberFile(fp, label)); } catch (e) { return { __error: `${e.message}` }; } };
/** m1, m2, ... — the number space is the filename space, claimed by link(2). */
const nextLabel = (fp) => { const nums = memberLabels(fp).filter((l) => l !== 'lead').map((l) => Number(l.replace(/^[a-z]+/, ''))).filter(Number.isInteger); return `m${nums.length ? Math.max(...nums) + 1 : 1}`; };
/** Write-once member file. The caller owns the label, because the member's worktree and branch are
 *  named after it: a label is claimed here or the join fails, never silently re-rolled under a path
 *  some other join already made. */
function register(fp, pane, agentName, role, kind, label, worktree = null, branch = null) {
  const body = { label, pane_id: pane.pane_id, terminal_id: pane.terminal_id, agent: agentName ?? null, role: role ?? null, kind: kind ?? null, worktree, branch };
  if (!publishOnce(fp.members, `${label}.json`, `${JSON.stringify(body, null, 2)}\n`)) die(`members/${label}.json already exists — another join claimed that label; re-run this join.`);
  return label;
}
/** This pane's label, and only when exactly one ready member claims it: herdr hands pane ids out
 *  again, so answering as the wrong label would let one pane burn another one's messages. */
function resolveSelf(fp, env, stateMap) {
  const paneId = String(env.HERDR_PANE_ID ?? '');
  const hits = memberLabels(fp).filter((label) => stateMap.get(label)?.pane_id === paneId && stateMap.get(label).state === 'ready');
  return hits.length === 1 ? hits[0] : null;
}

// ------------------------------------------------------------------ reconcile
const agentByPane = (listRes) => { const m = new Map(); for (const a of listRes.agents ?? []) if (a?.pane_id) m.set(a.pane_id, a); return m; };
/** herdr nests the pane under a different key per command (pane, move_result.pane, snapshot),
 *  so find it wherever it sits rather than betting on one envelope. */
const pickPane = (res) => (res && typeof res === 'object' ? [res.pane, res.move_result?.pane, res.snapshot, res.root_pane, res].find((cand) => cand?.pane_id) ?? null : null);
const paneLives = (io, paneId) => { const res = io.herdrExec(['pane', 'get', String(paneId)]); return res.ok ? pickPane(res.result) : null; };
/** HERDR_PANE_ID is herdr's inherited caller context and the only unambiguous answer;
 *  `--current` names the focused pane, which may be a human's, so it is the fallback. */
function selfPane(io, env) {
  const byId = env.HERDR_PANE_ID ? paneLives(io, env.HERDR_PANE_ID) : null;
  if (byId) return byId;
  const cur = io.herdrExec(['pane', 'get', '--current']), focused = cur.ok ? pickPane(cur.result) : null;
  if (focused) return focused;
  die(`cos could not identify this pane (HERDR_PANE_ID=${env.HERDR_PANE_ID ?? '(unset)'}; herdr said ${cur.code ?? 'no pane described'}). Claiming a fleet must run inside a herdr pane.`);
}
/** Member state is never stored: it is computed from members/*.json plus live herdr state, which
 *  is why a reboot needs no bookkeeping — the ledger claims identities, herdr owns what is alive. */
function reconcileMembers(fp, io, byPane) {
  const state = new Map(), declaredBy = new Map();
  const put = (label, info) => { const d = declaredBy.get(label) ?? {}; state.set(label, { label, role: d.role ?? null, kind: d.kind ?? null, ...info }); };
  const gone = (label, pane_id, reason) => put(label, { pane_id, state: 'gone', reason });
  for (const label of memberLabels(fp)) {
    const declared = readMember(fp, label); declaredBy.set(label, declared.__error ? {} : declared);
    if (declared.__error) { gone(label, null, `members/${label}.json is unreadable`); continue; }
    const paneId = declared.pane_id;
    // An agent at the declared pane is the only thing that can take a prompt, so ask the agent list
    // first; the pane is what tells "still launching" from "gone", so ask it second. A named agent
    // that came back under a new pane id is the same member — herdr owns the id, the ledger owns
    // the name — so follow it, and store nothing about it.
    const entry = byPane.get(paneId) ?? null;
    const live = entry ?? paneLives(io, paneId);
    const heir = live ?? (declared.agent ? [...byPane.values()].find((a) => a.name === declared.agent) ?? null : null);
    if (!heir) { gone(label, paneId, 'no such pane'); continue; }
    if (live && heir.terminal_id !== declared.terminal_id) { gone(label, paneId, 'the pane now holds a different terminal'); continue; }
    if (declared.agent && (heir.name ?? null) !== declared.agent) {
      if (entry) gone(label, paneId, `agent ${declared.agent} is gone; this pane answers to ${heir.name ?? 'nothing'}`);
      else put(label, { pane_id: paneId, state: 'creating', reason: 'the agent is not visible to herdr yet' });
      continue;
    }
    // A bare pane has no agent_status, so its existence is the whole observation and the ack
    // deadline alone decides whether it is keeping up.
    const observ = declared.agent ? (heir.agent_status ?? 'unknown') : null;
    if (observ === 'unknown') { gone(label, paneId, 'herdr reports unknown'); continue; }
    put(label, { pane_id: heir.pane_id, terminal_id: heir.terminal_id, agent: declared.agent ?? null, observ, seq: Number.isInteger(heir.state_change_seq) ? heir.state_change_seq : null, state: 'ready', reason: live ? null : `re-bound from pane ${paneId}` });
  }
  return state;
}
/** Consumption evidence lives in exactly one place: this directory listing. A report that a
 *  doorbell named a number this channel never held is filed under `missing/` instead, so it can
 *  never share a name with a consumption record — see `cos ack`. */
function ackState(fp, to, from, seq) {
  return existsSync(join(ackDir(fp, to, from), `${seq}.json`)) ? 'acked' : null;
}
const ackCount = (fp, owner) => (existsSync(fp.acks)
  ? readdirSync(fp.acks).filter((d) => d.startsWith(`${owner}~`)).reduce((n, d) => n + readdirSync(join(fp.acks, d)).filter((f) => /^\d+\.json$/.test(f)).length, 0)
  : 0);
const failureMarkers = (fp, label) => { const dir = join(fp.failures, label); return existsSync(dir) ? readdirSync(dir).filter((n) => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b) : []; };
/** Progress is measured against the watermark in the newest marker, so the count
 *  survives a crash without any file being edited in place. */
function trackProgress(fp, label, isStuck) {
  const dir = join(fp.failures, label), markers = failureMarkers(fp, label), top = markers.at(-1) ?? 0, acks = ackCount(fp, label);
  const seen = top ? Number(readJsonAt(join(dir, String(top))).acks ?? 0) || 0 : 0;
  if (!isStuck || acks > seen) { if (markers.length) rmSync(dir, { recursive: true, force: true }); return 0; }
  // The counter only has to answer "two passes yet?", so it saturates there: a member that never
  // comes back would otherwise file one new marker per pass, forever, for a fact already told.
  if (top >= FAILED_AFTER) return top;
  publishOnce(dir, String(top + 1), `${JSON.stringify({ label, n: top + 1, acks })}\n`);
  return top + 1;
}
/** The sender's cache for one channel: oldest unacked record, the recipient's state_change_seq
 *  at delivery, when, and whether it was already re-belled. Only the head is tracked, so a
 *  newer send cannot reset the clock on the stalling one. */
function pendingState(fp, from, to, rec, stateMap, now, isHead, myLabel) {
  const acked = ackState(fp, to, from, rec.seq);
  if (acked) return { state: acked };
  // Everything below is the sender's ladder: a reader only asks "unacked and unread", and a
  // bystander never writes the slot it does not own.
  if (to === myLabel) return { state: 'pending' };
  const peer = stateMap.get(to);
  if (!peer || peer.state !== 'ready') return { state: 'dead', detail: peer ? `recipient ${to} is ${peer.state}` : `recipient ${to} is not listed` };
  if (peer.observ === 'blocked') return { state: 'blocked', detail: 'approval dialog in the way' };
  if (peer.observ === 'working') return { state: 'queued' };
  if (!isHead) return { state: 'pending' };
  const key = `${from}~${to}.s`;
  const cache = readCache(fp.cursors, key) ?? {};
  const mine = from === myLabel;
  if (cache.q !== rec.seq) { if (mine) writeCache(fp.cursors, key, { q: rec.seq, b: peer.seq, t: rec.mtimeMs, r: 0 }); return { state: 'pending' }; }
  if (now - Number(cache.t ?? rec.mtimeMs) < ACK_DEADLINE_MS) return { state: 'pending' };
  // state_change_seq is a negative-only signal: unmoved proves nothing ran. A bare pane has no
  // counter, so the deadline is the trigger. Something did run since delivery => restart the
  // clock on that activity, else this record sits at pending for the fleet's whole life.
  if (peer.seq !== null && cache.b !== null && peer.seq !== cache.b) {
    if (mine) writeCache(fp.cursors, key, { q: rec.seq, b: peer.seq, t: now, r: Number(cache.r ?? 0) });
    return { state: 'pending' };
  }
  return { state: Number(cache.r ?? 0) >= 1 ? 'dead' : 'unproven', detail: 'no ack by the deadline and nothing ran in that pane' };
}
function scanChannels(fp, stateMap, now, myLabel, note) {
  const rows = [];
  if (!existsSync(fp.channels)) return rows;
  for (const chan of readdirSync(fp.channels)) {
    const [from, to] = chan.split('->');
    // A publish killed mid-flight strands its temp here. Only that channel's writer touches it,
    // and only past the deadline; a sibling that linked and cleared it first reads as "too new".
    if (from === myLabel) for (const stale of readdirSync(join(fp.channels, chan)).filter((n) => n.endsWith('.tmp'))) {
      let age = 0; try { age = now - statSync(join(fp.channels, chan, stale)).mtimeMs; } catch { age = 0; }
      if (age > ACK_DEADLINE_MS) unlinkQuiet(join(fp.channels, chan, stale));
    }
    const recs = recordsIn(join(fp.channels, chan), note);
    const head = recs.find((r) => !ackState(fp, to, from, r.seq))?.seq ?? null;
    for (const rec of recs) {
      const { state, detail = null } = pendingState(fp, from, to, rec, stateMap, now, rec.seq === head, myLabel);
      rows.push({ from, to, seq: rec.seq, type: rec.record.type ?? 'send', file: rec.file, mtimeMs: rec.mtimeMs, state, detail });
    }
  }
  return rows;
}
/** A send that was acked but never answered, by a peer that can no longer answer, is
 *  reported to a human: redoing it would replay someone else's side effects. */
function findUnanswered(fp, stateMap) {
  if (!existsSync(fp.channels)) return [];
  return readdirSync(fp.channels).flatMap((chan) => {
    const [from, to] = chan.split('->');
    if (stateMap.get(to)?.state === 'ready') return [];
    const acks = ackDir(fp, from, to);
    const refs = new Set([...recordsIn(chanDir(fp, to, from)).filter((r) => r.record.type === 'reply' && r.record.re).map((r) => r.record.re), ...listSeqs(acks).map((n) => readCache(acks, `${n}.json`)?.re).filter(Boolean)]);
    return recordsIn(join(fp.channels, chan)).filter((rec) => rec.record.type === 'send' && ackState(fp, to, from, rec.seq) && !refs.has(`${chan}#${rec.seq}`)).map((rec) => ({ ref: `${chan}#${rec.seq}`, owedBy: to }));
  });
}
/** Only the channel's own writer recycles it: every channel keeps one writer. A record held
 *  for unanswered is skipped: deleting it would destroy the only evidence of the answer still
 *  owed, and the report would then vanish after the one pass that made it. */
function recycle(fp, myLabel, report, held) {
  if (!myLabel || !existsSync(fp.channels)) return;
  for (const chan of readdirSync(fp.channels).filter((c) => c.startsWith(`${myLabel}->`))) {
    const [from, to] = chan.split('->');
    for (const rec of recordsIn(join(fp.channels, chan)).filter((r) => ackState(fp, to, from, r.seq) === 'acked' && !held.has(`${chan}#${r.seq}`))) {
      const art = join(fp.artifacts, artifactName(from, to, rec.seq));
      if (existsSync(art)) { unlinkQuiet(art); report.artifacts += 1; }
      unlinkQuiet(rec.file); report.removed += 1;
    }
  }
}
/** A cursor may only trail the acks; a stale high value would hide records. */
function clampCursors(fp, myLabel, report) {
  if (!myLabel || !existsSync(fp.cursors)) return;
  for (const name of readdirSync(fp.cursors)) {
    const [owner, peer] = name.slice(0, -2).split('~');
    if (!name.endsWith('.r') || owner !== myLabel) continue;
    const cur = readCache(fp.cursors, name) ?? { c: 0 };
    const rows = recordsIn(chanDir(fp, peer, myLabel));
    // Back up to just below the oldest record still owed an ack — not to the highest acked one,
    // which would let a later ack hide an earlier record that was never consumed.
    const owed = rows.filter((r) => !ackState(fp, myLabel, peer, r.seq)).map((r) => r.seq);
    const back = owed.length ? Math.min(...owed) - 1 : high(rows.map((r) => r.seq));
    report.clamped += rows.filter((r) => !ackState(fp, myLabel, peer, r.seq) && r.seq <= (cur.c ?? 0)).length;
    if ((cur.c ?? 0) > back) writeCache(fp.cursors, name, { c: back });
  }
}
const unreadInbound = (fp, myLabel, report) => (!myLabel ? [] : report.rows.filter((row) =>
  row.to === myLabel && row.state === 'pending' && row.seq > ((readCache(fp.cursors, `${myLabel}~${row.from}.r`) ?? { c: 0 }).c ?? 0)));
/** Ring the bell, returning the herdr result so the stall baseline is taken from the *after* state. */
function sendDoorbell(fp, io, stateMap, from, to, seq, report) {
  const peer = stateMap.get(to), stand = 'The record stands;';
  // This line is typed into a shell — `pane run` sends text and Enter, `agent prompt` hands the pane
  // the same text it would type — so no token of it comes from a directory name unchecked: a member
  // file or channel made by hand could otherwise make this program run a command in someone's pane.
  if (!LABEL_RE.test(from) || !LABEL_RE.test(to)) { report.warn.push(`${from}->${to}#${seq}: not rung — "${LABEL_RE.test(to) ? from : to}" is not a label this program issues. ${stand} rename that member file or channel directory, and until you do nothing is delivered on it.`); return null; }
  if (!peer || peer.state !== 'ready') { report.warn.push(`${from}->${to}#${seq}: nothing sent — recipient ${to} is ${peer ? peer.state : 'unlisted'}. ${stand} a doorbell only goes out once that member is ready again.`); return null; }
  // A peer at an approval dialog refuses input outright, and a write would land in that
  // dialog too: bell withheld, record stands, a human clears it.
  if (peer.observ === 'blocked') { report.warn.push(`${from}->${to}#${seq}: doorbell withheld — ${to} is at an approval dialog. ${stand} a human answers it, then reconcile delivers.`); return null; }
  const text = `cosa ${fp.contract} ${to} ${seq}`;
  const res = peer.observ ? io.herdrExec(['agent', 'prompt', String(peer.pane_id), text]) : io.herdrExec(['pane', 'run', String(peer.pane_id), text]);
  if (!res.ok) { report.warn.push(`${from}->${to}#${seq}: doorbell failed (herdr ${res.code}: ${res.message}). ${stand} reconcile retries it.`); return null; }
  // A bare pane has no agent to execute the line: the shell runs `cosa`, finds no such command, and
  // the doorbell becomes a notice on screen. Nothing is consumed until someone acks.
  if (!peer.observ) { report.warn.push(`${from}->${to}#${seq}: written to ${to}'s bare pane as a notice, not consumed — a shell runs that line looking for a command named cosa and finds none. Someone must read it and run its ack.`); return res; }
  report.doorbells += 1;
  return res;
}
function captureBaseline(fp, from, to, seq, res, now, retries = 0) {
  // Only the head of a channel owns the stall clock: a newer send must not take the slot
  // from an older unacked one, or that one restarts its deadline and gets belled twice.
  if (!retries && listSeqs(chanDir(fp, from, to)).some((n) => n < seq && !ackState(fp, to, from, n))) return;
  const r = res?.result ?? {};
  const after = r.agent?.state_change_seq ?? r.state_change_seq ?? null;
  writeCache(fp.cursors, `${from}~${to}.s`, { q: seq, b: Number.isInteger(after) ? after : null, t: now, r: retries });
}
function retryDue(fp, io, stateMap, myLabel, rows, report, now) {
  if (!myLabel || existsSync(fp.closed)) return;
  for (const row of rows.filter((r) => r.from === myLabel)) {
    if (row.state === 'unproven') {
      const res = sendDoorbell(fp, io, stateMap, row.from, row.to, row.seq, report);
      // Ringing the bell moves the very counter the stall test reads, so a retry must re-baseline
      // and restart the deadline — else the retry looks like progress and never reaches dead.
      if (res) { captureBaseline(fp, row.from, row.to, row.seq, res, now, 1); report.resends += 1; report.warn.push(`${row.from}->${row.to}#${row.seq}: unproven — re-sent the doorbell once, same sequence number.`); }
    } else if (row.state === 'dead') {
      report.warn.push(`${row.from}->${row.to}#${row.seq}: dead (${row.detail}). Not retried again; only a human decides whether the work is redone.`);
    }
  }
}
function coreReconcile(fp, io, env, now) {
  const byPane = agentByPane(need(io.herdrExec(['agent', 'list']), 'agent list'));
  const stateMap = reconcileMembers(fp, io, byPane);
  const report = { stateMap, closed: existsSync(fp.closed), myLabel: resolveSelf(fp, env, stateMap), rows: [], members: [], warn: [], doorbells: 0, resends: 0, removed: 0, artifacts: 0, clamped: 0 };
  for (const [pane, n] of [...stateMap.values()].reduce((m, i) => i.state === 'ready' && i.pane_id ? m.set(i.pane_id, (m.get(i.pane_id) ?? 0) + 1) : m, new Map())) if (n > 1) report.warn.push(`two members resolve to pane ${pane}: no pane addresses itself there until members/ is corrected`);
  const note = (message) => report.warn.push(message);
  report.rows = scanChannels(fp, stateMap, now, report.myLabel, note);
  report.unanswered = findUnanswered(fp, stateMap);
  clampCursors(fp, report.myLabel, report);
  if (!report.closed) recycle(fp, report.myLabel, report, new Set(report.unanswered.map((u) => u.ref)));
  report.rows = scanChannels(fp, stateMap, now, report.myLabel, note);
  retryDue(fp, io, stateMap, report.myLabel, report.rows, report, now);
  report.unread = unreadInbound(fp, report.myLabel, report);
  for (const [label, info] of stateMap) {
    // A `gone` member is already the report: counting its no-progress would file a marker every
    // pass for a pane that cannot make any, and `failed` is not a second name for `gone`.
    const alive = info.state !== 'gone', unacked = report.rows.some((r) => r.to === label && (r.state === 'unproven' || r.state === 'dead'));
    const markers = report.closed || !alive ? 0 : trackProgress(fp, label, info.state !== 'ready' || unacked); // a closed fleet rings, retries and recycles nothing
    // `failed` is the marker judgement over a member that still resolves: the never-listed agent is the case it was invented for.
    report.members.push({ label, state: markers >= FAILED_AFTER ? 'failed' : info.state, observ: info.observ ?? null, pane_id: info.pane_id ?? null, reason: info.reason ?? null, markers, role: info.role ?? null, kind: info.kind ?? null });
  }
  if (stateMap.size > MEMBER_WARN) report.warn.push(`${stateMap.size} members exceeds the recommended ${MEMBER_WARN}: every member owes every other one a channel.`);
  return report;
}

// ------------------------------------------------------------------ peer contract
/** Every rendered line carries the ledger root as an env assignment — re-resolving $TMPDIR is
 *  forbidden, and this is what makes "copy it and it works" true. Root and slug are charset-checked,
 *  an ack line's label is checked before it prints, and this program's own path is the one token
 *  quoted because its install dir is not ours to constrain. */
const shQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
const program = (root) => `HERDR_COS_HOME=${root} node ${shQuote(SELF_PATH)}`;
function renderContract(slug, root) {
  const cos = program(root), fleet = join(root, 'fleets', slug);
  return `# Peer contract — fleet ${slug}

You were pointed here by a line \`cosa <this file> <your-label> <seq>\`: a record addressed
to <your-label> exists at sequence <seq>. That is an accelerator, not proof of delivery —
the ledger is the proof, and your ack is the only positive record that you consumed one.
Ledger: ${fleet}
Contract: ${join(fleet, 'peer-contract.md')}
Program: ${cos}

## Do exactly this

1. \`${cos} poll ${slug}\` — your label is resolved from HERDR_PANE_ID, you do not need to
   know it. Lines you may see: \`NEW <from> <seq> <type> <preview>\` (work waiting on you),
   \`RUN …\` (the ack line for it), \`OUT …\` (your own unacked sends), \`MEMBER <label>
   creating|ready|failed|gone\`, \`UNANSWERED …\`, \`WARN …\`.
2. Do the work, then run the poll line verbatim: \`${cos} ack ${slug} <from> <seq>\`. The ack
   is what stops retries, so ack only after the work actually happened.
3. If it needs an answer, reply on the channel it arrived on:
   \`${cos} send ${slug} <from> <text|-> "<from>-><your-label>#<seq>"\`. \`-\` reads the body
   from stdin; bodies over ${TEXT_THRESHOLD_BYTES} bytes land in ${fleet}/artifacts/ and the
   record carries the path, so the doorbell stays one short line — read that file first.
4. Pull whenever you are next able to — you are not a timer, so nothing here can be late. Never resend
   work that some other pane's ack already covers, and expect an unacked \`NEW\` to be shown again on
   the next poll: only your ack ends it. If its preview says \`<body MISSING …>\`, report that line
   and do not redo it. If your ack answers \`as MISSING\`, the doorbell named a number this channel
   never held: report that line, redo nothing, and do not retry the ack.

## Your working tree

Unless the lead joined you with \`--no-worktree\` (or the lead's cwd is not inside a git repo, which
prints a note instead), you were given your own git worktree at
\`${join(root, 'worktrees', slug)}/<label>\` on branch \`cos/${slug}/<label>\`, and your pane opened
there. No two members write the same tree. Your member file names your \`worktree\` and \`branch\`;
if your pane dies, that is what a replacement is joined against.

## Your role

Role is a name the lead chose, recorded write-once in your member file and printed on poll lines.
It is not a permission — the ledger routes nothing by role and enforces no division of labour; the
soft constraint lives in the brief the lead sent you. What each name means is a contract file
beside this program, read only the one your member file names:

${shippedRoles().length ? shippedRoles().map((r) => `- \`roles/${r}.md\``).join('\n') : '- (this copy ships no roles/ directory — the lead names roles in the brief instead.)'}

## Rules

- Never edit a ledger file that has its final name: publishing is link(2) of a same-directory
  temp file, and overwriting is corruption.
- ${fleet}/cursors/ is cache: losing it may cost one duplicate doorbell, never a record or a reused number.
- acks/, manifest.json and this contract are never recycled; acked records are.
- Identity is a label bound to a pane id, never a herdr agent name: those are cleared
  when the process that owns them exits. A recognised agent is prompted; a bare pane is
  written to. Both are herdr.

## The whole interface

\`\`\`
${cos} new ${slug}                                     claim a fleet, render this file
${cos} join ${slug} <right|down> [agent-kind] [role] [--no-worktree]   add a member pane
${cos} send ${slug} <to>[,<to>...] <text|-> [re]   publish, then doorbell each
${cos} poll ${slug}                                    reconcile, print NEW and RUN lines
${cos} ack ${slug} <from> <seq>                        consumption proof
${cos} reconcile ${slug}                               recompute states, retry what is due
${cos} close ${slug}                                   stop reconciling this fleet
\`\`\`

Roster: the files in \`${fleet}/members/\` — one write-once file per member; member state is
not stored, it is recomputed from pane ids on every call.
Ack deadline ${ACK_DEADLINE_MS / 1000}s. The lead pulls whenever it is next able to, not on a timer.
`;
}

// ------------------------------------------------------------------ subcommands
function cmdNew({ io, env, out, slug, cwd }) {
  const root = resolveRoot(env), fp = fleetPaths(root, slug);
  const claimed = existsSync(fp.manifest);
  // A claim only counts once it has a lead and a contract, so finish an interrupted one instead of
  // burning the slug forever: a herdr hiccup mid-call must not force a new name.
  if (claimed) { openFleet(fp); if (memberLabels(fp).length !== 0 || existsSync(fp.contract)) die(`fleet "${slug}" is already claimed: ${fp.manifest} exists. A second lead needs a new slug.`); }
  else if (!publishOnce(fp.base, 'manifest.json', `${JSON.stringify({ slug, v: PROTOCOL_V, root, repo: gitToplevel(io, cwd) }, null, 2)}\n`)) die(`fleet "${slug}" was claimed by another process between the check and the link.`);
  for (const d of [fp.members, fp.channels, fp.cursors, fp.acks, fp.artifacts, fp.failures]) mkdirSync(d, { recursive: true });
  const pane = selfPane(io, env);
  // `pane get` reports the agent *kind*; the alias a peer is addressed by is AgentInfo.name.
  const entry = agentByPane(need(io.herdrExec(['agent', 'list']), 'agent list')).get(pane.pane_id);
  const lead = { label: 'lead', pane_id: pane.pane_id, terminal_id: pane.terminal_id, agent: entry?.name ?? null };
  if (!publishOnce(fp.members, 'lead.json', `${JSON.stringify(lead, null, 2)}\n`)) die('members/lead.json already exists');
  if (!publishOnce(fp.base, 'peer-contract.md', renderContract(slug, root))) die('peer-contract.md already exists');
  out(`${claimed ? 'finished claiming' : 'claimed'} fleet "${slug}" at ${fp.base}`);
  out(`lead pane ${lead.pane_id} terminal ${lead.terminal_id} agent ${lead.agent ?? '(bare pane)'}`); out(`contract ${fp.contract}`);
  return 0;
}
function cmdJoin({ io, out, args, fp, cwd }) {
  const flags = args.filter((a) => a.startsWith('--')), positional = args.filter((a) => !a.startsWith('--'));
  const unknown = flags.find((f) => f !== '--no-worktree');
  if (unknown) die(`join: unknown flag ${unknown}`);
  const [direction, kind, role] = positional;
  if (positional.length > 3) die('join takes: <slug> <right|down> [agent-kind] [role] [--no-worktree]');
  if (direction !== 'right' && direction !== 'down') die('join needs a direction: right or down');
  // A member without a contract cannot ack, so it would be a pane that can only ever go dead.
  if (!existsSync(fp.contract)) die(`this fleet has no peer-contract.md: \`cos new ${fp.slug}\` never finished. Run it again to complete the claim.`);
  const label = nextLabel(fp);
  // Isolation: each member gets its own git worktree, named after its label, so no two members
  // write the same working tree. The ledger lives under the root and is untouched by the branch.
  let worktree = null, branch = null, paneCwd = cwd, repo = null;
  if (!flags.includes('--no-worktree')) {
    repo = gitToplevel(io, cwd);
    if (repo) {
      worktree = join(fp.root, 'worktrees', fp.slug, label); branch = `cos/${fp.slug}/${label}`;
      mkdirSync(dirname(worktree), { recursive: true });
      const made = io.gitExec(['-C', repo, 'worktree', 'add', '-b', branch, worktree, 'HEAD']);
      if (!made.ok) die(`join: could not create a worktree for ${label} at ${worktree} (git ${made.code}: ${made.message}). Fix the repo, or pass --no-worktree to share the lead's working tree.`);
      paneCwd = worktree;
    } else out(`note: ${cwd} is not inside a git worktree, so ${label} shares the lead's working tree — no isolation. Run this from a git repo, or pass --no-worktree to silence this.`);
  }
  // The window between carving the tree and registering the member: a split or move failure here
  // would strand the fresh tree and a stray pane in the lead's tab. The checkout is seconds old
  // and bare, so the git side rolls back; the pane is named for a human, because closing panes is
  // not one of this program's two ports.
  let pane = null, splitPaneId = null;
  try {
    const split = need(io.herdrExec(['pane', 'split', '--current', '--direction', direction, '--cwd', paneCwd, '--no-focus']), 'pane split');
    if (!split.pane) die('pane split returned no pane');
    splitPaneId = split.pane.pane_id;
    const moved = need(io.herdrExec(['pane', 'move', String(split.pane.pane_id), '--new-tab', '--no-focus']), 'pane move');
    pane = moved.move_result?.pane ?? split.pane;
    if (moved.move_result?.previous_pane_id && moved.move_result.previous_pane_id !== pane.pane_id) out(`pane id after the move is ${pane.pane_id}; ${moved.move_result.previous_pane_id} is stale and must not be used`);
  } catch (e) {
    if (worktree) {
      const removed = io.gitExec(['-C', repo, 'worktree', 'remove', worktree], cwd);
      if (removed.ok) io.gitExec(['-C', repo, 'branch', '-d', branch], cwd);
      else out(`note: ${worktree} could not be removed automatically (git ${removed.code}: ${removed.message}); remove it and branch ${branch} by hand`);
    }
    if (splitPaneId) out(`note: pane ${splitPaneId} was split into this tab and is now stray — close it by hand`);
    throw e;
  }
  let agentName = null;
  if (kind && kind !== 'none') {
    agentName = `cos-${label}-${fp.slug}`.slice(0, 32); // label first: a long slug must not truncate two members into one name
    // Object.hasOwn, not AGENT_ARGS[kind]: a plain object literal answers `constructor` and
    // `toString` with functions from Object.prototype, and those reach the spread below — which
    // throws after the pane was already split and moved, stranding a member the ledger never records.
    const kindArgs = Object.hasOwn(AGENT_ARGS, String(kind)) ? AGENT_ARGS[String(kind)] : [];
    const started = io.herdrExec([
      'agent', 'start', agentName, '--kind', String(kind), '--pane', String(pane.pane_id),
      ...(kindArgs.length ? ['--', ...kindArgs] : [])
    ]);
    if (!started.ok) {
      // Registered without an agent: the half-success stays inspectable, and a retry would open a duplicate.
      out(`agent start returned herdr ${started.code}: ${started.message}`);
      out('not retrying agent start: a retry would open a duplicate agent. If herdr stopped at an approval prompt, handle it in that pane, then cos join a fresh member — this label is registered with no agent binding and keeps it, so its doorbells ring a bare pane.');
      out(`registered ${register(fp, pane, null, role, null, label, worktree, branch)} at pane ${pane.pane_id} with no agent binding`);
      return 1;
    }
  }
  register(fp, pane, agentName, role, kind, label, worktree, branch);
  out(`joined ${label} at pane ${pane.pane_id} terminal ${pane.terminal_id} agent ${agentName ?? '(bare pane)'}`);
  if (worktree) out(`worktree ${worktree} (branch ${branch})`);
  if (memberLabels(fp).length > MEMBER_WARN) out(`note: ${memberLabels(fp).length} members, over the recommended ${MEMBER_WARN} counting the lead. Nothing refuses; each new member owes every other one a channel.`);
  out(`in that pane run: ${fp.contract} — or wait for the first doorbell to name it`);
  return 0;
}
function cmdSend({ io, out, args, fp, report, readOnly, now }) {
  if (readOnly) die('send refused: this ledger was written by a newer protocol version. Reading and acking old records stays safe; allocating sequence numbers does not.');
  const myLabel = report.myLabel;
  if (!myLabel) die('send: this pane is not in the roster, so it has no label to send from');
  const targets = String(args[0] ?? '').split(',').filter(Boolean);
  const [raw, re] = args.slice(1);
  if (!targets.length || raw === undefined) die('send needs: <to>[,<to>...] <text|-> [re]');
  if (re !== undefined && !REF_RE.test(re)) die(`re must look like <from>-><to>#<seq>, got "${re}"`);
  const text = raw === '-' ? readFileSync(0, 'utf8') : String(raw);
  const big = Buffer.byteLength(text) > TEXT_THRESHOLD_BYTES;
  const roster = memberLabels(fp);
  for (const t of targets) if (!LABEL_RE.test(t) || !roster.includes(t)) die(`send: no member "${t}". Roster: ${roster.join(', ') || '(empty)'}`);
  const published = [];
  for (const to of targets) {
    const chan = chanDir(fp, myLabel, to);
    // The factory runs immediately before the record is linked, so the body is published first
    // and the record's link is the commit point: a crash between the two leaves an orphan body,
    // never a record naming a file never written. A taken body name means that number is already
    // claimed — by a sibling sender or a body this pane stranded earlier — so it tries the next.
    const seq = publishNumbered(chan, (n) => {
      const name = artifactName(myLabel, to, n);
      if (big && !publishOnce(fp.artifacts, name, text)) throw CONTESTED;
      return `${JSON.stringify({
        v: PROTOCOL_V, fleet: fp.slug, seq: n, from: myLabel, to, type: re ? 'reply' : 'send', re: re ?? null,
        text: big ? '' : text, file: big ? join(fp.artifacts, name) : null,
      }, null, 2)}\n`;
    }, high(listSeqs(ackDir(fp, to, myLabel)))); published.push({ to, seq });
  }
  const rungBefore = report.doorbells; // reconcile may have re-rung someone else's owed record already
  for (const { to, seq } of published) {
    const res = sendDoorbell(fp, io, report.stateMap, myLabel, to, seq, report);
    if (res) captureBaseline(fp, myLabel, to, seq, res, now);
    out(`sent ${myLabel}->${to}#${seq}${big ? ' (body in artifacts/)' : ''}`);
  }
  for (const w of report.warn) out(`WARN ${w}`); out(`doorbells ${report.doorbells - rungBefore} of ${published.length}`);
  return 0;
}
function cmdPoll({ out, fp, report }) {
  const cos = program(fp.root);
  for (const row of report.unread) {
    const rec = readJsonAt(row.file);
    const missing = rec.file && !existsSync(rec.file);
    const preview = missing ? `<body MISSING at ${rec.file}: the record survived, its body did not. Report this line; do not redo the work on the strength of an absent file>`
      : rec.text === '' ? `<body ${rec.file}>` : String(rec.text).replace(/\s+/g, ' ').slice(0, 90);
    out(`NEW ${row.from} ${row.seq} ${row.type} ${preview}`);
    out(LABEL_RE.test(row.from) && row.seq >= 1 && row.seq <= Number.MAX_SAFE_INTEGER ? `RUN ${cos} ack ${fp.slug} ${row.from} ${row.seq}`
      : `WARN ${row.from}->${report.myLabel}#${row.seq}: no ack line, because ${!LABEL_RE.test(row.from) ? `"${row.from}" is not a label cos ack would accept` : row.seq < 1 ? `sequence ${row.seq} is below the smallest number cos ack reads` : `sequence ${row.seq} is past the largest integer cos ack reads`}. Someone named that channel or record file by hand: correct the name, or the record can never be consumed.`);
    const key = `${report.myLabel}~${row.from}.r`; writeCache(fp.cursors, key, { c: Math.max(row.seq, (readCache(fp.cursors, key) ?? { c: 0 }).c ?? 0) });
  }
  const mine = report.rows.filter((r) => r.from === report.myLabel && r.state !== 'acked');
  for (const row of mine) out(`OUT ${row.from}->${row.to}#${row.seq} ${row.state}`);
  printMembers(out, report);
  for (const u of report.unanswered) out(`UNANSWERED ${u.ref} owed by ${u.owedBy} — reported, never auto-redone`);
  for (const w of report.warn) out(`WARN ${w}`);
  out(`fleet ${fp.slug}: ${report.members.length} member(s), ${mine.length} unacked outbound, ${report.unread.length} new inbound, ${report.removed} recycled`);
  if (mine.length) out(`unacked outbound above; ack deadline ${ACK_DEADLINE_MS / 1000}s`);
  return 0;
}
function cmdAck({ out, args, fp, report }) {
  if (!report.myLabel) die('ack: this pane is not in the roster, so there is no label to ack as');
  const [from, raw = ''] = args;
  // An ack file's name is the sequence number and the allocation floor reads those names, so
  // anything but plain digits would poison the channel: 1e308 and 2**53 round-trip as integers.
  if (!from || !LABEL_RE.test(from) || !/^[1-9]\d*$/.test(raw) || Number(raw) > Number.MAX_SAFE_INTEGER) die('ack needs: <from> <seq> (seq as plain digits)');
  const seq = Number(raw), dir = ackDir(fp, report.myLabel, from), recFile = join(chanDir(fp, from, report.myLabel), `${seq}.json`);
  if (existsSync(join(dir, `${seq}.json`))) { out(`already acked: ${report.myLabel} consumed ${from}->${report.myLabel}#${seq}`); return 0; }
  if (!existsSync(recFile)) {
    // The doorbell named a number this channel never held. The report is filed under missing/
    // rather than beside the acks because an ack file's *name* is the allocation floor: a report
    // at seq N must never read as consumption of the record that later claims N. A closed fleet
    // gets the line but no file, because nothing there retries — a filing with no reader would
    // be a write for its own sake. The line prints either way, so no bell goes silent.
    if (!report.closed) publishOnce(join(dir, 'missing'), `${seq}.json`, `${JSON.stringify({ missing: true, at: new Date().toISOString() })}\n`);
    out(`acked ${from}->${report.myLabel}#${seq} as MISSING: no such record in the ledger`);
    out('nothing was redone. Report this line: the doorbell carried a number this channel never reached.');
    return 0;
  }
  let rec = null;
  try { rec = readJsonAt(recFile); } catch { die(`ack refused: ${from}->${report.myLabel}#${seq} is published but unreadable. Report it — consuming what cannot be read lets it be deleted.`); }
  // Acking a reply copies its `re` into the ack, because acks/ outlives the record: that copy
  // is how an answer keeps proving it existed after its writer recycled it.
  out(publishOnce(dir, `${seq}.json`, rec.re ? `${JSON.stringify({ re: rec.re })}\n` : '')
    ? `acked: ${report.myLabel} consumed ${from}->${report.myLabel}#${seq}`
    : `already acked: ${from}->${report.myLabel}#${seq}`);
  const key = `${report.myLabel}~${from}.r`; writeCache(fp.cursors, key, { c: Math.max(seq, (readCache(fp.cursors, key) ?? { c: 0 }).c ?? 0) });
  for (const w of report.warn) out(`WARN ${w}`);
  return 0;
}
const printMembers = (out, report) => { for (const m of report.members) out(`MEMBER ${m.label} ${m.state}${m.role ? ` role=${m.role}` : ''}${m.kind ? ` kind=${m.kind}` : ''}${m.observ ? ` observed=${m.observ}` : ''}${m.markers ? ` no-progress=${m.markers}` : ''}${m.reason ? ` (${m.reason})` : ''}`); };
function cmdReconcile({ out, fp, report }) {
  out(`fleet ${fp.slug} at ${fp.base}`); out(`self: ${report.myLabel ?? '(this pane is not in the roster)'}`);
  printMembers(out, report);
  for (const r of report.rows) if (r.state !== 'acked') out(`PENDING ${r.from}->${r.to}#${r.seq} ${r.state}${r.detail ? ` (${r.detail})` : ''}`);
  for (const u of report.unanswered) out(`UNANSWERED ${u.ref} owed by ${u.owedBy}`);
  for (const w of report.warn) out(`WARN ${w}`);
  out(`doorbells ${report.doorbells}, re-sent ${report.resends}, recycled ${report.removed} record(s) + ${report.artifacts} artifact(s), clamped ${report.clamped} cursor(s)`);
  return 0;
}
function cmdClose({ out, fp, report }) {
  if (report.closed) { out(`fleet "${fp.slug}" was already closed`); return 0; }
  publishOnce(fp.base, 'closed', `${JSON.stringify({ closed_at: new Date().toISOString() })}\n`);
  out(`closed fleet "${fp.slug}" with ${report.rows.filter((r) => r.state !== 'acked').length} unacked record(s); no more doorbells, no retries, no recycling, and poll refuses this slug`); out(`the ledger is at ${fp.base} — copy it somewhere durable if you need it past this machine's temp cleanup`);
  return 0;
}

// ------------------------------------------------------------------ entry
const COMMANDS = { new: cmdNew, join: cmdJoin, send: cmdSend, poll: cmdPoll, ack: cmdAck, reconcile: cmdReconcile, close: cmdClose };

/** Every subcommand but `new` opens the ledger and reconciles it first. */
export function run(argv, deps = {}) {
  const env = deps.env ?? process.env, sink = deps.out ?? ((line) => process.stdout.write(`${line}\n`));
  // One printed line stays exactly one line: a channel directory is a POSIX name, may contain a
  // newline, and an unescaped one would let a hand-made directory forge output lines — including a
  // `RUN …` a peer would copy, filing consumption proof for a record it never read.
  const out = (line) => sink(String(line).replace(/[\x00-\x1f\x7f]/g, ' '));
  const io = { herdrExec: deps.herdrExec ?? herdrExec, gitExec: deps.gitExec ?? gitExec }, now = deps.now ?? (() => Date.now());
  const [name, slug] = argv;
  if (!name || !(name in COMMANDS)) { out(`usage: cos <${Object.keys(COMMANDS).join('|')}> <slug> ...  — see SKILL.md`); return 2; }
  if (!slug) { out(`cos ${name}: the fleet slug is required`); return 2; }
  if (!SLUG_RE.test(slug)) { out(`cos ${name}: slug "${slug}" must match ${SLUG_RE}`); return 2; }
  try {
    const fp = fleetPaths(resolveRoot(env), slug);
    const ctx = { io, env, out, now: now(), slug, args: argv.slice(2), fp, readOnly: false, cwd: deps.cwd ?? process.cwd() };
    if (name === 'new') return COMMANDS[name](ctx) ?? 0;
    ctx.readOnly = openFleet(fp).v > PROTOCOL_V;
    ctx.report = coreReconcile(fp, io, env, ctx.now);
    // A closed fleet stops being reconciled: no ringing, no retries, no recycling. A late
    // peer's ack is still taken (it is evidence, not work), and close stays idempotent.
    if (ctx.report.closed && name !== 'ack' && name !== 'close') die(`fleet "${fp.slug}" is closed (${fp.closed}). Nothing more is sent or reconciled; continue with a new slug. The ledger stays readable at ${fp.base}.`);
    return COMMANDS[name](ctx) ?? 0;
  } catch (e) {
    const message = e instanceof CosError ? e.message : `unexpected ${e?.code ?? e?.name}: ${e?.message}`;
    out(`cos ${name}: ${message}`);
    return 1;
  }
}

// Run when invoked as a program, including through a symlink or an alias elsewhere: node hands
// import.meta.url over already realpathed, so comparing argv[1] raw would no-op silently and exit 0.
let invoked = ''; try { invoked = realpathSync(process.argv[1] ?? ''); } catch { /* not a readable path: no match either way */ }
if (invoked === SELF_PATH) process.exitCode = run(process.argv.slice(2));
