/**
 * l3-fake-peer.mjs — the scripted fleet member, run by tests/cos.test.mjs against a stub
 * `herdr` today and by the live L3 round trip once a session can be started.
 *
 * It is given the doorbell line exactly as herdr typed it into its pane, and it does what
 * the rendered peer-contract tells a real peer to do: read that contract, poll, then run
 * the ack line the contract printed. Nothing here knows the ledger root, the slug, or the
 * path of cos.mjs — all three are taken out of the doorbell and the contract, which is the
 * point: a hand-invoked peer only ever has those two things.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const line = process.argv.slice(2).join(' ').trim();
const [bell, contractPath, label, seq] = line.split(/\s+/);
if (bell !== 'cosa' || !contractPath || !label || !/^\d+$/.test(String(seq))) {
  console.log(`FAKEPEER refused: "${line}" is not "cosa <contract> <label> <seq>"`);
  process.exit(1);
}

const contract = readFileSync(contractPath, 'utf8');
console.log(`PEER read ${contractPath} (${Buffer.byteLength(contract)} bytes) as ${label}`);
const program = contract.split('\n').find((l) => l.startsWith('Program: '))?.slice('Program: '.length).trim();
const slug = contract.split('\n')[0].match(/fleet ([a-z0-9_-]+)/)?.[1];
if (!program || !slug) {
  console.log('FAKEPEER refused: the contract carries no Program line or no fleet slug');
  process.exit(1);
}

/**
 * Word splitting with enough POSIX shell in it to read what the contract renders. cos.mjs wraps
 * its own path in single quotes and escapes an embedded quote as '\'', because the directory it
 * was installed into is not ours to constrain; a naive regex on quoted runs would turn that
 * sequence into four words and silently stop this harness being a peer at all. It models quoting
 * only, not expansion: an unquoted `$` or backtick would be run verbatim here and mean something
 * else in a real shell. That gap is covered on the rendering side — every token `cos` puts in a
 * line unquoted is one it issued itself from a restricted charset (root, slug, label), and the one
 * token from outside (its own install path) arrives single-quoted.
 */
function shellWords(s) {
  const words = [];
  let cur = '', begun = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { if (begun) { words.push(cur); cur = ''; begun = false; } i += 1; continue; }
    if (c === "'" || c === '"') {
      const end = s.indexOf(c, i + 1);
      if (end < 0) return null;
      cur += s.slice(i + 1, end); begun = true; i = end + 1; continue;
    }
    if (c === '\\') { cur += s[i + 1] ?? ''; begun = true; i += 2; continue; }
    cur += c; begun = true; i += 1;
  }
  if (begun) words.push(cur);
  return words;
}

const run = (line) => {
  const words = shellWords(line.trim());
  if (!words) { console.log(`FAKEPEER refused: unbalanced quote in "${line}"`); process.exit(1); }
  const env = { ...process.env };
  // The contract renders commands as HERDR_COS_HOME=<root> node <cos.mjs> ..., so the
  // peer never re-resolves a temp root of its own. Hoist any leading assignments into env.
  while (words.length > 1 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) {
    const i = words[0].indexOf('=');
    env[words[0].slice(0, i)] = words[0].slice(i + 1);
    words.shift();
  }
  const r = spawnSync(words[0], words.slice(1), { encoding: 'utf8', env });
  if (r.error) { console.log(`FAKEPEER could not run "${words[0]}": ${r.error.message}`); process.exit(1); }
  return `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
};

const poll = run(`${program} poll ${slug}`);
console.log(poll);
const ackLine = poll.split('\n').map((l) => l.replace(/^RUN /, '')).find((l) => l.endsWith(` ${seq}`));
if (!ackLine) {
  console.log(`FAKEPEER no RUN line for seq ${seq}: the contract's own procedure found nothing to ack`);
  process.exit(1);
}
console.log(`PEER running the contract's line verbatim: ${ackLine}`);
console.log(run(ackLine));
console.log(`PEER done: ${label} consumed ${seq}`);
