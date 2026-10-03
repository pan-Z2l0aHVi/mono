/**
 * L1: the losslessness assertions for the herdr-cos ledger.
 *
 * Everything herdr-facing here is a fake injected through the herdrExec port, so
 * these run without a server, without a network, and without a pane. Run them with:
 *
 *   node --test <this file>
 *
 * The six fault injections are the acceptance row "不丢" in the plan: duplicate
 * doorbell, sequence collision, a publish killed halfway, cursors ahead of acks,
 * the whole cursors/ directory deleted, and manifest.json deleted.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, existsSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { run, gitExec as realGitExec } from '../scripts/cos.mjs';

const LEAD_PANE = 'w1:p1';
/** A git port that answers nothing, for the direct `run()` calls that must never shell out to git. */
const noGit = () => ({ ok: false, code: 'spawn_failed', message: 'no git in this test', stdout: '' });

/** A stand-in for herdr: panes, agents on them, and a log of every call made. */
function makeWorld(start = []) {
  const world = {
    panes: new Map(),
    calls: [],
    gitCalls: [],
    branches: new Set(),
    repo: '/fake/repo',
    failWorktree: null,
    agentStarts: 0,
    agentStartArgv: [],
    failAgentStart: null,
    nextPane: 2,
    add(pane) {
      world.panes.set(pane.pane_id, { status: 'idle', seq: 1, agent: null, terminal_id: `t${pane.pane_id}`, ...pane });
      return world.panes.get(pane.pane_id);
    },
  };
  // The second port: git, faked so no test ever creates a real worktree or touches the checkout
  // the suite runs from. Set world.repo = null to stand for a lead outside any repo.
  world.gitExec = (argv) => {
    world.gitCalls.push(argv);
    if (argv[0] === 'rev-parse' && argv[1] === '--show-toplevel') {
      return world.repo
        ? { ok: true, code: null, message: '', stdout: `${world.repo}\n` }
        : { ok: false, code: 'exit_128', message: 'fatal: not a git repository', stdout: '' };
    }
    if (argv.includes('worktree') && argv.includes('add')) {
      if (world.failWorktree) return { ok: false, code: 'exit_255', message: world.failWorktree, stdout: '' };
      const branch = argv[argv.indexOf('-b') + 1];
      if (world.branches.has(branch)) return { ok: false, code: 'exit_255', message: `fatal: a branch named '${branch}' already exists`, stdout: '' };
      world.branches.add(branch);
      return { ok: true, code: null, message: `Preparing worktree (new branch '${branch}')`, stdout: '' };
    }
    if (argv.includes('worktree') && argv.includes('remove')) {
      return { ok: true, code: null, message: '', stdout: '' };
    }
    if (argv.includes('branch') && argv.includes('-d')) {
      world.branches.delete(argv[argv.indexOf('-d') + 1]);
      return { ok: true, code: null, message: '', stdout: '' };
    }
    return { ok: false, code: 'cli_usage_error', message: `fake git: unhandled ${argv.join(' ')}`, stdout: '' };
  };
  for (const p of start) world.add(p);
  world.exec = (argv) => {
    world.calls.push(argv);
    const [group, sub] = argv;
    const find = (id) => world.panes.get(String(id));
    if (group === 'agent' && sub === 'list') {
      const agents = [...world.panes.values()].filter((p) => p.agent).map((p) => ({
        pane_id: p.pane_id, terminal_id: p.terminal_id, name: p.agent, agent: p.agent,
        agent_status: p.status, state_change_seq: p.seq,
      }));
      return { ok: true, code: null, message: null, result: { type: 'agent_list', agents } };
    }
    if (group === 'pane' && sub === 'get') {
      // herdr's own pane is addressed with --current, not with an id.
      const p = argv[2] === '--current' ? world.panes.get(world.current ?? LEAD_PANE) : find(argv[2]);
      if (!p) return { ok: false, code: 'pane_not_found', message: `no pane ${argv[2]}`, result: null };
      return {
        ok: true, code: null, message: null,
        result: { type: 'pane_info', pane: { pane_id: p.pane_id, terminal_id: p.terminal_id, agent: p.agent, agent_status: p.agent ? p.status : null } },
      };
    }
    if (group === 'pane' && sub === 'split') {
      const id = `w1:p${world.nextPane++}`;
      world.add({ pane_id: id, terminal_id: `t${id}` });
      return { ok: true, code: null, message: null, result: { type: 'pane_info', pane: { ...world.panes.get(id) } } };
    }
    if (group === 'pane' && sub === 'move') {
      const p = find(argv[2]);
      if (!p) return { ok: false, code: 'pane_not_found', message: 'gone', result: null };
      p.tab_id = argv.includes('--new-tab') ? `w1:t${world.nextPane++}` : p.tab_id;
      // A move inside one workspace keeps its pane id; only a cross-workspace move
      // re-qualifies it (herdr SKILL.md). The id is reported either way.
      return {
        ok: true, code: null, message: null,
        result: { type: 'pane_move', move_result: { pane: { ...p }, previous_pane_id: p.pane_id } },
      };
    }
    if (group === 'agent' && sub === 'start') {
      world.agentStarts += 1;
      world.agentStartArgv.push(argv);
      if (world.failAgentStart) return { ok: false, code: world.failAgentStart, message: 'agent blocked at startup', result: null };
      const p = find(argv[argv.indexOf('--pane') + 1]);
      if (!p) return { ok: false, code: 'pane_not_found', message: `no pane ${argv[argv.indexOf('--pane') + 1]}`, result: null };
      p.agent = argv[2];
      return { ok: true, code: null, message: null, result: { type: 'agent_started', agent: { ...p, name: p.agent } } };
    }
    if (group === 'agent' && sub === 'prompt') {
      const p = find(argv[2]);
      if (!p?.agent) return { ok: false, code: 'agent_not_found', message: `no agent on ${argv[2]}`, result: null };
      if (p.status === 'blocked') return { ok: false, code: 'agent_blocked', message: 'approval dialog', result: null };
      p.seq += 1;
      p.inbox = [...(p.inbox ?? []), argv[3]];
      // herdr's agent prompt result carries the agent, including the counter the
      // sender stores as its "nothing has run yet" baseline.
      return { ok: true, code: null, message: null, result: { type: 'agent_prompted', agent: { ...p, name: p.agent, state_change_seq: p.seq } } };
    }
    if (group === 'pane' && sub === 'run') {
      const p = find(argv[2]);
      if (!p) return { ok: false, code: 'pane_not_found', message: 'no pane', result: null };
      p.inbox = [...(p.inbox ?? []), argv[3]];
      return { ok: true, code: null, message: null, result: { type: 'ok' } };
    }
    return { ok: false, code: 'cli_usage_error', message: `fake herdr: unhandled ${argv.join(' ')}`, result: null };
  };
  return world;
}

function makeHerd(startPanes = [{ pane_id: LEAD_PANE }]) {
  const home = mkdtempSync(join(tmpdir(), 'cos-l1-'));
  const world = makeWorld(startPanes);
  const lines = [];
  const h = {
    home,
    world,
    lines,
    env: { HERDR_COS_HOME: home, HERDR_PANE_ID: LEAD_PANE, TMPDIR: home },
    now: () => Date.now(),
    call: (argv, extra = {}) => run(argv, { env: h.env, herdrExec: world.exec, gitExec: world.gitExec, out: (l) => lines.push(l), now: h.now, ...extra }),
    at: (offsetMs, argv, pane) => {
      const env = pane ? { ...h.env, HERDR_PANE_ID: pane } : h.env;
      const before = lines.length;
      const code = run(argv, { env, herdrExec: world.exec, gitExec: world.gitExec, out: (l) => lines.push(l), now: () => h.now() + offsetMs });
      return { code, out: lines.slice(before) };
    },
    fleet: (slug = 'f') => join(home, 'fleets', slug),
    records: (slug, chan) => {
      const dir = join(h.fleet(slug), 'channels', chan);
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((n) => /^\d+\.json$/.test(n)).map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')));
    },
    ackFiles: (slug, key) => {
      const dir = join(h.fleet(slug), 'acks', key);
      return existsSync(dir) ? readdirSync(dir) : [];
    },
  };
  return h;
}

function newFleet(h, slug = 'f') {
  assert.equal(h.call(['new', slug]), 0, h.lines.join('\n'));
  return h;
}

test('new claims a fleet, writes a write-once manifest and a renderable contract', () => {
  const h = newFleet(makeHerd());
  const manifest = JSON.parse(readFileSync(join(h.fleet(), 'manifest.json'), 'utf8'));
  assert.equal(manifest.slug, 'f');
  assert.equal(manifest.root, h.home);
  assert.equal(manifest.v, 1);
  const lead = JSON.parse(readFileSync(join(h.fleet(), 'members', 'lead.json'), 'utf8'));
  assert.equal(lead.pane_id, LEAD_PANE);
  const contract = readFileSync(join(h.fleet(), 'peer-contract.md'), 'utf8');
  assert.match(contract, /## Do exactly this/);
  assert.ok(contract.includes(join(h.home, 'fleets', 'f', 'peer-contract.md')), 'the contract names its own absolute path');
  for (const sub of ['new', 'join', 'send', 'poll', 'ack', 'reconcile', 'close']) {
    assert.match(contract, new RegExp(`cos\\.mjs' ${sub} f`), `the contract carries the ${sub} signature`);
  }
  assert.match(contract, /node '[^']+cos\.mjs' ack f <from> <seq>/, 'the ack line is shell-quoted, so it survives an install path with a space');
});

test('the contract points at members/ for the roster and names all four member states', () => {
  const h = fleetWithMembers(2);
  const contract = readFileSync(join(h.fleet(), 'peer-contract.md'), 'utf8');
  const roster = contract.split('\n').filter((l) => l.startsWith('Roster:')).join(' ');
  assert.match(roster, /the files in `[^`]*\/members\/`/, 'a peer lists members/ rather than reading a roster out of the contract');
  assert.ok(!/\bm\d\b/.test(roster), 'and that sentence enumerates nobody: the roster is derived, so listing it here would go stale');
  assert.match(contract, /MEMBER <label>\s+creating\|ready\|failed\|gone/, 'the whole member-state set is in front of a peer, so it can report `failed` rather than invent a word');
  for (const [prefix, word] of [['NEW', 'work waiting on you'], ['OUT', 'your own unacked sends'], ['UNANSWERED', 'reported, never auto-redone']]) {
    assert.ok(contract.includes(prefix), `the poll vocabulary dropped ${prefix} (${word})`);
  }
});

test('adding a member leaves the rendered contract byte-for-byte alone', () => {
  const h = newFleet(newHerdForJoin());
  const file = join(h.fleet(), 'peer-contract.md');
  const before = readFileSync(file);
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.equal(h.call(['join', 'f', 'down', 'codex']), 0, h.lines.join('\n'));
  assert.ok(readFileSync(file).equals(before), 'two members joined and nothing in the contract needed rewriting — it carries no derived data');
});

test('a second lead on the same slug is refused, not silently shared', () => {
  const h = newFleet(makeHerd());
  const before = h.lines.length;
  assert.equal(h.call(['new', 'f']), 1);
  assert.match(h.lines.slice(before).join('\n'), /already claimed/);
});

test('join publishes one member file per label and never re-starts a failed agent', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  const labels = readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')).sort();
  assert.deepEqual(labels, ['lead.json', 'm1.json']);
  assert.equal(h.world.agentStarts, 1);
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0);
  assert.deepEqual(readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')).sort(), ['lead.json', 'm1.json', 'm2.json']);
});

test('join starts a member under the args its kind needs, and none for an unlisted kind', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  const codexStart = h.world.agentStartArgv.at(-1);
  assert.deepEqual(
    codexStart.slice(codexStart.indexOf('--')),
    ['--', '--approve-for-me'],
    'a codex member runs with --approve-for-me: on its own defaults it stops at an approval dialog, which reads as blocked, and a blocked member has its doorbell withheld'
  );

  assert.equal(h.call(['join', 'f', 'right', 'gemini']), 0, h.lines.join('\n'));
  const geminiStart = h.world.agentStartArgv.at(-1);
  assert.equal(geminiStart.includes('--'), false, 'an unlisted kind starts on its own defaults, with no stray --');
  // claude is left out on purpose: --dangerously-skip-permissions bypasses the permission layer
  // outright, which is the gap the benchmark research asks to close. See PROTOCOL.md.
  assert.equal(h.call(['join', 'f', 'down', 'claude']), 0, h.lines.join('\n'));
  assert.equal(h.world.agentStartArgv.at(-1).includes('--'), false, 'claude gets no args, so it keeps its own defaults');
  // The args configure the member process only; the ledger records the kind and nothing else.
  assert.equal(JSON.parse(readFileSync(join(h.fleet(), 'members', 'm2.json'), 'utf8')).kind, 'gemini');
});

test('a kind that names an Object.prototype member joins instead of throwing', () => {
  // AGENT_ARGS is a plain object literal, so AGENT_ARGS['constructor'] is a function rather than
  // undefined. Spreading one throws — and it throws after pane split and pane move, which strays
  // a pane the ledger never records. Prototype-named kinds reach the lookup unfiltered: --kind is
  // validated by herdr, but the lookup happens before herdr is called.
  for (const kind of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
    const h = newFleet(newHerdForJoin());
    assert.equal(h.call(['join', 'f', 'right', kind]), 0, `${kind}: ${h.lines.join('\n')}`);
    const start = h.world.agentStartArgv.at(-1);
    assert.equal(start.includes('--'), false, `${kind} is not a kind this table knows, so it starts unadorned`);
    assert.equal(h.call(['join', 'f', 'right', 'gemini']), 0, `${kind}: the fleet is still usable afterwards`);
  }
});

function newHerdForJoin() {
  return makeHerd([{ pane_id: LEAD_PANE, agent: 'lead-agent' }]);
}

test('two members under a 40-character slug still get two distinct agent names', () => {
  const long = 's'.repeat(40);
  const h = newFleet(newHerdForJoin(), long);
  assert.equal(h.call(['join', long, 'right', 'codex']), 0, h.lines.join('\n'));
  assert.equal(h.call(['join', long, 'right', 'codex']), 0, h.lines.join('\n'));
  const names = ['m1', 'm2'].map((l) => JSON.parse(readFileSync(join(h.fleet(long), 'members', `${l}.json`), 'utf8')).agent);
  assert.equal(new Set(names).size, 2, `${names} collapsed onto one name`);
  for (const n of names) assert.ok(n.length <= 32, `${n} is over herdr's 32-character name limit`);
});

test('a half-created member never opens a second agent', () => {
  const h = newFleet(newHerdForJoin());
  h.world.failAgentStart = 'agent_not_ready';
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 1);
  assert.match(h.lines.slice(before).join('\n'), /not retrying agent start/);
  assert.match(h.lines.slice(before).join('\n'), /then cos join a fresh member/,
    'the advice must name the branch that works');
  assert.doesNotMatch(h.lines.slice(before).join('\n'), /then run cos reconcile|reconcile (fixes|it)/,
    'and must not send the reader to reconcile: a null binding is permanent, so reconciling repairs nothing');
  assert.equal(h.world.agentStarts, 1, 'agent start must not be retried: a retry opens a duplicate agent');
  const labels = readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json'));
  assert.equal(labels.length, 2, 'the half-success is registered, not left as an orphan pane');
  const out = h.call(['reconcile', 'f']);
  const text = h.lines.slice().join('\n');
  assert.equal(out, 0);
  assert.match(text, /MEMBER m1 ready/, 'no agent was ever bound, so it is a live bare pane: reachable, and every bell to it says it is only a notice');
  assert.doesNotMatch(text, /MEMBER m1 \w+ .*unknown/);
});

test('a move that keeps its pane id says nothing, one that re-qualifies it retires the old id out loud', () => {
  const h = newFleet(newHerdForJoin());
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.doesNotMatch(h.lines.slice(before).join('\n'), /stale/, 'this move kept the id, so there is nothing to retire');
  const real = h.world.exec;
  h.world.exec = (argv) => {
    const res = real(argv);
    if (argv[0] === 'pane' && argv[1] === 'move' && res.ok && res.result.move_result) {
      const old = String(argv[2]), p = h.world.panes.get(old);
      h.world.panes.delete(old);
      p.pane_id = 'w1:p9';
      h.world.panes.set('w1:p9', p);
      res.result.move_result = { pane: { ...p }, previous_pane_id: old };
    }
    return res;
  };
  const second = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.match(h.lines.slice(second).join('\n'), /pane id after the move is w1:p9; w1:p\d+ is stale/, 'herdr re-qualified the pane, so the id split handed out is dead');
  const m2 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm2.json'), 'utf8'));
  assert.equal(m2.pane_id, 'w1:p9', 'the member file records the id the move returned, not the one split proposed');
  h.world.exec = real;
  assert.equal(h.call(['send', 'f', 'm2', 'after the re-qualification']), 0, h.lines.join('\n'));
  assert.equal(h.world.calls.filter((c) => c[1] === 'prompt').at(-1)[2], 'w1:p9', 'the bell goes to the pane that exists now');
});

test('a member whose agent herdr has not listed is creating, then failed at the threshold, and neither files a member', () => {
  const h = fleetWithMembers(1);
  const m1File = join(h.fleet(), 'members', 'm1.json');
  const m1 = JSON.parse(readFileSync(m1File, 'utf8'));
  assert.equal(m1.agent, 'cos-m1-f', 'the member file records the name it was started under');
  // What herdr does to a name when the process owning it exits: the pane stays, the agent does not.
  h.world.panes.get(m1.pane_id).agent = null;
  const starts = h.world.agentStarts;
  const before = h.lines.length;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.slice(before).join('\n'), /MEMBER m1 creating .*\(the agent is not visible to herdr yet\)/,
    'the triple does not resolve while the pane lives, which is launching, not gone');
  assert.equal(h.world.agentStarts, starts, 'creating must never open a second agent');
  assert.deepEqual(readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')).sort(), ['lead.json', 'm1.json'],
    'no second member file for the same label');
  const bytes = readFileSync(m1File, 'utf8');
  const second = h.lines.length;
  assert.equal(h.call(['reconcile', 'f']), 0);
  assert.equal(readFileSync(m1File, 'utf8'), bytes, 'the member file keeps its bytes across a stuck pass');
  // Two passes with no progress is the whole definition of `failed`, so a member herdr never listed
  // reaches it too — the plan's half-success judgement, not a `ready`-only decoration.
  assert.match(h.lines.slice(second).join('\n'), /MEMBER m1 failed kind=codex no-progress=2 .*\(the agent is not visible to herdr yet\)/,
    'the second unproductive pass is reported as failed, with the reason kept');
  assert.equal(h.world.agentStarts, starts, 'the failed judgement starts nothing either');
  // The count saturates, because it only has to answer "two passes yet?". Three more passes must not keep filing.
  const third = h.lines.length;
  for (let pass = 0; pass < 3; pass += 1) assert.equal(h.call(['reconcile', 'f']), 0);
  const filed = join(h.fleet(), 'failures', 'm1');
  assert.deepEqual(existsSync(filed) ? readdirSync(filed).sort() : [], ['1', '2'], 'the counter stops at the threshold that makes it a report');
  assert.match(h.lines.slice(third).join('\n'), /MEMBER m1 failed kind=codex no-progress=2/, 'it reports the saturated count, never a growing one');
});

test('dispatch costs one agent list plus N doorbells and no wait flag', () => {
  const h = fleetWithMembers(3);
  h.world.calls.length = 0;
  assert.equal(h.call(['send', 'f', 'm1,m2,m3', 'review this']), 0, h.lines.join('\n'));
  const lists = h.world.calls.filter((c) => c[0] === 'agent' && c[1] === 'list');
  const prompts = h.world.calls.filter((c) => c[0] === 'agent' && c[1] === 'prompt');
  assert.equal(lists.length, 1, 'one fleet read for a fan-out');
  assert.equal(prompts.length, 3, 'one doorbell per recipient');
  assert.ok(h.world.calls.every((c) => !c.includes('--wait')), 'nothing in dispatch may wait');
  for (let i = 1; i < prompts.length; i += 1) {
    assert.equal(prompts[i - 1][2] !== prompts[i][2], true, 'each doorbell targets a distinct pane');
  }
  assert.deepEqual(h.world.calls.slice(1).map((c) => `${c[0]} ${c[1]}`), ['agent prompt', 'agent prompt', 'agent prompt'],
    'the next bell rings as soon as the last returns: nothing is interleaved between two doorbells');
  assert.equal(h.records('f', 'lead->m1').length, 1);
  assert.equal(h.records('f', 'lead->m2').length, 1);
  assert.match(h.lines.join('\n'), /doorbells 3 of 3/, 'send states how many bells went out, so a fan-out does not have to be graded from the absence of a warning');
});

test("send's tally counts the bells it rang, not the one its opening pass re-rung", () => {
  const h = fleetWithMembers(2);
  assert.equal(h.call(['send', 'f', 'm1', 'first brief']), 0, h.lines.join('\n'));
  const slot = join(h.fleet(), 'cursors', 'lead~m1.s');
  writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000 }));
  const r = h.at(300_000, ['send', 'f', 'm2', 'second brief']);
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out.join('\n'), /lead->m1#1: unproven — re-sent the doorbell once/, 'this send opened with a pass that re-rang an older owed record');
  assert.equal(h.world.panes.get('w1:p2').inbox.length, 2, 'so a bell for m1 genuinely did go out inside this call');
  assert.match(r.out.join('\n'), /doorbells 1 of 1/, 'the tally still counts only this call: one record published, one bell rung for it');
});

test('a withheld bell is counted in M and never in N', () => {
  const blocked = fleetWithMembers(2);
  const m2Pane = JSON.parse(readFileSync(join(blocked.fleet(), 'members', 'm2.json'), 'utf8')).pane_id;
  blocked.world.panes.get(m2Pane).status = 'blocked';
  const r = blocked.at(0, ['send', 'f', 'm1,m2', 'one body two recipients']);
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out.join('\n'), /doorbell withheld — m2 is at an approval dialog/, r.out.join('\n'));
  assert.match(r.out.join('\n'), /doorbells 1 of 2/, 'one published record was rung, the other was not');
  const notice = newFleet(makeHerd());
  assert.equal(notice.call(['join', 'f', 'right']), 0, notice.lines.join('\n'));
  notice.lines.length = 0;
  const n = notice.at(0, ['send', 'f', 'm1', 'ping']);
  assert.match(n.out.join('\n'), /as a notice, not consumed/, n.out.join('\n'));
  assert.equal(notice.world.panes.get('w1:p2').inbox.length, 1, 'the line did reach the pane');
  assert.match(n.out.join('\n'), /doorbells 0 of 1/, 'a bare pane is not a handover: nothing is consumed until someone acks');
});

test('a ready member nothing is owed to is never failed, however many passes go by', () => {
  const h = fleetWithMembers(1);
  for (let pass = 0; pass < 5; pass += 1) assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /MEMBER m1 ready/, h.lines.join('\n'));
  assert.doesNotMatch(h.lines.join('\n'), /MEMBER m1 failed/, 'five quiet passes must not invent a verdict on an idle member');
  assert.ok(!existsSync(join(h.fleet(), 'failures', 'm1')), 'nothing owed, so no pass can be unproductive');
});

test('a gone member files no markers, because failed is not a second name for gone', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0, h.lines.join('\n'));
  h.world.panes.delete('w1:p2');
  for (let pass = 0; pass < 3; pass += 1) assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.ok(!existsSync(join(h.fleet(), 'failures', 'm1')), 'absence files nothing, so it can never count to a threshold');
  assert.doesNotMatch(h.lines.join('\n'), /MEMBER m1 failed/, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /MEMBER m1 gone/, h.lines.join('\n'));
});

test('a hand-made marker above the cap is read, reported, and removed whole — never edited', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0, h.lines.join('\n'));
  const slot = join(h.fleet(), 'cursors', 'lead~m1.s');
  writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000 }));
  // Someone files a marker cos would never write, above the saturation point, to see what the count reads.
  const dir = join(h.fleet(), 'failures', 'm1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '7'), `${JSON.stringify({ label: 'm1', n: 7, acks: 0 })}\n`);
  const stuck = h.at(300_000, ['reconcile', 'f']);
  assert.equal(stuck.code, 0, stuck.out.join('\n'));
  assert.match(stuck.out.join('\n'), /MEMBER m1 failed/, 'the cap says what cos files, not what cos reports');
  assert.match(stuck.out.join('\n'), /no-progress=7/, 'the count is the highest marker name, so a hand-made one reads back verbatim');
  assert.deepEqual(readdirSync(dir), ['7'], 'saturated means saturated: a pass past the cap files no eighth marker');
  // The re-ring restarts that record's deadline, so the next pass is productive for m1 and clears the count.
  const clear = h.at(0, ['reconcile', 'f']);
  assert.equal(clear.code, 0, clear.out.join('\n'));
  assert.ok(!existsSync(dir), 'one productive pass removes the whole directory: markers are never edited down, only dropped');
  assert.match(clear.out.join('\n'), /MEMBER m1 ready/, 'and the member is ready again, with no residue of the inflated count');
});

test('a hand-made marker that is not JSON stops the pass that reads it instead of counting as zero', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0, h.lines.join('\n'));
  const slot = join(h.fleet(), 'cursors', 'lead~m1.s');
  writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000 }));
  const dir = join(h.fleet(), 'failures', 'm1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '3'), ''); // what `touch failures/m1/3` leaves behind
  const r = h.at(300_000, ['reconcile', 'f']);
  assert.equal(r.code, 1, r.out.join('\n'));
  assert.match(r.out.join('\n'), /^cos reconcile: unexpected SyntaxError/m, 'the newest marker holds the ack watermark, so an unreadable one cannot be guessed at');
  assert.equal(readdirSync(dir).length, 1, 'the failing pass filed nothing alongside the marker it could not read');
});

test('the first ack past a marker\'s watermark clears the count while the member is still stuck', () => {
  const h = fleetWithMembers(2);
  assert.equal(h.call(['send', 'f', 'm1', 'owed past the deadline']), 0, h.lines.join('\n'));
  // Past the deadline with one re-send already spent (`r: 1` written by hand), so the row reads
  // `dead` — the one state retryDue reports and never acts on, which keeps the slot still and this
  // member stuck for every pass below. The baseline `b` is the one the original send captured: a
  // retry re-baselines it, and `retryDue` only reaches `unproven` rows, so nothing re-baselines here.
  const slot = join(h.fleet(), 'cursors', 'lead~m1.s');
  writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000, r: 1 }));
  const dir = join(h.fleet(), 'failures', 'm1');
  const first = h.at(300_000, ['reconcile', 'f']);
  assert.equal(first.code, 0, first.out.join('\n'));
  assert.match(first.out.join('\n'), /^PENDING lead->m1#1 dead/m, 'the ladder has already given up on this record');
  assert.deepEqual(readdirSync(dir), ['1'], 'one stuck pass files one marker, and one marker is not yet `failed`');
  const second = h.at(300_000, ['reconcile', 'f']);
  assert.match(second.out.join('\n'), /^MEMBER m1 failed/m, 'the second stuck pass is what makes `failed`, so there is a count to clear');
  // m1 consumed something else entirely — another sender's channel, filed out of band here, which is
  // the only way to move its ack count without running a pass in m1's own pane (that pass would read
  // lead->m1#1 as `pending` and clear the marker through the other branch of the same test).
  const other = join(h.fleet(), 'acks', 'm1~m2');
  mkdirSync(other, { recursive: true });
  writeFileSync(join(other, '1.json'), '');
  const third = h.at(300_000, ['reconcile', 'f']);
  assert.equal(third.code, 0, third.out.join('\n'));
  assert.match(third.out.join('\n'), /^PENDING lead->m1#1 dead/m, 'still owed, still stuck, and the record was never rewritten');
  assert.ok(!existsSync(dir), 'so the count goes: progress is measured against the watermark inside the marker, not against this channel');
  assert.match(third.out.join('\n'), /^MEMBER m1 ready/m, 'one ack elsewhere is enough to un-fail a member herdr still lists');
});

test('the pull cadence line appears only while something outbound is unacked', () => {
  const h = fleetWithMembers(2);
  const quiet = h.at(0, ['poll', 'f']);
  assert.equal(quiet.code, 0, quiet.out.join('\n'));
  assert.doesNotMatch(quiet.out.join('\n'), /pull again/, 'nothing is owed, so there is no cadence to hand out');
  assert.equal(h.call(['send', 'f', 'm1', 'a task']), 0, h.lines.join('\n'));
  const owed = h.at(0, ['poll', 'f']);
  assert.match(owed.out.join('\n'), /OUT lead->m1#1 pending/, 'poll says what is owed with an OUT line');
  assert.match(owed.out.join('\n'), /pull again in 30s; ack deadline 240s/, 'and only then states the rhythm — both numbers are the written estimates, so this line is where they are pinned');
});

test('reconcile uses PENDING where poll uses OUT, and counts its own retry in its tally', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0, h.lines.join('\n'));
  const seen = h.at(0, ['poll', 'f']);
  assert.match(seen.out.join('\n'), /^OUT lead->m1#1 pending$/m, 'poll names a row of yours with an OUT line');
  const slot = join(h.fleet(), 'cursors', 'lead~m1.s');
  writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000 }));
  const r = h.at(300_000, ['reconcile', 'f']);
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out[0], /^fleet f at /, 'the fleet header is reconcile\'s first line');
  assert.match(r.out[1], /^self: lead$/, 'and the label it is speaking as is its second, so nobody reads one member\'s ladder as another\'s');
  assert.match(r.out.join('\n'), /^PENDING lead->m1#1 unproven/m, 'the same row is PENDING here and OUT in poll, which is why both words are in the eval assertions');
  assert.match(r.out.join('\n'), /^doorbells 1, re-sent 1/m, 'the retry is counted in both numbers, and this tally line is what the replay scenario reads');
});

test('a seventh member is taken with a note, and every pass that reports the fleet warns about it', () => {
  const h = fleetWithMembers(4); // lead + m1..m4
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.ok(!h.lines.join('\n').includes('note:'), 'six counting the lead is the recommendation itself, so the sixth member hears nothing extra');
  h.lines.length = 0;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.ok(!h.lines.join('\n').includes('members exceeds the recommended'), 'and the reporting pass stays quiet at exactly six: the warning is for a fleet over the recommendation, not one at it');
  h.lines.length = 0;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /joined m6 at pane/, 'nothing refuses the extra member');
  assert.match(h.lines.join('\n'), /note: 7 members, over the recommended 6/, 'and the count is stated as advice, in its own wording');
  h.lines.length = 0;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /WARN 7 members exceeds the recommended 6/, 'a pass that reports the fleet says it as a warning instead');
  h.lines.length = 0;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /note: 8 members, over the recommended 6/, 'join keeps its own wording as the fleet grows');
  assert.ok(!h.lines.join('\n').includes('WARN 8 members'), 'and join never prints the warning: it is the reporting passes that carry it, not all seven');
  h.lines.length = 0;
  assert.equal(h.call(['poll', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /WARN 8 members exceeds the recommended 6/, 'poll reports the same fact');
  h.lines.length = 0;
  assert.equal(h.call(['close', 'f']), 0, h.lines.join('\n'));
  assert.ok(!h.lines.join('\n').includes('members exceeds the recommended'), 'close prints neither wording');
});

test('the doorbell is one short line and never carries the body', () => {
  const h = fleetWithMembers(1);
  h.world.calls.length = 0;
  const long = 'x'.repeat(4000);
  assert.equal(h.call(['send', 'f', 'm1', long]), 0, h.lines.join('\n'));
  const prompt = h.world.calls.find((c) => c[1] === 'prompt');
  assert.ok(prompt[3].startsWith('cosa '), prompt[3]);
  assert.ok(Buffer.byteLength(prompt[3]) < 400, 'doorbell stays short whatever the body is');
  const arts = readdirSync(join(h.fleet(), 'artifacts'));
  assert.equal(arts.length, 1);
  assert.equal(readFileSync(join(h.fleet(), 'artifacts', arts[0]), 'utf8'), long);
  const rec = h.records('f', 'lead->m1')[0];
  assert.equal(rec.text, '');
  assert.ok(rec.file.endsWith('#1.md'), rec.file);
  assert.ok(rec.file.includes(h.fleet()));
});

test('a body at the threshold stays in the record, one byte over does not', () => {
  const h = fleetWithMembers(1);
  const at = 'y'.repeat(1500), over = 'y'.repeat(1501);
  assert.equal(h.call(['send', 'f', 'm1', at]), 0, h.lines.join('\n'));
  assert.equal(readdirSync(join(h.fleet(), 'artifacts')).length, 0, '1500 bytes is still inside the record');
  assert.equal(h.records('f', 'lead->m1')[0].text, at);
  assert.equal(h.call(['send', 'f', 'm1', over]), 0, h.lines.join('\n'));
  assert.equal(readdirSync(join(h.fleet(), 'artifacts')).length, 1, '1501 bytes lands in artifacts/');
  assert.equal(h.records('f', 'lead->m1')[1].text, '', 'and its record carries only the path');
});

test('a body stranded by a killed publish moves the next send along, not onto it', () => {
  const h = fleetWithMembers(1);
  const long = 'x'.repeat(2000);
  assert.equal(h.call(['send', 'f', 'm1', long]), 0, h.lines.join('\n'));
  // The half-crash this leaves behind: the body for #2 is published, its record never was.
  writeFileSync(join(h.fleet(), 'artifacts', 'lead->m1#2.md'), 'orphan');
  assert.equal(h.call(['send', 'f', 'm1', long]), 0, 'the send must not die accusing a number of being handed out twice');
  assert.deepEqual(readdirSync(join(h.fleet(), 'channels', 'lead->m1')).filter((n) => n.endsWith('.json')).sort(), ['1.json', '3.json'],
    'the contested number is skipped, never overwritten and never re-argued over');
  assert.equal(JSON.parse(readFileSync(join(h.fleet(), 'channels', 'lead->m1', '3.json'), 'utf8')).file,
    join(h.fleet(), 'artifacts', 'lead->m1#3.md'), 'and the record names a body that really is there');
});

test('injection: a duplicate doorbell is acked once and consumes nothing twice', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'do the thing']), 0);
  const m1 = h.world.panes.get('w1:p2');
  assert.equal(m1.agent, 'cos-m1-f');
  assert.equal(h.call(['ack', 'f', 'lead', '1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' } }), 0, h.lines.join('\n'));
  const before = h.lines.length;
  assert.equal(run(['ack', 'f', 'lead', '1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' }, herdrExec: h.world.exec, out: (l) => h.lines.push(l), now: h.now }), 0);
  assert.match(h.lines.slice(before).join('\n'), /already acked/);
  assert.deepEqual(h.ackFiles('f', 'm1~lead'), ['1.json']);
  assert.equal(h.call(['reconcile', 'f']), 0, 'the writer reconciles after the ack');
  assert.equal(h.records('f', 'lead->m1').length, 0, 'an acked record is recycled by its own writer');
  assert.equal(h.call(['send', 'f', 'm1', 'next']), 0, h.lines.join('\n'));
  assert.deepEqual(h.records('f', 'lead->m1').map((r) => r.seq), [2], 'a recycled number is never handed out again: the ack directory is the floor');
});

test('injection: a colliding sequence number is worked around, never overwritten', () => {
  const h = fleetWithMembers(1);
  const dir = join(h.fleet(), 'channels', 'lead->m1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '1.json'), JSON.stringify({ v: 1, fleet: 'f', seq: 1, from: 'lead', to: 'm1', type: 'send', re: null, text: 'pre-existing', file: null }));
  const mtime = statSync(join(dir, '1.json')).mtimeMs;
  const contentBefore = readFileSync(join(dir, '1.json'), 'utf8');
  assert.equal(h.call(['send', 'f', 'm1', 'second']), 0, h.lines.join('\n'));
  assert.equal(readFileSync(join(dir, '1.json'), 'utf8'), contentBefore, 'the record that was already there is untouched');
  assert.equal(statSync(join(dir, '1.json')).mtimeMs, mtime, 'and not rewritten in place');
  assert.deepEqual(h.records('f', 'lead->m1').map((r) => r.seq), [1, 2]);
});

test('injection: a publish killed halfway leaves no record and the number is reused', () => {
  const h = fleetWithMembers(1);
  const dir = join(h.fleet(), 'channels', 'lead->m1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '1.999.deadbeef.tmp'), '{"v":1,"seq":1,"text":"half');
  assert.equal(h.call(['send', 'f', 'm1', 'after the kill']), 0);
  const seqs = readdirSync(dir).filter((n) => /^\d+\.json$/.test(n));
  assert.deepEqual(seqs, ['1.json'], 'the stranded temp file is not a record');
  assert.equal(JSON.parse(readFileSync(join(dir, '1.json'), 'utf8')).text, 'after the kill');
});

test('injection: a cursor ahead of the acks is clamped and the record is shown again', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'work']), 0);
  const cursors = join(h.fleet(), 'cursors');
  mkdirSync(cursors, { recursive: true });
  writeFileSync(join(cursors, 'm1~lead.r'), '{"c":99}\n');
  writeFileSync(join(cursors, 'lead~m1.s'), '{"q":1,"b":1,"t":0,"r":0}\n');
  const peer = h.at(300_000, ['poll', 'f'], 'w1:p2');
  assert.equal(peer.code, 0, peer.out.join('\n'));
  assert.match(peer.out.join('\n'), /NEW lead 1 send work/);
  assert.match(peer.out.join('\n'), /^RUN (?:\S+ )+ack f lead 1$/m, 'the RUN line is the ack command itself, runnable verbatim');
  assert.equal(JSON.parse(readFileSync(join(cursors, 'm1~lead.r'), 'utf8')).c <= 1, true, 'the inflated cursor was clamped back');
});

test('an ack of a later record does not hide an earlier one still owed', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'first']), 0, h.lines.join('\n'));
  assert.equal(h.call(['send', 'f', 'm1', 'second']), 0, h.lines.join('\n'));
  assert.equal(h.at(0, ['poll', 'f'], 'w1:p2').code, 0);           // the peer has been shown both
  assert.equal(h.at(0, ['ack', 'f', 'lead', '2'], 'w1:p2').code, 0); // and consumed only the second
  const again = h.at(1000, ['poll', 'f'], 'w1:p2');
  assert.equal(again.code, 0, again.out.join('\n'));
  assert.match(again.out.join('\n'), /^NEW lead 1 send first$/m,
    'the watermark backs up below the oldest record still unacked, so owed work cannot be hidden by a newer ack');
  assert.equal(h.at(0, ['ack', 'f', 'lead', '1'], 'w1:p2').code, 0);
  assert.doesNotMatch(h.at(1000, ['poll', 'f'], 'w1:p2').out.join('\n'), /^NEW/m, 'and it stops once it really is acked');
});

test('injection: deleting the whole cursors directory loses nothing', () => {
  const h = fleetWithMembers(2);
  assert.equal(h.call(['send', 'f', 'm1,m2', 'task one']), 0, h.lines.join('\n'));
  assert.equal(h.call(['ack', 'f', 'lead', '1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' } }), 0);
  rmSync(join(h.fleet(), 'cursors'), { recursive: true, force: true });
  const before = h.lines.length;
  assert.equal(h.call(['poll', 'f']), 0);
  assert.equal(h.call(['send', 'f', 'm2', 'task two']), 0, h.lines.join('\n'));
  const recs = h.records('f', 'lead->m2');
  assert.deepEqual(recs.map((r) => r.seq), [1, 2], 'the cache never owned sequence numbers: losing it reused none');
  assert.deepEqual(h.ackFiles('f', 'm1~lead'), ['1.json'], 'acks are never recycled, even after their record is');
  assert.match(h.lines.slice(before).join('\n'), /fleet f: /);
});

test('injection: a missing manifest is an error, not an empty fleet', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0);
  rmSync(join(h.fleet(), 'manifest.json'));
  const r = h.at(0, ['poll', 'f']);
  assert.equal(r.code, 1);
  assert.match(r.out.join('\n'), /no ledger at .*manifest\.json is missing/);
  assert.equal(h.at(0, ['reconcile', 'f']).code, 1);
  assert.equal(h.records('f', 'lead->m1').length, 1, 'the records were not touched by the failed read');
});

test('a newer protocol version still reads and acks but stops allocating', () => {
  const h = fleetWithMembers(1);
  const mf = join(h.fleet(), 'manifest.json');
  writeFileSync(mf, JSON.stringify({ slug: 'f', v: 99, root: h.home }));
  assert.equal(h.call(['poll', 'f']), 0, h.lines.join('\n'));
  const before = h.lines.length;
  assert.equal(h.call(['send', 'f', 'm1', 'nope']), 1);
  assert.match(h.lines.slice(before).join('\n'), /send refused/);
  assert.equal(h.call(['ack', 'f', 'lead', '1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' } }), 0, 'acking a record you were given stays safe');
});

test('a dead pane yields dead messages, one re-send, then silence', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0, h.lines.join('\n'));
  const dir = join(h.fleet(), 'cursors');
  const cache = JSON.parse(readFileSync(join(dir, 'lead~m1.s'), 'utf8'));
  writeFileSync(join(dir, 'lead~m1.s'), JSON.stringify({ ...cache, t: Date.now() - 300_000 }));
  const out1 = h.at(300_000, ['reconcile', 'f']);
  assert.match(out1.out.join('\n'), /unproven — re-sent the doorbell once/);
  assert.equal(h.world.panes.get('w1:p2').inbox.length, 2, 'the re-send reused the same sequence number, not a new record');
  assert.equal(h.records('f', 'lead->m1').length, 1);
  const out2 = h.at(600_000, ['reconcile', 'f']);
  assert.match(out2.out.join('\n'), /dead \(/);
  assert.equal(h.world.panes.get('w1:p2').inbox.length, 2, 'a second re-send would be a third doorbell: it does not happen');
});

test('a pane that vanished yields dead immediately and is reported gone', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0);
  h.world.panes.delete('w1:p2');
  const r = h.call(['reconcile', 'f']);
  assert.equal(r, 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /MEMBER m1 gone/);
  assert.match(h.lines.join('\n'), /lead->m1#1 dead/);
});

test('an unclassified agent is treated as gone and never as a consumer', () => {
  const h = fleetWithMembers(1);
  h.world.panes.get('w1:p2').status = 'unknown';
  const r = h.call(['reconcile', 'f']);
  assert.equal(r, 0);
  assert.match(h.lines.join('\n'), /MEMBER m1 gone .*\(herdr reports unknown\)/);
});

test('a working peer is queued, not re-doorbelled', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0);
  h.world.panes.get('w1:p2').status = 'working';
  h.world.calls.length = 0;
  const r = h.at(300_000, ['reconcile', 'f']);
  assert.match(r.out.join('\n'), /lead->m1#1 queued/);
  assert.equal(h.world.calls.filter((c) => c[1] === 'prompt').length, 0, 'a working pane must not be poked again');
});

test('a blocked peer hands the approval to a human instead of resending', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0);
  h.world.panes.get('w1:p2').status = 'blocked';
  h.world.calls.length = 0;
  const r = h.at(300_000, ['reconcile', 'f']);
  assert.match(r.out.join('\n'), /lead->m1#1 blocked \(approval dialog in the way\)/);
  assert.equal(h.world.calls.filter((c) => c[1] === 'prompt').length, 0);
});

test('a send that was acked but never answered by a vanished peer is reported', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'question']), 0, h.lines.join('\n'));
  assert.equal(h.call(['ack', 'f', 'lead', '1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' } }), 0, h.lines.join('\n'));
  h.world.panes.delete('w1:p2'); // the debtor vanished: it owes an answer it can no longer give
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /UNANSWERED lead->m1#1 owed by m1/);
  assert.equal(h.records('f', 'lead->m1').length, 1, 'the record is held while an answer is owed: recycling it would delete the only evidence of the debt');
});

test('a doorbell pointing at nothing is reported as missing, outside the ack namespace', () => {
  const h = fleetWithMembers(1);
  const r = h.at(0, ['ack', 'f', 'lead', '7'], 'w1:p2');
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out.join('\n'), /acked lead->m1#7 as MISSING/);
  assert.equal(JSON.parse(readFileSync(join(h.fleet(), 'acks', 'm1~lead', 'missing', '7.json'), 'utf8')).missing, true);
  assert.deepEqual(h.ackFiles('f', 'm1~lead'), ['missing'], 'a report does not sit under a sequence number beside the consumption records');
});

test('a mistranscribed doorbell number is reported, not promoted to the allocation floor', () => {
  const h = fleetWithMembers(1);
  const r = h.at(0, ['ack', 'f', 'lead', '999999999999'], 'w1:p2');
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out.join('\n'), /MISSING/, 'a number the ledger never had is a report about a bad line, not a consumption record');
  assert.equal(h.call(['send', 'f', 'm1', 'the next real task']), 0, h.lines.join('\n'));
  assert.deepEqual(h.records('f', 'lead->m1').map((x) => x.seq), [1],
    'the channel still numbers from 1: a phantom ack must not ratchet every later message up to a trillion');
});

test('a missing report cannot stand in for the ack of a record that later claims its number', () => {
  // A doorbell typo files `missing` at seq 1, and the first real record then lands on 1. If one
  // file could be both a report and a consumption record, that message would read as already
  // consumed: never shown, never re-belled, never recycled. A silent drop wearing a report's name.
  const h = fleetWithMembers(1);
  assert.equal(h.at(0, ['ack', 'f', 'lead', '1'], 'w1:p2').code, 0, h.lines.join('\n'));
  assert.equal(h.call(['send', 'f', 'm1', 'the first real task']), 0, h.lines.join('\n'));
  assert.match(h.at(0, ['poll', 'f'], 'w1:p2').out.join('\n'), /^NEW lead 1 send the first real task$/m, 'the record is still offered');
  assert.equal(h.at(0, ['ack', 'f', 'lead', '1'], 'w1:p2').code, 0, h.lines.join('\n'));
  assert.equal(existsSync(join(h.fleet(), 'acks', 'm1~lead', '1.json')), true, 'real consumption is recorded beside the report');
  assert.equal(h.at(60000, ['reconcile', 'f']).out.join('\n').includes('lead->m1#1 pending'), false, 'and it is terminal afterwards');
});

test('a repeated phantom doorbell still prints its report', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.at(0, ['ack', 'f', 'lead', '9'], 'w1:p2').code, 0);
  const second = h.at(500, ['ack', 'f', 'lead', '9'], 'w1:p2');
  assert.equal(second.code, 0, second.out.join('\n'));
  assert.match(second.out.join('\n'), /acked lead->m1#9 as MISSING/, 'the duplicate is not swallowed because the first report file already exists');
  assert.deepEqual(h.ackFiles('f', 'm1~lead'), ['missing'], 'and still nothing sits beside the consumption records');
});

test('a phantom doorbell on a closed fleet is reported without filing anything', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.at(0, ['close', 'f']).code, 0, h.lines.join('\n'));
  const r = h.at(0, ['ack', 'f', 'lead', '9'], 'w1:p2');
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out.join('\n'), /acked lead->m1#9 as MISSING/, 'the line a human needs still prints');
  assert.deepEqual(h.ackFiles('f', 'm1~lead'), [], 'a closed fleet files no report: nothing there retries, so it would be a write with no reader');
});

test('a late peer can still prove it consumed a real record on a closed fleet', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0, h.lines.join('\n'));
  assert.equal(h.at(0, ['close', 'f']).code, 0, h.lines.join('\n'));
  const r = h.at(0, ['ack', 'f', 'lead', '1'], 'w1:p2');
  assert.equal(r.code, 0, r.out.join('\n'));
  assert.match(r.out.join('\n'), /acked: m1 consumed lead->m1#1/, 'an ack is evidence, not work, so close does not refuse it');
  assert.deepEqual(h.ackFiles('f', 'm1~lead'), ['1.json'], 'the ack alone: no report, no other file');
});

test("a hand-made channel directory gets a warning, never an ack line cos would refuse", () => {
  const h = fleetWithMembers(1);
  const from = "it's b";
  const dir = join(h.fleet(), 'channels', `${from}->lead`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '1.json'), `${JSON.stringify({ v: 1, fleet: 'f', seq: 1, from, to: 'lead', type: 'send', re: null, text: 'hand-made', file: null }, null, 2)}\n`);
  const p = h.at(0, ['poll', 'f']);
  assert.equal(p.code, 0, p.out.join('\n'));
  assert.match(p.out.join('\n'), /NEW it's b 1 send hand-made/, 'the record is still shown: a message is never hidden');
  assert.doesNotMatch(p.out.join('\n'), /^RUN .*it's/m, 'no peer can run a line whose label cos ack would refuse');
  assert.match(p.out.join('\n'), /WARN .*not a label cos ack would accept/);
});

test('peers talk to each other without the lead owning their channel', () => {
  const h = fleetWithMembers(2);
  assert.equal(h.call(['send', 'f', 'm1', 'a question']), 0, h.lines.join('\n'));
  assert.equal(h.call(['send', 'f', 'm2', 'from m1', 'lead->m1#1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' } }), 0, h.lines.join('\n'));
  assert.equal(h.records('f', 'm1->m2').length, 1);
  assert.equal(h.records('f', 'm1->m2')[0].type, 'reply');
  assert.equal(h.records('f', 'm1->m2')[0].re, 'lead->m1#1');
  assert.equal(existsSync(join(h.fleet(), 'channels', 'lead->m2')), false, 'the lead never owned a channel to m2 here');
  const r = h.call(['reconcile', 'f']);
  assert.equal(r, 0);
  assert.match(h.lines.join('\n'), /m1->m2#1 pending/);
});

test('a closed fleet is not reconciled again and its acks stay put', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'task']), 0);
  assert.equal(h.call(['ack', 'f', 'lead', '1'], { env: { ...h.env, HERDR_PANE_ID: 'w1:p2' } }), 0);
  const closed = h.at(0, ['close', 'f']);
  assert.equal(closed.code, 0, closed.out.join('\n'));
  assert.match(closed.out.join('\n'), /copy it somewhere durable/);
  assert.ok(closed.out.join('\n').includes(h.fleet()), 'close prints where the ledger lives');
  const poll = h.at(0, ['poll', 'f']);
  assert.equal(poll.code, 1);
  assert.match(poll.out.join('\n'), /is closed/);
  const rec = h.at(0, ['reconcile', 'f']);
  assert.equal(rec.code, 1, rec.out.join('\n'));
  assert.equal(rec.out.length, 1, 'the refusal is the whole output…');
  assert.ok(!rec.out[0].startsWith('fleet f at '), '…so reconcile never gets to print its header for a closed fleet');
  assert.equal(existsSync(join(h.fleet(), 'acks', 'm1~lead', '1.json')), true, 'acks are never recycled');
  assert.equal(existsSync(join(h.fleet(), 'manifest.json')), true, 'the manifest survives close');
});

test('two fleets in one root keep separate ledgers', () => {
  const h = fleetWithMembers(1);
  const second = makeHerd([{ pane_id: 'w9:p1', agent: 'other-lead' }]);
  second.env = { ...second.env, HERDR_COS_HOME: h.home, HERDR_PANE_ID: 'w9:p1' };
  assert.equal(second.call(['new', 'g']), 0, second.lines.join('\n'));
  assert.equal(second.call(['join', 'g', 'right', 'codex']), 0, second.lines.join('\n'));
  assert.equal(h.call(['send', 'f', 'm1', 'mine']), 0, h.lines.join('\n'));
  assert.equal(second.call(['send', 'g', 'm1', 'theirs'], { env: { ...second.env, HERDR_PANE_ID: 'w9:p1' } }), 0, second.lines.join('\n'));
  assert.deepEqual(h.records('f', 'lead->m1').map((r) => [r.seq, r.fleet, r.text]), [[1, 'f', 'mine']]);
  assert.deepEqual(h.records('g', 'lead->m1').map((r) => [r.seq, r.fleet, r.text]), [[1, 'g', 'theirs']]);
  assert.deepEqual(readdirSync(join(h.fleet('f'), 'channels')).sort(), ['lead->m1'], 'fleet f holds no channel from fleet g');
  assert.deepEqual(readdirSync(join(h.fleet('f'), 'cursors')).sort(), ['lead~m1.s'], 'fleet f caches only its own sender slot');
  assert.deepEqual(readdirSync(join(h.fleet('g'), 'members')).sort(), ['lead.json', 'm1.json']);
});

test('a root that resolves elsewhere is refused rather than reopened', () => {
  const h = fleetWithMembers(1);
  const other = mkdtempSync(join(tmpdir(), 'cos-other-'));
  const before = h.lines.length;
  const code = run(['poll', 'f'], { env: { HERDR_COS_HOME: other, HERDR_PANE_ID: LEAD_PANE }, herdrExec: h.world.exec, out: (l) => h.lines.push(l), now: h.now });
  assert.equal(code, 1);
  assert.match(h.lines.slice(before).join('\n'), /no ledger at/);
  assert.equal(existsSync(join(other, 'fleets')), false, 'a second root must not be created by a recovery attempt');
});

test('a bad HERDR_COS_HOME is a one-line refusal, not a thrown error', () => {
  const lines = [];
  const noHerd = () => ({ ok: false, code: 'spawn_failed', message: 'no herdr', result: null });
  // Each of these would otherwise put a relative path, an empty path, or a shell command into
  // the one line herdr types into a peer's pane.
  const bad = [['relative/dir', /must be an absolute path/], ['', /must be an absolute path/], ['/', /cannot be the filesystem root/],
    [`${tmpdir()}/has space`, /holds characters a doorbell line cannot carry/], [`/tmp/x; touch ${tmpdir()}/pwned`, /holds characters a doorbell line cannot carry/]];
  for (const [value] of bad) {
    const code = run(['new', 'f'], { env: { HERDR_COS_HOME: value, HERDR_PANE_ID: LEAD_PANE }, herdrExec: noHerd, out: (l) => lines.push(l), now: () => 1 });
    assert.equal(code, 1, `${value} must exit 1 without throwing`);
  }
  for (const [value, expected] of bad) assert.match(lines.join('\n'), expected, `${value} refused for the wrong reason`);
  assert.equal(existsSync(join(tmpdir(), 'pwned')), false, 'a metacharacter in the root must never reach a shell');
});

test('a missing or unknown subcommand is a usage error, exactly as PROTOCOL says', () => {
  const lines = [];
  for (const argv of [[], ['nonsense', 'f']]) {
    assert.equal(run(argv, { out: (l) => lines.push(l) }), 2, `${argv.join(' ') || '(bare)'} must exit 2, not 0`);
  }
  assert.match(lines.join('\n'), /usage: cos <new\|join\|send\|poll\|ack\|reconcile\|close>/);
});

test('a member pane with no agent is delivered to by writing to the pane', () => {
  const h = newFleet(makeHerd());
  assert.equal(h.call(['join', 'f', 'right']), 0, h.lines.join('\n'));
  assert.equal(h.world.panes.get('w1:p2').agent, null);
  assert.equal(h.call(['send', 'f', 'm1', 'ping']), 0, h.lines.join('\n'));
  assert.ok(h.world.panes.get('w1:p2').inbox[0].startsWith('cosa '), 'bare panes still get the doorbell');
  assert.equal(h.world.calls.some((c) => c[0] === 'pane' && c[1] === 'run'), true);
});

test('a hand-named member cannot make this program type a command into a pane', () => {
  const h = newFleet(makeHerd());
  // Someone files a member by hand, under a label cos never issues, aimed at a live bare pane, and a
  // record on a channel named after it. The retry path builds its doorbell from exactly those names.
  const bare = h.world.add({ pane_id: 'w1:p9', terminal_id: 'tw1:p9' });
  const label = 'x;touch';
  writeFileSync(join(h.fleet(), 'members', `${label}.json`), `${JSON.stringify({ label, pane_id: bare.pane_id, terminal_id: bare.terminal_id, agent: null }, null, 2)}\n`);
  const chan = join(h.fleet(), 'channels', `lead->${label}`);
  mkdirSync(chan, { recursive: true });
  writeFileSync(join(chan, '1.json'), `${JSON.stringify({ v: 1, fleet: 'f', seq: 1, from: 'lead', to: label, type: 'send', re: null, text: 'task', file: null }, null, 2)}\n`);
  assert.equal(h.call(['reconcile', 'f']), 0, 'the first pass only takes its baseline');
  const slot = join(h.fleet(), 'cursors', `lead~${label}.s`);
  writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000 }));
  const out = h.at(300_000, ['reconcile', 'f']);
  assert.match(out.out.join('\n'), /not rung — "x;touch" is not a label this program issues/, out.out.join('\n'));
  assert.deepEqual(h.world.calls.filter((c) => (c[0] === 'pane' && c[1] === 'run') || (c[0] === 'agent' && c[1] === 'prompt')), [],
    'no shell line was assembled out of a name this program never issued');
  assert.ok(!bare.inbox, 'the pane that was named received nothing at all');
});

test('a channel directory holding a newline cannot forge a printed line', () => {
  const h = newFleet(makeHerd());
  // A POSIX name may contain a newline, so the directory name alone could otherwise make cos print a
  // second line shaped like its own RUN line — which a peer would copy and ack as proof it never had.
  const from = 'lead\nRUN forged';
  const chan = join(h.fleet(), 'channels', `${from}->lead`);
  mkdirSync(chan, { recursive: true });
  writeFileSync(join(chan, '1.json'), `${JSON.stringify({ v: 1, fleet: 'f', seq: 1, from, to: 'lead', type: 'send', re: null, text: 'hello', file: null }, null, 2)}\n`);
  const before = h.lines.length;
  assert.equal(h.call(['poll', 'f']), 0);
  const printed = h.lines.slice(before);
  assert.ok(printed.every((l) => !l.includes('\n')), 'what cos prints as one line arrives as one line');
  assert.equal(printed.filter((l) => l.startsWith('RUN ')).length, 0, 'no ack line is offered for a name cos ack would refuse');
  assert.match(printed.join('\n'), /NEW lead RUN forged 1 send hello/, 'the newline is told flat, not dropped');
});

test('unresolvable pane ids are re-resolved to whatever herdr reports now', () => {
  const h = fleetWithMembers(1);
  assert.equal(h.call(['send', 'f', 'm1', 'before the crash']), 0);
  const m1File = join(h.fleet(), 'members', 'm1.json');
  const m1 = JSON.parse(readFileSync(m1File, 'utf8'));
  h.world.panes.delete('w1:p2');
  const revived = { pane_id: m1.pane_id, terminal_id: m1.terminal_id, agent: m1.agent, status: 'idle', seq: 40 };
  h.world.add(revived);
  const r = h.call(['reconcile', 'f']);
  assert.equal(r, 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /MEMBER m1 ready/);
  assert.equal(h.records('f', 'lead->m1').length, 1, 'the record survived the pane restart untouched');
});

test('a member that came back under a new pane id is the same member, not a new one', () => {
  const h = fleetWithMembers(1);
  const m1 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8'));
  assert.equal(h.call(['send', 'f', 'm1', 'before the crash']), 0, h.lines.join('\n'));
  h.world.panes.delete(m1.pane_id);
  h.world.add({ pane_id: 'w1:p77', terminal_id: 't99', agent: m1.agent, status: 'idle', seq: 40 });
  const before = h.lines.length;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.slice(before).join('\n'), new RegExp(`MEMBER m1 ready kind=codex observed=\\w+ \\(re-bound from pane ${m1.pane_id}\\)`));
  assert.equal(h.world.agentStarts, 1, 'following the agent name must not start a second agent');
  assert.equal(JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8')).pane_id, m1.pane_id,
    'the member file keeps its bytes: the triple is resolved on every call, never stored');
  h.world.calls.length = 0;
  assert.equal(h.call(['send', 'f', 'm1', 'after the crash']), 0, h.lines.join('\n'));
  assert.equal(h.world.calls.filter((c) => c[1] === 'prompt').at(-1)[2], 'w1:p77', 'the next doorbell goes to the pane that exists now');
  const ack = h.at(0, ['ack', 'f', 'lead', '2'], 'w1:p77');
  assert.equal(ack.code, 0, ack.out.join('\n'));
  assert.equal(existsSync(join(h.fleet(), 'acks', 'm1~lead', '2.json')), true, 'the rebound pane acks as m1 with nothing edited first');
});

test('a pane writes only the cursor slots it owns', () => {
  const h = fleetWithMembers(2);
  const owners = () => [...new Set(readdirSync(join(h.fleet(), 'cursors')).map((n) => n.split('~')[0]))].sort();
  assert.equal(h.call(['send', 'f', 'm1', 'one']), 0, h.lines.join('\n'));
  assert.deepEqual(owners(), ['lead'], 'the sender owns lead~<peer>.s');
  assert.equal(h.at(0, ['poll', 'f'], 'w1:p2').code, 0);
  assert.deepEqual(owners(), ['lead', 'm1'], 'a reader adds m1~lead.r and touches no other label');
  assert.equal(h.at(0, ['reconcile', 'f'], 'w1:p3').code, 0);
  assert.deepEqual(owners(), ['lead', 'm1'], 'm2 reading the fleet still writes nothing under another label');
});

/** lead + N agent members, already joined */
function fleetWithMembers(n) {
  const h = newFleet(newHerdForJoin());
  for (let i = 0; i < n; i += 1) {
    assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  }
  h.lines.length = 0;
  return h;
}

/**
 * A herdr stand-in for the process-level tests below: pane and agent bookkeeping in one JSON
 * file, and a doorbell recorded into the target pane's inbox instead of typed into a screen.
 * It is written to disk and named `herdr` so cos.mjs's real spawnSync('herdr') finds it on PATH.
 * Reads leave the file alone, so a fleet of processes that only inspects herdr never races the
 * stub's own unsynchronised write — the ledger is what that race is meant to exercise.
 */
const STUB_HERDR = `#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const state = process.env.STUB_STATE;
const load = () => (existsSync(state) ? JSON.parse(readFileSync(state, 'utf8')) : { n: 1, panes: {} });
const save = (v) => writeFileSync(state, JSON.stringify(v));
const out = (result) => process.stdout.write(JSON.stringify({ result }) + '\\n');
const fail = (code, message) => { process.stdout.write(JSON.stringify({ error: { code, message } }) + '\\n'); process.exit(1); };
const s = load();
const wrap = (p) => ({ pane_id: p.pane_id, terminal_id: p.terminal_id, agent: p.agent, name: p.agent, agent_status: p.status, state_change_seq: p.seq });
const add = (id) => { const p = { pane_id: id, terminal_id: 't' + id, agent: null, status: null, seq: 10, inbox: [] }; s.panes[id] = p; return p; };
if (!existsSync(state)) add(process.env.HERDR_PANE_ID);
const [g, sub, ...rest] = process.argv.slice(2);
// A clock-quantum barrier, not a sleep: every caller rounds its arrival up to the same
// boundary, so concurrent children are released together and pile into the publish window
// instead of being staggered by their own process startup. Never hangs, never syncs state.
const wait = Number(process.env.STUB_PILE_MS || 0);
if (wait && g === 'agent' && sub === 'list') {
  const until = Math.ceil(Date.now() / wait) * wait - Date.now() + 5;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, until);
}
const at = (id) => s.panes[String(id)];
if (g === 'pane' && sub === 'get') {
  const p = rest[0] === '--current' ? at(process.env.HERDR_PANE_ID) : at(rest[0]);
  if (!p) fail('pane_not_found', 'no pane ' + rest[0]);
  out({ pane: wrap(p) });
} else if (g === 'pane' && sub === 'split') {
  s.n += 1; out({ pane: wrap(add('p' + s.n)) });
} else if (g === 'pane' && sub === 'move') {
  const p = at(rest[0]);
  if (!p) fail('pane_not_found', 'no pane');
  out({ move_result: { pane: wrap(p), previous_pane_id: p.pane_id } });
} else if (g === 'pane' && sub === 'run') {
  const p = at(rest[0]);
  if (!p) fail('pane_not_found', 'no pane');
  // A successful pane run prints NOTHING on real herdr (measured against a live 0.9.1 server,
  // 2026-09-30): the whole verdict is exit status 0. The stub mirrors that, because a stub that
  // answered with JSON would let a bell be judged by a shape the transport never produces.
  p.inbox.push(rest[1]);
} else if (g === 'agent' && sub === 'list') {
  out({ agents: Object.values(s.panes).filter((p) => p.agent).map(wrap) });
} else if (g === 'agent' && sub === 'start') {
  const p = at(rest[rest.indexOf('--pane') + 1]);
  if (!p) fail('pane_not_found', 'no pane');
  p.agent = rest[0]; p.status = 'idle'; p.seq += 1;
  out({ agent: wrap(p) });
} else if (g === 'agent' && sub === 'prompt') {
  const p = at(rest[0]);
  if (!p || !p.agent) fail('agent_not_found', 'no agent at ' + rest[0]);
  if (p.status === 'blocked') fail('agent_blocked', 'approval dialog');
  p.inbox.push(rest[1]); p.seq += 1;
  out({ agent: wrap(p) });
} else {
  fail('unknown_command', 'stub has no ' + g + ' ' + sub);
}
if (!(g === 'pane' && sub === 'get') && !(g === 'agent' && sub === 'list')) save(s);
`;

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));

/**
 * A fleet driven from separate node processes against the disk stub above. Nothing about
 * publishing, allocating or reconciling goes through an in-process seam here, so a claim that
 * holds in this harness holds for a peer that only ever saw a doorbell line.
 */
function processHarness(tag) {
  const home = mkdtempSync(join(tmpdir(), `cos-${tag}-`));
  const bin = join(home, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'herdr'), STUB_HERDR, { mode: 0o755 });
  const envFor = (pane) => ({ ...process.env, HERDR_COS_HOME: home, PATH: `${bin}:${dirname(process.execPath)}`, STUB_STATE: join(home, 'panes.json'), HERDR_PANE_ID: pane });
  return {
    home,
    envFor,
    fleet: (...args) => join(home, 'fleets', 'demo', ...args),
    cos: (argv, pane = 'p1') => spawnSync(process.execPath, [here('../scripts/cos.mjs'), ...argv], { encoding: 'utf8', env: envFor(pane) }),
    hcAsync: (argv, pane = 'p1', extra = {}) => new Promise((resolve) => {
      const kid = spawn(process.execPath, [here('../scripts/cos.mjs'), ...argv], { env: { ...envFor(pane), ...extra } });
      let stdout = '';
      kid.stdout.on('data', (d) => { stdout += d; });
      kid.on('exit', (status) => resolve({ status, stdout }));
    }),
  };
}

test('a skill installed under a path with a space and an apostrophe still renders runnable lines', () => {
  // The ledger root's charset is enforced; this program's own path is not ours to constrain, so
  // every rendered line single-quotes it and escapes an embedded quote as '\''. This is the only
  // place that claim is checked by running one — the peer below parses the line the way a shell
  // would and executes it, so a wrong escape here shows up as a failed spawn, not a green test.
  const { home, envFor, fleet } = processHarness('spacey');
  const odd = join(home, `it's a test dir`);
  mkdirSync(odd);
  const copy = join(odd, 'cos.mjs');
  writeFileSync(copy, readFileSync(here('../scripts/cos.mjs'), 'utf8'));
  const cos = (argv, pane = 'p1') => spawnSync(process.execPath, [copy, ...argv], { encoding: 'utf8', env: envFor(pane) });
  const steps = [cos(['new', 'demo']), cos(['join', 'demo', 'right', 'codex', '--no-worktree']), cos(['send', 'demo', 'm1', 'do the thing'])];
  assert.deepEqual(steps.map((r) => r.status), [0, 0, 0], steps.map((r) => `${r.stdout}${r.stderr}`).join('\n'));
  const contract = readFileSync(fleet('peer-contract.md'), 'utf8');
  // Compared by fragment, not by whole path: node builds import.meta.url from the realpath of
  // the main module, so SELF_PATH in the rendered line is the resolved temp dir while `copy`
  // still holds the symlinked one. The quotes and the tail of the path are what matters here.
  const ackLine = contract.split('\n').find((l) => l.includes(' ack demo <from> <seq>'));
  assert.ok(ackLine && ackLine.includes(`'\\''`) && ackLine.includes(`s a test dir/cos.mjs'`),
    `the install path's apostrophe is escaped as the POSIX '\\'' idiom, in: ${ackLine}`);
  const bell = JSON.parse(readFileSync(join(home, 'panes.json'), 'utf8')).panes.p2.inbox[0];
  const peer = spawnSync(process.execPath, [here('./l3-fake-peer.mjs'), bell], { encoding: 'utf8', env: envFor('p2') });
  assert.equal(peer.status, 0, peer.stdout + peer.stderr);
  assert.equal(existsSync(fleet('acks', 'm1~lead', '1.json')), true, 'a peer ran the awkwardly named line verbatim and the ack landed');
});

test('a peer in a second process consumes the ledger from the contract alone', () => {
  const { home, cos, envFor, fleet } = processHarness('proc');

  assert.equal(cos(['new', 'demo']).status, 0);
  assert.equal(cos(['join', 'demo', 'right', 'codex', '--no-worktree']).status, 0);
  const sent = cos(['send', 'demo', 'm1', 'do the thing']);
  assert.equal(sent.status, 0, sent.stdout + sent.stderr);
  const bell = JSON.parse(readFileSync(join(home, 'panes.json'), 'utf8')).panes.p2.inbox[0];
  assert.match(bell, /^cosa \S+peer-contract\.md m1 1$/, 'the doorbell is one line carrying the contract path');

  // The peer gets nothing but that line — no root, no slug, no script path of its own.
  const peer = spawnSync(process.execPath, [here('./l3-fake-peer.mjs'), bell], { encoding: 'utf8', env: envFor('p2') });
  assert.equal(peer.status, 0, peer.stdout + peer.stderr);
  assert.match(peer.stdout, /PEER read \S+peer-contract\.md/);
  assert.equal(existsSync(fleet('acks', 'm1~lead', '1.json')), true, 'the ack came from the line the contract printed, not one this test hand-wrote');

  assert.equal(cos(['reconcile', 'demo']).status, 0);
  assert.equal(existsSync(fleet('channels', 'lead->m1', '1.json')), false, 'the writer recycles what the ack proved');
  assert.doesNotMatch(cos(['poll', 'demo']).stdout, /^NEW/m, 'a consumed message is never offered twice');
});

test('a bell into a bare pane is judged delivered on exit status alone', () => {
  // The one case only a real process shows: `pane run` is the transport for a member with no agent,
  // and on a live herdr 0.9.1 it prints nothing at all. A port that reads "no JSON" as "failed" rings
  // every doorbell, reports `doorbell failed`, and then re-rings the same bell forever.
  const { home, cos, fleet } = processHarness('silentbell');
  assert.equal(cos(['new', 'demo']).status, 0);
  assert.equal(cos(['join', 'demo', 'right', 'none', '--no-worktree']).status, 0);
  const sent = cos(['send', 'demo', 'm1', 'a bare pane has no agent state to read']);
  assert.equal(sent.status, 0, sent.stdout + sent.stderr);
  assert.match(sent.stdout, /as a notice, not consumed/, 'the transport accepted the line, so it is reported as written');
  assert.doesNotMatch(sent.stdout, /doorbell failed/, 'a silent pane run is not a failed one');
  assert.equal(existsSync(fleet('channels', 'lead->m1', '1.json')), true, 'the record stands for whoever reads the notice');
  assert.equal(JSON.parse(readFileSync(join(home, 'panes.json'), 'utf8')).panes.p2.inbox.length, 1, 'and the line really did reach the pane');
});

test('eight processes sending on one channel get eight numbers and lose no record', async () => {
  const { home, cos, hcAsync, fleet } = processHarness('race');
  assert.equal(cos(['new', 'demo']).status, 0);
  assert.equal(cos(['join', 'demo', 'right', 'codex', '--no-worktree']).status, 0);
  // Take the recipient's pane away first, so all eight children only ever *read* herdr: the race
  // this creates is the ledger's, not the stub's own unsynchronised bookkeeping.
  const stub = join(home, 'panes.json');
  const panes = JSON.parse(readFileSync(stub, 'utf8'));
  delete panes.panes.p2;
  writeFileSync(stub, JSON.stringify(panes));
  // Same pane, same channel, no await between the spawns: every child reads the same head and
  // has to be pushed off it by a failed link(), which is the only allocator of sequence numbers.
  // STUB_PILE_MS holds them all at the read before allocation and releases them on one clock
  // boundary — pressure, not proof: the deterministic collision case is the injected one above.
  const kids = await Promise.all(Array.from({ length: 8 }, (_, i) => hcAsync(['send', 'demo', 'm1', `body-${i}`], 'p1', { STUB_PILE_MS: '400' })));
  for (const kid of kids) assert.equal(kid.status, 0, kid.stdout);
  assert.match(kids[0].stdout, /WARN .*nothing sent/, 'the bell was withheld — delivery is the two-process test above');
  const dir = fleet('channels', 'lead->m1');
  const files = readdirSync(dir);
  assert.deepEqual(files.filter((n) => n.endsWith('.tmp')), [], 'a killed publish may strand a temp, a completed one never does');
  const seqs = files.filter((n) => /^\d+\.json$/.test(n)).map((n) => Number(n.slice(0, -5))).sort((a, b) => a - b);
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6, 7, 8], 'eight concurrent sends, eight distinct numbers, none skipped');
  const bodies = seqs.map((n) => JSON.parse(readFileSync(join(dir, `${n}.json`), 'utf8')));
  assert.deepEqual(bodies.map((b) => b.text).sort(), Array.from({ length: 8 }, (_, i) => `body-${i}`).sort(), 'no send was overwritten by another that computed the same number');
  for (const b of bodies) assert.equal(b.to, 'm1');
});

test('a failed pane get cannot name this pane, even when its body still describes one', () => {
  // Invariant 13 says the exit status is the verdict and a field may be read only off a response the
  // caller branched on `ok` for. `selfPane` once took a `pane get` envelope straight from `.result`,
  // so a nonzero exit whose stdout still parsed a pane would have claimed a fleet as some stranger's
  // pane — which is every addressing guarantee this file makes, voided at the first line of a ledger.
  const home = mkdtempSync(join(tmpdir(), 'cos-l1-'));
  const lines = [];
  const body = { pane: { pane_id: 'someone-elses:p9', terminal_id: 't9', agent: 'claude', agent_status: 'working' } };
  const port = (argv) => ({ ok: false, code: 'pane_not_found', message: `no pane ${argv[2]}`, result: body });
  const code = run(['new', 'f'], { env: { HERDR_COS_HOME: home, HERDR_PANE_ID: 'ghost:p1', TMPDIR: home }, herdrExec: port, gitExec: noGit, out: (l) => lines.push(l), now: () => Date.now() });
  assert.equal(code, 1, lines.join('\n'));
  assert.match(lines.join('\n'), /could not identify this pane/);
  assert.ok(!existsSync(join(home, 'fleets', 'f', 'members', 'lead.json')), 'a lead was registered against a pane herdr refused to name');
});

test('a hand-named record number never yields an ack line the reader cannot run', () => {
  // Invariant 11: every line cos prints for someone to run is a line cos itself would accept. Two ways a
  // hand-named file breaks that, and the second is the one that looks safe: `007.json` and a 30-digit
  // name do not round-trip through Number(), so the reader resolves a path that is not there and skips
  // the record; 0.json and 9007199254740992.json (= 2**53) round-trip perfectly, so they are read, printed
  // — and then refused by `cos ack`, which wants digits from 1 up to MAX_SAFE_INTEGER. Hence both bounds.
  // The floor is reached by this program's own means, not by a hand-edited file: a reader that has a
  // cursor at all gets it clamped to one below the oldest record still owed an ack, and for a channel
  // whose oldest owed record is 0 that is -1. Nothing in this case is hand-edited except the records.
  const h = fleetWithMembers(1);
  const dir = join(h.fleet(), 'channels', 'm1->lead');
  mkdirSync(dir, { recursive: true });
  const body = (seq, text = 'hand-named') => JSON.stringify({ v: 1, fleet: 'f', seq, from: 'm1', to: 'lead', type: 'send', re: null, text, file: null });
  writeFileSync(join(dir, '1.json'), body(1, 'an ordinary send'));
  const seen = h.at(0, ['poll', 'f']);
  assert.match(seen.out.join('\n'), /^RUN .*ack f m1 1$/m, 'the ordinary record is ackable, so the control line is there to compare against');
  const slot = join(h.fleet(), 'cursors', 'lead~m1.r');
  assert.match(readFileSync(slot, 'utf8'), /"c":1/, 'and that poll wrote the reader a cursor — the thing the clamp acts on');
  writeFileSync(join(dir, '007.json'), body(7));
  writeFileSync(join(dir, '0.json'), body(0));
  writeFileSync(join(dir, `${'9'.repeat(30)}.json`), body(Number('9'.repeat(30))));
  writeFileSync(join(dir, '9007199254740992.json'), body(2 ** 53));
  const cl = h.at(0, ['reconcile', 'f']);
  assert.match(cl.out.join('\n'), /clamped 2 cursor\(s\)/, 'records 0 and 1 both sit at or below the read position, and the clamp writes a reading below the older of them');
  assert.match(readFileSync(slot, 'utf8'), /"c":-1/, 'the clamp backs up to one below the oldest owed record, and that record is numbered 0 — so cos itself writes a cursor below zero');
  const before = h.world.calls.length;
  const p = h.at(0, ['poll', 'f']);
  const text = p.out.join('\n');
  assert.equal(p.code, 0, text);
  assert.match(text, /published but unreadable: skipped, not deleted/, 'the names that do not round-trip are reported, not hidden');
  assert.match(text, /NEW m1 0 send/, 'the clamped cursor did surface the zero record: the WARN below is the printing path refusing, not the pass never having looked');
  assert.match(text, /WARN m1->lead#0: no ack line, because sequence 0 is below the smallest number cos ack reads/,
    'a hand-made 0.json does round-trip through Number(), so only the printing path can stop it becoming an ack line that cos ack refuses');
  assert.match(text, /WARN m1->lead#9007199254740992: no ack line, because sequence .* is past the largest integer cos ack reads/);
  const ackLines = text.split('\n').filter((l) => l.startsWith('RUN '));
  assert.ok(ackLines.length > 0 && ackLines.every((l) => l.endsWith(' 1')), `only the ordinary record earns an ack line: ${JSON.stringify(ackLines)}`);
  assert.match(readFileSync(slot, 'utf8'), /"c":9007199254740992/, 'poll advances the cursor to the highest number it reported, so the next clamp pushes it under zero again: the two ends take turns while the record stays unconsumable');
  assert.equal(h.at(0, ['ack', 'f', 'm1', '0']).code, 1, 'and cos ack refuses that number, which is why the cycle never ends by consuming it');
  assert.equal(h.world.calls.filter((c) => c[0] === 'pane' && c[1] === 'run').length, 0, 'nothing was rung — a reader\'s own channel rings nothing at all, so this is the trivial half');
  assert.equal(h.world.calls.filter((c) => c[0] === 'agent' && c[1] === 'prompt').length, 0, 'and the same for prompts: the number-blindness of the bell is the next case, not this one');
  assert.ok(before < h.world.calls.length, 'the pass did run and report, rather than silently doing nothing');
  assert.deepEqual(readdirSync(dir).sort(), ['0.json', '1.json', '007.json', '9007199254740992.json', `${'9'.repeat(30)}.json`].sort(), 'a refusal never removes a file it did not publish');
});

test('the doorbell is number-blind: both out-of-range records are still re-rung at their deadline', () => {
  // Invariant 11's other half, and the direction the case above cannot show: a reader's own channel
  // rings nothing at all, so "no bell was rung there" is a fact about the channel, not about the
  // number. Here the records go *out* from the lead, and the bell's own guard reads labels and never a
  // sequence number, so 0 and 2**53 are rung exactly as an ordinary 3 would be. The cap and the floor
  // therefore govern what cos invites a human or a peer to *run*, not what cos sends.
  const rung = (seq) => {
    const h = fleetWithMembers(1);
    const dir = join(h.fleet(), 'channels', 'lead->m1');
    mkdirSync(dir, { recursive: true });
    const rec = (s, text) => JSON.stringify({ v: 1, fleet: 'f', seq: s, from: 'lead', to: 'm1', type: 'send', re: null, text, file: null });
    writeFileSync(join(dir, `${seq}.json`), rec(seq, 'hand-aged'));
    assert.equal(h.at(0, ['reconcile', 'f']).code, 0, 'the first pass only takes the stall baseline');
    const slot = join(h.fleet(), 'cursors', 'lead~m1.s');
    writeFileSync(slot, JSON.stringify({ ...JSON.parse(readFileSync(slot, 'utf8')), t: Date.now() - 300_000 }));
    h.world.calls.length = 0;
    const r = h.at(300_000, ['reconcile', 'f']);
    assert.match(r.out.join('\n'), new RegExp(`^PENDING lead->m1#${seq} unproven`, 'm'), 'the aged record is judged at its deadline, not merely listed');
    assert.match(r.out.join('\n'), /unproven — re-sent the doorbell once/);
    const bells = h.world.calls.filter((c) => c[0] === 'agent' && c[1] === 'prompt').map((c) => c[3]);
    // The receiving side. The recipient has never polled this channel, so no `m1~lead.r` exists for the
    // clamp to move and `unreadInbound` compares against its default 0. An ordinary record arrives to
    // give it a cursor the ordinary way; nothing is written into `cursors/` by hand.
    writeFileSync(join(dir, '3.json'), rec(3, 'an ordinary send'));
    const cold = h.at(300_000, ['poll', 'f'], 'w1:p2').out.join('\n');
    const warm = h.at(300_000, ['poll', 'f'], 'w1:p2').out.join('\n');
    return { bells, cold, warm };
  };
  for (const seq of [0, 2 ** 53]) {
    const { bells, cold, warm } = rung(seq);
    assert.equal(bells.length, 1, `seq ${seq} got exactly one re-ring`);
    assert.match(bells[0], new RegExp(` m1 ${seq}$`), 'the bell carries the raw number, bound checked only at the printing path');
    // A cold reader is the state a bell into a fresh pane arrives in: only the ordinary record clears a
    // cursor that defaults to 0, so the zero bound is silent there and the over-cap one is not. The
    // silence belongs to the missing cursor, not to the number — the second poll runs after the first
    // wrote one, and the clamp pulls that cursor under even a zero, so the floor's WARN does reach this
    // reader. Either way the number is never consumed, because cos ack refuses it.
    assert.match(cold, /^NEW lead 3 send/m, 'the ordinary record is what a reader with no cursor still sees');
    if (seq === 0) {
      assert.doesNotMatch(cold, /^NEW lead 0 /m, 'a zero is not above the default 0, so a reader holding no cursor on this channel is shown nothing of it');
      assert.match(cold, /1 new inbound/);
    } else {
      assert.match(cold, new RegExp(`^NEW lead ${seq} send`, 'm'), 'the over-cap record clears that default, so it is printed');
      assert.match(cold, /no ack line, because sequence .* is past the largest integer cos ack reads/);
      assert.match(cold, /2 new inbound/);
    }
    assert.match(warm, new RegExp(`^NEW lead ${seq} send`, 'm'), 'and once the reader holds a cursor, the clamp pulls it under even a zero');
    assert.match(warm, new RegExp(`WARN lead->m1#${seq}: no ack line, because sequence .* is (below the smallest number|past the largest integer) cos ack reads`));
  }
});

test('a joined member records its role and kind, and its MEMBER line shows them', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right', 'codex', 'reviewer']), 0, h.lines.join('\n'));
  const m1 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8'));
  assert.equal(m1.role, 'reviewer', 'the role the lead assigned is on the member file');
  assert.equal(m1.kind, 'codex', 'and so is the CLI it was started under — nothing else in the ledger records it');
  h.lines.length = 0;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  assert.match(h.lines.join('\n'), /MEMBER m1 ready role=reviewer kind=codex observed=\w+/,
    'identity comes before observation on the line');
});

test('a member joined without a role or kind records nulls and renders neither field', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right']), 0, h.lines.join('\n'));
  const m1 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8'));
  assert.equal(m1.role, null); assert.equal(m1.kind, null);
  assert.equal(m1.agent, null, 'a join naming no kind starts no agent, so the member file binds no name');
  h.lines.length = 0;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  const line = h.lines.join('\n').split('\n').find((l) => l.startsWith('MEMBER m1 '));
  assert.ok(line, 'the member is reported');
  assert.doesNotMatch(line, /role=|kind=/, 'an absent role renders as nothing, never as the word `role=null`');
});

test('a gone member still reports the role and kind it was joined with', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right', 'codex', 'implementer']), 0, h.lines.join('\n'));
  const m1 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8'));
  h.world.panes.delete(m1.pane_id);
  h.lines.length = 0;
  assert.equal(h.call(['reconcile', 'f']), 0, h.lines.join('\n'));
  // The pane is what died; the file is what says how to bring the work back, so the recovery-relevant
  // fields must survive the one state that is about a member needing replacement.
  assert.match(h.lines.join('\n'), /MEMBER m1 gone role=implementer kind=codex \(no such pane\)/,
    'a gone member still names the role and the CLI its replacement should be joined with');
});

test('cos join refuses a fifth word rather than dropping it in silence', () => {
  const h = newFleet(newHerdForJoin());
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex', 'reviewer', 'extra']), 1);
  assert.match(h.lines.slice(before).join('\n'), /join takes: <slug> <right\|down> \[agent-kind\] \[role\]/,
    'the refusal states the shape, so the caller can see which word was surplus');
  assert.deepEqual(readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')), ['lead.json'],
    'a refused join adds no member and splits no pane');
});

test('the rendered contract tells a peer that join takes a role', () => {
  const h = newFleet(newHerdForJoin());
  const contract = readFileSync(join(h.fleet(), 'peer-contract.md'), 'utf8');
  assert.match(contract, /join f <right\|down> \[agent-kind\] \[role\]/, 'the fourth positional is on the interface a peer reads');
});

// --- worktree isolation: two members must never share one working tree ---

const splitCwds = (world) => world.calls.filter((c) => c[0] === 'pane' && c[1] === 'split').map((c) => c[c.indexOf('--cwd') + 1]);
const splitCwd = (world) => splitCwds(world)[0];

test('cos join gives each member its own git worktree and opens its pane in it', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right', 'codex', 'coder']), 0, h.lines.join('\n'));
  const wt = join(h.home, 'worktrees', 'f', 'm1'), branch = 'cos/f/m1';
  assert.deepEqual(h.world.gitCalls.find((c) => c.includes('worktree')),
    ['-C', '/fake/repo', 'worktree', 'add', '-b', branch, wt, 'HEAD'],
    'the tree is carved with `-C <repo> worktree add -b <branch> <path> HEAD`');
  assert.equal(splitCwd(h.world), wt, 'the new pane is opened in the member\'s tree, not the lead\'s');
  const m1 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8'));
  assert.equal(m1.worktree, wt, 'the member file records where its tree is, so recovery can name it again');
  assert.equal(m1.branch, branch);
  assert.ok(h.lines.includes(`worktree ${wt} (branch ${branch})`), 'the join says where the member landed');
});

test('two members get two trees: the second label does not reuse the first branch', () => {
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 0, h.lines.join('\n'));
  assert.equal(h.call(['join', 'f', 'down', 'codex']), 0, h.lines.join('\n'));
  assert.ok(h.world.branches.has('cos/f/m1') && h.world.branches.has('cos/f/m2'), 'labels name the branches, so no two members collide');
  assert.deepEqual(splitCwds(h.world), [join(h.home, 'worktrees', 'f', 'm1'), join(h.home, 'worktrees', 'f', 'm2')],
    'each member gets its own tree — the second does not reuse the first');
});

test('join --no-worktree shares the lead\'s tree and calls no git at all', () => {
  const h = newFleet(newHerdForJoin());
  h.world.gitCalls.length = 0; // `new` resolves the repo once; the flag must add nothing on top
  assert.equal(h.call(['join', 'f', 'right', 'codex', 'coder', '--no-worktree'], { cwd: '/lead/tree' }), 0, h.lines.join('\n'));
  assert.deepEqual(h.world.gitCalls, [], 'the flag short-circuits before git is consulted');
  assert.equal(splitCwd(h.world), '/lead/tree', 'the pane inherits the lead\'s cwd');
  const m1 = JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8'));
  assert.equal(m1.worktree, null); assert.equal(m1.branch, null);
});

test('a lead outside any git repo gets a note, not a failure, and members still join', () => {
  const h = newFleet(newHerdForJoin());
  h.world.repo = null;
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex'], { cwd: '/not/a/repo' }), 0, h.lines.join('\n'));
  const text = h.lines.slice(before).join('\n');
  assert.match(text, /not inside a git worktree/, 'the lead is told there is no isolation to be had');
  assert.match(text, /--no-worktree/, 'and told how to silence the note');
  assert.equal(splitCwd(h.world), '/not/a/repo', 'so the member shares the lead\'s tree');
  assert.equal(JSON.parse(readFileSync(join(h.fleet(), 'members', 'm1.json'), 'utf8')).worktree, null);
});

test('a worktree git refuses stops the join before any pane is opened', () => {
  const h = newFleet(newHerdForJoin());
  h.world.failWorktree = 'fatal: could not create work tree dir';
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 1);
  const text = h.lines.slice(before).join('\n');
  assert.match(text, /could not create a worktree for m1/, 'the failure names the member and the path');
  assert.match(text, /pass --no-worktree/, 'and names the escape hatch, so a stuck lead is not stuck');
  assert.equal(h.world.calls.filter((c) => c[0] === 'pane' && c[1] === 'split').length, 0, 'git failed before a pane was split');
  assert.deepEqual(readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')), ['lead.json'], 'a refused join files no member');
});

test('a real git worktree goes up and comes down, so the args above are the ones git actually takes', () => {
  // The fake git in every case above proves cos *calls* the port; only a real repo proves the argv is
  // one git accepts and that the pane is handed a directory that exists. The repo is thrown away.
  const repo = mkdtempSync(join(tmpdir(), 'cos-realrepo-'));
  const runGit = (...a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' });
  runGit('init', '-q'); runGit('config', 'user.email', 't@t'); runGit('config', 'user.name', 't');
  writeFileSync(join(repo, 'f.txt'), 'x\n'); runGit('add', 'f.txt'); runGit('commit', '-qm', 'seed');
  const h = newFleet(newHerdForJoin());
  assert.equal(h.call(['join', 'f', 'right'], { cwd: repo, gitExec: realGitExec }), 0, h.lines.join('\n'));
  const wt = join(h.home, 'worktrees', 'f', 'm1');
  assert.ok(existsSync(join(wt, 'f.txt')), 'git checked the branch out into the path cos named');
  assert.equal(splitCwd(h.world), wt);
  assert.ok(readFileSync(join(wt, 'f.txt'), 'utf8').includes('x'), 'and the tree carries the committed content');
  runGit('worktree', 'remove', '--force', wt); runGit('branch', '-D', 'cos/f/m1');
});

test('a failed pane move rolls the fresh worktree back and names the stray pane', () => {
  const h = newFleet(newHerdForJoin());
  const real = h.world.exec;
  h.world.exec = (argv) => (argv[0] === 'pane' && argv[1] === 'move'
    ? { ok: false, code: 'exit_1', message: 'move refused', result: null }
    : real(argv));
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 1);
  const text = h.lines.slice(before).join('\n');
  assert.match(text, /pane move: herdr reported exit_1/, 'the original refusal still carries');
  assert.match(text, /pane w1:p2 was split into this tab and is now stray/, 'the pane a human must close is named');
  assert.deepEqual(h.world.gitCalls.find((c) => c.includes('worktree') && c.includes('remove')),
    ['-C', '/fake/repo', 'worktree', 'remove', join(h.home, 'worktrees', 'f', 'm1')], 'the seconds-old tree is rolled back');
  assert.deepEqual(h.world.gitCalls.find((c) => c.includes('branch') && c.includes('-d')),
    ['-C', '/fake/repo', 'branch', '-d', 'cos/f/m1'], 'and so is its branch');
  assert.ok(!h.world.branches.has('cos/f/m1'), 'the fake git really dropped the branch');
  assert.deepEqual(readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')), ['lead.json'], 'no member was registered');
  assert.equal(h.world.agentStarts, 0, 'no agent was started');
});

test('a failed pane split rolls the worktree back with no stray pane to name', () => {
  const h = newFleet(newHerdForJoin());
  const real = h.world.exec;
  h.world.exec = (argv) => (argv[0] === 'pane' && argv[1] === 'split'
    ? { ok: false, code: 'exit_1', message: 'split refused', result: null }
    : real(argv));
  const before = h.lines.length;
  assert.equal(h.call(['join', 'f', 'right', 'codex']), 1);
  const text = h.lines.slice(before).join('\n');
  assert.match(text, /pane split: herdr reported exit_1/);
  assert.doesNotMatch(text, /stray/, 'no pane was ever split, so none is named');
  assert.ok(h.world.gitCalls.some((c) => c.includes('worktree') && c.includes('remove')), 'the carved tree still rolls back');
  assert.deepEqual(readdirSync(join(h.fleet(), 'members')).filter((n) => n.endsWith('.json')), ['lead.json']);
});

// --- role contracts: shipped beside the program, named by the ledger, enforced by nothing ---

test('the rendered contract names the role contracts shipped beside the program', () => {
  const h = newFleet(newHerdForJoin());
  const contract = readFileSync(join(h.fleet(), 'peer-contract.md'), 'utf8');
  assert.match(contract, /## Your role/, 'role semantics are a section a peer can find');
  for (const role of ['manager', 'planner', 'coder', 'supervisor', 'tester']) {
    assert.match(contract, new RegExp(`roles/${role}\\.md`), `the contract points a peer at the ${role} file`);
  }
});

test('every shipped role carries the fixed sections and restates that role is not enforced', () => {
  const dir = here('../roles');
  const names = readdirSync(dir).filter((n) => n.endsWith('.md')).sort();
  assert.deepEqual(names, ['coder.md', 'manager.md', 'planner.md', 'supervisor.md', 'tester.md'], 'the five roles the lead chooses from');
  for (const n of names) {
    const text = readFileSync(join(dir, n), 'utf8');
    for (const heading of ['## Identity', '## Mission', '## Responsibilities', '## Boundaries', '## Collaboration', '## Done when']) {
      assert.match(text, new RegExp(`^${heading}$`, 'm'), `${n} is missing ${heading}`);
    }
    assert.match(text, /role is a name the ledger records, not a permission/i, `${n} does not repeat that a role is not enforced`);
  }
});
