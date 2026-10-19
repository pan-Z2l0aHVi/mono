import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = path.resolve(import.meta.dirname, '..')
const checker = path.join(repoRoot, 'scripts', 'check-policies.mjs')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-check-policies-test-'))
const fixture = path.join(tempRoot, 'repo')
const stateDir = path.join(tempRoot, 'task-state')
const log = path.join(tempRoot, 'policy-log')
const checks = ['command-conventions', 'format-clean', 'no-mutual-links', 'turbo-cache-invariant', 'web-ui-docs-inputs']
const checkEnv = {
  ...process.env,
  AGENT_TASK_ID: 'poison-id',
  AGENT_TASK_TASK: 'missing-task',
  AGENT_TASK_BASE_SHA: 'not-a-commit',
  AGENT_TASK_ROOT: path.join(tempRoot, 'missing-root'),
  AGENT_TASK_STATE_DIR: stateDir,
  POLICY_LOG: log
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()
}

function writeCheck(root, name, source) {
  const file = path.join(root, '.agents', 'checks', name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, source)
  fs.chmodSync(file, 0o755)
  return file
}

function loggingCheck(name) {
  return ['#!/bin/sh', 'printf "%s\\n" "' + name + '" >> "$POLICY_LOG"', 'exit 0', ''].join('\n')
}

function run(cwd = fixture, env = checkEnv) {
  return spawnSync(process.execPath, [checker], { cwd, env, encoding: 'utf8' })
}

try {
  fs.mkdirSync(fixture, { recursive: true })
  git(fixture, 'init', '-b', 'main')
  for (const name of checks) {
    writeCheck(
      fixture,
      name,
      [
        '#!/bin/sh',
        'if env | grep -q "^AGENT_TASK_"; then echo "task env leaked" >&2; exit 61; fi',
        'printf "%s\\n" "' + name + '" >> "$POLICY_LOG"',
        name === 'format-clean' ? 'echo successful checker stdout marker' : ':',
        'exit 0',
        ''
      ].join('\n')
    )
  }
  writeCheck(fixture, 'changeset-required', '#!/bin/sh\necho changeset-required-ran >> "$POLICY_LOG"\nexit 72\n')
  fs.mkdirSync(path.join(fixture, 'nested', 'path'), { recursive: true })
  fs.mkdirSync(stateDir, { recursive: true })
  fs.writeFileSync(path.join(stateDir, 'poison.json'), '{corrupt and intentionally unused')

  // import 只导出常量，既不识别 repo cwd，也不触发子检查。
  const imported = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import(${JSON.stringify(pathToFileURL(checker).href)}).then(({ POLICY_CHECKS }) => process.stdout.write(JSON.stringify(POLICY_CHECKS)))`
    ],
    { cwd: path.join(fixture, 'nested'), env: checkEnv, encoding: 'utf8' }
  )
  assert.equal(imported.status, 0, imported.stderr)
  assert.deepEqual(JSON.parse(imported.stdout), checks)
  assert.equal(fs.existsSync(log), false)

  // cwd 可为 worktree 子目录；task 环境与损坏登记文件不影响五项只读检查，stdout 始终是单个 JSON。
  const successful = run(path.join(fixture, 'nested', 'path'))
  assert.equal(successful.status, 0, successful.stderr)
  assert.deepEqual(JSON.parse(successful.stdout), { ok: true, command: 'check-policies', checks })
  assert.match(successful.stderr, /successful checker stdout marker/)
  assert.deepEqual(fs.readFileSync(log, 'utf8').trim().split('\n'), checks)
  assert.doesNotMatch(fs.readFileSync(log, 'utf8'), /changeset-required-ran/)
  assert.equal(fs.readFileSync(path.join(stateDir, 'poison.json'), 'utf8'), '{corrupt and intentionally unused')

  // 整个检查目录缺失时 fail closed。
  fs.rmSync(path.join(fixture, '.agents'), { recursive: true, force: true })
  const noDirectory = run()
  assert.notEqual(noDirectory.status, 0)
  assert.equal(noDirectory.stdout, '')
  assert.match(noDirectory.stderr, /required policy directory is unavailable/)

  // Git lookup failures preserve both spawn errors and signal termination details.
  const noGit = run(fixture, { ...checkEnv, PATH: '' })
  assert.notEqual(noGit.status, 0)
  assert.match(noGit.stderr, /spawnSync git ENOENT/)

  const signalBin = path.join(tempRoot, 'signal-bin')
  fs.mkdirSync(signalBin)
  const signalGit = path.join(signalBin, 'git')
  fs.writeFileSync(signalGit, '#!/bin/sh\nkill -TERM "$$"\n')
  fs.chmodSync(signalGit, 0o755)
  const signalFailure = run(fixture, { ...checkEnv, PATH: signalBin })
  assert.notEqual(signalFailure.status, 0)
  assert.match(signalFailure.stderr, /terminated by SIGTERM/)

  // 单项缺失、失去执行位或非普通文件均失败，并继续运行其它可执行检查以保留诊断。
  for (const mode of ['missing', 'not-executable', 'directory']) {
    for (const name of checks) writeCheck(fixture, name, loggingCheck(name))
    const file = path.join(fixture, '.agents', 'checks', 'command-conventions')
    if (mode === 'missing') fs.rmSync(file)
    if (mode === 'not-executable') fs.chmodSync(file, 0o644)
    if (mode === 'directory') {
      fs.rmSync(file)
      fs.mkdirSync(file)
    }
    fs.rmSync(log, { force: true })
    const failed = run()
    assert.notEqual(failed.status, 0, mode)
    assert.equal(failed.stdout, '', mode)
    assert.match(failed.stderr, /missing or non-executable: command-conventions/, mode)
    assert.deepEqual(fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [], checks.slice(1), mode)
    fs.rmSync(path.join(fixture, '.agents', 'checks', 'command-conventions'), { recursive: true, force: true })
    writeCheck(fixture, 'command-conventions', '#!/bin/sh\nexit 0\n')
  }

  // 子检查失败时返回非零并完整保留 stdout/stderr 原因，且其它 checks 仍按固定列表执行。
  for (const name of checks) writeCheck(fixture, name, loggingCheck(name))
  writeCheck(fixture, 'no-mutual-links', '#!/bin/sh\necho child stdout detail\necho child stderr detail >&2\nexit 23\n')
  fs.rmSync(log, { force: true })
  const failedCheck = run()
  assert.notEqual(failedCheck.status, 0)
  assert.equal(failedCheck.stdout, '')
  assert.match(failedCheck.stderr, /child stdout detail/)
  assert.match(failedCheck.stderr, /child stderr detail/)
  assert.match(failedCheck.stderr, /no-mutual-links: exited with 23/)
  assert.doesNotMatch(failedCheck.stderr, /AGENT_TASK_ROOT|missing-task|poison-id/)

  process.stdout.write('scripts/check-policies.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
