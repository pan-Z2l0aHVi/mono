import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createActionsRuntime, createMemoryActionsRuntime, oneLine, runCli } from './actions-runtime.mjs'
import { commandError, createGhClient, createGitHubApi, isHttp403, isHttp404, isHttp422 } from './github.mjs'

// 1. oneLine 折叠换行与可选截断
assert.equal(oneLine('  hello\n\t world  '), 'hello world')
assert.equal(oneLine(undefined), '')
assert.equal(oneLine('abcdef', 4), 'abcd…')
assert.equal(oneLine('abcd', 4), 'abcd')

// 2. createActionsRuntime 真实临时文件落盘（GITHUB_OUTPUT / GITHUB_STEP_SUMMARY / annotate / requireEnv）
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-runtime-test-'))
  try {
    const outputFile = path.join(tempDir, 'output')
    const summaryFile = path.join(tempDir, 'summary')
    const logs = []
    const warnings = []
    const errors = []
    let exitCode

    const runtime = createActionsRuntime({
      env: {
        GITHUB_OUTPUT: outputFile,
        GITHUB_STEP_SUMMARY: summaryFile,
        REQUIRED_A: 'val-a',
        EMPTY_B: ''
      },
      cwd: tempDir,
      stdout: line => logs.push(line),
      warn: line => warnings.push(line),
      stderr: line => errors.push(line),
      setExitCode: code => {
        exitCode = code
      },
      getExitCode: () => exitCode
    })

    assert.deepEqual(runtime.requireEnv(['REQUIRED_A']), { REQUIRED_A: 'val-a' })
    assert.throws(() => runtime.requireEnv(['MISSING_X']), /MISSING_X is missing/)
    assert.throws(() => runtime.requireEnv(['EMPTY_B']), /EMPTY_B is missing/)

    runtime.writeOutputs({ foo: 'bar\nbaz', count: 3 })
    assert.equal(fs.readFileSync(outputFile, 'utf8'), 'foo=bar baz\ncount=3\n')

    runtime.appendSummary(['## Title', '', '- item 1'])
    runtime.appendSummary('   \n  ')
    assert.equal(fs.readFileSync(summaryFile, 'utf8'), `## Title${os.EOL}${os.EOL}- item 1${os.EOL}`)

    runtime.annotate('notice', 'Codex skipped', 'line1\nline2')
    runtime.warn('careful')
    runtime.error('boom')
    runtime.setExitCode(1)

    assert.deepEqual(logs, ['::notice title=Codex skipped::line1 line2'])
    assert.deepEqual(warnings, ['careful'])
    assert.deepEqual(errors, ['boom'])
    assert.equal(runtime.getExitCode(), 1)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// 3. createMemoryActionsRuntime 内存行为
{
  const runtime = createMemoryActionsRuntime({ env: { TOKEN: 'abc' }, cwd: '/virtual' })
  assert.equal(runtime.cwd, '/virtual')
  assert.deepEqual(runtime.requireEnv(['TOKEN']), { TOKEN: 'abc' })
  assert.throws(() => runtime.requireEnv(['NOPE']), /NOPE is missing/)

  runtime.writeOutputs({ status: 'ok\nnow' })
  runtime.appendSummary(['line a', 'line b'])
  runtime.annotate('warning', 'Check', 'msg\nhere')
  runtime.log('hello')
  runtime.warn('w')
  runtime.error('e')
  runtime.setExitCode(2)

  assert.deepEqual(runtime.outputs, { status: 'ok now' })
  assert.deepEqual(runtime.summaries, ['line a\nline b'])
  assert.deepEqual(runtime.annotations, [
    { level: 'warning', title: 'Check', message: 'msg here', line: '::warning title=Check::msg here' }
  ])
  assert.deepEqual(runtime.logs, ['::warning title=Check::msg here', 'hello'])
  assert.deepEqual(runtime.warnings, ['w'])
  assert.deepEqual(runtime.errors, ['e'])
  assert.equal(runtime.getExitCode(), 2)
}

// 4. runCli 分发与 usage 报错
{
  const runtime = createMemoryActionsRuntime()
  let received = null
  const result = runCli(
    {
      ping: ctx => {
        received = ctx
        return 'pong'
      },
      other: () => 'other'
    },
    { argv: ['ping', '--flag'], scriptName: 'demo.mjs', runtime }
  )
  assert.equal(result, 'pong')
  assert.equal(received.runtime, runtime)
  assert.deepEqual(received.args, ['--flag'])

  assert.throws(
    () => runCli({ ping: () => {}, other: () => {} }, { argv: ['bad'], scriptName: 'demo.mjs', runtime }),
    /usage: node demo\.mjs <ping\|other>/
  )
}

// 5. HTTP 404 / 422 / 403 状态码判定
assert.equal(isHttp404(new Error('gh: Not Found (HTTP 404)')), true)
assert.equal(isHttp404(new Error('gh: 404 Not Found')), true)
assert.equal(isHttp404(new Error('gh: HTTP 500')), false)

assert.equal(isHttp422(new Error('gh: Validation Failed (HTTP 422)')), true)
assert.equal(isHttp422(new Error('gh: 422 Unprocessable Entity')), true)
assert.equal(isHttp422(new Error('gh: HTTP 404')), false)

assert.equal(isHttp403(new Error('Resource not accessible by integration')), true)
assert.equal(isHttp403(new Error('gh: Forbidden (HTTP 403)')), true)
assert.equal(isHttp403(new Error('gh: 403 Forbidden')), true)
assert.equal(isHttp403(new Error('gh api -f body=finding mentions error 403 failed (exit 1): timeout')), false)

// 6. createGhClient（apiJson / allow404 / allowEmpty / paginateJson / getPull / listRunJobs / getJobLog）
{
  const calls = []
  const fakeSpawn = (command, args) => {
    calls.push([command, args])
    const last = args.at(-1)
    if (last === 'repos/owner/repo/pulls/42') {
      return { status: 0, stdout: JSON.stringify({ number: 42, head: { sha: 'abc' } }), stderr: '' }
    }
    if (last === 'repos/owner/repo/missing') {
      return { status: 1, stdout: '', stderr: 'gh: Not Found (HTTP 404)' }
    }
    if (last === 'repos/owner/repo/bad-json') {
      return { status: 0, stdout: '{invalid', stderr: '' }
    }
    if (last === 'repos/owner/repo/pulls/42/update-branch') {
      return { status: 0, stdout: '', stderr: '' }
    }
    if (last === 'repos/owner/repo/pulls/42/commits?per_page=2&page=1') {
      return { status: 0, stdout: JSON.stringify([{ sha: '1' }, { sha: '2' }]), stderr: '' }
    }
    if (last === 'repos/owner/repo/pulls/42/commits?per_page=2&page=2') {
      return { status: 0, stdout: JSON.stringify([{ sha: '3' }]), stderr: '' }
    }
    if (last === 'repos/owner/repo/actions/runs/99/jobs?per_page=100') {
      return { status: 0, stdout: JSON.stringify({ jobs: [{ id: 7, name: 'test' }] }), stderr: '' }
    }
    if (last === 'repos/owner/repo/actions/jobs/7/logs') {
      assert.ok(args.includes('--allow-escape-sequences'), 'getJobLog must pass --allow-escape-sequences')
      return { status: 0, stdout: '\u001b[31merror\u001b[0m', stderr: '' }
    }
    throw new Error(`unexpected args: ${args.join(' ')}`)
  }

  const client = createGhClient({ repository: 'owner/repo', spawn: fakeSpawn })
  assert.deepEqual(client.getPull(42), { number: 42, head: { sha: 'abc' } })
  assert.equal(client.apiJson('missing', { allow404: true }), null)
  assert.throws(() => client.apiJson('missing'), /HTTP 404/)
  assert.throws(() => client.apiJson('bad-json'), /gh api returned invalid JSON for bad-json/)
  assert.deepEqual(
    client.apiJson('pulls/42/update-branch', {
      method: 'PUT',
      fields: { expected_head_sha: 'abc' },
      allowEmpty: true
    }),
    {}
  )
  assert.deepEqual(client.paginateJson('pulls/42/commits', { perPage: 2, maxPages: 5 }), [
    { sha: '1' },
    { sha: '2' },
    { sha: '3' }
  ])
  assert.deepEqual(client.listRunJobs(99), [{ id: 7, name: 'test' }])
  assert.equal(client.getJobLog(7), '\u001b[31merror\u001b[0m')
  assert.equal(calls.length, 9)
}

console.log('.github/scripts/lib/actions-runtime.test.mjs: all assertions passed')

// commandError 携带独立 diagnostic 字段：请求参数正文含 403 短语时不得误判为 HTTP 403。
{
  const err = commandError(
    'gh',
    [
      'api',
      '-X',
      'POST',
      '-f',
      'body=403 Forbidden / Resource not accessible by integration',
      'repos/o/r/issues/1/comments'
    ],
    { status: 1, stderr: 'gh: HTTP 500 Internal Server Error', stdout: '' }
  )
  assert.equal(isHttp403(err), false, 'body payload mentioning 403 must not trigger isHttp403')
  const real403 = commandError('gh', ['api', '-X', 'POST', 'repos/o/r/issues/1/comments'], {
    status: 1,
    stderr: 'gh: Resource not accessible by integration (HTTP 403)',
    stdout: ''
  })
  assert.equal(isHttp403(real403), true, 'stderr 403 must still be classified as isHttp403')
}

// formatAnnotation 必须按 GitHub Actions workflow command 协议转义 %、CR、LF 以及 title 中的 : 和 ,。
{
  const rt = createMemoryActionsRuntime()
  rt.annotate('warning', 'PR: 100%, done\nnext', '100% failed\r\n::error::injected')
  assert.equal(rt.annotations[0].line, '::warning title=PR%3A 100%25%2C done next::100%25 failed ::error::injected')
}

// createGitHubApi 保持既有 404 返回 null 的容错语义，非 404 错误仍抛错。
{
  const api404 = createGitHubApi({
    repository: 'owner/mono',
    spawn: () => ({ status: 1, stdout: '', stderr: 'gh: Not Found (HTTP 404)' })
  })
  assert.equal(api404.api('releases/tags/v0.0.0'), null)

  const api500 = createGitHubApi({
    repository: 'owner/mono',
    spawn: () => ({ status: 1, stdout: '', stderr: 'gh: Internal Server Error (HTTP 500)' })
  })
  assert.throws(() => api500.api('releases/tags/v0.0.0'), /HTTP 500/)
}
