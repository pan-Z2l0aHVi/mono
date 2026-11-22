import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'ledger.mjs')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'task-ledger-test-'))
const stateRoot = path.join(tempRoot, 'state')
const fakeHome = path.join(tempRoot, 'home')
const xdgCacheRoot = path.join(tempRoot, 'xdg-cache')
const repoA = path.join(tempRoot, 'repo-a')
const repoB = path.join(tempRoot, 'repo-b')
const inheritedEnv = { ...process.env }
delete inheritedEnv.AGENT_TASK_STATE_DIR
delete inheritedEnv.AGENT_TASK_ROOT
delete inheritedEnv.XDG_CACHE_HOME
const baseEnv = {
  ...inheritedEnv,
  HOME: fakeHome,
  GIT_AUTHOR_NAME: 'Task Ledger Test',
  GIT_AUTHOR_EMAIL: 'task-ledger@example.com',
  GIT_COMMITTER_NAME: 'Task Ledger Test',
  GIT_COMMITTER_EMAIL: 'task-ledger@example.com',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null'
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
  assert.deepEqual(created.scope, [])
  assert.equal(created.events.at(-1).event, 'new')
  const packet = fs.readFileSync(path.join(stateRoot, 'task-a.md'), 'utf8')
  assert.match(packet, /^# task-a/m)
  assert.match(packet, /- Level: T2/)
  assert.match(packet, /- Owner: owner-a/)
  assert.doesNotMatch(packet, /scope/)
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
  assert.deepEqual(listA[0].scope, [])
  assert.deepEqual(JSON.parse(run(repoA, envA, 'status', 'task-a')).scope, [])
  const table = run(repoA, envA, 'status').trim().split('\n')
  assert.equal(table.length, 1)
  assert.equal(table[0].split('\t').length, 6)
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

  // scope 只存仓库相对路径：new 可重复写入，子命令默认 set，每次都追加 scope 事件。
  const scoped = JSON.parse(
    run(
      repoA,
      envA,
      'new',
      'task-paths',
      '--level',
      't2',
      '--owner',
      'owner-a',
      '--scope',
      'packages/web-ui',
      '--scope',
      './apps/react-demo/',
      '--scope=packages/web-ui'
    )
  )
  assert.deepEqual(scoped.scope, ['apps/react-demo', 'packages/web-ui'])
  assert.deepEqual(JSON.parse(run(repoA, envA, 'status', 'task-paths')).scope, [
    'apps/react-demo',
    'packages/web-ui'
  ])
  assert.deepEqual(
    JSON.parse(run(repoA, envA, 'status', '--json')).find(task => task.id === 'task-paths').scope,
    ['apps/react-demo', 'packages/web-ui']
  )
  assert.doesNotMatch(fs.readFileSync(path.join(stateRoot, 'task-paths.md'), 'utf8'), /scope/)

  const defaultSet = JSON.parse(run(repoA, envA, 'scope', 'task-paths', 'docs', 'packages/js-kit'))
  assert.deepEqual(defaultSet.scope, ['docs', 'packages/js-kit'])
  assert.equal(defaultSet.events.at(-1).event, 'scope')
  assert.equal(defaultSet.events.at(-1).action, 'set')
  assert.deepEqual(defaultSet.events.at(-1).scope, ['docs', 'packages/js-kit'])

  const scopeAdded = JSON.parse(run(repoA, envA, 'scope', 'task-paths', 'scripts', '--add'))
  assert.deepEqual(scopeAdded.scope, ['docs', 'packages/js-kit', 'scripts'])
  assert.equal(scopeAdded.events.at(-1).action, 'add')

  const scopeRemoved = JSON.parse(run(repoA, envA, 'scope', 'task-paths', 'docs', '--remove'))
  assert.deepEqual(scopeRemoved.scope, ['packages/js-kit', 'scripts'])
  assert.equal(scopeRemoved.events.at(-1).action, 'remove')

  const scopeExplicitSet = JSON.parse(run(repoA, envA, 'scope', 'task-paths', 'AGENTS.md', '--set'))
  assert.deepEqual(scopeExplicitSet.scope, ['AGENTS.md'])
  assert.equal(scopeExplicitSet.events.at(-1).action, 'set')

  const scopeCleared = JSON.parse(run(repoA, envA, 'scope', 'task-paths', '--clear'))
  assert.deepEqual(scopeCleared.scope, [])
  assert.equal(scopeCleared.events.at(-1).action, 'clear')

  // 用 --task 指定记录时，位置参数都是路径，不再需要占位 id。
  const scopeViaAlias = JSON.parse(run(repoA, envA, 'scope', '--task', 'task-paths', 'apps/react-demo'))
  assert.deepEqual(scopeViaAlias.scope, ['apps/react-demo'])
  assert.equal(scopeViaAlias.events.at(-1).action, 'set')

  assert.match(
    failMessage(repoA, envA, 'scope', 'task-paths', 'docs', '--set', '--add'),
    /only one of --set, --add, --remove or --clear/
  )
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths', 'docs', '--clear'), /--clear does not accept paths/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths', '--set'), /set requires at least one path/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths', '--add'), /--add requires at least one path/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths', '--remove'), /--remove requires at least one path/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths'), /set requires at least one path/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths', '../outside'), /stay inside/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-paths', '/abs'), /repo-relative/)

  assert.match(
    failMessage(repoA, envA, 'new', 'bad-scope', '--level', 't0', '--owner', 'owner-a', '--scope', '/abs'),
    /repo-relative/
  )
  assert.match(
    failMessage(repoA, envA, 'new', 'bad-scope', '--level', 't0', '--owner', 'owner-a', '--scope', '.'),
    /repo-relative/
  )
  assert.match(
    failMessage(repoA, envA, 'new', 'bad-scope', '--level', 't0', '--owner', 'owner-a', '--scope', 'a/../b'),
    /stay inside/
  )
  assert.match(
    failMessage(repoA, envA, 'new', 'bad-scope', '--level', 't0', '--owner', 'owner-a', '--scope', ''),
    /missing value for --scope/
  )
  assert.match(
    failMessage(repoA, envA, 'new', 'bad-scope', '--level', 't0', '--owner', 'owner-a', '--scope'),
    /missing value for --scope/
  )
  assert.equal(fs.existsSync(path.join(stateRoot, 'bad-scope.json')), false)

  // 老记录可以没有 scope；读取不迁移，第一次写 scope 时才补上字段。
  const legacy = {
    schema: 1,
    id: 'task-legacy',
    level: 'T2',
    status: 'open',
    owner: 'owner-a',
    base: baseA,
    branch: 'main',
    repoRoot: fs.realpathSync(repoA),
    gitCommonDir: fs.realpathSync(path.join(repoA, '.git')),
    refs: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [{ at: new Date().toISOString(), event: 'new' }]
  }
  fs.writeFileSync(path.join(stateRoot, 'task-legacy.json'), JSON.stringify(legacy, null, 2) + '\n')
  assert.equal(JSON.parse(run(repoA, envA, 'status', 'task-legacy')).scope, undefined)
  assert.equal(
    JSON.parse(run(repoA, envA, 'status', '--json')).find(task => task.id === 'task-legacy').scope,
    undefined
  )
  const migrated = JSON.parse(run(repoA, envA, 'scope', 'task-legacy', 'docs'))
  assert.deepEqual(migrated.scope, ['docs'])

  fs.writeFileSync(
    path.join(stateRoot, 'bad-scope-record.json'),
    JSON.stringify({ ...legacy, id: 'bad-scope-record', scope: ['../outside'] }) + '\n'
  )
  assert.match(failMessage(repoA, envA, 'status', 'bad-scope-record'), /task ledger record is invalid/)
  fs.writeFileSync(
    path.join(stateRoot, 'bad-scope-record.json'),
    JSON.stringify({ ...legacy, id: 'bad-scope-record', scope: 'docs' }) + '\n'
  )
  assert.match(failMessage(repoA, envA, 'status', 'bad-scope-record'), /task ledger record is invalid/)
  fs.rmSync(path.join(stateRoot, 'bad-scope-record.json'))

  // close/drop 是本地终态，输出不会冒充 review、CI、merge 或发布结论。
  const closed = JSON.parse(run(repoA, envA, 'close', 'task-a'))
  assert.equal(closed.status, 'closed')
  assert.match(closed.note, /does not assert review, CI, merge or release success/)
  assert.match(JSON.parse(run(repoA, envA, 'close', 'task-a')).note, /already closed/)
  assert.match(failMessage(repoA, envA, 'start', 'task-a'), /cannot start/)
  assert.match(failMessage(repoA, envA, 'drop', 'task-a'), /cannot drop/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-a', 'docs'), /task-a is closed; cannot change scope/)

  const dropped = JSON.parse(run(repoA, envA, 'new', 'task-b', '--level', 't1', '--owner', 'owner-b'))
  assert.equal(dropped.status, 'open')
  const droppedState = JSON.parse(run(repoA, envA, 'drop', 'task-b', '--reason', 'abandoned by fixture'))
  assert.equal(droppedState.status, 'dropped')
  assert.equal(droppedState.events.at(-1).reason, 'abandoned by fixture')
  assert.match(JSON.parse(run(repoA, envA, 'drop', 'task-b')).note, /already dropped/)
  assert.match(failMessage(repoA, envA, 'start', 'task-b'), /cannot start/)
  assert.match(failMessage(repoA, envA, 'close', 'task-b'), /cannot close/)
  assert.match(failMessage(repoA, envA, 'scope', 'task-b', 'docs'), /task-b is dropped; cannot change scope/)

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

  // 默认状态目录优先级：AGENT_TASK_STATE_DIR > 绝对 XDG_CACHE_HOME > HOME/.cache，按 Git common directory 隔离。
  const xdgEnv = { ...baseEnv, XDG_CACHE_HOME: xdgCacheRoot }
  const isolatedA = JSON.parse(run(repoA, xdgEnv, 'new', 'isolated-a', '--level', 't2', '--owner', 'owner-a'))
  const isolatedB = JSON.parse(run(repoB, xdgEnv, 'new', 'isolated-b', '--level', 't2', '--owner', 'owner-b'))
  assert.equal(isolatedA.gitCommonDir, fs.realpathSync(path.join(repoA, '.git')))
  assert.equal(isolatedB.gitCommonDir, fs.realpathSync(path.join(repoB, '.git')))
  assert.notEqual(repoId(repoA), repoId(repoB))
  assert.equal(fs.existsSync(path.join(xdgCacheRoot, 'agent-task-ledger', repoId(repoA), 'isolated-a.json')), true)
  assert.equal(fs.existsSync(path.join(xdgCacheRoot, 'agent-task-ledger', repoId(repoB), 'isolated-b.json')), true)
  assert.equal(fs.existsSync(path.join(fakeHome, '.cache')), false)

  // linked worktree 与主仓共享同一个 repo-id 目录。
  const wtA = path.join(tempRoot, 'repo-a-wt')
  git(repoA, 'worktree', 'add', '-b', 'wt-branch', wtA)
  const wtTask = JSON.parse(run(wtA, xdgEnv, 'status', 'isolated-a'))
  assert.equal(wtTask.id, 'isolated-a')
  git(repoA, 'worktree', 'remove', wtA)

  // XDG_CACHE_HOME 为空或相对路径时回退到 HOME/.cache；严禁在 cwd 下创建相对路径目录。
  const relXdgEnv = { ...baseEnv, XDG_CACHE_HOME: 'relative-cache-dir' }
  run(repoA, relXdgEnv, 'new', 'fallback-rel', '--level', 't2', '--owner', 'owner-a')
  assert.equal(fs.existsSync(path.join(repoA, 'relative-cache-dir')), false)
  assert.equal(fs.existsSync(path.join(fakeHome, '.cache', 'agent-task-ledger', repoId(repoA), 'fallback-rel.json')), true)

  const blankXdgEnv = { ...baseEnv, XDG_CACHE_HOME: '   ' }
  run(repoA, blankXdgEnv, 'new', 'fallback-blank', '--level', 't2', '--owner', 'owner-a')
  assert.equal(
    fs.existsSync(path.join(fakeHome, '.cache', 'agent-task-ledger', repoId(repoA), 'fallback-blank.json')),
    true
  )

  // AGENT_TASK_STATE_DIR 优先于 XDG_CACHE_HOME 与 HOME。
  const overrideDir = path.join(tempRoot, 'override-state')
  run(repoA, { ...xdgEnv, AGENT_TASK_STATE_DIR: overrideDir }, 'new', 'override-task', '--level', 't2', '--owner', 'o')
  assert.equal(fs.existsSync(path.join(overrideDir, 'override-task.json')), true)
  assert.equal(fs.existsSync(path.join(xdgCacheRoot, 'agent-task-ledger', repoId(repoA), 'override-task.json')), false)

  // help 文案反映新命令与新存储路径。
  const helpText = run(repoA, baseEnv, 'help')
  assert.match(helpText, /prune \[--days <n>\] \[--dry-run\] \[--json\]/)
  assert.match(helpText, /XDG_CACHE_HOME/)

  // prune 参数校验：拒绝缺值（true）、0、负数、非整数与多余位置参数。
  assert.match(failMessage(repoA, envA, 'prune', '--days'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', '--days', '--dry-run'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', '--days', '0'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', '--days', '-5'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', '--days', '1.5'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', '--days', 'abc'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', '--days=30d'), /positive integer/)
  assert.match(failMessage(repoA, envA, 'prune', 'extra'), /unexpected argument/)

  // prune 行为与保护边界：隔离在独立状态目录验证终态清理、mtime 回退、dry-run 及活跃态/损坏文件保护。
  const pruneState = path.join(tempRoot, 'prune-state')
  const envPruneA = { ...baseEnv, AGENT_TASK_ROOT: repoA, AGENT_TASK_STATE_DIR: pruneState }
  const envPruneB = { ...baseEnv, AGENT_TASK_ROOT: repoB, AGENT_TASK_STATE_DIR: pruneState }
  const nowMs = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const daysAgoIso = days => new Date(nowMs - days * dayMs).toISOString()
  const setAge = (file, days) => {
    const t = new Date(nowMs - days * dayMs)
    fs.utimesSync(file, t, t)
  }

  // 1) 过期终态 closed / dropped（按记录 updatedAt）
  run(repoA, envPruneA, 'new', 'old-closed', '--level', 't2', '--owner', 'owner-a')
  run(repoA, envPruneA, 'close', 'old-closed')
  const oldClosedFile = path.join(pruneState, 'old-closed.json')
  const oldClosedData = JSON.parse(fs.readFileSync(oldClosedFile, 'utf8'))
  oldClosedData.updatedAt = daysAgoIso(35)
  fs.writeFileSync(oldClosedFile, JSON.stringify(oldClosedData, null, 2) + '\n')

  run(repoA, envPruneA, 'new', 'old-dropped', '--level', 't1', '--owner', 'owner-a')
  run(repoA, envPruneA, 'drop', 'old-dropped', '--reason', 'obsolete')
  const oldDroppedFile = path.join(pruneState, 'old-dropped.json')
  const oldDroppedData = JSON.parse(fs.readFileSync(oldDroppedFile, 'utf8'))
  oldDroppedData.updatedAt = daysAgoIso(45)
  fs.writeFileSync(oldDroppedFile, JSON.stringify(oldDroppedData, null, 2) + '\n')

  // 2) 未过期终态（5 天前），默认 30 天保留
  run(repoA, envPruneA, 'new', 'recent-closed', '--level', 't2', '--owner', 'owner-a')
  run(repoA, envPruneA, 'close', 'recent-closed')
  const recentClosedFile = path.join(pruneState, 'recent-closed.json')
  const recentClosedData = JSON.parse(fs.readFileSync(recentClosedFile, 'utf8'))
  recentClosedData.updatedAt = daysAgoIso(5)
  fs.writeFileSync(recentClosedFile, JSON.stringify(recentClosedData, null, 2) + '\n')

  // 3) 缺失记录终态时间时回退文件 mtime
  run(repoA, envPruneA, 'new', 'mtime-closed', '--level', 't2', '--owner', 'owner-a')
  run(repoA, envPruneA, 'close', 'mtime-closed')
  const mtimeClosedFile = path.join(pruneState, 'mtime-closed.json')
  const mtimeClosedData = JSON.parse(fs.readFileSync(mtimeClosedFile, 'utf8'))
  mtimeClosedData.updatedAt = ''
  mtimeClosedData.events = [{ event: 'close' }]
  fs.writeFileSync(mtimeClosedFile, JSON.stringify(mtimeClosedData, null, 2) + '\n')
  setAge(mtimeClosedFile, 40)

  // 4) 活跃态 open / active 即使超龄也绝不删除
  run(repoA, envPruneA, 'new', 'ancient-open', '--level', 't0', '--owner', 'owner-a')
  const ancientOpenFile = path.join(pruneState, 'ancient-open.json')
  const ancientOpenData = JSON.parse(fs.readFileSync(ancientOpenFile, 'utf8'))
  ancientOpenData.updatedAt = daysAgoIso(120)
  fs.writeFileSync(ancientOpenFile, JSON.stringify(ancientOpenData, null, 2) + '\n')
  setAge(ancientOpenFile, 120)

  run(repoA, envPruneA, 'new', 'ancient-active', '--level', 't1', '--owner', 'owner-a')
  run(repoA, envPruneA, 'start', 'ancient-active')
  const ancientActiveFile = path.join(pruneState, 'ancient-active.json')
  const ancientActiveData = JSON.parse(fs.readFileSync(ancientActiveFile, 'utf8'))
  ancientActiveData.updatedAt = daysAgoIso(120)
  fs.writeFileSync(ancientActiveFile, JSON.stringify(ancientActiveData, null, 2) + '\n')
  setAge(ancientActiveFile, 120)

  // 5) 损坏 JSON 与未知 schema 即使超龄也保留不删
  const corruptFile = path.join(pruneState, 'corrupt-prune.json')
  const corruptMd = path.join(pruneState, 'corrupt-prune.md')
  fs.writeFileSync(corruptFile, '{not valid json')
  fs.writeFileSync(corruptMd, '# corrupt packet\n')
  setAge(corruptFile, 120)

  const futureFile = path.join(pruneState, 'future-prune.json')
  const futureMd = path.join(pruneState, 'future-prune.md')
  fs.writeFileSync(
    futureFile,
    JSON.stringify({ schema: 2, id: 'future-prune', status: 'closed', updatedAt: daysAgoIso(120) }) + '\n'
  )
  fs.writeFileSync(futureMd, '# future packet\n')
  setAge(futureFile, 120)

  // 6) 其他仓库的过期终态不跨仓误删
  run(repoB, envPruneB, 'new', 'other-repo-closed', '--level', 't2', '--owner', 'owner-b')
  run(repoB, envPruneB, 'close', 'other-repo-closed')
  const otherRepoFile = path.join(pruneState, 'other-repo-closed.json')
  const otherRepoData = JSON.parse(fs.readFileSync(otherRepoFile, 'utf8'))
  otherRepoData.updatedAt = daysAgoIso(90)
  fs.writeFileSync(otherRepoFile, JSON.stringify(otherRepoData, null, 2) + '\n')

  // --dry-run 只预览，不删任何文件
  const dryRunResult = JSON.parse(run(repoA, envPruneA, 'prune', '--dry-run', '--json'))
  assert.equal(dryRunResult.dryRun, true)
  assert.equal(dryRunResult.days, 30)
  assert.deepEqual(
    dryRunResult.pruned.map(item => item.id).sort(),
    ['mtime-closed', 'old-closed', 'old-dropped']
  )
  assert.equal(fs.existsSync(oldClosedFile), true)
  assert.equal(fs.existsSync(path.join(pruneState, 'old-closed.md')), true)
  assert.equal(fs.existsSync(oldDroppedFile), true)
  assert.equal(fs.existsSync(mtimeClosedFile), true)

  // 正式执行 prune（默认 30 天）：清理 3 条过期终态及其同名 .md，保护其余全部记录
  const pruneRun = spawn(repoA, envPruneA, 'prune', '--json')
  assert.equal(pruneRun.status, 0, pruneRun.stderr)
  assert.match(pruneRun.stderr, /warning: skipping unreadable task state/)
  const prunedResult = JSON.parse(pruneRun.stdout)
  assert.equal(prunedResult.dryRun, false)
  assert.deepEqual(
    prunedResult.pruned.map(item => item.id).sort(),
    ['mtime-closed', 'old-closed', 'old-dropped']
  )
  assert.equal(prunedResult.skippedCount, 2)

  for (const id of ['old-closed', 'old-dropped', 'mtime-closed']) {
    assert.equal(fs.existsSync(path.join(pruneState, `${id}.json`)), false)
    assert.equal(fs.existsSync(path.join(pruneState, `${id}.md`)), false)
  }
  for (const file of [
    recentClosedFile,
    path.join(pruneState, 'recent-closed.md'),
    ancientOpenFile,
    path.join(pruneState, 'ancient-open.md'),
    ancientActiveFile,
    path.join(pruneState, 'ancient-active.md'),
    corruptFile,
    corruptMd,
    futureFile,
    futureMd,
    otherRepoFile,
    path.join(pruneState, 'other-repo-closed.md')
  ]) {
    assert.equal(fs.existsSync(file), true, `must preserve ${file}`)
  }

  // 自定义 --days 3 预览（纯文本）与正式清理 5 天前的 closed，仍保护 open/active
  const customDryText = run(repoA, envPruneA, 'prune', '--days', '3', '--dry-run')
  assert.match(customDryText, /^would prune\trecent-closed\tclosed\t/m)
  assert.equal(fs.existsSync(recentClosedFile), true)

  const customPrune = JSON.parse(run(repoA, envPruneA, 'prune', '--days', '3', '--json'))
  assert.deepEqual(
    customPrune.pruned.map(item => item.id),
    ['recent-closed']
  )
  assert.equal(fs.existsSync(recentClosedFile), false)
  assert.equal(fs.existsSync(path.join(pruneState, 'recent-closed.md')), false)
  assert.equal(fs.existsSync(ancientOpenFile), true)
  assert.equal(fs.existsSync(ancientActiveFile), true)

  // 空目录 / 不存在的状态目录也不失败
  const emptyPruneEnv = { ...envPruneA, AGENT_TASK_STATE_DIR: path.join(tempRoot, 'missing-dir') }
  const emptyPrune = JSON.parse(run(repoA, emptyPruneEnv, 'prune', '--json'))
  assert.deepEqual(emptyPrune.pruned, [])
  assert.match(run(repoA, emptyPruneEnv, 'prune'), /no expired terminal tasks to prune/)

  process.stdout.write('skills/task-ledger/ledger.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
