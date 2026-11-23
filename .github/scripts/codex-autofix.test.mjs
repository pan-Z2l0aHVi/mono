import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  AUTOFIX_TRAILER_KEY,
  AUTOFIX_TRAILER,
  AUTOFIX_TRAILER_VALUE,
  MAX_AUTOFIX_COMMITS,
  PULL_COMMITS_API_CAP,
  REQUIRED_JOB,
  appendStepSummary,
  assertPushAllowed,
  autofixCommitMessage,
  capturePatch,
  countAutofixCommits,
  createGhAutofixAdapter,
  createGuardedMatcher,
  failedJobSteps,
  failedStepAllowsChangeset,
  generatedGuarded,
  globToRegExp,
  hasAutofixTrailer,
  inspectPatch,
  isChangesetAddition,
  readAutofixMessage,
  tailLog,
  validatePatchFile
} from './codex-autofix.mjs'
import { resolvePullNumber } from './lib/github.mjs'

const headSha = 'a'.repeat(40)
const otherSha = 'b'.repeat(40)
const scriptPath = path.join(import.meta.dirname, 'codex-autofix.mjs')
const settingsFile = fs.readFileSync(path.join(import.meta.dirname, '../../.claude/settings.json'), 'utf8')

const TEST_ENV_ALLOWLIST = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'SystemRoot',
  'ComSpec',
  'PATHEXT',
  'USERPROFILE'
]

function testEnv(overrides = {}) {
  const env = {}
  for (const key of TEST_ENV_ALLOWLIST) {
    if (process.env[key] !== undefined) env[key] = process.env[key]
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key]
    else env[key] = String(value)
  }
  return env
}

function prependPath(bin) {
  const basePath = process.env.PATH || ['/usr/bin', '/bin'].join(path.delimiter)
  return [bin, basePath].filter(Boolean).join(path.delimiter)
}

function shQuote(value) {
  return `'${String(value).replace(/'/gu, `'\\''`)}'`
}

function writeFakeGh({
  bin,
  callsPath,
  repository = 'owner/repo',
  pullNumber = 54,
  runId,
  jobId,
  commitPages = {},
  pullFile,
  pullFiles,
  jobsFile,
  logFile
}) {
  const cases = []
  for (const [page, file] of Object.entries(commitPages)) {
    cases.push(
      `  "api repos/${repository}/pulls/${pullNumber}/commits?per_page=100&page=${page}")\n    cat ${shQuote(file)}\n    ;;`
    )
  }
  if (pullFile !== undefined) {
    cases.push(`  "api repos/${repository}/pulls/${pullNumber}")\n    cat ${shQuote(pullFile)}\n    ;;`)
  }
  if (Array.isArray(pullFiles)) {
    // 按调用序返回不同的 PR 快照（push 失败复查这类同一 run 内的第二次读取）：
    // calls 在 case 分派前已记账，exact-match 计数即本次是第几次 pull 读取。
    const branches = pullFiles.map((file, index) => `      ${index + 1}) cat ${shQuote(file)} ;;`).join('\n')
    cases.push(
      `  "api repos/${repository}/pulls/${pullNumber}")\n` +
        `    i=$(grep -cxF "api repos/${repository}/pulls/${pullNumber}" ${shQuote(callsPath)})\n` +
        `    case "$i" in\n${branches}\n      *) cat ${shQuote(pullFiles.at(-1))} ;;\n    esac\n    ;;`
    )
  }
  if (runId !== undefined && jobsFile !== undefined) {
    cases.push(
      `  "api repos/${repository}/actions/runs/${runId}/jobs?per_page=100")\n    cat ${shQuote(jobsFile)}\n    ;;`
    )
  }
  if (jobId !== undefined && logFile !== undefined) {
    cases.push(
      `  "api --allow-escape-sequences repos/${repository}/actions/jobs/${jobId}/logs")\n    cat ${shQuote(logFile)}\n    ;;`,
      `  "api repos/${repository}/actions/jobs/${jobId}/logs")\n    echo "gh: non-JSON response contains control characters; pass --allow-escape-sequences to output it" >&2\n    exit 1\n    ;;`
    )
  }
  const script = [
    '#!/bin/sh',
    `printf '%s\\n' "$*" >> ${shQuote(callsPath)}`,
    'case "$*" in',
    ...cases,
    '  *)',
    '    echo "unexpected gh call: $*" >&2',
    '    exit 1',
    '    ;;',
    'esac',
    ''
  ].join('\n')
  const ghPath = path.join(bin, 'gh')
  fs.writeFileSync(ghPath, script, { mode: 0o755 })
  return ghPath
}

function guarded() {
  return createGuardedMatcher({ repositoryFile: settingsFile })
}

function modification(file) {
  return [
    `diff --git a/${file} b/${file}`,
    `index 1111111..2222222 100644`,
    `--- a/${file}`,
    `+++ b/${file}`,
    '@@ -1 +1 @@',
    '-old',
    '+new'
  ].join('\n')
}

function addition(file, { mode = '100644' } = {}) {
  return [
    `diff --git a/${file} b/${file}`,
    `new file mode ${mode}`,
    'index 0000000..e69de29',
    '--- /dev/null',
    `+++ b/${file}`,
    '@@ -0,0 +1,2 @@',
    '+---',
    '+---'
  ].join('\n')
}

function commit(message) {
  return { commit: { message } }
}

function plainCommits(count) {
  return Array.from({ length: count }, (_, index) => commit(`feat: change ${index}`))
}

function fakeGhSession({
  repository = 'owner/repo',
  pullNumber = 54,
  runId = 99,
  jobId = 2,
  pages = {},
  pull,
  jobs,
  log
}) {
  const calls = []
  const spawn = (command, args) => {
    calls.push([command, ...args])
    const call = args.join(' ')
    if (command !== 'gh') {
      return { status: 1, stdout: '', stderr: `unexpected gh call: ${[command, ...args].join(' ')}` }
    }
    if (
      args.length === 2 &&
      args[0] === 'api' &&
      pull !== undefined &&
      args[1] === `repos/${repository}/pulls/${pullNumber}`
    ) {
      return { status: 0, stdout: JSON.stringify(pull) }
    }
    const commitsPrefix = `repos/${repository}/pulls/${pullNumber}/commits?per_page=100&page=`
    if (args.length === 2 && args[0] === 'api' && String(args[1]).startsWith(commitsPrefix)) {
      const page = String(args[1]).slice(commitsPrefix.length)
      if (Object.hasOwn(pages, page)) {
        return { status: 0, stdout: JSON.stringify(pages[page]) }
      }
    }
    if (
      args.length === 2 &&
      args[0] === 'api' &&
      jobs !== undefined &&
      args[1] === `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`
    ) {
      return { status: 0, stdout: JSON.stringify({ jobs }) }
    }
    if (
      args.length === 3 &&
      args[0] === 'api' &&
      args[1] === '--allow-escape-sequences' &&
      log !== undefined &&
      args[2] === `repos/${repository}/actions/jobs/${jobId}/logs`
    ) {
      return { status: 0, stdout: log }
    }
    return { status: 1, stdout: '', stderr: `unexpected gh call: ${call}` }
  }
  return { calls, spawn }
}

{
  // §9.1: 共享 PR number 解析器单测
  assert.equal(resolvePullNumber({ explicit: '54', ref: 'refs/pull/999/merge' }), '54')
  assert.equal(resolvePullNumber({ ref: 'refs/pull/54/merge' }), '54')
  assert.equal(resolvePullNumber(), '')
  assert.equal(resolvePullNumber({ explicit: '', ref: '' }), '')
  assert.equal(resolvePullNumber({ ref: 'refs/heads/main' }), '')
  assert.equal(resolvePullNumber({ ref: 'refs/pull/0/merge' }), '')
  assert.equal(resolvePullNumber({ ref: 'refs/pull/54/head' }), '')
  for (const invalid of ['0', 0, '-1', ' ', 'abc', '54/commits', null]) {
    assert.throws(
      () => resolvePullNumber({ explicit: invalid }),
      /pull number must be a positive integer/,
      `invalid explicit ${String(invalid)} must throw`
    )
    assert.throws(
      () => resolvePullNumber({ explicit: invalid, ref: 'refs/pull/54/merge' }),
      /pull number must be a positive integer/,
      `invalid explicit ${String(invalid)} must not fall back to GITHUB_REF`
    )
  }
  assert.equal(resolvePullNumber({ ref: 'refs/pull/54/merge', allowRefFallback: false }), '')
  assert.equal(resolvePullNumber({ explicit: '', ref: 'refs/pull/54/merge', allowRefFallback: false }), '')
  assert.equal(resolvePullNumber({ explicit: '54', ref: 'refs/pull/999/merge', allowRefFallback: false }), '54')
}

{
  // §7.2 & §9.2: testEnv 剥离宿主污染，且保留正常 allowlist 键值与空 PATH 兜底
  const pollutedKeys = [
    'GITHUB_REF',
    'GITHUB_HEAD_REF',
    'GITHUB_BASE_REF',
    'GITHUB_WORKSPACE',
    'GITHUB_OUTPUT',
    'GITHUB_TOKEN',
    'GH_TOKEN',
    'CODEX_AUTOFIX_PULL_NUMBER',
    'CODEX_TRUSTED_SETTINGS',
    'RUNNER_TEMP',
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_CONFIG_GLOBAL'
  ]
  const saved = new Map(
    [...pollutedKeys, 'PATH', 'HOME'].map(key => [key, Object.hasOwn(process.env, key) ? process.env[key] : undefined])
  )
  try {
    for (const key of pollutedKeys) process.env[key] = `polluted-${key}`
    process.env.PATH = '/custom/bin'
    const clean = testEnv()
    for (const key of pollutedKeys) {
      assert.equal(key in clean, false, `testEnv must strip ${key}`)
    }
    assert.equal(clean.PATH, '/custom/bin')
    if (saved.get('HOME') !== undefined) assert.equal(clean.HOME, saved.get('HOME'))
    assert.equal(prependPath('/fake/bin'), ['/fake/bin', '/custom/bin'].join(path.delimiter))

    process.env.PATH = ''
    assert.equal(prependPath('/fake/bin'), ['/fake/bin', '/usr/bin', '/bin'].join(path.delimiter))
    delete process.env.PATH
    assert.equal(prependPath('/fake/bin'), ['/fake/bin', '/usr/bin', '/bin'].join(path.delimiter))
  } finally {
    for (const [key, value] of saved.entries()) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

{
  assert.equal(
    globToRegExp('apps/*/src/generated/**').test('apps/react-web-ui-demo/src/generated/button.meta.js'),
    true
  )
  assert.equal(globToRegExp('**/routeTree.gen.ts').test('apps/react-web-ui-demo/src/routeTree.gen.ts'), true)
  assert.equal(
    globToRegExp('**/routeTree.gen.ts').test('routeTree.gen.ts'),
    true,
    'a root-level match is still a generated file'
  )
  assert.equal(globToRegExp('apps/*/frontend/bindings/**').test('apps/interweave/frontend/bindings/cmd/app.ts'), true)
  assert.equal(globToRegExp('packages/web-ui/src/icons/**').test('packages/web-ui/src/icons/index.ts'), true)
  assert.equal(globToRegExp('packages/web-ui/src/icons/**').test('packages/web-ui/src/button.ts'), false)
  assert.equal(globToRegExp('apps/*/src/generated/**').test('apps/react-web-ui-demo/src/button.ts'), false)
}

{
  const deny = JSON.parse(settingsFile).permissions.deny.filter(entry => entry.startsWith('Edit('))
  assert.ok(deny.length > 0, 'the repository must keep an authoritative generated artifact list')
  assert.equal(generatedGuarded({ repositoryFile: settingsFile }).length, deny.length)
  assert.throws(() => generatedGuarded({ repositoryFile: '{"permissions":{"deny":[]}}' }), /no Edit deny patterns/)

  const hit = guarded()
  const representatives = [
    'apps/interweave/frontend/bindings/cmd/app.ts',
    'apps/react-web-ui-demo/src/generated/button.CN.meta.js',
    'apps/vue-web-ui-demo/auto-imports.d.ts',
    'apps/react-web-ui-demo/src/routeTree.gen.ts',
    'apps/interweave/frontend/typed-router.d.ts',
    'packages/web-ui/src/icons/alert.svg.ts'
  ]
  for (const file of representatives) {
    assert.equal(hit(file)?.label, '生成物', `${file} must stay out of every autofix patch`)
  }
}

for (const file of [
  '.github/workflows/ci.yml',
  'pnpm-lock.yaml',
  'packages/web-ui/package.json',
  'pnpm-workspace.yaml',
  'skills-lock.json',
  '.npmrc',
  '.mise.toml',
  'apps/interweave/go.mod',
  'apps/interweave/go.sum',
  'go.work',
  'apps/interweave/go.work.sum',
  'apps/interweave/vendor/modules.txt',
  'AGENTS.md',
  'docs/agents/review.md',
  'docs/adr/0021-codex-review-gate.md',
  '.agents/skills/task-ledger/SKILL.md',
  '.codex/config.toml',
  '.claude/settings.json',
  '.env.local',
  'packages/web-ui/__screenshots__/button.png',
  'packages/web-ui/.vitest-attachments/1.json'
]) {
  assert.ok(guarded()(file), `${file} needs an autofix guard`)
}

for (const file of [
  'packages/web-ui/src/button.ts',
  'apps/interweave/main.go',
  'ago.mod',
  'packages/web-ui/go.mod.bak',
  'packages/md-to-meta/src/index.ts',
  'apps/interweave/frontend/wails.json',
  'docs/design/notes.md',
  'packages/web-ui/README.md'
]) {
  assert.equal(guarded()(file), null, `${file} is ordinary source that autofix may repair`)
}

{
  assert.deepEqual(inspectPatch(modification('packages/web-ui/src/button.ts')), {
    reject: '',
    files: ['packages/web-ui/src/button.ts'],
    added: []
  })
  assert.deepEqual(inspectPatch(''), { reject: 'patch changes no tracked file', files: [], added: [] })
  assert.match(inspectPatch('diff --git a/x/y.ts b/x/z.ts\n').reject, /renames or moves/)
  assert.match(inspectPatch(`${modification('a.ts')}\nnew file mode 100644\n`).reject, /adds a new file/)
  assert.match(inspectPatch(`${modification('a.ts')}\ndeleted file mode 100644\n`).reject, /deletes a file/)
  assert.match(inspectPatch('diff --git a/x.png b/x.png\nBinary files a/x.png and b/x.png differ\n').reject, /binary/)
  assert.match(inspectPatch('diff --git a/x.png b/x.png\nGIT binary patch\nliteral 12\n').reject, /binary/)

  assert.deepEqual(inspectPatch(addition('.changeset/quiet-fox.md'), { allowNewChangeset: true }), {
    reject: '',
    files: ['.changeset/quiet-fox.md'],
    added: ['.changeset/quiet-fox.md']
  })
  assert.match(inspectPatch(addition('.changeset/quiet-fox.md')).reject, /adds a new file/)
  assert.match(
    inspectPatch(addition('.changeset/nested/quiet-fox.md'), { allowNewChangeset: true }).reject,
    /adds a new file/
  )
  assert.match(
    inspectPatch(addition('.changeset/quiet-fox.txt'), { allowNewChangeset: true }).reject,
    /adds a new file/
  )
  assert.match(
    inspectPatch(addition('packages/web-ui/src/new.ts'), { allowNewChangeset: true }).reject,
    /adds a new file/
  )
  assert.match(
    inspectPatch(addition('.changeset/quiet-fox.md', { mode: '120000' }), { allowNewChangeset: true }).reject,
    /non-regular/
  )

  assert.equal(isChangesetAddition('.changeset/quiet-fox.md'), true)
  assert.equal(isChangesetAddition('.changeset/nested/quiet-fox.md'), false)
  assert.equal(isChangesetAddition('.changeset/README.md'), false)

  assert.equal(failedStepAllowsChangeset('Check changesets'), true)
  assert.equal(failedStepAllowsChangeset('Build, Check changesets'), true)
  assert.equal(failedStepAllowsChangeset('Test'), false)
  assert.equal(failedStepAllowsChangeset(''), false)
  assert.equal(failedStepAllowsChangeset(undefined), false)
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-patch-'))
  const patchPath = path.join(directory, 'autofix.patch')
  const command = () => modification('packages/web-ui/src/button.ts')
  const captured = capturePatch({ headSha, patchPath, guarded: guarded(), command })
  assert.deepEqual(captured.files, ['packages/web-ui/src/button.ts'])
  assert.equal(captured.reject, '')
  assert.equal(fs.readFileSync(patchPath, 'utf8'), modification('packages/web-ui/src/button.ts'))
  assert.deepEqual(validatePatchFile({ patchPath, guarded: guarded() }), {
    reject: '',
    files: ['packages/web-ui/src/button.ts']
  })

  const changesetPatch = addition('.changeset/quiet-fox.md')
  const calls = []
  const changesetCapture = capturePatch({
    headSha,
    patchPath: path.join(directory, 'changeset.patch'),
    guarded: guarded(),
    allowNewChangeset: true,
    command: (name, args) => {
      calls.push([name, ...args])
      return changesetPatch
    }
  })
  assert.equal(changesetCapture.reject, '')
  assert.deepEqual(changesetCapture.files, ['.changeset/quiet-fox.md'])
  assert.deepEqual(calls[0], ['git', 'add', '--intent-to-add', '--', '.changeset'])
  assert.deepEqual(validatePatchFile({ patchPath: path.join(directory, 'changeset.patch'), guarded: guarded() }), {
    reject: 'patch adds a new file: .changeset/quiet-fox.md',
    files: ['.changeset/quiet-fox.md']
  })
  assert.deepEqual(
    validatePatchFile({
      patchPath: path.join(directory, 'changeset.patch'),
      guarded: guarded(),
      allowNewChangeset: true
    }),
    { reject: '', files: ['.changeset/quiet-fox.md'] }
  )

  const guardedPatch = modification('apps/react-web-ui-demo/src/routeTree.gen.ts')
  const rejected = capturePatch({
    headSha,
    patchPath: path.join(directory, 'rejected.patch'),
    guarded: guarded(),
    command: () => guardedPatch
  })
  assert.match(rejected.reject, /routeTree\.gen\.ts is 生成物/)
  assert.equal(fs.existsSync(path.join(directory, 'rejected.patch')), false, 'a rejected patch must not be uploaded')

  assert.throws(() => capturePatch({ headSha: 'main', patchPath, guarded: guarded(), command }), /patch base SHA/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  const positive = [
    `fix(root): repair lint\n\n${AUTOFIX_TRAILER}`,
    `fix(root): repair lint\r\n\r\n${AUTOFIX_TRAILER}\r\n`,
    `fix(root): repair lint\n\n${AUTOFIX_TRAILER_KEY}:\t${AUTOFIX_TRAILER_VALUE}\t`,
    `fix(root): repair lint\n\nBody: detail\n${AUTOFIX_TRAILER}`
  ]
  for (const message of positive) assert.equal(hasAutofixTrailer(message), true, message)

  const negative = [
    `fix(root): repair lint\n\nMention ${AUTOFIX_TRAILER} in the body\n\nMore context`,
    `fix(root): repair lint\n\n> ${AUTOFIX_TRAILER}`,
    `fix(root): repair lint\n\n${AUTOFIX_TRAILER}\n\nMore context`,
    `fix(root): repair lint\n\n ${AUTOFIX_TRAILER}`,
    `fix(root): repair lint\n\n${AUTOFIX_TRAILER_KEY}: other\n ${AUTOFIX_TRAILER_VALUE}`,
    `fix(root): repair lint\n\nAutofix-By: ${AUTOFIX_TRAILER_VALUE}`,
    `fix(root): repair lint\n\n${AUTOFIX_TRAILER_KEY}: other`,
    '',
    undefined,
    null
  ]
  for (const message of negative) assert.equal(hasAutofixTrailer(message), false, String(message))

  assert.equal(
    countAutofixCommits([commit(`x\n\n${AUTOFIX_TRAILER}`), commit('feat: x'), { commit: null }]),
    1,
    'only commits with a valid trailer count, and malformed entries are ignored'
  )
  assert.equal(
    countAutofixCommits([commit(`x\n\n${AUTOFIX_TRAILER}\n${AUTOFIX_TRAILER}`)]),
    1,
    'a commit counts at most once'
  )

  const generated = autofixCommitMessage(['packages/web-ui/src/button.ts', '.changeset/quiet-fox.md'])
  assert.equal(hasAutofixTrailer(generated), true)
  assert.equal(hasAutofixTrailer(generated.replace(AUTOFIX_TRAILER_KEY, 'Autofix-With')), false)
  assert.equal(hasAutofixTrailer(generated.replace(AUTOFIX_TRAILER_VALUE, 'other-autofix')), false)

  const commits = count =>
    Array.from({ length: count }, (_, index) => commit(`fix(${index}): repair\n\n${AUTOFIX_TRAILER}`))
  const base = {
    liveHeadSha: headSha,
    expectedHeadSha: headSha,
    commits: commits(2),
    autofixUnverified: false,
    checkoutSha: headSha
  }
  assert.equal(assertPushAllowed(base), headSha)
  assert.throws(() => assertPushAllowed({ ...base, liveHeadSha: otherSha }), /head moved from a{40}/)
  assert.throws(
    () => assertPushAllowed({ ...base, commits: commits(MAX_AUTOFIX_COMMITS) }),
    /already has 3 Autofix-by: codex-autofix commits/
  )
  assert.throws(() => assertPushAllowed({ ...base, autofixUnverified: true }), /cannot verify the autofix count/)
  assert.throws(() => assertPushAllowed({ ...base, checkoutSha: otherSha }), /checked out b{40} instead of a{40}/)
  assert.throws(() => assertPushAllowed({ ...base, expectedHeadSha: 'not-a-sha' }), /planned head SHA/)
  assert.throws(
    () => assertPushAllowed({ ...base, liveHeadSha: otherSha, autofixUnverified: true }),
    /head moved/,
    'the live head check still runs before the count checks'
  )

  assert.throws(
    () =>
      assertPushAllowed({
        ...base,
        liveHeadSha: otherSha,
        commits: plainCommits(100),
        autofixUnverified: false
      }),
    /head moved/,
    'a rewritten history is rejected by the post-pagination live head even when total looks complete'
  )
}

{
  const jobs = [
    { id: 1, name: 'Prepare Wails apt cache', steps: [{ name: 'x', conclusion: 'success' }] },
    {
      id: 2,
      name: REQUIRED_JOB,
      steps: [
        { name: 'Build', conclusion: 'success' },
        { name: 'Format + Lint + Type-check + Go vet', conclusion: 'failure' },
        { name: 'Test', conclusion: 'failure' }
      ]
    }
  ]
  assert.deepEqual(failedJobSteps(jobs, REQUIRED_JOB), {
    jobId: 2,
    steps: ['Format + Lint + Type-check + Go vet', 'Test']
  })
  assert.equal(failedJobSteps(jobs, 'no-such-job'), null)
  assert.deepEqual(failedJobSteps([{ id: 3, name: REQUIRED_JOB, steps: [] }], REQUIRED_JOB), { jobId: 3, steps: [] })
}

{
  const short = 'a\nb\n'
  assert.equal(tailLog(short, 100), short)
  const long = `${'x'.repeat(500)}\nTAIL`
  const trimmed = tailLog(long, 64)
  assert.match(trimmed, /truncated/)
  assert.ok(trimmed.endsWith('TAIL'), 'the tail of the log carries the failing command output')
  assert.ok(Buffer.byteLength(trimmed) < Buffer.byteLength(long))
}

{
  const pages = { 1: plainCommits(100), 2: plainCommits(100), 3: plainCommits(50) }
  const session = fakeGhSession({
    pages,
    pull: { commits: PULL_COMMITS_API_CAP, head: { sha: headSha } },
    jobs: [{ id: 2, name: 'check', steps: [] }],
    log: 'log body\n'
  })
  const adapter = createGhAutofixAdapter({ repository: 'owner/repo', spawn: session.spawn, cwd: '/tmp', env: {} })
  assert.equal(adapter.pull(54).head.sha, headSha)
  assert.deepEqual(adapter.pullCommits(54), { commits: [...pages[1], ...pages[2], ...pages[3]] })
  assert.deepEqual(adapter.jobs(99), [{ id: 2, name: 'check', steps: [] }])
  assert.equal(adapter.jobLog(2), 'log body\n')
  assert.throws(() => adapter.jobLog(7), /unexpected gh call/)
  assert.throws(() => adapter.pull(55), /unexpected gh call/)
  assert.throws(() => adapter.pullCommits(55), /unexpected gh call/)
  assert.throws(() => adapter.jobs(100), /unexpected gh call/)
  const wrongRepoAdapter = createGhAutofixAdapter({
    repository: 'other/repo',
    spawn: session.spawn,
    cwd: '/tmp',
    env: {}
  })
  assert.throws(() => wrongRepoAdapter.pull(54), /unexpected gh call/)
  assert.ok(session.calls.every(args => args[0] === 'gh' && args[1] === 'api'))
  assert.deepEqual(
    session.calls.slice(1, 4).map(([, , endpoint]) => endpoint),
    [1, 2, 3].map(page => `repos/owner/repo/pulls/54/commits?per_page=100&page=${page}`)
  )
  assert.deepEqual(
    session.calls.find(([, , , endpoint]) => endpoint === 'repos/owner/repo/actions/jobs/2/logs'),
    ['gh', 'api', '--allow-escape-sequences', 'repos/owner/repo/actions/jobs/2/logs']
  )
}

{
  const pageOne = plainCommits(100)
  const pageTwo = plainCommits(1)
  const session = fakeGhSession({ pages: { 1: pageOne, 2: pageTwo }, pull: { commits: 101 } })
  const adapter = createGhAutofixAdapter({ repository: 'owner/repo', spawn: session.spawn, cwd: '/tmp', env: {} })
  assert.deepEqual(adapter.pullCommits(54), { commits: [...pageOne, ...pageTwo] })
  assert.equal(session.calls.length, 2, 'an exactly full page continues to the next page')

  const short = fakeGhSession({ pages: { 1: pageOne, 2: [] }, pull: { commits: 101 } })
  const shortAdapter = createGhAutofixAdapter({ repository: 'owner/repo', spawn: short.spawn, cwd: '/tmp', env: {} })
  assert.deepEqual(shortAdapter.pullCommits(54), { commits: pageOne })
  assert.equal(short.calls.length, 2, 'an empty following page stops pagination without reading beyond it')

  const capped = fakeGhSession({
    pages: { 1: plainCommits(100), 2: plainCommits(100), 3: plainCommits(50), 4: plainCommits(1) },
    pull: { commits: 251 }
  })
  const cappedAdapter = createGhAutofixAdapter({ repository: 'owner/repo', spawn: capped.spawn, cwd: '/tmp', env: {} })
  assert.equal(cappedAdapter.pullCommits(54).commits.length, 250)
  assert.equal(capped.calls.length, 3, 'the real 100 + 100 + 50 API shape stops after the configured cap')

  const missingPageSession = fakeGhSession({ pages: { 1: pageOne }, pull: { commits: 101 } })
  const missingPageAdapter = createGhAutofixAdapter({
    repository: 'owner/repo',
    spawn: missingPageSession.spawn,
    cwd: '/tmp',
    env: {}
  })
  assert.throws(() => missingPageAdapter.pullCommits(54), /unexpected gh call/)
}

{
  // prepare 走 CLI：用 PATH 上的假 gh 固定 API 返回，判据是产出物而不是日志文本。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-prepare-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const logFixture = path.join(directory, 'job-log.txt')
  fs.writeFileSync(logFixture, '\u001B[31mError: expected 1 to be 2\u001B[0m\n')
  const versionLine = `codex-autofix: prepare (limit=${MAX_AUTOFIX_COMMITS}, cap=${PULL_COMMITS_API_CAP}, trailer=${AUTOFIX_TRAILER})`

  function prepare({ pages, pull, jobs, env: extraEnv = {} }) {
    const commitPages = {}
    for (const [page, entries] of Object.entries(pages)) {
      const pagePath = path.join(directory, `commits-${page}.json`)
      fs.writeFileSync(pagePath, JSON.stringify(entries))
      commitPages[page] = pagePath
    }
    const pullPath = path.join(directory, 'pull.json')
    const jobsPath = path.join(directory, 'jobs.json')
    const ghCallsPath = path.join(directory, 'gh-calls')
    fs.writeFileSync(pullPath, JSON.stringify(pull))
    fs.writeFileSync(jobsPath, jobs)
    fs.writeFileSync(ghCallsPath, '')
    const outputPath = path.join(directory, 'output')
    const summaryPath = path.join(directory, 'summary')
    fs.writeFileSync(outputPath, '')
    fs.writeFileSync(summaryPath, '')
    writeFakeGh({
      bin,
      callsPath: ghCallsPath,
      repository: 'owner/repo',
      pullNumber: 54,
      runId: 99,
      jobId: 2,
      commitPages,
      pullFile: pullPath,
      jobsFile: jobsPath,
      logFile: logFixture
    })
    const result = spawnSync(process.execPath, [scriptPath, 'prepare'], {
      encoding: 'utf8',
      env: testEnv({
        PATH: prependPath(bin),
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_RUN_ID: '99',
        GITHUB_REF: 'refs/pull/54/merge',
        RUNNER_TEMP: directory,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
        ...extraEnv
      })
    })
    assert.ok(result.stdout.includes(versionLine), 'every prepare run identifies the active limit contract')
    const outputs = Object.fromEntries(
      fs
        .readFileSync(outputPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
    )
    return {
      result,
      outputs,
      summary: fs.readFileSync(summaryPath, 'utf8'),
      ghCalls: fs.readFileSync(ghCallsPath, 'utf8').trim().split('\n').filter(Boolean)
    }
  }

  const failingJobs = '{"jobs":[{"id":2,"name":"check","steps":[{"name":"Test","conclusion":"failure"}]}]}'
  const plain = plainCommits(1)
  const repaired = count =>
    Array.from({ length: count }, (_, index) => commit(`fix(root): repair ${index}\n\n${AUTOFIX_TRAILER}`))

  const planned = prepare({ pages: { 1: plain }, pull: { commits: 1 }, jobs: failingJobs })
  assert.equal(planned.result.status, 0, planned.result.stderr)
  assert.equal(planned.outputs.has_log, 'true')
  assert.equal(planned.outputs.failed_steps, 'Test')
  assert.equal(planned.summary, '')
  assert.doesNotMatch(planned.result.stdout, /^::notice /m)
  assert.match(fs.readFileSync(path.join(directory, 'ci-failure.log'), 'utf8'), /expected 1 to be 2/)

  fs.rmSync(path.join(directory, 'ci-failure.log'))
  const secondRound = prepare({
    pages: { 1: [repaired(1)[0], ...plainCommits(99)], 2: repaired(1) },
    pull: { commits: 101 },
    jobs: failingJobs
  })
  assert.equal(secondRound.result.status, 0, secondRound.result.stderr)
  assert.equal(secondRound.outputs.has_log, 'true', 'autofix commits on separate pages still count toward the limit')
  fs.rmSync(path.join(directory, 'ci-failure.log'))

  const limited = prepare({
    pages: { 1: [repaired(1)[0], ...plainCommits(99)], 2: repaired(2) },
    pull: { commits: 102 },
    jobs: failingJobs
  })
  assert.equal(limited.result.status, 0, limited.result.stderr)
  assert.equal(limited.outputs.has_log, 'false')
  assert.match(limited.result.stdout, /pull request #54 already has 3 autofix commits; limit reached/)
  assert.match(limited.summary, /## Codex Autofix 已跳过/)
  assert.match(limited.summary, /提交上限/)
  assert.match(limited.result.stdout, /^::notice title=Codex autofix skipped::.*already has 3 autofix commits$/m)
  assert.equal(fs.existsSync(path.join(directory, 'ci-failure.log')), false)

  const limitedAndUnverified = prepare({ pages: { 1: repaired(3) }, pull: { commits: 4 }, jobs: failingJobs })
  assert.equal(limitedAndUnverified.outputs.has_log, 'false')
  assert.match(limitedAndUnverified.result.stdout, /already has 3 autofix commits; limit reached/)
  assert.match(limitedAndUnverified.result.stdout, /cannot verify autofix count \(read 3 of 4 commits\)/)
  assert.match(limitedAndUnverified.summary, /## Codex Autofix 已跳过/)
  assert.match(limitedAndUnverified.summary, /无法验证/)
  assert.match(limitedAndUnverified.result.stdout, /^::notice title=Codex autofix skipped::/m)

  const green = prepare({
    pages: { 1: plain },
    pull: { commits: 1 },
    jobs: '{"jobs":[{"id":2,"name":"check","steps":[{"name":"Test","conclusion":"success"}]}]}'
  })
  assert.equal(green.outputs.has_log, 'false')
  assert.match(green.result.stdout, /no failed step/)
  assert.match(green.summary, /## Codex Autofix 已跳过/)
  assert.match(green.summary, /未发现失败步骤/)
  assert.match(green.result.stdout, /^::notice title=Codex autofix skipped::no failed step in the check job/m)
  const pagesAtApiCap = { 1: plainCommits(100), 2: plainCommits(100), 3: plainCommits(50) }
  const atTotal = prepare({ pages: pagesAtApiCap, pull: { commits: 250 }, jobs: failingJobs })
  assert.equal(atTotal.outputs.has_log, 'true')
  assert.doesNotMatch(atTotal.result.stdout, /cannot verify autofix count/)

  const overTotal = prepare({ pages: pagesAtApiCap, pull: { commits: 251 }, jobs: failingJobs })
  assert.equal(overTotal.outputs.has_log, 'false')
  assert.match(overTotal.result.stdout, /cannot verify autofix count \(read 250 of 251 commits\)/)
  assert.doesNotMatch(overTotal.result.stdout, /250\+/)
  assert.match(overTotal.summary, /## Codex Autofix 已跳过/)
  assert.match(overTotal.summary, /read 250 of 251 commits/)
  assert.match(overTotal.result.stdout, /^::notice title=Codex autofix skipped::cannot verify autofix commit count/m)

  const missingTotal = prepare({ pages: { 1: plain }, pull: {}, jobs: failingJobs })
  assert.equal(missingTotal.outputs.has_log, 'false')
  assert.match(missingTotal.result.stdout, /cannot verify autofix count/)
  assert.doesNotMatch(missingTotal.result.stdout, /already has/)

  const invalidTotal = prepare({ pages: { 1: plain }, pull: { commits: '1' }, jobs: failingJobs })
  assert.equal(invalidTotal.outputs.has_log, 'false')
  assert.match(invalidTotal.result.stdout, /cannot verify autofix count/)

  const hiddenAutofixTail = prepare({ pages: pagesAtApiCap, pull: { commits: 300 }, jobs: failingJobs })
  assert.equal(hiddenAutofixTail.outputs.has_log, 'false')
  assert.match(hiddenAutofixTail.result.stdout, /cannot verify autofix count \(read 250 of 300 commits\)/)
  assert.throws(
    () =>
      assertPushAllowed({
        liveHeadSha: headSha,
        expectedHeadSha: headSha,
        commits: repaired(2),
        autofixUnverified: true,
        checkoutSha: headSha
      }),
    /cannot verify the autofix count/
  )

  const addedButUnread = prepare({
    pages: { 1: plainCommits(100), 2: [] },
    pull: { commits: 101 },
    jobs: failingJobs
  })
  assert.equal(addedButUnread.outputs.has_log, 'false')
  assert.match(addedButUnread.result.stdout, /cannot verify autofix count \(read 100 of 101 commits\)/)

  const addedAndRead = prepare({
    pages: { 1: plainCommits(100), 2: plainCommits(1) },
    pull: { commits: 101 },
    jobs: failingJobs
  })
  assert.equal(addedAndRead.outputs.has_log, 'true')
  assert.doesNotMatch(addedAndRead.result.stdout, /cannot verify autofix count/)

  // §9.3 #4: 宿主存在 CODEX_AUTOFIX_PULL_NUMBER=999 污染时，prepare 仍只请求 fixture 的 PR 54。
  const savedPreparePull = process.env.CODEX_AUTOFIX_PULL_NUMBER
  process.env.CODEX_AUTOFIX_PULL_NUMBER = '999'
  try {
    fs.rmSync(path.join(directory, 'ci-failure.log'), { force: true })
    const isolatedPrepare = prepare({ pages: { 1: plain }, pull: { commits: 1 }, jobs: failingJobs })
    assert.equal(isolatedPrepare.result.status, 0, isolatedPrepare.result.stderr)
    assert.equal(isolatedPrepare.outputs.has_log, 'true')
    assert.ok(isolatedPrepare.ghCalls.some(call => call === 'api repos/owner/repo/pulls/54'))
    assert.equal(
      isolatedPrepare.ghCalls.some(call => call.includes('/pulls/999')),
      false,
      'host CODEX_AUTOFIX_PULL_NUMBER must not leak into prepare subprocess'
    )
  } finally {
    if (savedPreparePull === undefined) delete process.env.CODEX_AUTOFIX_PULL_NUMBER
    else process.env.CODEX_AUTOFIX_PULL_NUMBER = savedPreparePull
  }

  // §9.3 #7: 严格 fake gh 收到错误 PR / repo / run / job / 页号时立即失败，并保持 log 控制字符错误契约。
  const ghPath = path.join(bin, 'gh')
  for (const args of [
    ['api', 'repos/owner/repo/pulls/99'],
    ['api', 'repos/other/repo/pulls/54'],
    ['api', 'repos/owner/repo/actions/runs/100/jobs?per_page=100'],
    ['api', '--allow-escape-sequences', 'repos/owner/repo/actions/jobs/3/logs'],
    ['api', 'repos/owner/repo/pulls/54/commits?per_page=100&page=4']
  ]) {
    const unexpected = spawnSync(ghPath, args, { encoding: 'utf8', env: testEnv() })
    assert.equal(unexpected.status, 1)
    assert.ok(
      unexpected.stderr.includes(`unexpected gh call: ${args.join(' ')}`),
      `expected diagnostic stderr for ${args.join(' ')}, got: ${unexpected.stderr}`
    )
  }
  const controlChars = spawnSync(ghPath, ['api', 'repos/owner/repo/actions/jobs/2/logs'], {
    encoding: 'utf8',
    env: testEnv()
  })
  assert.equal(controlChars.status, 1)
  assert.match(controlChars.stderr, /--allow-escape-sequences/)

  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // apply 的 PR 对象只能在 commits 分页结束后读取一次；它同时承担 total、live head 与安全拒绝。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-apply-order-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const pagePath = path.join(directory, 'commits.json')
  const pullPath = path.join(directory, 'pull.json')
  const ghCallsPath = path.join(directory, 'gh-calls')
  const gitCallsPath = path.join(directory, 'git-calls')
  const patchPath = path.join(directory, 'autofix.patch')
  fs.writeFileSync(patchPath, modification('packages/web-ui/src/button.ts'))
  writeFakeGh({
    bin,
    callsPath: ghCallsPath,
    repository: 'owner/repo',
    pullNumber: 54,
    commitPages: { 1: pagePath },
    pullFile: pullPath
  })
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GIT_CALLS"\ncase "$1" in\n  rev-parse) printf '%s\\n' "$FAKE_HEAD" ;;\nesac\nexit 0\n`,
    { mode: 0o755 }
  )
  function runApply({ commits, total, pull: pullOverrides = {}, env: extraEnv = {} }) {
    fs.writeFileSync(pagePath, JSON.stringify(commits))
    fs.writeFileSync(
      pullPath,
      JSON.stringify({
        state: 'open',
        base: { ref: 'main' },
        head: { repo: { full_name: 'owner/repo' }, ref: 'feature/x', sha: headSha },
        commits: total,
        number: 54,
        ...pullOverrides
      })
    )
    fs.writeFileSync(ghCallsPath, '')
    fs.writeFileSync(gitCallsPath, '')
    const summaryPath = path.join(directory, 'summary')
    fs.writeFileSync(summaryPath, '')
    const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
      encoding: 'utf8',
      env: testEnv({
        PATH: prependPath(bin),
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_STEP_SUMMARY: summaryPath,
        RUNNER_TEMP: directory,
        CODEX_AUTOFIX_HEAD_SHA: headSha,
        CODEX_AUTOFIX_HEAD_REF: 'feature/x',
        CODEX_AUTOFIX_PULL_NUMBER: '54',
        CODEX_TRUSTED_SETTINGS: path.join(import.meta.dirname, '../../.claude/settings.json'),
        FAKE_GIT_CALLS: gitCallsPath,
        FAKE_HEAD: headSha,
        ...extraEnv
      }),
      cwd: directory
    })
    return {
      result,
      summary: fs.readFileSync(summaryPath, 'utf8'),
      ghCalls: fs.readFileSync(ghCallsPath, 'utf8').trim().split('\n').filter(Boolean),
      gitCalls: fs.readFileSync(gitCallsPath, 'utf8')
    }
  }

  const pushed = runApply({ commits: plainCommits(2), total: 2 })
  assert.equal(pushed.result.status, 0, pushed.result.stderr)
  assert.match(pushed.result.stdout, /pushed autofix for 1 files/)
  assert.match(pushed.summary, /## Codex Autofix 已推送补丁/)
  assert.match(pushed.summary, /`feature\/x`/)
  assert.match(pushed.summary, /`packages\/web-ui\/src\/button\.ts`/)

  const ghCalls = pushed.ghCalls
  const commitsIndex = ghCalls.findIndex(call => call.includes('/pulls/54/commits?'))
  const pullIndexes = ghCalls
    .map((call, index) => (call.endsWith('/pulls/54') ? index : -1))
    .filter(index => index >= 0)
  assert.ok(commitsIndex >= 0)

  // 只有「PR 不再 open」才是绿色出口：资格配置不匹配（base 不是 main、fork、版本分支）仍须红，
  // 否则一次配置错误会被静默吞成绿灯。
  const wrongBase = runApply({ commits: plainCommits(2), total: 2, pull: { base: { ref: 'release' } } })
  assert.equal(wrongBase.result.status, 1, 'a base-branch mismatch must stay red')
  assert.match(wrongBase.result.stderr, /refusing to push: the PR base is release, not main/)
  assert.doesNotMatch(wrongBase.summary, /## Codex autofix 未应用/)
  assert.doesNotMatch(wrongBase.gitCalls, /^apply | commit| push origin/m)

  // 不确定的 state（缺失或异常值）不能当成「已关闭」走绿：fail-closed 才是正确方向。
  const unknownState = runApply({ commits: plainCommits(2), total: 2, pull: { state: 'unknown' } })
  assert.equal(unknownState.result.status, 1, 'an unknown PR state must stay red')
  assert.match(unknownState.result.stderr, /refusing to push: the pull request is unknown/)
  assert.doesNotMatch(unknownState.summary, /## Codex autofix 未应用/)
  assert.deepEqual(pullIndexes.length, 1, 'apply reads the PR object exactly once')
  assert.ok(pullIndexes[0] > commitsIndex, 'the PR object snapshot is read after commit pagination')
  assert.match(pushed.gitCalls, /-c user\.name=codex -c user\.email=codex@openai\.com commit/)
  assert.match(pushed.gitCalls, /--force-with-lease=refs\/heads\/feature\/x:/)
  assert.match(pushed.gitCalls, /origin HEAD:refs\/heads\/feature\/x/)

  const unverified = runApply({ commits: plainCommits(2), total: 3 })
  assert.equal(unverified.result.status, 1)
  assert.match(unverified.result.stderr, /cannot verify the autofix count \(read 2 of 3 commits\)/)
  assert.doesNotMatch(unverified.gitCalls, /^apply | commit| push origin/m)

  const limited = runApply({
    commits: Array.from({ length: MAX_AUTOFIX_COMMITS }, (_, index) =>
      commit(`fix(${index}): x\n\n${AUTOFIX_TRAILER}`)
    ),
    total: MAX_AUTOFIX_COMMITS
  })
  assert.equal(limited.result.status, 1)
  assert.match(limited.result.stderr, /already has 3 Autofix-by: codex-autofix commits/)
  assert.doesNotMatch(limited.gitCalls, /^apply | commit| push origin/m)

  // §9.3 #1: 子进程同时收到 CODEX_AUTOFIX_PULL_NUMBER=54 与 GITHUB_REF=refs/pull/999/merge，只请求 PR 54。
  const conflict = runApply({
    commits: plainCommits(2),
    total: 2,
    env: {
      CODEX_AUTOFIX_PULL_NUMBER: '54',
      GITHUB_REF: 'refs/pull/999/merge'
    }
  })
  assert.equal(conflict.result.status, 0, conflict.result.stderr)
  assert.deepEqual(conflict.ghCalls, [
    'api repos/owner/repo/pulls/54/commits?per_page=100&page=1',
    'api repos/owner/repo/pulls/54'
  ])

  // §9.3 #2: apply 缺失 CODEX_AUTOFIX_PULL_NUMBER 时禁止回退 GITHUB_REF，且 gh 零调用。
  const missingPull = runApply({
    commits: plainCommits(2),
    total: 2,
    env: {
      CODEX_AUTOFIX_PULL_NUMBER: undefined,
      GITHUB_REF: 'refs/pull/999/merge'
    }
  })
  assert.equal(missingPull.result.status, 1)
  assert.match(missingPull.result.stderr, /CODEX_AUTOFIX_PULL_NUMBER is missing/)
  assert.deepEqual(missingPull.ghCalls, [])
  assert.doesNotMatch(missingPull.gitCalls, /^apply | commit| push origin/m)

  // §9.3 #3: apply 收到非法 CODEX_AUTOFIX_PULL_NUMBER（0 / bad）即使 ref 合法也直接失败，gh 零调用，无 commit/push。
  for (const invalidPull of ['0', 'bad']) {
    const rejectedPull = runApply({
      commits: plainCommits(2),
      total: 2,
      env: {
        CODEX_AUTOFIX_PULL_NUMBER: invalidPull,
        GITHUB_REF: 'refs/pull/999/merge'
      }
    })
    assert.equal(rejectedPull.result.status, 1)
    assert.match(
      rejectedPull.result.stderr,
      new RegExp(`pull number must be a positive integer: ${invalidPull}`),
      invalidPull
    )
    assert.deepEqual(rejectedPull.ghCalls, [])
    assert.doesNotMatch(rejectedPull.gitCalls, /^apply | commit| push origin/m)
  }

  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // CI run 晚于合并完成：resolve 到的 PR 已 closed。apply 在 reviewTarget 处绿色收尾，
  // 不触碰任何 git 调用，原因写进 step summary——与 report 路径「拒绝即绿」同一语义。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-apply-closed-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const pagePath = path.join(directory, 'commits.json')
  const pullPath = path.join(directory, 'pull.json')
  const ghCallsPath = path.join(directory, 'gh-calls')
  const gitCallsPath = path.join(directory, 'git-calls')
  const summaryPath = path.join(directory, 'summary')
  fs.writeFileSync(path.join(directory, 'autofix.patch'), modification('packages/web-ui/src/button.ts'))
  writeFakeGh({
    bin,
    callsPath: ghCallsPath,
    repository: 'owner/repo',
    pullNumber: 54,
    commitPages: { 1: pagePath },
    pullFile: pullPath
  })
  fs.writeFileSync(pagePath, JSON.stringify(plainCommits(2)))
  fs.writeFileSync(
    pullPath,
    JSON.stringify({
      state: 'closed',
      base: { ref: 'main' },
      head: { repo: { full_name: 'owner/repo' }, ref: 'feature/x', sha: headSha },
      commits: 2,
      number: 54
    })
  )
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GIT_CALLS"\ncase "$1" in\n  rev-parse) printf '%s\\n' "$FAKE_HEAD" ;;\nesac\nexit 0\n`,
    { mode: 0o755 }
  )
  // 守卫拒绝发生在任何 git 调用之前：预创建空文件，让「零 git 调用」可断言。
  fs.writeFileSync(gitCallsPath, '')
  const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
    encoding: 'utf8',
    env: testEnv({
      PATH: prependPath(bin),
      GITHUB_REPOSITORY: 'owner/repo',
      RUNNER_TEMP: directory,
      GITHUB_STEP_SUMMARY: summaryPath,
      CODEX_AUTOFIX_HEAD_SHA: headSha,
      CODEX_AUTOFIX_HEAD_REF: 'feature/x',
      CODEX_AUTOFIX_PULL_NUMBER: '54',
      CODEX_TRUSTED_SETTINGS: path.join(import.meta.dirname, '../../.claude/settings.json'),
      FAKE_GIT_CALLS: gitCallsPath,
      FAKE_HEAD: headSha
    }),
    cwd: directory
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /skipping autofix apply: the pull request is closed/)
  assert.match(fs.readFileSync(summaryPath, 'utf8'), /Codex autofix 未应用/)
  assert.match(fs.readFileSync(summaryPath, 'utf8'), /the pull request is closed/)
  assert.equal(fs.readFileSync(gitCallsPath, 'utf8'), '', 'a closed PR must be rejected before any git call runs')
  assert.deepEqual(fs.readFileSync(ghCallsPath, 'utf8').trim().split('\n').filter(Boolean), [
    'api repos/owner/repo/pulls/54/commits?per_page=100&page=1',
    'api repos/owner/repo/pulls/54'
  ])
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // push 落地前的秒级窗口里 PR 刚被合并删分支：push 失败后复查 PR 状态，
  // 已关闭即绿色收尾；对照分支（PR 仍 open 的 push 故障）保持红色。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-apply-race-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const pagePath = path.join(directory, 'commits.json')
  const openPath = path.join(directory, 'pull-open.json')
  const closedPath = path.join(directory, 'pull-closed.json')
  const ghCallsPath = path.join(directory, 'gh-calls')
  const gitCallsPath = path.join(directory, 'git-calls')
  const summaryPath = path.join(directory, 'summary')
  fs.writeFileSync(path.join(directory, 'autofix.patch'), modification('packages/web-ui/src/button.ts'))
  writeFakeGh({
    bin,
    callsPath: ghCallsPath,
    repository: 'owner/repo',
    pullNumber: 54,
    commitPages: { 1: pagePath },
    pullFiles: [openPath, closedPath]
  })
  fs.writeFileSync(pagePath, JSON.stringify(plainCommits(2)))
  const pullOf = state =>
    JSON.stringify({
      state,
      base: { ref: 'main' },
      head: { repo: { full_name: 'owner/repo' }, ref: 'feature/x', sha: headSha },
      commits: 2,
      number: 54
    })
  fs.writeFileSync(openPath, pullOf('open'))
  fs.writeFileSync(closedPath, pullOf('closed'))
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GIT_CALLS"\ncase "$1" in\n  rev-parse) printf '%s\\n' "$FAKE_HEAD" ;;\n  push) echo "fatal: cannot lock ref 'refs/heads/feature/x': expected $FAKE_HEAD but got no such ref (stale info)" >&2\n    exit 128 ;;\nesac\nexit 0\n`,
    { mode: 0o755 }
  )
  const runApply = () => {
    fs.writeFileSync(ghCallsPath, '')
    fs.writeFileSync(gitCallsPath, '')
    fs.writeFileSync(summaryPath, '')
    const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
      encoding: 'utf8',
      env: testEnv({
        PATH: prependPath(bin),
        GITHUB_REPOSITORY: 'owner/repo',
        RUNNER_TEMP: directory,
        GITHUB_STEP_SUMMARY: summaryPath,
        CODEX_AUTOFIX_HEAD_SHA: headSha,
        CODEX_AUTOFIX_HEAD_REF: 'feature/x',
        CODEX_AUTOFIX_PULL_NUMBER: '54',
        CODEX_TRUSTED_SETTINGS: path.join(import.meta.dirname, '../../.claude/settings.json'),
        FAKE_GIT_CALLS: gitCallsPath,
        FAKE_HEAD: headSha
      }),
      cwd: directory
    })
    return {
      result,
      ghCalls: fs.readFileSync(ghCallsPath, 'utf8').trim().split('\n').filter(Boolean),
      gitCalls: fs.readFileSync(gitCallsPath, 'utf8'),
      summary: fs.readFileSync(summaryPath, 'utf8')
    }
  }

  const raced = runApply()
  assert.equal(raced.result.status, 0, raced.result.stderr)
  assert.match(raced.result.stdout, /skipping autofix apply/)
  assert.match(raced.summary, /closed before the push landed/)
  // push 必须带 lease 锚定 run head：裸 refspec 会把已删分支当新建分支推成功，复查永远不会触发。
  assert.match(raced.gitCalls, /--force-with-lease=refs\/heads\/feature\/x:/)
  assert.match(raced.gitCalls, new RegExp(`--force-with-lease=refs/heads/feature/x:${headSha}`))
  assert.match(raced.gitCalls, /origin HEAD:refs\/heads\/feature\/x/)
  assert.equal(raced.gitCalls.match(/origin HEAD:refs/gu)?.length, 1, 'the green skip must not retry the push')
  assert.deepEqual(raced.ghCalls, [
    'api repos/owner/repo/pulls/54/commits?per_page=100&page=1',
    'api repos/owner/repo/pulls/54',
    'api repos/owner/repo/pulls/54'
  ])

  // 对照：push 失败但 PR 仍 open（网络 / 权限类故障）必须原样红，不能被复查吞掉。
  fs.writeFileSync(openPath, pullOf('open'))
  fs.writeFileSync(closedPath, pullOf('open'))
  const failed = runApply()
  assert.equal(failed.result.status, 1)
  assert.match(failed.result.stderr, /stale info/)
  assert.doesNotMatch(failed.summary, /closed before the push landed/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 复查自身 API 故障不能盖掉原始 push 错误：原始原因保持可见，退出仍红。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-apply-recheck-fail-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const pagePath = path.join(directory, 'commits.json')
  const openPath = path.join(directory, 'pull-open.json')
  const ghCallsPath = path.join(directory, 'gh-calls')
  const gitCallsPath = path.join(directory, 'git-calls')
  const summaryPath = path.join(directory, 'summary')
  fs.writeFileSync(path.join(directory, 'autofix.patch'), modification('packages/web-ui/src/button.ts'))
  writeFakeGh({
    bin,
    callsPath: ghCallsPath,
    repository: 'owner/repo',
    pullNumber: 54,
    commitPages: { 1: pagePath },
    pullFiles: [openPath]
  })
  fs.writeFileSync(pagePath, JSON.stringify(plainCommits(2)))
  fs.writeFileSync(
    openPath,
    JSON.stringify({
      state: 'open',
      base: { ref: 'main' },
      head: { repo: { full_name: 'owner/repo' }, ref: 'feature/x', sha: headSha },
      commits: 2,
      number: 54
    })
  )
  fs.writeFileSync(
    path.join(bin, 'gh'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GH_CALLS"\ncase "$*" in\n  "api repos/owner/repo/pulls/54/commits?per_page=100&page=1")\n    cat "$FAKE_COMMITS"\n    ;;\n  "api repos/owner/repo/pulls/54")\n    if [ -f "$FAKE_PULL_DONE" ]; then\n      echo "gh: HTTP 502: re-check unavailable" >&2\n      exit 1\n    fi\n    cat "$FAKE_PULL_OPEN"\n    touch "$FAKE_PULL_DONE"\n    ;;\n  *)\n    echo "unexpected gh call: $*" >&2\n    exit 2\n    ;;\nesac\n`,
    { mode: 0o755 }
  )
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GIT_CALLS"\ncase "$1" in\n  rev-parse) printf '%s\\n' "$FAKE_HEAD" ;;\n  push) echo "fatal: cannot lock ref 'refs/heads/feature/x': expected $FAKE_HEAD but got no such ref (stale info)" >&2\n    exit 128 ;;\nesac\nexit 0\n`,
    { mode: 0o755 }
  )
  const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
    encoding: 'utf8',
    env: testEnv({
      PATH: prependPath(bin),
      GITHUB_REPOSITORY: 'owner/repo',
      RUNNER_TEMP: directory,
      GITHUB_STEP_SUMMARY: summaryPath,
      CODEX_AUTOFIX_HEAD_SHA: headSha,
      CODEX_AUTOFIX_HEAD_REF: 'feature/x',
      CODEX_AUTOFIX_PULL_NUMBER: '54',
      CODEX_TRUSTED_SETTINGS: path.join(import.meta.dirname, '../../.claude/settings.json'),
      FAKE_GIT_CALLS: gitCallsPath,
      FAKE_HEAD: headSha,
      FAKE_GH_CALLS: ghCallsPath,
      FAKE_COMMITS: pagePath,
      FAKE_PULL_OPEN: openPath,
      FAKE_PULL_DONE: path.join(directory, 'first-pull-done')
    }),
    cwd: directory
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /stale info/, 'the original push failure must stay visible')
  assert.match(
    result.stderr,
    /re-check also failed.*502/s,
    'the re-check API error must be labeled, not mistaken for the push failure'
  )
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 没有 patch artifact 时 apply 必须安静跳过，并在 Step Summary 与 notice 留痕。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-apply-'))
  const summaryPath = path.join(directory, 'summary')
  fs.writeFileSync(summaryPath, '')
  const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
    encoding: 'utf8',
    env: testEnv({
      PATH: ['/usr/bin', '/bin'].join(path.delimiter),
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_STEP_SUMMARY: summaryPath,
      RUNNER_TEMP: directory,
      CODEX_AUTOFIX_HEAD_SHA: headSha,
      CODEX_AUTOFIX_HEAD_REF: 'feature/x',
      CODEX_AUTOFIX_PULL_NUMBER: '54'
    })
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /nothing to apply/)
  assert.match(result.stdout, /^::notice title=Codex autofix apply skipped::/m)
  const summary = fs.readFileSync(summaryPath, 'utf8')
  assert.match(summary, /## Codex Autofix 无补丁可应用/)
  assert.match(summary, /`feature\/x`/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 预检没跑成时模型 job 被跳过，工作区里的零散改动不能变成 patch 交给特权 job。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-capture-'))
  const outputPath = path.join(directory, 'output')
  const summaryPath = path.join(directory, 'summary')
  fs.writeFileSync(outputPath, '')
  fs.writeFileSync(summaryPath, '')
  const result = spawnSync(process.execPath, [scriptPath, 'capture'], {
    encoding: 'utf8',
    env: testEnv({
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_REPOSITORY: 'owner/repo',
      RUNNER_TEMP: directory,
      CODEX_AUTOFIX_HEAD_SHA: headSha,
      CODEX_AUTOFIX_FAILED_STEPS: 'Build'
    }),
    cwd: directory
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /no configuration snapshot/)
  assert.match(result.stdout, /^::notice title=Codex autofix skipped::the Codex configuration preflight did not run$/m)
  const outputs = Object.fromEntries(
    fs
      .readFileSync(outputPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  )
  assert.equal(outputs.has_patch, 'false')
  assert.match(outputs.reject_reason, /preflight/)
  const summary = fs.readFileSync(summaryPath, 'utf8')
  assert.match(summary, /## Codex Autofix 未产出补丁/)
  assert.match(summary, /`Build`/)
  assert.match(summary, /preflight did not run/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // appendStepSummary 与 readAutofixMessage 辅助函数：空路径跳过、EOL 规范化与 8000 字符截断边界。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-helpers-'))
  const savedSummary = Object.hasOwn(process.env, 'GITHUB_STEP_SUMMARY') ? process.env.GITHUB_STEP_SUMMARY : undefined
  try {
    delete process.env.GITHUB_STEP_SUMMARY
    appendStepSummary('ignored when unset')
    process.env.GITHUB_STEP_SUMMARY = ''
    appendStepSummary('ignored when empty')

    const summaryPath = path.join(directory, 'step-summary.md')
    fs.writeFileSync(summaryPath, '')
    process.env.GITHUB_STEP_SUMMARY = summaryPath
    appendStepSummary('## Title\n- line 1\r\n- line 2\n')
    assert.equal(fs.readFileSync(summaryPath, 'utf8'), `## Title${os.EOL}- line 1${os.EOL}- line 2${os.EOL}`)

    assert.equal(readAutofixMessage(directory), '')
    assert.equal(readAutofixMessage(''), '')

    const messagePath = path.join(directory, 'codex-autofix-message.txt')
    fs.writeFileSync(messagePath, '   \n\t  ')
    assert.equal(readAutofixMessage(directory), '')

    const exact = 'a'.repeat(8000)
    fs.writeFileSync(messagePath, `  ${exact}\n`)
    assert.equal(readAutofixMessage(directory), exact, 'exactly 8000 characters must not be truncated')

    const oversized = `${'b'.repeat(8000)}TAIL_SHOULD_BE_DROPPED`
    fs.writeFileSync(messagePath, oversized)
    const truncated = readAutofixMessage(directory)
    assert.ok(!truncated.includes('TAIL_SHOULD_BE_DROPPED'), 'characters beyond 8000 must be truncated')
    assert.match(truncated, /截断/)
    assert.match(truncated, /8000/)

    // 7999 个字符后紧接一个 2 码元 emoji（代理对跨越 8000 边界）时，不得留下孤立高位代理。
    const boundary = `${'c'.repeat(7999)}🧪extra`
    fs.writeFileSync(messagePath, boundary)
    const boundaryRead = readAutofixMessage(directory)
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/u.test(boundaryRead), 'must not leave an orphan high surrogate')
    assert.match(boundaryRead, /截断/)
  } finally {
    if (savedSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY
    else process.env.GITHUB_STEP_SUMMARY = savedSummary
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

{
  // capture 在已通过预检后：覆盖空 patch + 模型诊断、受保护路径拒绝 + 超长诊断截断、以及成功捕获补丁。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-capture-summary-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(directory, 'codex-config.json'), JSON.stringify({ fingerprint: 'test' }))
  const fakeDiffPath = path.join(directory, 'fake-diff.patch')
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/bin/sh\ncase "$1" in\n  diff) cat ${shQuote(fakeDiffPath)} ;;\nesac\nexit 0\n`,
    { mode: 0o755 }
  )

  function runCapture({ diff, message, failedSteps = 'Test' }) {
    fs.rmSync(path.join(directory, 'autofix.patch'), { force: true })
    const messagePath = path.join(directory, 'codex-autofix-message.txt')
    if (message === undefined) fs.rmSync(messagePath, { force: true })
    else fs.writeFileSync(messagePath, message)
    fs.writeFileSync(fakeDiffPath, diff)
    const outputPath = path.join(directory, 'output')
    const summaryPath = path.join(directory, 'summary')
    fs.writeFileSync(outputPath, '')
    fs.writeFileSync(summaryPath, '')
    const result = spawnSync(process.execPath, [scriptPath, 'capture'], {
      encoding: 'utf8',
      env: testEnv({
        PATH: prependPath(bin),
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
        GITHUB_REPOSITORY: 'owner/repo',
        RUNNER_TEMP: directory,
        CODEX_AUTOFIX_HEAD_SHA: headSha,
        CODEX_AUTOFIX_FAILED_STEPS: failedSteps,
        CODEX_TRUSTED_SETTINGS: path.join(import.meta.dirname, '../../.claude/settings.json')
      }),
      cwd: directory
    })
    const outputs = Object.fromEntries(
      fs
        .readFileSync(outputPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
    )
    return { result, outputs, summary: fs.readFileSync(summaryPath, 'utf8') }
  }

  try {
    const emptyWithMessage = runCapture({
      diff: '',
      message: '根因位于受保护生成物，需人手动重建。',
      failedSteps: 'Test, Check generated artifacts'
    })
    assert.equal(emptyWithMessage.result.status, 0, emptyWithMessage.result.stderr)
    assert.equal(emptyWithMessage.outputs.has_patch, 'false')
    assert.equal(emptyWithMessage.outputs.reject_reason, 'patch changes no tracked file')
    assert.match(emptyWithMessage.summary, /## Codex Autofix 未产出补丁/)
    assert.match(emptyWithMessage.summary, /`Test, Check generated artifacts`/)
    assert.match(emptyWithMessage.summary, /patch changes no tracked file/)
    assert.match(emptyWithMessage.summary, /### 模型诊断结论/)
    assert.match(emptyWithMessage.summary, /根因位于受保护生成物，需人手动重建。/)
    assert.match(
      emptyWithMessage.result.stdout,
      /^::notice title=Codex autofix skipped::patch changes no tracked file$/m
    )

    const longBody = `${'x'.repeat(8100)}OVER_LIMIT_TAIL`
    const guardedRejected = runCapture({
      diff: modification('.github/workflows/ci.yml'),
      message: longBody,
      failedSteps: 'Format + Lint'
    })
    assert.equal(guardedRejected.result.status, 0, guardedRejected.result.stderr)
    assert.equal(guardedRejected.outputs.has_patch, 'false')
    assert.match(guardedRejected.outputs.reject_reason, /CI 与 workflow 定义/)
    assert.match(guardedRejected.summary, /## Codex Autofix 未产出补丁/)
    assert.match(guardedRejected.summary, /CI 与 workflow 定义/)
    assert.match(guardedRejected.summary, /截断/)
    assert.ok(!guardedRejected.summary.includes('OVER_LIMIT_TAIL'))
    assert.match(guardedRejected.result.stdout, /^::notice title=Codex autofix skipped::/m)

    const validCaptured = runCapture({
      diff: modification('packages/web-ui/src/button.ts'),
      message: '已修复按钮导出类型遗漏。',
      failedSteps: 'Type-check'
    })
    assert.equal(validCaptured.result.status, 0, validCaptured.result.stderr)
    assert.equal(validCaptured.outputs.has_patch, 'true')
    assert.match(validCaptured.summary, /## Codex Autofix 已生成补丁/)
    assert.match(validCaptured.summary, /`packages\/web-ui\/src\/button\.ts`/)
    assert.match(validCaptured.summary, /bytes/)
    assert.match(validCaptured.summary, /### 模型诊断摘要/)
    assert.match(validCaptured.summary, /已修复按钮导出类型遗漏。/)
    assert.doesNotMatch(validCaptured.result.stdout, /^::notice title=Codex autofix skipped::/m)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

console.log('.github/scripts/codex-autofix.test.mjs: all assertions passed')
