import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  CONFIG_ENV,
  CONFIG_FILE,
  CONCLUSION_MARKER,
  FINDINGS_ARTIFACT,
  REVIEW_EXCLUDE_PATHSPECS,
  createGhReviewAdapter,
  deriveConclusion,
  findPullForHead,
  findReusableRun,
  inspectConfig,
  parseReviewFindings,
  readConclusion,
  renderConclusion,
  resolveReviewRange,
  reviewTarget,
  withPermissionDiagnosis
} from './codex-review.mjs'
import { SPAWN_MAX_BUFFER, run } from './lib/github.mjs'
import { RELEASE_BRANCH } from './lib/workflow-topology.mjs'

const headSha = 'a'.repeat(40)
const otherSha = 'b'.repeat(40)
const scriptPath = path.join(import.meta.dirname, 'codex-review.mjs')
const configFingerprint = '0123456789abcdef'
const configuredEnv = Object.fromEntries(CONFIG_ENV.map(name => [name, `value-for-${name}`]))

function writeConfig(directory) {
  fs.writeFileSync(
    path.join(directory, CONFIG_FILE),
    JSON.stringify({
      endpoint: 'https://responses.example.test/v1/responses',
      model: 'configured-model',
      effort: 'configured-effort',
      version: 'configured-version',
      key_present: true,
      fingerprint: configFingerprint
    })
  )
}

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
  return {
    head_sha: headSha,
    base_sha: otherSha,
    merge_base_sha: otherSha,
    model: 'configured-model',
    effort: 'configured-effort',
    config_fingerprint: configFingerprint,
    status: 'reviewed',
    ...overrides
  }
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
    ['git', 'diff', '--no-color', otherSha, headSha, '--', ':(exclude,glob)**/generated/**']
  ])
  assert.deepEqual([...REVIEW_EXCLUDE_PATHSPECS], [':(exclude,glob)**/generated/**'])
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

  // 缺产物、读失败、配置故障与调用故障都不能再静默放绿。
  for (const [label, input] of [
    ['missing artifact', { meta: null, findings: null, liveHeadSha: headSha, error: 'the review artifact is missing' }],
    ['gateway error', { meta: metaOf(), findings: null, liveHeadSha: headSha, error: 'gateway returned 502' }],
    ['no findings', { meta: metaOf(), findings: null, liveHeadSha: headSha, error: '' }],
    [
      'config error',
      {
        meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
        findings: null,
        liveHeadSha: headSha,
        error: ''
      }
    ]
  ]) {
    const status = deriveConclusion(input)
    assert.equal(status.status, 'error', label)
    assert.equal(status.blocking, true, label)
    assert.deepEqual(status.counts, { Block: 0, 'Should fix': 0, Nit: 0 }, label)
  }

  const configError = deriveConclusion({
    meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
    findings: parsedConclusion('Block'),
    liveHeadSha: headSha,
    error: ''
  })
  assert.equal(configError.code, 'config_missing')
  assert.equal(configError.blocking, true, 'an error outranks findings from an earlier run')

  const notApplicable = deriveConclusion({
    meta: null,
    findings: null,
    liveHeadSha: headSha,
    error: 'the review artifact is missing',
    notApplicable: true
  })
  assert.equal(notApplicable.status, 'not_applicable')
  assert.equal(notApplicable.blocking, false)

  const unreviewed = deriveConclusion({
    meta: metaOf({ status: 'unreviewed', error: 'the review step produced no output file' }),
    findings: null,
    liveHeadSha: headSha,
    error: ''
  })
  assert.equal(unreviewed.status, 'unreviewed')
  assert.equal(unreviewed.blocking, false, 'a model that completed without output stays green')

  const complete = inspectConfig(configuredEnv)
  assert.equal(complete.present, true)
  assert.deepEqual(complete.missing, [])
  assert.equal(complete.config.key_present, true)
  const incomplete = inspectConfig({ ...configuredEnv, CODEX_REVIEW_MODEL: '', CODEX_VERSION: ' ' })
  assert.deepEqual(incomplete.missing, ['CODEX_REVIEW_MODEL', 'CODEX_VERSION'])
  assert.equal(
    inspectConfig({ ...configuredEnv, CODEX_REVIEW_MODEL: 'other-model' }).config.fingerprint ===
      complete.config.fingerprint,
    false,
    'changing the model must change the fingerprint'
  )
  assert.equal(
    JSON.stringify(complete.config).includes(configuredEnv.CODEX_REVIEW_API_KEY),
    false,
    'the config snapshot must never carry the API key value'
  )
  const padded = inspectConfig({
    ...configuredEnv,
    CODEX_REVIEW_MODEL: `  ${configuredEnv.CODEX_REVIEW_MODEL}  `
  })
  assert.equal(padded.config.model, configuredEnv.CODEX_REVIEW_MODEL)
  assert.equal(
    padded.config.fingerprint,
    complete.config.fingerprint,
    'whitespace padding must not look like a configuration change'
  )
  assert.equal(inspectConfig({ ...configuredEnv, CODEX_REVIEW_API_KEY: '   ' }).present, false)
}

{
  const parsed = parsedConclusion('Should fix', 'Block')
  const meta = { ...metaOf(), summary: parsed.summary, findings: parsed.findings, reused_from: '1234' }
  const body = renderConclusion({
    conclusion: deriveConclusion({ meta, findings: parsed, liveHeadSha: headSha, error: '' }),
    meta,
    pullNumber: 54
  })
  assert.ok(body.startsWith(`<!-- ${CONCLUSION_MARKER} sha=${headSha} status=blocked blocks=1 -->`))
  assert.match(body, /结论：\*\*已审查\*\*/)
  assert.match(body, /packages\/web-ui\/src\/button\.ts:12/)
  assert.match(body, /Block 1 · Should fix 1 · Nit 0/)
  assert.match(body, /模型：`configured-model`/)
  assert.match(body, /Block` 与 `error` 让/)
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

  const unreviewedMeta = { status: 'unreviewed', error: 'the review step produced no output file' }
  const unreviewed = renderConclusion({
    conclusion: deriveConclusion({ meta: unreviewedMeta, findings: null, liveHeadSha: headSha, error: '' }),
    meta: unreviewedMeta,
    pullNumber: 54
  })
  assert.match(unreviewed, /sha=none status=unreviewed blocks=0/)
  assert.match(unreviewed, /结论：\*\*未审查\*\*/)
  assert.match(unreviewed, /没有可用发现/)

  const failed = renderConclusion({
    conclusion: deriveConclusion({
      meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
      findings: null,
      liveHeadSha: headSha,
      error: ''
    }),
    meta: metaOf({ status: 'error', error_code: 'config_missing', error: 'missing CODEX_REVIEW_MODEL' }),
    pullNumber: 54
  })
  assert.match(failed, /status=error blocks=0/)
  assert.match(failed, /结论：\*\*审查失败\*\*/)
  assert.match(failed, /故障码：`config_missing`/)
  assert.match(failed, /检查 GitHub 后台的 secrets\/variables/)
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
      PATH: process.env.PATH,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_REF: 'refs/pull/54/merge',
      RUNNER_TEMP: conclusionDir,
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
  assert.equal(missing.result.status, 1, 'a missing conclusion is an error, never a silent green gate')
  assert.match(missing.summary, /Status: \*\*error\*\*/)
  assert.match(missing.summary, /review artifact is missing/)

  const skipped = runCli('gate', {
    env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha, CODEX_REVIEW_NOT_APPLICABLE: 'true' },
    conclusionDir: directory
  })
  assert.equal(skipped.result.status, 0, 'a skipped review job is not applicable, not a failure')
  assert.match(skipped.summary, /Status: \*\*not_applicable\*\*/)

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
    CODEX_REVIEW_STEP_OUTCOME: 'success'
  }
  writeConfig(runnerTemp)
  fs.writeFileSync(
    path.join(runnerTemp, 'codex-final-message.json'),
    JSON.stringify({ summary: '有两处要改。', findings: [finding('Block'), finding('Should fix')] })
  )
  const validated = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(validated.result.status, 0, validated.result.stderr)
  assert.equal(validated.outputs.blocks, '1')
  const persisted = readConclusion(conclusionDir)
  assert.equal(persisted.meta.head_sha, headSha)
  assert.equal(persisted.meta.model, 'configured-model')
  assert.equal(persisted.meta.config_fingerprint, configFingerprint)
  assert.equal(persisted.meta.status, 'reviewed')
  assert.equal(persisted.findings.counts['Should fix'], 1)

  fs.rmSync(path.join(runnerTemp, 'codex-final-message.json'))
  fs.rmSync(path.join(conclusionDir, 'review-findings.json'))
  fs.rmSync(path.join(conclusionDir, 'review-meta.json'))
  const broken = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(broken.result.status, 0, 'a model that completed without output stays unreviewed')
  assert.equal(broken.outputs.blocks, '0')
  assert.match(broken.outputs.reason, /no output file/)
  assert.equal(fs.existsSync(path.join(conclusionDir, 'review-findings.json')), false)
  const gateAfterBreak = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateAfterBreak.result.status, 0)
  assert.match(gateAfterBreak.summary, /Status: \*\*unreviewed\*\*/)

  // 同一个「没有输出文件」，outcome=failure 说明 action 崩了，必须让 gate 变红。
  const crashed = runCli('validate', {
    env: { ...validateEnv, CODEX_REVIEW_STEP_OUTCOME: 'failure' },
    conclusionDir
  })
  assert.equal(crashed.result.status, 0)
  const gateAfterCrash = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateAfterCrash.result.status, 1, 'a crashed model action must not be masked by continue-on-error')
  assert.match(gateAfterCrash.summary, /Status: \*\*error\*\*/)

  // 没有配置快照时 validate 不能把 error 结论覆盖成 unreviewed。
  fs.rmSync(path.join(runnerTemp, CONFIG_FILE))
  const unconfigured = runCli('validate', { env: validateEnv, conclusionDir })
  assert.equal(unconfigured.result.status, 0)
  const gateUnconfigured = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir })
  assert.equal(gateUnconfigured.result.status, 1)
  assert.match(gateUnconfigured.summary, /Status: \*\*error\*\*/)

  writeConfig(runnerTemp)
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
  // preflight 是配置缺失的第一道也是唯一一道写 error 结论的地方。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-preflight-'))
  const ready = runCli('preflight', { env: configuredEnv, conclusionDir: directory })
  assert.equal(ready.result.status, 0, ready.result.stderr)
  assert.equal(ready.outputs.configured, 'true')
  assert.equal(ready.outputs.missing, '')
  assert.ok(fs.existsSync(path.join(directory, CONFIG_FILE)))
  assert.ok(
    !fs.readFileSync(path.join(directory, CONFIG_FILE), 'utf8').includes('value-for-CODEX_REVIEW_API_KEY'),
    'the config snapshot must never persist the API key'
  )

  fs.rmSync(path.join(directory, CONFIG_FILE))
  const incomplete = runCli('preflight', {
    env: { ...configuredEnv, CODEX_RESPONSES_ENDPOINT: '', CODEX_REVIEW_EFFORT: '' },
    conclusionDir: directory
  })
  assert.equal(incomplete.result.status, 0, 'a missing configuration is a red gate, not a crashed step')
  assert.equal(incomplete.outputs.configured, 'false')
  assert.equal(incomplete.outputs.missing, 'CODEX_RESPONSES_ENDPOINT,CODEX_REVIEW_EFFORT')
  assert.equal(fs.existsSync(path.join(directory, CONFIG_FILE)), false)
  const meta = JSON.parse(fs.readFileSync(path.join(directory, 'review-meta.json'), 'utf8'))
  assert.equal(meta.status, 'error')
  assert.equal(meta.error_code, 'config_missing')
  assert.deepEqual(meta.missing, ['CODEX_RESPONSES_ENDPOINT', 'CODEX_REVIEW_EFFORT'])
  const gate = runCli('gate', { env: { CODEX_REVIEW_LIVE_HEAD_SHA: headSha }, conclusionDir: directory })
  assert.equal(gate.result.status, 1)
  assert.match(gate.summary, /Status: \*\*error\*\*/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-reuse-'))
  const reuseEnv = { CODEX_REVIEW_HEAD_SHA: headSha, CODEX_REVIEW_PRIOR_RUN_ID: '4321', RUNNER_TEMP: directory }
  writeConfig(directory)

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

  writeFixtures(directory, conclusionOf('Nit'), metaOf({ config_fingerprint: 'another-configuration' }))
  const reconfigured = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(reconfigured.outputs.reused, 'false')
  assert.match(
    reconfigured.outputs.reason,
    /configuration changed/,
    'a changed model or endpoint must force a fresh review'
  )

  writeFixtures(directory, conclusionOf('Nit'), metaOf({ status: 'error', error_code: 'config_missing' }))
  const priorError = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(priorError.outputs.reused, 'false')
  assert.match(priorError.outputs.reason, /no reviewable conclusion/, 'a failed prior run must never be reused')

  fs.rmSync(path.join(directory, CONFIG_FILE))
  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  const noConfig = runCli('reuse', { env: reuseEnv, conclusionDir: directory })
  assert.equal(noConfig.outputs.reused, 'false')
  assert.match(noConfig.outputs.reason, /configuration snapshot is missing/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 读写 PR 的 403 都必须带排查清单；诊断只认权限类错误，不能吞掉其它失败。
  const call = withPermissionDiagnosis('54')
  assert.equal(
    call(() => 'ok'),
    'ok'
  )
  for (const message of [
    'gh api failed (exit 1): Resource not accessible by integration',
    'gh api failed (exit 1): HTTP 403: forbidden',
    'gh api failed (exit 1): 403 Forbidden'
  ]) {
    assert.throws(
      () =>
        call(() => {
          throw new Error(message)
        }),
      /cannot access PR #54 or its comments/
    )
  }
  // gh 会把 `-f body=<评论正文>` 拼进 error.message；正文里的 "403" 不能触发权限诊断。
  for (const message of [
    'gh api failed (exit 1): HTTP 500: upstream unavailable',
    'gh api -X POST -f body=fix issue 403 repos/owner/repo/issues/54/comments failed (exit 1): HTTP 500'
  ]) {
    const other = new Error(message)
    assert.throws(
      () =>
        call(() => {
          throw other
        }),
      error => error === other,
      'non-permission failures must surface unchanged'
    )
  }
}

{
  // 端到端：把 gh 换成受控替身，分别让读评论、写评论、非权限调用失败。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-report-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const fakeGh = path.join(bin, 'gh')
  fs.writeFileSync(
    fakeGh,
    `#!/bin/sh
case "$*" in
  *"-X POST"*)
    if [ "$FAKE_GH_FAIL_AT" = "write" ] || [ "$FAKE_GH_FAIL_AT" = "server" ]; then
      echo "gh: $FAKE_GH_ERROR" >&2
      exit 1
    fi
    printf '%s\\n' '{"id":9001}'
    ;;
  *"/pulls/54")
    printf '%s\\n' '{"number":54,"state":"open","base":{"ref":"main"},"head":{"ref":"feature","sha":"${headSha}","repo":{"full_name":"owner/repo"}}}'
    ;;
  *"/comments?per_page=100")
    if [ "$FAKE_GH_FAIL_AT" = "read" ]; then
      echo "gh: $FAKE_GH_ERROR" >&2
      exit 1
    fi
    printf '%s\\n' '[]'
    ;;
  *)
    echo "unexpected gh invocation: $*" >&2
    exit 2
    ;;
esac
`,
    { mode: 0o755 }
  )
  writeFixtures(directory, conclusionOf('Nit'), metaOf())
  const reportEnv = failAt => ({
    PATH: `${bin}:${process.env.PATH}`,
    CODEX_REVIEW_LIVE_HEAD_SHA: headSha,
    FAKE_GH_FAIL_AT: failAt,
    FAKE_GH_ERROR: 'Resource not accessible by integration (HTTP 403)'
  })

  const created = runCli('report', { env: reportEnv('none'), conclusionDir: directory })
  assert.equal(created.result.status, 0, created.result.stderr)
  assert.match(created.result.stdout, /created conclusion comment 9001/)
  // 运行页要能回答「这次到底发了什么」：只有日志里的 console.log 不够。
  assert.match(created.summary, /已创建结论评论 #9001/)
  assert.match(created.summary, /Block 0 · Should fix 0 · Nit 1/)

  for (const failAt of ['read', 'write']) {
    const denied = runCli('report', { env: reportEnv(failAt), conclusionDir: directory })
    assert.equal(denied.result.status, 1, `${failAt} 403 must fail the report step`)
    assert.match(denied.result.stderr, /cannot access PR #54 or its comments/, failAt)
    assert.match(denied.result.stderr, /pull-requests: write/, failAt)
    assert.match(denied.result.stderr, /Workflow permissions/, failAt)
    assert.match(denied.result.stderr, /organization policy/, failAt)
  }

  const serverError = runCli('report', {
    env: { ...reportEnv('server'), FAKE_GH_ERROR: 'HTTP 500: upstream unavailable' },
    conclusionDir: directory
  })
  assert.equal(serverError.result.status, 1)
  assert.match(serverError.result.stderr, /HTTP 500/, 'the original failure must still be visible')
  assert.doesNotMatch(serverError.result.stderr, /cannot access PR #54/, 'a 500 is not a permission diagnosis')
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 生成产物必须在 diff 入口就剔掉，而不是指望模型自己忽略；嵌套与根级 generated/ 都要覆盖。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-scope-'))
  const git = args => run('git', ['-C', directory, ...args])
  const commit = message =>
    git(['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', message])
  git(['-c', 'init.defaultBranch=main', 'init', '-q'])
  git(['config', 'user.email', 'scope@example.test'])
  git(['config', 'user.name', 'Scope Test'])
  fs.mkdirSync(path.join(directory, 'src/generated'), { recursive: true })
  fs.mkdirSync(path.join(directory, 'generated'), { recursive: true })
  fs.writeFileSync(path.join(directory, 'src/generated/hash-a.js'), 'export const a = 1\n')
  fs.writeFileSync(path.join(directory, 'generated/root.js'), 'export const root = 1\n')
  fs.writeFileSync(path.join(directory, 'src/real.ts'), 'export const real = 1\n')
  git(['add', '.'])
  commit('base')
  const baseSha = git(['rev-parse', 'HEAD']).trim()
  fs.rmSync(path.join(directory, 'src/generated/hash-a.js'))
  fs.writeFileSync(path.join(directory, 'src/generated/hash-b.js'), 'export const a = 2\n')
  fs.writeFileSync(path.join(directory, 'generated/root.js'), 'export const root = 2\n')
  fs.writeFileSync(path.join(directory, 'src/real.ts'), 'export const real = 2\n')
  git(['add', '-A'])
  commit('head')
  const headSha = git(['rev-parse', 'HEAD']).trim()
  const range = resolveReviewRange({ baseSha, headSha, command: (_name, args) => git(args) })
  assert.match(range.diff, /src\/real\.ts/, 'real source must stay in the review diff')
  assert.doesNotMatch(range.diff, /src\/generated\//, 'nested generated artifacts must be excluded')
  assert.doesNotMatch(range.diff, /generated\/root\.js/, 'root-level generated artifacts must be excluded')
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 回归：大 PR 的 git diff 曾撑爆 spawnSync 默认 1 MiB 缓冲，让 prepare 在 preflight 之前就失败。
  const bytes = 2 * 1024 * 1024
  const output = run(process.execPath, ['-e', `process.stdout.write('x'.repeat(${bytes}))`])
  assert.equal(output.length, bytes, 'large stdout must not hit ENOBUFS')
  assert.equal(SPAWN_MAX_BUFFER, 64 * 1024 * 1024, 'the documented buffer ceiling must stay explicit')
  assert.throws(
    () => run(process.execPath, ['-e', "process.stdout.write('x'.repeat(4096))"], { maxBuffer: 1024 }),
    /exceeded the configured 1024 bytes buffer/,
    'an overridden maxBuffer must be reported with the actual limit'
  )
}

console.log('.github/scripts/codex-review.test.mjs: all assertions passed')
