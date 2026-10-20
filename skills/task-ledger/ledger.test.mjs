import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'ledger.mjs')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'task-ledger-test-'))
const stateRoot = path.join(tempRoot, 'state')
const tmpRoot = path.join(tempRoot, 'tmp')
const repoA = path.join(tempRoot, 'repo-a')
const repoB = path.join(tempRoot, 'repo-b')
const baseEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Task Ledger Test',
  GIT_AUTHOR_EMAIL: 'task-ledger@example.com',
  GIT_COMMITTER_NAME: 'Task Ledger Test',
  GIT_COMMITTER_EMAIL: 'task-ledger@example.com',
  GIT_CONFIG_NOSYSTEM: '1'
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { env: baseEnv, encoding: 'utf8' }).trim()
}

function initRepo(root) {
  fs.mkdirSync(root, { recursive: true })
  git(root, 'init', '-b', 'main')
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n')
  git(root, 'add', '-A')
  git(root, 'commit', '-m', 'initial fixture')
  return git(root, 'rev-parse', 'HEAD')
}

function run(cwd, env, ...args) {
  return execFileSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8' })
}

function spawn(cwd, env, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8' })
}

function failMessage(cwd, env, ...args) {
  const result = spawn(cwd, env, ...args)
  assert.notEqual(result.status, 0, 'expected a failure: ledger.mjs ' + args.join(' '))
  return result.stdout + '\n' + result.stderr
}

function repoId(root) {
  return crypto.createHash('sha256').update(fs.realpathSync(path.join(root, '.git'))).digest('hex').slice(0, 16)
}

try {
  const baseA = initRepo(repoA)
  const baseB = initRepo(repoB)
  const envA = { ...baseEnv, AGENT_TASK_ROOT: repoA, AGENT_TASK_STATE_DIR: stateRoot }
  const envB = { ...baseEnv, AGENT_TASK_ROOT: repoB, AGENT_TASK_STATE_DIR: stateRoot }

  // 建账不要求干净工作区；状态、base、branch 与 Git 上下文都来自当前仓库。
  fs.writeFileSync(path.join(repoA, 'dirty.txt'), 'uncommitted\n')
  const created = JSON.parse(run(repoA, envA, 'new', 'task-a', '--level', 't2', '--owner', 'owner-a'))
  assert.equal(created.schema, 1)
  assert.equal(created.id, 'task-a')
  assert.equal(created.level, 'T2')
  assert.equal(created.status, 'open')
  assert.equal(created.base, baseA)
  assert.equal(created.branch, 'main')
  assert.equal(created.repoRoot, fs.realpathSync(repoA))
  assert.equal(created.gitCommonDir, fs.realpathSync(path.join(repoA, '.git')))
  assert.deepEqual(created.refs, {})
  assert.equal(created.events.at(-1).event, 'new')
  const packet = fs.readFileSync(path.join(stateRoot, 'task-a.md'), 'utf8')
  assert.match(packet, /^# task-a/m)
  assert.match(packet, /- Level: T2/)
  assert.match(packet, /- Owner: owner-a/)
  assert.match(failMessage(repoA, envA, 'new', 'task-a', '--level', 't2', '--owner', 'owner-a'), /already exists/)

  // start 幂等；终态不能再开始。
  assert.equal(JSON.parse(run(repoA, envA, 'start', 'task-a')).status, 'active')
  const activeAgain = JSON.parse(run(repoA, envA, 'start', 'task-a'))
  assert.equal(activeAgain.status, 'active')
  assert.match(activeAgain.note, /already active/)

  // ref 接受任意非空值，不校验 URL 或引用类型；--remove 删除已存在的引用。
  assert.equal(JSON.parse(run(repoA, envA, 'ref', 'task-a', 'issue', 'not-a-url')).refs.issue, 'not-a-url')
  assert.equal(
    JSON.parse(run(repoA, envA, 'ref', 'task-a', 'pr', 'https://example.com/pull/7')).refs.pr,
    'https://example.com/pull/7'
  )
  assert.equal(JSON.parse(run(repoA, envA, 'ref', 'task-a', 'issue', '--remove')).refs.issue, undefined)
  assert.match(failMessage(repoA, envA, 'ref', 'task-a', 'Bad_Kind', 'value'), /invalid ref kind/)
  assert.match(failMessage(repoA, envA, 'ref', 'task-a', 'missing'), /missing ref value/)
  assert.match(failMessage(repoA, envA, 'ref', 'task-a', 'issue', '--remove'), /ref not found/)
  assert.match(failMessage(repoA, envA, 'ref', 'task-a', 'note', 'line 1\nline 2'), /must not contain line breaks/)

  // status 支持单条、列表与 JSON；列表只包含当前仓库的记录。
  assert.equal(JSON.parse(run(repoA, envA, 'status', 'task-a')).id, 'task-a')
  assert.equal(JSON.parse(run(repoA, envA, 'status', '--task', 'task-a')).id, 'task-a')
  const listA = JSON.parse(run(repoA, envA, 'status', '--json'))
  assert.equal(listA.length, 1)
  assert.equal(listA[0].id, 'task-a')
  assert.match(run(repoA, envA, 'status'), /task-a\tT2\tactive\towner-a\tmain\t/)
  assert.match(failMessage(repoA, envA, 'status', 'task-a', '--task', 'task-a'), /not both/)
  assert.match(failMessage(repoA, envA, 'status', 'task-a', 'extra'), /unexpected argument/)

  const repoBTask = JSON.parse(run(repoB, envB, 'new', 'task-b-repo', '--level', 't2', '--owner', 'owner-b'))
  assert.equal(repoBTask.gitCommonDir, fs.realpathSync(path.join(repoB, '.git')))
  const filteredA = JSON.parse(run(repoA, envA, 'status', '--json'))
  assert.deepEqual(
    filteredA.map(task => task.id),
    ['task-a']
  )
  const filteredB = JSON.parse(run(repoB, envB, 'status', '--json'))
  assert.deepEqual(
    filteredB.map(task => task.id),
    ['task-b-repo']
  )

  // close/drop 是本地终态，输出不会冒充 review、CI、merge 或发布结论。
  const closed = JSON.parse(run(repoA, envA, 'close', 'task-a'))
  assert.equal(closed.status, 'closed')
  assert.match(closed.note, /does not assert review, CI, merge or release success/)
  assert.match(JSON.parse(run(repoA, envA, 'close', 'task-a')).note, /already closed/)
  assert.match(failMessage(repoA, envA, 'start', 'task-a'), /cannot start/)
  assert.match(failMessage(repoA, envA, 'drop', 'task-a'), /cannot drop/)

  const dropped = JSON.parse(run(repoA, envA, 'new', 'task-b', '--level', 't1', '--owner', 'owner-b'))
  assert.equal(dropped.status, 'open')
  const droppedState = JSON.parse(run(repoA, envA, 'drop', 'task-b', '--reason', 'abandoned by fixture'))
  assert.equal(droppedState.status, 'dropped')
  assert.equal(droppedState.events.at(-1).reason, 'abandoned by fixture')
  assert.match(JSON.parse(run(repoA, envA, 'drop', 'task-b')).note, /already dropped/)
  assert.match(failMessage(repoA, envA, 'start', 'task-b'), /cannot start/)
  assert.match(failMessage(repoA, envA, 'close', 'task-b'), /cannot close/)

  // 参数与基线校验保持明确；未知旧命令直接失败。
  run(repoA, envA, 'new', 'task-c', '--level', 't0', '--owner', 'owner-c', '--base', 'main')
  assert.match(failMessage(repoA, envA, 'drop', 'task-c', '--reason'), /--reason must be a non-empty string/)
  assert.match(
    failMessage(repoA, envA, 'new', 'task-d', '--level', 't0', '--owner', 'owner-d', '--base', 'missing-ref'),
    /does not resolve to a commit/
  )
  assert.match(failMessage(repoA, envA, 'new', 'task-e', '--level', 't3', '--owner', 'owner-e'), /invalid task level/)
  assert.match(failMessage(repoA, envA, 'new', 'task-e', '--level', 't0'), /missing required option --owner/)
  assert.match(failMessage(repoA, envA, 'new', 'task-e', '--level', 't0', '--owner', 'bad owner'), /invalid owner id/)
  assert.match(failMessage(repoA, envA, 'new', 'bad id', '--level', 't0', '--owner', 'owner-e'), /invalid task id/)
  assert.match(failMessage(repoA, envA, 'assign', 'task-c'), /unknown task-ledger command/)
  assert.match(failMessage(repoA, envA, 'issue', 'task-c'), /unknown task-ledger command/)
  assert.match(failMessage(repoA, envA, 'pr', 'task-c'), /unknown task-ledger command/)

  // 已存在的 Packet 不被覆盖。
  const customPacket = path.join(stateRoot, 'task-custom.md')
  fs.writeFileSync(customPacket, 'custom packet\n')
  run(repoA, envA, 'new', 'task-custom', '--level', 't2', '--owner', 'owner-c')
  assert.equal(fs.readFileSync(customPacket, 'utf8'), 'custom packet\n')

  // 损坏记录与未知 schema 明确失败，不静默迁移或覆盖。
  fs.writeFileSync(path.join(stateRoot, 'corrupt.json'), '{not json')
  assert.match(failMessage(repoA, envA, 'status', 'corrupt'), /cannot read task state/)
  fs.writeFileSync(path.join(stateRoot, 'future.json'), JSON.stringify({ schema: 2, id: 'future' }) + '\n')
  assert.match(failMessage(repoA, envA, 'status', 'future'), /unsupported schema version/)

  // 非 Git 目录明确失败；--root 与 AGENT_TASK_ROOT 都受同一检查。
  const outsideEnv = { ...baseEnv, AGENT_TASK_STATE_DIR: stateRoot }
  assert.match(failMessage(tempRoot, outsideEnv, 'new', 'outside', '--level', 't0', '--owner', 'owner'), /not a Git repository/)
  assert.match(
    failMessage(repoA, { ...envA, AGENT_TASK_ROOT: tempRoot }, 'new', 'outside', '--level', 't0', '--owner', 'owner'),
    /not a Git repository/
  )
  assert.match(
    failMessage(repoA, envA, 'new', 'outside', '--level', 't0', '--owner', 'owner', '--root', tempRoot),
    /not a Git repository/
  )

  // 默认状态目录按 Git common directory 派生：不同仓库落到不同目录，同一仓库共享。
  const isolationEnv = { ...baseEnv, TMPDIR: tmpRoot }
  const isolatedA = JSON.parse(run(repoA, isolationEnv, 'new', 'isolated-a', '--level', 't2', '--owner', 'owner-a'))
  const isolatedB = JSON.parse(run(repoB, isolationEnv, 'new', 'isolated-b', '--level', 't2', '--owner', 'owner-b'))
  assert.equal(isolatedA.gitCommonDir, fs.realpathSync(path.join(repoA, '.git')))
  assert.equal(isolatedB.gitCommonDir, fs.realpathSync(path.join(repoB, '.git')))
  assert.notEqual(repoId(repoA), repoId(repoB))
  assert.equal(fs.existsSync(path.join(tmpRoot, 'agent-task-ledger', repoId(repoA), 'isolated-a.json')), true)
  assert.equal(fs.existsSync(path.join(tmpRoot, 'agent-task-ledger', repoId(repoB), 'isolated-b.json')), true)

  process.stdout.write('skills/task-ledger/ledger.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
