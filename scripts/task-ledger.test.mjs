import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repoRoot, 'scripts', 'task-ledger.mjs')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-task-ledger-test-'))
const fixture = path.join(tempRoot, 'repo')
const secondFixture = path.join(tempRoot, 'second-repo')
const stateDir = path.join(tempRoot, 'state')
const marker = path.join(tempRoot, 'unexpected-side-effect')
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Codex',
  GIT_AUTHOR_EMAIL: 'noreply@openai.com',
  GIT_COMMITTER_NAME: 'Codex',
  GIT_COMMITTER_EMAIL: 'noreply@openai.com'
}
const taskEnv = { ...gitEnv, AGENT_TASK_ROOT: fixture, AGENT_TASK_STATE_DIR: stateDir, SIDE_EFFECT_MARKER: marker }

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { env: gitEnv, encoding: 'utf8' }).trim()
}

function commit(root, message) {
  git(root, 'add', '-A')
  git(root, 'commit', '-m', message)
  return git(root, 'rev-parse', 'HEAD')
}

function initRepo(root) {
  fs.mkdirSync(root, { recursive: true })
  git(root, 'init', '-b', 'main')
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n')
  return commit(root, 'initial fixture')
}

function run(...args) {
  return execFileSync(process.execPath, [script, ...args], {
    cwd: fixture,
    env: taskEnv,
    encoding: 'utf8'
  })
}

function spawn(...args) {
  const options = args.at(-1) && typeof args.at(-1) === 'object' ? args.pop() : {}
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? fixture,
    env: { ...taskEnv, ...(options.env ?? {}) },
    encoding: 'utf8'
  })
}

function failMessage(...args) {
  const result = spawn(...args)
  assert.notEqual(result.status, 0, 'expected a failure: task-ledger ' + args.join(' '))
  return result.stdout + '\n' + result.stderr
}

function statePath(taskId) {
  return path.join(stateDir, taskId + '.json')
}

try {
  const baseSha = initRepo(fixture)

  // 登记独立于检查和整理；缺少 checks 目录也允许登记，失败工具与 fixer 不会运行或触碰 index。
  fs.writeFileSync(path.join(fixture, 'dirty.txt'), 'already staged\n')
  git(fixture, 'add', 'dirty.txt')
  fs.mkdirSync(path.join(fixture, '.agents', 'checks'), { recursive: true })
  fs.writeFileSync(
    path.join(fixture, '.agents', 'checks', 'command-conventions'),
    '#!/bin/sh\ntouch "$SIDE_EFFECT_MARKER"\nexit 91\n'
  )
  fs.chmodSync(path.join(fixture, '.agents', 'checks', 'command-conventions'), 0o755)
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({
      name: 'ledger-fixture',
      scripts: { 'fix-code': "node -e \"require('node:fs').writeFileSync(process.env.SIDE_EFFECT_MARKER, 'fixer')\"" }
    }) + '\n'
  )
  const indexBefore = git(fixture, 'diff', '--cached', '--raw')
  const t2 = JSON.parse(run('new', '--task', 'dirty-t2', '--level', 't2', '--owner', 'fixture-owner'))
  assert.equal(t2.version, 3)
  assert.equal(t2.status, 'open')
  assert.equal(t2.level, 't2')
  assert.equal(t2.baseSha, baseSha)
  assert.equal(JSON.parse(run('start', '--task', 'dirty-t2')).status, 'active')
  assert.equal(git(fixture, 'diff', '--cached', '--raw'), indexBefore)
  assert.equal(fs.existsSync(marker), false)
  assert.match(failMessage('assign', '--task', 'dirty-t2', '--roles', 'reviewer'), /does not accept --roles/)
  assert.match(
    failMessage('drop', '--task', 'dirty-t2', '--reason', 'too short', '--by', 'fixture-sweeper-1'),
    /at least 10 non-space characters/
  )
  const pr = JSON.parse(run('pr', '--task', 'dirty-t2', '--ref', 'https://github.com/greypan/mono/pull/123'))
  assert.equal(pr.pr, 'https://github.com/greypan/mono/pull/123')
  assert.match(pr.note, /does not indicate CI or review status/)
  assert.equal(JSON.parse(run('close', '--task', 'dirty-t2')).status, 'closed')
  assert.equal(fs.existsSync(marker), false)

  // T0/T1 干净起点、owner/worktree 唯一性与 status 迁移保持现有登记约束。
  git(fixture, 'rm', '--cached', 'dirty.txt')
  fs.rmSync(path.join(fixture, 'dirty.txt'))
  fs.rmSync(path.join(fixture, '.agents'), { recursive: true, force: true })
  fs.rmSync(path.join(fixture, 'package.json'))
  const dirtyT1 = JSON.parse(run('new', '--task', 'dirty-t1', '--level', 't1', '--issue', 'N/A'))
  assert.equal(dirtyT1.status, 'open')
  fs.writeFileSync(path.join(fixture, 'preexisting-after-new.txt'), 'must clean before start\n')
  assert.match(failMessage('start', '--task', 'dirty-t1'), /cannot start with uncommitted changes/)
  fs.rmSync(path.join(fixture, 'preexisting-after-new.txt'))
  assert.equal(JSON.parse(run('start', '--task', 'dirty-t1')).status, 'active')
  fs.writeFileSync(path.join(fixture, 'later-wip.txt'), 'active changes remain allowed\n')
  assert.equal(JSON.parse(run('start', '--task', 'dirty-t1')).status, 'active')
  fs.rmSync(path.join(fixture, 'later-wip.txt'))
  assert.match(failMessage('issue', '--task', 'dirty-t1', '--ref', 'http://example.com/1'), /invalid issue reference/)
  assert.equal(
    JSON.parse(run('issue', '--task', 'dirty-t1', '--ref', 'https://github.com/greypan/mono/issues/42')).issue,
    'https://github.com/greypan/mono/issues/42'
  )
  assert.match(failMessage('pr', '--task', 'dirty-t1', '--ref', 'https://example.com/not-a-pr'), /pull/)
  assert.match(failMessage('new', '--task', 'duplicate-worktree', '--level', 't2'), /already assigned to active task/)
  assert.equal(JSON.parse(run('assign', '--task', 'dirty-t1', '--owner', 'fixture-owner')).owner, 'fixture-owner')
  assert.equal(JSON.parse(run('close', '--task', 'dirty-t1')).status, 'closed')
  assert.equal(JSON.parse(run('new', '--task', 'released-worktree', '--level', 't2')).status, 'open')
  assert.equal(JSON.parse(run('start', '--task', 'released-worktree')).status, 'active')
  assert.equal(
    JSON.parse(
      run(
        'drop',
        '--task',
        'released-worktree',
        '--reason',
        'fixture cleanup after ownership check',
        '--by',
        'fixture-sweeper-1'
      )
    ).status,
    'dropped'
  )

  // 选项结束符、字段白名单与 PR/issue 参数保持明确。
  assert.equal(JSON.parse(run('status', '--task', 'dirty-t1', '--', 'run', 'pnpm', 'test')).taskId, 'dirty-t1')
  assert.match(failMessage('status', '--', '--task', 'dirty-t1'), /missing required option --task/)
  assert.match(failMessage('assign', '--task', 'dirty-t1', '--roles=reviewer'), /does not accept --roles/)
  assert.match(failMessage('assign', '--task', 'dirty-t1', '--owner', 'bad id!'), /invalid owner id/)

  // v1 所有历史 phase 与 v2 status 都只读投影；定向写入迁移到 v3、保留事件和 v2 PR。
  initRepo(secondFixture)
  const secondEnv = { ...taskEnv, AGENT_TASK_ROOT: secondFixture }
  const secondRun = (...args) =>
    execFileSync(process.execPath, [script, ...args], { cwd: secondFixture, env: secondEnv, encoding: 'utf8' })
  const secondSpawn = (...args) =>
    spawnSync(process.execPath, [script, ...args], { cwd: secondFixture, env: secondEnv, encoding: 'utf8' })
  const v1Cases = [
    ['open', 'open'],
    ['active', 'active'],
    ['frozen', 'active'],
    ['reviewed', 'active'],
    ['approved', 'active'],
    ['done', 'closed'],
    ['dropped', 'dropped']
  ]
  for (const [phase, expectedStatus] of v1Cases) {
    const taskId = 'legacy-v1-' + phase
    const created = JSON.parse(
      execFileSync(process.execPath, [script, 'new', '--task', taskId, '--level', 't2', '--owner', 'legacy-owner'], {
        cwd: secondFixture,
        env: secondEnv,
        encoding: 'utf8'
      })
    )
    const file = path.join(stateDir, taskId + '.json')
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    raw.version = 1
    raw.phase = phase
    raw.diffHash = 'retired-hash'
    raw.review = { result: 'pass', diffHash: 'retired-hash' }
    raw.approval = { granted: true, diffHash: 'retired-hash' }
    raw.verification = [{ result: 'pass', diffHash: 'retired-hash' }]
    raw.events.push({ at: '2026-10-17T00:00:00.000Z', event: 'approve', diffHash: 'retired-hash' })
    fs.writeFileSync(file, JSON.stringify(raw, null, 2) + '\n')
    const before = fs.readFileSync(file, 'utf8')
    const projected = JSON.parse(secondRun('status', '--task', taskId))
    assert.equal(projected.version, 3)
    assert.equal(projected.status, expectedStatus, 'v1 phase ' + phase)
    assert.equal(projected.migrationPendingFrom, 1)
    assert.equal(fs.readFileSync(file, 'utf8'), before, 'status must not migrate v1 ' + phase)
    assert.equal(projected.pr, null)
    const migrated = JSON.parse(secondRun('issue', '--task', taskId, '--ref', 'N/A'))
    assert.equal(migrated.version, 3)
    assert.equal(migrated.status, expectedStatus)
    assert.ok(
      migrated.events.some(event => event.event === 'migration' && event.fromVersion === 1 && event.toVersion === 3)
    )
    assert.ok(migrated.events.some(event => event.event === 'approve' && event.diffHash === 'retired-hash'))
    for (const field of ['phase', 'diffHash', 'review', 'approval', 'verification'])
      assert.equal(Object.hasOwn(migrated, field), false)
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'))
    assert.equal(stored.version, 3)
    assert.equal(stored.status, expectedStatus)
    if (['open', 'active'].includes(expectedStatus))
      secondRun('drop', '--task', taskId, '--reason', 'migration fixture cleanup', '--by', 'fixture-sweeper-1')
    assert.ok(created.events.some(event => event.event === 'new'))
  }

  const v2Cases = [
    ['open', 'open'],
    ['active', 'active'],
    ['done', 'closed'],
    ['dropped', 'dropped']
  ]
  for (const [phase, expectedStatus] of v2Cases) {
    const taskId = 'legacy-v2-' + phase
    execFileSync(process.execPath, [script, 'new', '--task', taskId, '--level', 't2', '--owner', 'legacy-owner'], {
      cwd: secondFixture,
      env: secondEnv,
      encoding: 'utf8'
    })
    const file = path.join(stateDir, taskId + '.json')
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    raw.version = 2
    raw.phase = phase
    raw.pr = 'https://github.com/greypan/mono/pull/77'
    raw.events.push({ at: '2026-10-17T00:00:00.000Z', event: 'legacy-event' })
    fs.writeFileSync(file, JSON.stringify(raw, null, 2) + '\n')
    const before = fs.readFileSync(file, 'utf8')
    const projected = JSON.parse(secondRun('status', '--task', taskId))
    assert.equal(projected.version, 3)
    assert.equal(projected.status, expectedStatus, 'v2 phase ' + phase)
    assert.equal(projected.pr, 'https://github.com/greypan/mono/pull/77')
    assert.equal(fs.readFileSync(file, 'utf8'), before, 'status must not migrate v2 ' + phase)
    const migrated = JSON.parse(secondRun('issue', '--task', taskId, '--ref', 'N/A'))
    assert.ok(
      migrated.events.some(event => event.event === 'migration' && event.fromVersion === 2 && event.toVersion === 3)
    )
    assert.ok(migrated.events.some(event => event.event === 'legacy-event'))
    assert.equal(migrated.pr, 'https://github.com/greypan/mono/pull/77')
    if (['open', 'active'].includes(expectedStatus))
      secondRun('drop', '--task', taskId, '--reason', 'migration fixture cleanup', '--by', 'fixture-sweeper-1')
  }

  const unknownPath = statePath('unknown-schema')
  fs.writeFileSync(
    unknownPath,
    JSON.stringify({ taskId: 'unknown-schema', version: 99, events: [], commonDir: '', worktree: '', level: 't2' })
  )
  assert.match(failMessage('status', '--task', 'unknown-schema'), /unsupported schema version/)
  fs.writeFileSync(statePath('corrupt-target'), '{not json')
  assert.match(failMessage('status', '--task', 'corrupt-target'), /cannot read task state/)

  // 跨仓库 state 不占用当前仓库 worktree；隔离 seam 明确由 AGENT_TASK_ROOT / STATE_DIR 控制。
  const repoBTask = JSON.parse(secondRun('new', '--task', 'repo-b-task', '--level', 't2', '--owner', 'fixture-owner'))
  assert.equal(repoBTask.commonDir, fs.realpathSync(path.join(secondFixture, '.git')))
  assert.equal(repoBTask.status, 'open')
  const repoATask = JSON.parse(run('new', '--task', 'repo-a-task', '--level', 't2', '--owner', 'fixture-owner'))
  assert.equal(repoATask.commonDir, fs.realpathSync(path.join(fixture, '.git')))

  process.stdout.write('scripts/task-ledger.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
