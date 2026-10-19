import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const script = path.join(repoRoot, 'scripts', 'workflow', 'task.mjs')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-task-adapter-test-'))
const fixture = path.join(tempRoot, 'repo')
const stateDir = path.join(tempRoot, 'state')
const marker = path.join(tempRoot, 'unexpected-side-effect')
const env = {
  ...process.env,
  AGENT_TASK_ROOT: fixture,
  AGENT_TASK_STATE_DIR: stateDir,
  SIDE_EFFECT_MARKER: marker,
  GIT_AUTHOR_NAME: 'Codex',
  GIT_AUTHOR_EMAIL: 'noreply@openai.com',
  GIT_COMMITTER_NAME: 'Codex',
  GIT_COMMITTER_EMAIL: 'noreply@openai.com'
}

function git(...args) {
  return execFileSync('git', ['-C', fixture, ...args], { env, encoding: 'utf8' }).trim()
}

function run(...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: fixture, env, encoding: 'utf8' })
}

try {
  fs.mkdirSync(fixture, { recursive: true })
  git('init', '-b', 'main')
  fs.writeFileSync(path.join(fixture, 'README.md'), '# fixture\n')
  git('add', 'README.md')
  git('commit', '-m', 'adapter fixture')
  fs.mkdirSync(path.join(fixture, '.agents', 'checks'), { recursive: true })
  fs.writeFileSync(
    path.join(fixture, '.agents', 'checks', 'command-conventions'),
    '#!/bin/sh\ntouch "$SIDE_EFFECT_MARKER"\nexit 99\n'
  )
  fs.chmodSync(path.join(fixture, '.agents', 'checks', 'command-conventions'), 0o755)
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({
      name: 'adapter-fixture',
      scripts: { 'fix-code': "node -e \"require('node:fs').writeFileSync(process.env.SIDE_EFFECT_MARKER, 'fix')\"" }
    }) + '\n'
  )

  // 保留命令透传，迁移提示只写 stderr，不污染 machine-readable stdout。
  const created = run('new', '--task', 'adapter-task', '--level', 't2', '--owner', 'fixture-owner')
  assert.equal(created.status, 0, created.stderr)
  assert.match(created.stderr, /deprecated `agent:task`; use `agent:task-ledger`/)
  assert.equal(JSON.parse(created.stdout).status, 'open')
  const started = run('start', '--task', 'adapter-task')
  assert.equal(started.status, 0, started.stderr)
  assert.equal(JSON.parse(started.stdout).status, 'active')
  const issue = run('issue', '--task', 'adapter-task', '--ref', 'N/A')
  assert.equal(issue.status, 0, issue.stderr)
  assert.equal(JSON.parse(issue.stdout).issue, 'N/A')

  const stateFile = path.join(stateDir, 'adapter-task.json')
  const beforeState = fs.readFileSync(stateFile, 'utf8')
  const beforeIndex = git('diff', '--cached', '--raw')
  for (const command of ['guard', 'freeze', 'review', 'approve', 'verify']) {
    const rejected = run(command, '--task', 'adapter-task')
    assert.equal(rejected.status, 1, command)
    assert.match(rejected.stderr, new RegExp('deprecated `agent:task ' + command + '`'))
    assert.notEqual(rejected.stdout.includes('{'), true, command)
    assert.equal(fs.readFileSync(stateFile, 'utf8'), beforeState, command + ' must not mutate ledger')
    assert.equal(git('diff', '--cached', '--raw'), beforeIndex, command + ' must not mutate the index')
    assert.equal(fs.existsSync(marker), false, command + ' must not run checks or fixer')
  }
  assert.match(run('guard', '--task', 'adapter-task').stderr, /docs\/agents\/commit\.md/)
  assert.match(run('freeze', '--task', 'adapter-task').stderr, /pnpm fix-code.*git add/s)

  // 旧 done 明确映射为新 close，并继续将 JSON 保持在 stdout。
  const closed = run('done', '--task', 'adapter-task')
  assert.equal(closed.status, 0, closed.stderr)
  assert.match(closed.stderr, /`done` maps to `close`/)
  assert.equal(JSON.parse(closed.stdout).status, 'closed')

  process.stdout.write('scripts/workflow/task.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
