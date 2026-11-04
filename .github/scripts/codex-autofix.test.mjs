import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  AUTOFIX_TRAILER,
  REQUIRED_JOB,
  assertPushAllowed,
  capturePatch,
  createGhAutofixAdapter,
  createGuardedMatcher,
  failedJobSteps,
  generatedGuarded,
  globToRegExp,
  hasAutofixCommit,
  inspectPatch,
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
  'packages/md-to-meta/src/index.ts',
  'apps/interweave/frontend/wails.json',
  'docs/research/notes.md',
  'packages/web-ui/README.md'
]) {
  assert.equal(guarded()(file), null, `${file} is ordinary source that autofix may repair`)
}

{
  assert.deepEqual(inspectPatch(modification('packages/web-ui/src/button.ts')), {
    reject: '',
    files: ['packages/web-ui/src/button.ts']
  })
  assert.deepEqual(inspectPatch(''), { reject: 'patch changes no tracked file', files: [] })
  assert.match(inspectPatch('diff --git a/x/y.ts b/x/z.ts\n').reject, /renames or moves/)
  assert.match(inspectPatch(`${modification('a.ts')}\nnew file mode 100644\n`).reject, /adds a new file/)
  assert.match(inspectPatch(`${modification('a.ts')}\ndeleted file mode 100644\n`).reject, /deletes a file/)
  assert.match(inspectPatch('diff --git a/x.png b/x.png\nBinary files a/x.png and b/x.png differ\n').reject, /binary/)
  assert.match(inspectPatch('diff --git a/x.png b/x.png\nGIT binary patch\nliteral 12\n').reject, /binary/)
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
  const commits = message => [{ commit: { message } }]
  assert.equal(hasAutofixCommit(commits(`fix(root): repair lint\n\n${AUTOFIX_TRAILER}`)), true)
  assert.equal(hasAutofixCommit(commits('fix(root): repair lint')), false)
  assert.equal(hasAutofixCommit([{ commit: null }, { commit: { message: 'normal' } }]), false)

  const base = { liveHeadSha: headSha, expectedHeadSha: headSha, commits: commits('feat: x'), checkoutSha: headSha }
  assert.equal(assertPushAllowed(base), headSha)
  assert.throws(() => assertPushAllowed({ ...base, liveHeadSha: otherSha }), /head moved from a{40}/)
  assert.throws(
    () => assertPushAllowed({ ...base, commits: commits(`x\n\n${AUTOFIX_TRAILER}`) }),
    /already contains a Autofix-by/
  )
  assert.throws(() => assertPushAllowed({ ...base, checkoutSha: otherSha }), /checked out b{40} instead of a{40}/)
  assert.throws(() => assertPushAllowed({ ...base, expectedHeadSha: 'not-a-sha' }), /planned head SHA/)
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
  const calls = []
  const spawn = (command, args) => {
    calls.push(args)
    const endpoint = String(args.at(-1))
    if (endpoint.includes('/pulls/54/commits')) return { status: 0, stdout: '[{"commit":{"message":"feat: x"}}]' }
    if (endpoint.includes('/pulls/54')) return { status: 0, stdout: '{"head":{"sha":"' + headSha + '"}}' }
    if (endpoint.includes('/actions/runs/99/jobs'))
      return { status: 0, stdout: '{"jobs":[{"id":2,"name":"check","steps":[]}]}' }
    if (endpoint.includes('/actions/jobs/2/logs')) return { status: 0, stdout: 'log body\n' }
    return { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
  }
  const adapter = createGhAutofixAdapter({ repository: 'owner/repo', spawn, cwd: '/tmp', env: {} })
  assert.equal(adapter.pull(54).head.sha, headSha)
  assert.deepEqual(adapter.pullCommits(54), [{ commit: { message: 'feat: x' } }])
  assert.deepEqual(adapter.jobs(99), [{ id: 2, name: 'check', steps: [] }])
  assert.equal(adapter.jobLog(2), 'log body\n')
  assert.throws(() => adapter.jobLog(7), /HTTP 404/)
  assert.ok(calls.every(args => args[0] === 'api' && String(args[1]).startsWith('repos/owner/repo/')))
}

{
  // prepare 走 CLI：用 PATH 上的假 gh 固定 API 返回，判据是产出物而不是日志文本。
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-autofix-prepare-'))
  const bin = path.join(directory, 'bin')
  fs.mkdirSync(bin)
  const logFixture = path.join(directory, 'job-log.txt')
  fs.writeFileSync(logFixture, 'Error: expected 1 to be 2\n')

  function prepare({ commits, jobs }) {
    const commitsPath = path.join(directory, 'commits.json')
    const jobsPath = path.join(directory, 'jobs.json')
    fs.writeFileSync(commitsPath, commits)
    fs.writeFileSync(jobsPath, jobs)
    const outputPath = path.join(directory, 'output')
    fs.writeFileSync(outputPath, '')
    fs.writeFileSync(
      path.join(bin, 'gh'),
      `#!/bin/sh\ncase "$*" in\n  */pulls/*/commits*) cat "$FAKE_COMMITS" ;;\n  */actions/runs/*/jobs*) cat "$FAKE_JOBS" ;;\n  */actions/jobs/*/logs*) cat "$FAKE_LOG" ;;\nesac\n`,
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
        FAKE_COMMITS: commitsPath,
        FAKE_JOBS: jobsPath,
        FAKE_LOG: logFixture
      }
    })
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
  const plain = '[{"commit":{"message":"feat: add overlay"}}]'
  const repaired = `[{"commit":{"message":"fix(root): apply Codex autofix\\n\\n${AUTOFIX_TRAILER}"}}]`

  const planned = prepare({ commits: plain, jobs: failingJobs })
  assert.equal(planned.result.status, 0, planned.result.stderr)
  assert.equal(planned.outputs.has_log, 'true')
  assert.equal(planned.outputs.failed_steps, 'Test')
  assert.match(fs.readFileSync(path.join(directory, 'ci-failure.log'), 'utf8'), /expected 1 to be 2/)

  fs.rmSync(path.join(directory, 'ci-failure.log'))
  const secondRound = prepare({ commits: repaired, jobs: failingJobs })
  assert.equal(secondRound.result.status, 0, secondRound.result.stderr)
  assert.equal(
    secondRound.outputs.has_log,
    'false',
    'a head that already carries an autofix commit gets no second plan'
  )
  assert.equal(fs.existsSync(path.join(directory, 'ci-failure.log')), false)

  const green = prepare({
    commits: plain,
    jobs: '{"jobs":[{"id":2,"name":"check","steps":[{"name":"Test","conclusion":"success"}]}]}'
  })
  assert.equal(green.outputs.has_log, 'false')
  assert.match(green.result.stdout, /no failed step/)
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

console.log('.github/scripts/codex-autofix.test.mjs: all assertions passed')
