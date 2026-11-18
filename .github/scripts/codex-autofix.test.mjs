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
  tailLog,
  validatePatchFile
} from './codex-autofix.mjs'

const headSha = 'a'.repeat(40)
const otherSha = 'b'.repeat(40)
const scriptPath = path.join(import.meta.dirname, 'codex-autofix.mjs')
const settingsFile = fs.readFileSync(path.join(import.meta.dirname, '../../.claude/settings.json'), 'utf8')

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

function fakeGhSession({ pages = {}, pull, jobs = [], log = '' }) {
  const calls = []
  const spawn = (command, args) => {
    calls.push([command, ...args])
    const endpoint = String(args.at(-1))
    const page = endpoint.match(/[?&]page=(\d+)/u)?.[1]
    if (/\/pulls\/\d+\/commits\?/u.test(endpoint)) {
      return { status: 0, stdout: JSON.stringify(pages[Number(page)] ?? []) }
    }
    if (/\/pulls\/\d+$/u.test(endpoint)) return { status: 0, stdout: JSON.stringify(pull) }
    if (/\/actions\/runs\/\d+\/jobs/u.test(endpoint)) return { status: 0, stdout: JSON.stringify({ jobs }) }
    if (/\/actions\/jobs\/2\/logs/u.test(endpoint)) return { status: 0, stdout: log }
    return { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
  }
  return { calls, spawn }
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
  assert.throws(() => adapter.jobLog(7), /HTTP 404/)
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
}

{
  // prepare 走 CLI：用 PATH 上的假 gh 固定 API 返回，判据是产出物而不是日志文本。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-prepare-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const logFixture = path.join(directory, 'job-log.txt')
  fs.writeFileSync(logFixture, '\u001B[31mError: expected 1 to be 2\u001B[0m\n')
  const versionLine = `codex-autofix: prepare (limit=${MAX_AUTOFIX_COMMITS}, cap=${PULL_COMMITS_API_CAP}, trailer=${AUTOFIX_TRAILER})`

  function prepare({ pages, pull, jobs }) {
    const pagePaths = [1, 2, 3].map(page => path.join(directory, `commits-${page}.json`))
    pagePaths.forEach((pagePath, index) => fs.writeFileSync(pagePath, JSON.stringify(pages[index + 1] ?? [])))
    const pullPath = path.join(directory, 'pull.json')
    const jobsPath = path.join(directory, 'jobs.json')
    fs.writeFileSync(pullPath, JSON.stringify(pull))
    fs.writeFileSync(jobsPath, jobs)
    const outputPath = path.join(directory, 'output')
    fs.writeFileSync(outputPath, '')
    fs.writeFileSync(
      path.join(bin, 'gh'),
      `#!/bin/sh\ncase "$*" in\n  */pulls/*/commits*\\&page=1*) cat "$FAKE_COMMITS_1" ;;\n  */pulls/*/commits*\\&page=2*) cat "$FAKE_COMMITS_2" ;;\n  */pulls/*/commits*\\&page=3*) cat "$FAKE_COMMITS_3" ;;\n  */pulls/*) cat "$FAKE_PULL" ;;\n  */actions/runs/*/jobs*) cat "$FAKE_JOBS" ;;\n  *--allow-escape-sequences*/actions/jobs/*/logs*) cat "$FAKE_LOG" ;;\n  */actions/jobs/*/logs*) echo "gh: non-JSON response contains control characters; pass --allow-escape-sequences to output it" >&2; exit 1 ;;\nesac\n`,
      { mode: 0o755 }
    )
    const result = spawnSync(process.execPath, [scriptPath, 'prepare'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_RUN_ID: '99',
        GITHUB_REF: 'refs/pull/54/merge',
        RUNNER_TEMP: directory,
        GITHUB_OUTPUT: outputPath,
        FAKE_COMMITS_1: pagePaths[0],
        FAKE_COMMITS_2: pagePaths[1],
        FAKE_COMMITS_3: pagePaths[2],
        FAKE_PULL: pullPath,
        FAKE_JOBS: jobsPath,
        FAKE_LOG: logFixture
      }
    })
    assert.ok(result.stdout.includes(versionLine), 'every prepare run identifies the active limit contract')
    const outputs = Object.fromEntries(
      fs
        .readFileSync(outputPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
    )
    return { result, outputs }
  }

  const failingJobs = '{"jobs":[{"id":2,"name":"check","steps":[{"name":"Test","conclusion":"failure"}]}]}'
  const plain = plainCommits(1)
  const repaired = count =>
    Array.from({ length: count }, (_, index) => commit(`fix(root): repair ${index}\n\n${AUTOFIX_TRAILER}`))

  const planned = prepare({ pages: { 1: plain }, pull: { commits: 1 }, jobs: failingJobs })
  assert.equal(planned.result.status, 0, planned.result.stderr)
  assert.equal(planned.outputs.has_log, 'true')
  assert.equal(planned.outputs.failed_steps, 'Test')
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
  assert.equal(fs.existsSync(path.join(directory, 'ci-failure.log')), false)

  const limitedAndUnverified = prepare({ pages: { 1: repaired(3) }, pull: { commits: 4 }, jobs: failingJobs })
  assert.equal(limitedAndUnverified.outputs.has_log, 'false')
  assert.match(limitedAndUnverified.result.stdout, /already has 3 autofix commits; limit reached/)
  assert.match(limitedAndUnverified.result.stdout, /cannot verify autofix count \(read 3 of 4 commits\)/)

  const green = prepare({
    pages: { 1: plain },
    pull: { commits: 1 },
    jobs: '{"jobs":[{"id":2,"name":"check","steps":[{"name":"Test","conclusion":"success"}]}]}'
  })
  assert.equal(green.outputs.has_log, 'false')
  assert.match(green.result.stdout, /no failed step/)
  const pagesAtApiCap = { 1: plainCommits(100), 2: plainCommits(100), 3: plainCommits(50) }
  const atTotal = prepare({ pages: pagesAtApiCap, pull: { commits: 250 }, jobs: failingJobs })
  assert.equal(atTotal.outputs.has_log, 'true')
  assert.doesNotMatch(atTotal.result.stdout, /cannot verify autofix count/)

  const overTotal = prepare({ pages: pagesAtApiCap, pull: { commits: 251 }, jobs: failingJobs })
  assert.equal(overTotal.outputs.has_log, 'false')
  assert.match(overTotal.result.stdout, /cannot verify autofix count \(read 250 of 251 commits\)/)
  assert.doesNotMatch(overTotal.result.stdout, /250\+/)

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
  fs.writeFileSync(
    path.join(bin, 'gh'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GH_CALLS"\ncase "$*" in\n  */pulls/*/commits*\\&page=1*) cat "$FAKE_COMMITS" ;;\n  */pulls/*/commits*) echo '[]' ;;\n  */pulls/*) cat "$FAKE_PULL" ;;\n  *) exit 1 ;;\nesac\n`,
    { mode: 0o755 }
  )
  fs.writeFileSync(
    path.join(bin, 'git'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$FAKE_GIT_CALLS"\ncase "$1" in\n  rev-parse) printf '%s\\n' "$FAKE_HEAD" ;;\nesac\nexit 0\n`,
    { mode: 0o755 }
  )
  function runApply({ commits, total }) {
    fs.writeFileSync(pagePath, JSON.stringify(commits))
    fs.writeFileSync(
      pullPath,
      JSON.stringify({
        state: 'open',
        base: { ref: 'main' },
        head: { repo: { full_name: 'owner/repo' }, ref: 'feature/x', sha: headSha },
        commits: total,
        number: 54
      })
    )
    fs.writeFileSync(ghCallsPath, '')
    fs.writeFileSync(gitCallsPath, '')
    const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'owner/repo',
        RUNNER_TEMP: directory,
        CODEX_AUTOFIX_HEAD_SHA: headSha,
        CODEX_AUTOFIX_HEAD_REF: 'feature/x',
        CODEX_AUTOFIX_PULL_NUMBER: '54',
        CODEX_TRUSTED_SETTINGS: path.join(import.meta.dirname, '../../.claude/settings.json'),
        FAKE_COMMITS: pagePath,
        FAKE_PULL: pullPath,
        FAKE_GH_CALLS: ghCallsPath,
        FAKE_GIT_CALLS: gitCallsPath,
        FAKE_HEAD: headSha
      },
      cwd: directory
    })
    return {
      result,
      ghCalls: fs.readFileSync(ghCallsPath, 'utf8').trim().split('\n'),
      gitCalls: fs.readFileSync(gitCallsPath, 'utf8')
    }
  }

  const pushed = runApply({ commits: plainCommits(2), total: 2 })
  assert.equal(pushed.result.status, 0, pushed.result.stderr)
  assert.match(pushed.result.stdout, /pushed autofix for 1 files/)

  const ghCalls = pushed.ghCalls
  const commitsIndex = ghCalls.findIndex(call => call.includes('/pulls/54/commits?'))
  const pullIndexes = ghCalls
    .map((call, index) => (call.endsWith('/pulls/54') ? index : -1))
    .filter(index => index >= 0)
  assert.ok(commitsIndex >= 0)
  assert.deepEqual(pullIndexes.length, 1, 'apply reads the PR object exactly once')
  assert.ok(pullIndexes[0] > commitsIndex, 'the PR object snapshot is read after commit pagination')
  assert.match(pushed.gitCalls, /-c user\.name=codex -c user\.email=codex@openai\.com commit/)
  assert.match(pushed.gitCalls, /push origin HEAD:refs\/heads\/feature\/x/)

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

  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 没有 patch artifact 时 apply 必须安静跳过：它是绝大多数 run 的路径。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-apply-'))
  const result = spawnSync(process.execPath, [scriptPath, 'apply'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: '/usr/bin:/bin',
      GITHUB_REPOSITORY: 'owner/repo',
      RUNNER_TEMP: directory,
      CODEX_AUTOFIX_HEAD_SHA: headSha,
      CODEX_AUTOFIX_HEAD_REF: 'feature/x',
      CODEX_AUTOFIX_PULL_NUMBER: '54'
    }
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /nothing to apply/)
  fs.rmSync(directory, { recursive: true, force: true })
}

{
  // 预检没跑成时模型 job 被跳过，工作区里的零散改动不能变成 patch 交给特权 job。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-capture-'))
  const outputPath = path.join(directory, 'output')
  fs.writeFileSync(outputPath, '')
  const result = spawnSync(process.execPath, [scriptPath, 'capture'], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GITHUB_OUTPUT: outputPath,
      GITHUB_REPOSITORY: 'owner/repo',
      RUNNER_TEMP: directory,
      CODEX_AUTOFIX_HEAD_SHA: headSha
    },
    cwd: directory
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /no configuration snapshot/)
  const outputs = Object.fromEntries(
    fs
      .readFileSync(outputPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  )
  assert.equal(outputs.has_patch, 'false')
  assert.match(outputs.reject_reason, /preflight/)
  fs.rmSync(directory, { recursive: true, force: true })
}

console.log('.github/scripts/codex-autofix.test.mjs: all assertions passed')
