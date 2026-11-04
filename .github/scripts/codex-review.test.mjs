import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  CONCLUSION_MARKER,
  FINDINGS_ARTIFACT,
  createGhReviewAdapter,
  deriveConclusion,
  findPullForHead,
  findReusableRun,
  parseReviewFindings,
  readConclusion,
  renderConclusion,
  resolveReviewRange,
  reviewTarget
} from './codex-review.mjs'
import { RELEASE_BRANCH } from './lib/workflow-topology.mjs'

const headSha = 'a'.repeat(40)
const otherSha = 'b'.repeat(40)
const scriptPath = path.join(import.meta.dirname, 'codex-review.mjs')

function finding(severity) {
  return {
    severity,
    file: 'packages/web-ui/src/button.ts',
    line: 12,
    problem: '深色态描边消失了',
    suggestion: '补一条 dark 下的 border-color'
  }
}

function conclusionText(...severities) {
  return JSON.stringify({ summary: '改动整体可用。', findings: severities.map(finding) })
}

function parsedConclusion(...severities) {
  return parseReviewFindings(conclusionText(...severities))
}

function metaOf(overrides = {}) {
  return { head_sha: headSha, base_sha: otherSha, merge_base_sha: otherSha, model: 'claude-haiku-5-5', ...overrides }
}

function writeFixtures(directory, conclusion = conclusionOf('Block'), meta = metaOf()) {
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, 'review-findings.json'), JSON.stringify(conclusion))
  fs.writeFileSync(path.join(directory, 'review-meta.json'), JSON.stringify(meta))
}

function conclusionOf(...severities) {
  return { summary: '改动整体可用。', findings: severities.map(finding) }
}

{
  const parsed = parsedConclusion('Block', 'Nit')
  assert.deepEqual(parsed.counts, { Block: 1, 'Should fix': 0, Nit: 1 })
  assert.equal(parsed.summary, '改动整体可用。')
  assert.deepEqual(parseReviewFindings('{"summary":"ok","findings":[]}').findings, [])
  assert.deepEqual(parseReviewFindings('{"summary":"ok","findings":[]}').counts, {
    Block: 0,
    'Should fix': 0,
    Nit: 0
  })
}

for (const [label, value] of [
  ['non JSON', 'not json'],
  ['array root', '[]'],
  ['empty summary', JSON.stringify({ summary: ' ', findings: [] })],
  ['missing findings', JSON.stringify({ summary: 'ok' })],
  ['unknown severity', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), severity: 'Must fix' }] })],
  ['unknown field', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), extra: 1 }] })],
  [
    'missing field',
    JSON.stringify({ summary: 'ok', findings: [{ severity: 'Block', file: '', line: 0, problem: 'x' }] })
  ],
  ['negative line', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), line: -1 }] })],
  ['fractional line', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), line: 1.5 }] })],
  ['empty problem', JSON.stringify({ summary: 'ok', findings: [{ ...finding('Block'), problem: '  ' }] })]
]) {
  assert.throws(() => parseReviewFindings(value), /./, label)
}

{
  const calls = []
  const command = (name, args) => {
    calls.push([name, ...args])
    if (args[0] === 'merge-base') return `${otherSha}\n`
    if (args[0] === 'diff') return 'diff --git a/x b/x\n'
    return ''
  }
  const range = resolveReviewRange({ baseSha: otherSha, headSha, command })
  assert.deepEqual(range, { baseSha: otherSha, headSha, mergeBaseSha: otherSha, diff: 'diff --git a/x b/x\n' })
  assert.deepEqual(calls, [
    ['git', 'cat-file', '-e', `${otherSha}^{commit}`],
    ['git', 'cat-file', '-e', `${headSha}^{commit}`],
    ['git', 'merge-base', otherSha, headSha],
    ['git', 'diff', '--no-color', otherSha, headSha]
  ])
  assert.throws(() => resolveReviewRange({ baseSha: 'main', headSha, command }), /PR base SHA/)
  const missing = []
  const fetchOnDemand = (name, args) => {
    missing.push([name, ...args])
    if (args[0] === 'cat-file') throw new Error('not found')
    if (args[0] === 'merge-base') return `${otherSha}\n`
    if (args[0] === 'diff') return 'diff\n'
    return ''
  }
  assert.equal(resolveReviewRange({ baseSha: otherSha, headSha, command: fetchOnDemand }).mergeBaseSha, otherSha)
  assert.deepEqual(
    missing.filter(([, ...args]) => args[0] === 'fetch'),
    [
      ['git', 'fetch', '--no-tags', 'origin', otherSha],
      ['git', 'fetch', '--no-tags', 'origin', headSha]
    ]
  )
  assert.throws(
    () =>
      resolveReviewRange({
        baseSha: otherSha,
        headSha: 'nope',
        command: (name, args) => (args[0] === 'merge-base' ? 'x\n' : '')
      }),
    /PR head SHA/
  )
  assert.throws(
    () =>
      resolveReviewRange({
        baseSha: otherSha,
        headSha,
        command: (name, args) => (args[0] === 'merge-base' ? 'not-a-sha\n' : '')
      }),
    /merge base SHA/
  )
}

{
  const reviewed = deriveConclusion({
    meta: metaOf(),
    findings: parsedConclusion('Block'),
    liveHeadSha: headSha,
    error: ''
  })
  assert.equal(reviewed.status, 'reviewed')
  assert.equal(reviewed.blocking, true)

  const clean = deriveConclusion({ meta: metaOf(), findings: parsedConclusion('Nit'), liveHeadSha: headSha, error: '' })
  assert.equal(clean.status, 'reviewed')
  assert.equal(clean.blocking, false)

  const stale = deriveConclusion({
    meta: metaOf(),
    findings: parsedConclusion('Block'),
    liveHeadSha: otherSha,
    error: ''
  })
  assert.equal(stale.status, 'stale')
  assert.equal(stale.blocking, false, 'a Block that no longer describes the head must not gate the merge')
  assert.match(stale.reason, /head moved/)

  for (const [label, input] of [
    ['missing artifact', { meta: null, findings: null, liveHeadSha: headSha, error: 'the review artifact is missing' }],
    ['gateway error', { meta: metaOf(), findings: null, liveHeadSha: headSha, error: 'gateway returned 502' }],
    ['no findings', { meta: metaOf(), findings: null, liveHeadSha: headSha, error: '' }]
  ]) {
    const status = deriveConclusion(input)
    assert.equal(status.status, 'unreviewed', label)
    assert.equal(status.blocking, false, label)
    assert.deepEqual(status.counts, { Block: 0, 'Should fix': 0, Nit: 0 }, label)
  }
}

{
  const parsed = parsedConclusion('Should fix', 'Block')
  const meta = { ...metaOf(), summary: parsed.summary, findings: parsed.findings, effort: 'high', reused_from: '1234' }
  const body = renderConclusion({
    conclusion: deriveConclusion({ meta, findings: parsed, liveHeadSha: headSha, error: '' }),
    meta,
    pullNumber: 54
  })
  assert.ok(body.startsWith(`<!-- ${CONCLUSION_MARKER} sha=${headSha} status=blocked blocks=1 -->`))
  assert.match(body, /结论：\*\*已审查\*\*/)
  assert.match(body, /packages\/web-ui\/src\/button\.ts:12/)
  assert.match(body, /Block 1 · Should fix 1 · Nit 0/)
  assert.match(body, /模型：`claude-haiku-5-5`/)
  assert.match(body, /run `1234`/)
  assert.ok(body.indexOf('**Block**') < body.indexOf('**Should fix**'), 'Block renders before Should fix')
  assert.deepEqual(
    meta.findings.map(entry => entry.severity),
    ['Should fix', 'Block'],
    'rendering must not reorder input'
  )

  const escaped = renderConclusion({
    conclusion: deriveConclusion({
      meta,
      findings: null,
      liveHeadSha: headSha,
      error: '<script>alert(1)</script> broke'
    }),
    meta,
    pullNumber: 54
  })
  assert.ok(!escaped.includes('<script>'), 'model text must not inject HTML into the comment')
  assert.match(escaped, /scriptalert/)

  const unreviewed = renderConclusion({
    conclusion: deriveConclusion({ meta: null, findings: null, liveHeadSha: headSha, error: 'no conclusion' }),
    meta: null,
    pullNumber: 54
  })
  assert.match(unreviewed, /sha=none status=unreviewed blocks=0/)
  assert.match(unreviewed, /结论：\*\*未审查\*\*/)
  assert.match(unreviewed, /没有可用发现/)
}

{
  const runEntry = id => ({ id, name: 'CI', head_sha: headSha, conclusion: 'success' })
  const adapter = (runs, artifacts = [{ name: FINDINGS_ARTIFACT, id: 7 }]) => ({
    runs: () => runs,
    artifacts: () => artifacts
  })

  assert.deepEqual(
    findReusableRun({
      adapter: adapter([
        runEntry(10),
        runEntry(30),
        { ...runEntry(20), conclusion: 'failure' },
        { ...runEntry(40), name: 'Wails verify' },
        { ...runEntry(50), head_sha: otherSha }
      ]),
      headSha,
      currentRunId: '60'
    }),
    { runId: '30', artifactId: 7 },
    'the newest successful CI run on this head wins'
  )
  assert.equal(
    findReusableRun({ adapter: adapter([runEntry(40)]), headSha, currentRunId: '40' }),
    null,
    'the current run must not reuse its own in-flight conclusion'
  )
  assert.equal(
    findReusableRun({ adapter: adapter([runEntry(30)], []), headSha, currentRunId: '40' }),
    null,
    'a run without the findings artifact is not reusable'
  )
}

{
  const pullOf = (number, sha, updated_at) => ({ number, head: { sha }, updated_at })
  const adapter = pulls => ({ pulls: () => pulls })

  assert.equal(
    findPullForHead({
      adapter: adapter([
        pullOf(10, otherSha, '2026-01-01'),
        pullOf(11, headSha, '2026-01-02'),
        pullOf(12, headSha, '2026-03-04')
      ]),
      headSha
    }),
    12,
    'the pull request most recently touching this head wins'
  )
  assert.equal(
    findPullForHead({ adapter: adapter([pullOf(10, otherSha, '2026-01-01')]), headSha }),
    null,
    'a PR whose head moved on is not the owner of this SHA'
  )
  assert.equal(findPullForHead({ adapter: adapter([]), headSha }), null)
  assert.equal(findPullForHead({ adapter: adapter(undefined), headSha }), null, 'a null payload is no pull request')
}

{
  const calls = []
  const spawn = (command, args) => {
    calls.push(args)
    const endpoint = String(args.at(-1))
    if (args.includes('POST') || args.includes('PATCH')) return { status: 0, stdout: '{"id":9,"body":"posted"}' }
    if (endpoint.includes('/issues/54/comments')) return { status: 0, stdout: '[{"id":9,"body":"other"}]' }
    if (endpoint.includes('/pulls/54')) return { status: 0, stdout: JSON.stringify({ head: { sha: headSha } }) }
    if (endpoint.includes(`/commits/${headSha}/pulls`)) {
      return { status: 0, stdout: `[{"number":54,"head":{"sha":"${headSha}"},"updated_at":"2026-01-01T00:00:00Z"}]` }
    }
    if (endpoint.includes('/actions/runs?')) return { status: 0, stdout: '{"workflow_runs":[]}' }
    if (endpoint.includes('/actions/runs/30/artifacts')) return { status: 0, stdout: '{"artifacts":[]}' }
    return { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
  }
  const adapter = createGhReviewAdapter({ repository: 'owner/repo', spawn, cwd: '/tmp', env: {} })
  assert.equal(adapter.pull(54).head.sha, headSha)
  assert.equal(findPullForHead({ adapter, headSha }), 54)
  assert.deepEqual(adapter.listComments(54), [{ id: 9, body: 'other' }])
  assert.equal(adapter.createComment(54, 'body').id, 9)
  assert.equal(adapter.updateComment(9, 'body').id, 9)
  assert.deepEqual(adapter.runs(headSha), [])
  assert.deepEqual(adapter.artifacts(30), [])
  assert.throws(() => adapter.artifacts(31), /HTTP 404/)
  const posted = calls.find(args => args.includes('POST'))
  assert.ok(posted.includes('body=body'), 'the comment body travels as a gh api form field')
  assert.equal(posted.at(-1), 'repos/owner/repo/issues/54/comments')
}

{
  // ci.yml 只能写死分支名，这里钉住常量和它一致。
  assert.equal(RELEASE_BRANCH, 'changeset-release/main')
  const pullOf = overrides => ({
    number: 54,
    state: 'open',
    base: { ref: 'main' },
    head: { ref: 'feature/x', sha: headSha, repo: { full_name: 'owner/repo' } },
    ...overrides
  })
  const target = pull => reviewTarget({ pull, repository: 'owner/repo', releaseBranch: RELEASE_BRANCH })

  assert.deepEqual(target(pullOf()), { ok: true, number: 54, headRef: 'feature/x', headSha })
  assert.match(target(pullOf({ state: 'closed' })).reason, /is closed/)
  assert.match(target(pullOf({ base: { ref: 'topic' } })).reason, /not main/)
  assert.match(
    target(pullOf({ head: { ref: 'feature/x', sha: headSha, repo: { full_name: 'someone/else' } } })).reason,
    /fork/
  )
  assert.match(
    target(pullOf({ head: { ref: RELEASE_BRANCH, sha: headSha, repo: { full_name: 'owner/repo' } } })).reason,
    /release branch/
  )
}

{
  const directory = tempConclusion(conclusionOf('Block'), metaOf())
  const conclusion = readConclusion(directory)
  assert.equal(conclusion.meta.head_sha, headSha)
  assert.equal(conclusion.meta.summary, '改动整体可用。')
  assert.equal(conclusion.findings.counts.Block, 1)
  assert.equal(readConclusion(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-empty-'))), null)
  fs.writeFileSync(path.join(directory, 'review-findings.json'), 'oops')
  assert.throws(() => readConclusion(directory), /not valid JSON/)
  fs.rmSync(directory, { recursive: true, force: true })
}

function tempConclusion(conclusion, meta) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-conclusion-'))
  writeFixtures(directory, conclusion, meta)
  return directory
}

function runCli(command, { env = {}, conclusionDir }) {
  const outputPath = path.join(conclusionDir, 'output')
  const summaryPath = path.join(conclusionDir, 'summary')
  fs.writeFileSync(outputPath, '')
  fs.writeFileSync(summaryPath, '')
  const result = spawnSync(process.execPath, [scriptPath, command], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_REF: 'refs/pull/54/merge',
      CODEX_REVIEW_CONCLUSION_DIR: conclusionDir,
      ...env
    }
  })
  const outputs = Object.fromEntries(
    fs
      .readFileSync(outputPath, 'utf8')
      .split('\n')
      .filter(line => line.includes('='))
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  )
  return { result, outputs, summary: fs.readFileSync(summaryPath, 'utf8') }
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-gate-'))

  const missing = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(missing.result.status, 0, 'a missing conclusion is unreviewed, never a red gate')
  assert.match(missing.summary, /Status: \*\*unreviewed\*\*/)
  assert.match(missing.summary, /review artifact is missing/)

  writeFixtures(directory, conclusionOf('Block'), metaOf())
  const blocking = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(blocking.result.status, 1, 'a fresh Block must fail the gate')
  assert.match(blocking.summary, /Status: \*\*reviewed\*\*/)
  assert.match(blocking.summary, /Block 1 · Should fix 0 · Nit 0/)
  assert.match(blocking.summary, new RegExp(`Reviewed head: \`${headSha}\``))

  const stale = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: otherSha }, conclusionDir: directory })
  assert.equal(stale.result.status, 0, 'the same Block must not gate a head the review never saw')
  assert.match(stale.summary, /Status: \*\*stale\*\*/)

  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  const clean = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(clean.result.status, 0)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-validate-'))
  const runnerTemp = path.join(directory, 'runner-temp')
  const conclusionDir = path.join(directory, 'conclusion')
  fs.mkdirSync(runnerTemp, { recursive: true })
  fs.mkdirSync(conclusionDir, { recursive: true })
  const validateEnv = {
    RUNNER_TEMP: runnerTemp,
    CODEX_REVIEW_CONCLUSION_DIR: conclusionDir,
    CODEX_REVIEW_HEAD_SHA: headSha,
    CODEX_REVIEW_BASE_SHA: otherSha,
    CODEX_REVIEW_MODEL: 'claude-haiku-5-5',
    CODEX_REVIEW_EFFORT: 'high'
  }
  fs.writeFileSync(
    path.join(runnerTemp, 'codex-final-message.json'),
    JSON.stringify({ summary: '有两处要改。', findings: [finding('Block'), finding('Should fix')] })
  )
  const validated = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(validated.result.status, 0, validated.result.stderr)
  assert.equal(validated.outputs.blocks, '1')
  const persisted = readConclusion(conclusionDir)
  assert.equal(persisted.meta.head_sha, headSha)
  assert.equal(persisted.meta.model, 'claude-haiku-5-5')
  assert.equal(persisted.findings.counts['Should fix'], 1)

  fs.rmSync(path.join(runnerTemp, 'codex-final-message.json'))
  fs.rmSync(path.join(conclusionDir, 'review-findings.json'))
  fs.rmSync(path.join(conclusionDir, 'review-meta.json'))
  const broken = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(broken.result.status, 0, 'an unusable model output stays unreviewed instead of erroring out')
  assert.equal(broken.outputs.blocks, '0')
  assert.match(broken.outputs.reason, /no output file/)
  assert.equal(fs.existsSync(path.join(conclusionDir, 'review-findings.json')), false)
  const gateAfterBreak = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateAfterBreak.result.status, 0)
  assert.match(gateAfterBreak.summary, /no output file/)

  fs.writeFileSync(
    path.join(runnerTemp, 'codex-final-message.json'),
    '{"summary":"ok","findings":[{"severity":"Blocker","file":"","line":0,"problem":"x","suggestion":"y"}]}'
  )
  const wrongSeverity = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(wrongSeverity.result.status, 0)
  assert.match(wrongSeverity.outputs.reason, /unknown severity/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-reuse-'))
  const reuseEnv = { CODEX_REVIEW_HEAD_SHA: headSha, CODEX_REVIEW_PRIOR_RUN_ID: '4321', RUNNER_TEMP: directory }

  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  const reused = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(reused.result.status, 0, reused.result.stderr)
  assert.equal(reused.outputs.reused, 'true')
  assert.equal(readConclusion(directory).meta.reused_from, '4321')

  writeFixtures(directory, conclusionOf('Nit'), metaOf({ head_sha: otherSha }))
  const drifted = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(drifted.outputs.reused, 'false')
  assert.equal(drifted.outputs.reason, '', 'a head mismatch is expected, not a read failure')
  assert.equal(
    fs.existsSync(path.join(directory, 'review-findings.json')),
    false,
    'a mismatched conclusion must not be reused'
  )

  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  fs.writeFileSync(path.join(directory, 'review-findings.json'), 'not json')
  const corrupt = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(corrupt.result.status, 0, 'a corrupt conclusion degrades to a fresh model call')
  assert.equal(corrupt.outputs.reused, 'false')
  assert.match(corrupt.outputs.reason, /not valid JSON/)
  fs.rmSync(directory, { recursive: true, force: true })
}

console.log('.github/scripts/codex-review.test.mjs: all assertions passed')
