import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repoRoot, 'scripts', 'task.mjs')
const preCommit = fs.readFileSync(path.join(repoRoot, '.vite-hooks', 'pre-commit'), 'utf8')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-task-'))
const secondWorktree = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-task-second-'))
// task state 落在 $TMPDIR/greypan/tasks/ 之后，那份 fixture 会直接读写真机上真实 task 的目录，
// 所以整个文件统一注入一个私有落点（AGENT_TASK_STATE_DIR）。注入点与 AGENT_TASK_ROOT 是两件事：
// 后者换默认 worktree，前者换 state 目录，少任何一个用例都会打到真实的 $TMPDIR 或真实仓库上。
const stateDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-task-state-')), 'tasks')
const taskEnv = { AGENT_TASK_ROOT: fixture, AGENT_TASK_STATE_DIR: stateDir }

// pre-commit 边界：guard 是唯一门禁，归一化只发生在 freeze；不允许任何绕过形态。
assert.ok(preCommit.includes('pnpm agent:task guard'), 'pre-commit must run the task guard')
assert.equal(preCommit.includes('vp staged'), false, 'pre-commit must not run vp staged')
assert.equal(preCommit.includes('agent-workflow'), false, 'pre-commit must not reference the retired workflow script')
// 三个旁路变量都要点名：上游 `h` 包装脚本认 HUSKY / VP_GIT_HOOKS / VITE_GIT_HOOKS 三个，
// pre-commit 自己若出现任何一个，就等于门禁自带后门。
for (const bypass of ['--no-verify', 'HUSKY=0', 'VP_GIT_HOOKS=0', 'VITE_GIT_HOOKS=0'])
  assert.equal(preCommit.includes(bypass), false, `pre-commit must not include ${bypass}`)
assert.ok(fs.statSync(path.join(repoRoot, '.vite-hooks', 'pre-commit')).mode & 0o111, 'pre-commit must be executable')
// 可执行位是挂载条件，不是装饰：丢掉 +x，runChecks 会静默跳过这道唯一的无 task 保证。
assert.ok(
  fs.statSync(path.join(repoRoot, '.agents', 'checks', 'format-clean')).mode & 0o111,
  'the commit-boundary format gate must stay executable'
)

const git = (...args) => execFileSync('git', ['-C', fixture, ...args], { encoding: 'utf8' }).trim()
const run = (...args) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...taskEnv },
    encoding: 'utf8'
  })
const runFailure = (...args) =>
  assert.throws(
    () =>
      execFileSync(process.execPath, [script, ...args], {
        cwd: repoRoot,
        env: { ...process.env, ...taskEnv },
        encoding: 'utf8',
        stdio: 'pipe'
      }),
    /task failed/
  )
// status 的 issue 缺失提示走 stderr，JSON 走 stdout；需要同时捕获两者。
const spawn = (...args) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...taskEnv },
    encoding: 'utf8'
  })
// 只断言「失败」不足以证明拦对了原因；这里取回合并输出，逐条核对具体条款。
const failMessage = (...args) => {
  const result = spawn(...args)
  assert.notEqual(result.status, 0, `expected a failure: task ${args.join(' ')}`)
  return `${result.stdout}\n${result.stderr}`
}

try {
  git('init', '-b', 'main')
  git('config', 'user.name', 'Test')
  git('config', 'user.email', 'test@example.com')
  // 显式钉住重命名检测：`status.renames=false` 的全局配置会把下面那条 rename 用例的 staged 重命名
  // 渲染成一行删除加一行新增，届时旧路径本来就该出现在清单里，断言会因使用者的 git 配置而红。
  git('config', 'status.renames', 'true')
  fs.writeFileSync(path.join(fixture, 'README.md'), '# fixture\n')
  git('add', 'README.md')
  git('commit', '-m', 'fixture')

  // 无 active task 的 worktree：guard 放行但不静默——stderr 必须交代它没门禁，
  // 并给出建 task 的命令，否则「没有 task」和「忘了 task」在用户眼里长得一样。
  const untrackedGuard = spawn('guard')
  assert.equal(untrackedGuard.status, 0)
  assert.equal(JSON.parse(untrackedGuard.stdout).enforced, false)
  assert.match(untrackedGuard.stderr, /not enforced/)
  assert.match(untrackedGuard.stderr, /pnpm agent:task new/)

  // 脏 worktree 不得建 T0/T1 task：快照基线必须干净，freeze 的 `git add -A` 会扫进一切。
  fs.writeFileSync(path.join(fixture, 'preexisting.txt'), 'must not be absorbed\n')
  runFailure('new', '--task', 'dirty-init', '--level', 't1')

  // T2 豁免这条：它不 freeze，提交内容就是当时的 index，本没有隔离可破坏。这一档的用途是给
  // 快速改动留一条带署名的路径，前提不该是先把工作区收拾干净——所以 new 和 start 都要放行。
  const dirtyT2 = JSON.parse(run('new', '--task', 't2-dirty-init', '--level', 't2'))
  assert.equal(dirtyT2.phase, 'open')
  assert.equal(JSON.parse(run('start', '--task', 't2-dirty-init')).phase, 'active')
  run('drop', '--task', 't2-dirty-init', '--reason', 't2 dirty worktree exemption covered', '--by', 'fixture-sweeper-1')
  fs.rmSync(path.join(fixture, 'preexisting.txt'))

  // 清单里必须是「将被提交的那个名字」。staged 重命名在 porcelain 里渲染成 `old -> new`，只按
  // 固定偏移取整段就会把旧路径当成未提交改动报出去——使用者会去翻一个根本没动过的文件。
  git('mv', 'README.md', 'FIXTURE-NOTE.md')
  const renameFailure = failMessage('new', '--task', 'rename-init', '--level', 't1')
  assert.match(renameFailure, /FIXTURE-NOTE\.md/)
  assert.doesNotMatch(renameFailure, /README\.md/)
  git('mv', 'FIXTURE-NOTE.md', 'README.md')

  // 级别词汇校验。
  runFailure('new', '--task', 'bad-level', '--level', 't3')
  runFailure('new', '--task', 'bad id', '--level', 't1')

  // owner 也是一次身份申报，不是自由文本：它与 reviewer/approver/署名人落在同一形状里，四条
  // 事件记录才可比对，放任 `ab` 或 `bad id!` 当 owner 会让记录失去意义。
  // 只校验显式给出的 --owner；登录名兜底不该让短用户名的人建不了 task。
  for (const bad of ['ab', 'bad id!'])
    assert.match(failMessage('new', '--task', 'owner-shape', '--level', 't2', '--owner', bad), /invalid owner id/)
  // 漏值同样要拒：parseArgs 把裸 `--owner` 记成布尔 true，而 RegExp.test(true) 会先转成合法的
  // "true"，于是一个身份能以两种字形躲过「≠」比对。
  assert.match(
    failMessage('new', '--task', 'owner-shape', '--level', 't2', '--owner'),
    /invalid owner id: true; expected a string/
  )
  const ownerShape = JSON.parse(run('new', '--task', 'owner-shape', '--level', 't2', '--owner', 'owner-42'))
  assert.equal(ownerShape.owner, 'owner-42')
  assert.match(failMessage('assign', '--task', 'owner-shape', '--owner', 'nope!'), /invalid owner id/)
  assert.equal(JSON.parse(run('assign', '--task', 'owner-shape', '--owner', 'owner-43')).owner, 'owner-43')
  run('drop', '--task', 'owner-shape', '--reason', 'owner id shape covered', '--by', 'fixture-sweeper-1')

  // T0 全流程：new → assign → start → freeze → re-freeze → review → approve → commit → verify → done。
  const created = JSON.parse(
    run('new', '--task', 't0-fixture', '--level', 't0', '--issue', 'N/A', '--owner', 'fixture-owner')
  )
  assert.equal(created.phase, 'open')
  assert.equal(created.level, 't0')
  assert.equal(created.review.required, true)
  assert.equal(created.baseSha, git('rev-parse', 'HEAD'))
  assert.equal(Object.hasOwn(created, 'roles'), false)
  assert.ok(created.events.some(event => event.event === 'new'))

  // `--` 只终止选项解析：其后的内容既不是选项也不是位置参数，不改变任何行为。
  assert.equal(JSON.parse(run('status', '--task', 't0-fixture', '--', 'run', 'pnpm', 'test')).taskId, 't0-fixture')
  // 尤其是尾随的 --task 不能被回读成选项——漏掉前面的 --task 仍然要报错。
  assert.match(failMessage('status', '--', '--task', 't0-fixture'), /missing required option --task/)

  // assign 只改 owner/worktree；角色与执行体编排不进入 task state。
  const assigned = JSON.parse(run('assign', '--task', 't0-fixture', '--owner', 'fixture-owner'))
  assert.equal(assigned.owner, 'fixture-owner')
  assert.ok(assigned.events.some(event => event.event === 'assign'))
  assert.equal(Object.hasOwn(assigned.events.at(-1), 'roles'), false)

  // 已删除的 --roles 必须明确失败，不能假装编排成功。
  for (const roles of [['--roles', 'manager'], ['--roles=manager']])
    assert.match(failMessage('assign', '--task', 't0-fixture', ...roles), /assign does not accept --roles/)

  // 旧 v1 state 的顶层 roles 和历史事件仍可读取，但内核不解释、校验或重写它们。
  const statePath = path.join(stateDir, 't0-fixture.json')
  const legacyState = JSON.parse(fs.readFileSync(statePath, 'utf8'))
  legacyState.roles = ['retired-legacy-role']
  legacyState.events.push({ at: '2026-09-19T00:00:00.000Z', event: 'assign', roles: ['retired-legacy-role'] })
  fs.writeFileSync(statePath, `${JSON.stringify(legacyState, null, 2)}\n`)
  const legacyRead = JSON.parse(run('status', '--task', 't0-fixture'))
  assert.deepEqual(legacyRead.roles, ['retired-legacy-role'])
  assert.deepEqual(legacyRead.events.find(event => event.event === 'assign' && event.roles)?.roles, [
    'retired-legacy-role'
  ])
  const legacyReassigned = JSON.parse(run('assign', '--task', 't0-fixture', '--owner', 'fixture-owner'))
  assert.deepEqual(legacyReassigned.roles, ['retired-legacy-role'])
  assert.equal(Object.hasOwn(legacyReassigned.events.at(-1), 'roles'), false)

  // 同一 worktree 不允许第二个 active task。
  runFailure('new', '--task', 'duplicate', '--level', 't1', '--worktree', fixture)

  // open → active 也要求干净：freeze 的 `git add -A` 会扫进整个 worktree，起点残留必须
  // 挡在实施之前（new 之后仍可能有人往这个 worktree 里放文件）。
  fs.writeFileSync(path.join(fixture, 'stray.txt'), 'not mine\n')
  assert.match(failMessage('start', '--task', 't0-fixture'), /cannot start with uncommitted changes/)
  fs.rmSync(path.join(fixture, 'stray.txt'))

  const started = JSON.parse(run('start', '--task', 't0-fixture'))
  assert.equal(started.phase, 'active')
  // 已 active 后再次 start 是幂等留痕，不再重复干净校验。
  fs.writeFileSync(path.join(fixture, 'wip.txt'), 'work in progress\n')
  assert.equal(JSON.parse(run('start', '--task', 't0-fixture')).phase, 'active')
  fs.rmSync(path.join(fixture, 'wip.txt'))

  fs.mkdirSync(path.join(fixture, 'src'))
  fs.writeFileSync(path.join(fixture, 'src', 'change.ts'), 'export const value = 1\n')
  const frozen = JSON.parse(run('freeze', '--task', 't0-fixture'))
  assert.equal(frozen.phase, 'frozen')
  assert.ok(frozen.diffHash)
  // freeze 全量 staging：untracked 文件进入 staged 并出现在相对 baseSha 的 diff 中。
  assert.deepEqual(frozen.live.current.untrackedFiles, [])
  assert.ok(frozen.live.current.trackedFiles.includes('src/change.ts'))
  assert.match(git('status', '--porcelain'), /^A  src\/change\.ts/m)
  // fixture 无 package.json：归一化跳过但必须留痕（normalized: false）。
  assert.ok(frozen.events.some(event => event.event === 'freeze' && event.normalized === false))

  // 声明了 fix-code 但依赖未安装：freeze 必须失败并指引安装，不允许静默跳过归一化。
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ scripts: { 'fix-code': 'true' } }))
  fs.appendFileSync(path.join(fixture, 'src', 'change.ts'), '// pending edit\n')
  assert.throws(
    () =>
      execFileSync(process.execPath, [script, 'freeze', '--task', 't0-fixture'], {
        cwd: repoRoot,
        env: { ...process.env, ...taskEnv },
        encoding: 'utf8',
        stdio: 'pipe'
      }),
    /pnpm install && pnpm run build/
  )
  fs.rmSync(path.join(fixture, 'package.json'))
  fs.writeFileSync(path.join(fixture, 'src', 'change.ts'), 'export const value = 1\n// refined after freeze\n')

  // 冻结后继续编辑：旧证据 stale，必须能对当前 diff 重新冻结。
  fs.appendFileSync(path.join(fixture, 'src', 'change.ts'), '// refined after freeze\n')
  const refrozen = JSON.parse(run('freeze', '--task', 't0-fixture'))
  assert.equal(refrozen.phase, 'frozen')
  assert.notEqual(refrozen.diffHash, frozen.diffHash)
  assert.ok(refrozen.events.some(event => event.event === 'freeze' && event.reFreeze))

  // review 身份是机器约束，不是约定：形状不合法的 id 都要给出具体条款。「reviewer 不得是
  // owner」不再是内核约束——单 agent 工作流要求 owner 自己 approve，那条校验会让三个槽位凑不齐；
  // 实施会话不得自审因此改由 workflow.md「review 拓扑」的文档规则承担。
  assert.match(
    failMessage('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'bad id!'),
    /invalid reviewer id/
  )
  assert.match(
    failMessage('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'ab'),
    /invalid reviewer id/
  )
  assert.match(failMessage('review', '--task', 't0-fixture', '--result', 'pass'), /review requires --reviewer/)
  // 漏值的 flag 在 parseArgs 里是布尔 true，而 RegExp.test(true) 会先转成字符串 "true"——四个
  // 字符、形状合法。不挡类型，同一个身份就能以 true 与 'true' 两种字形骗过「≠ reviewer」。
  assert.match(
    failMessage('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer'),
    /invalid reviewer id: true; expected a string/
  )
  // 形状合法就照记：owner 的 id、乃至历史 owner 的 id 都不再被拒。这条断言钉的是删除而不是
  // 放行——把它改回 owner 自审时，红的是这里而不是某个 review 结果。
  run('assign', '--task', 't0-fixture', '--owner', 'handoff-owner-2')
  const ownerIdReviewed = JSON.parse(
    run('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'handoff-owner-2')
  )
  assert.equal(ownerIdReviewed.review.reviewer, 'handoff-owner-2')
  run('freeze', '--task', 't0-fixture')
  // review fail：回到 active 修复，修复后重新 freeze。
  const failedReview = JSON.parse(
    run('review', '--task', 't0-fixture', '--result', 'fail', '--reviewer', 'independent-reviewer-1')
  )
  assert.equal(failedReview.phase, 'active')
  const refrozenAfterFail = JSON.parse(run('freeze', '--task', 't0-fixture'))
  assert.equal(refrozenAfterFail.phase, 'frozen')

  // 未 approve 前提交被 guard 拦截（guard 在 pre-commit 之外也可独立调用）。
  assert.match(failMessage('guard', '--task', 't0-fixture'), /in phase frozen; expected approved/)

  const approved = JSON.parse(
    run('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'independent-reviewer-1')
  )
  assert.equal(approved.phase, 'reviewed')

  // approval 与 review 用同一套 id 形状，且 approver ≠ 本轮 reviewer：reviewer 批自己刚审过的
  // diff 不构成独立授权，这条比对必须留着。owner 批自己的活则不再被拒——单 agent 工作流的最小
  // 身份组合就是 owner 实施 + subagent review + owner approve，去掉 owner 身份限制后三个槽位
  // 才凑得齐；当前 owner 正是 handoff-owner-2，所以这条断言直接钉住那处删除。
  assert.match(failMessage('approve', '--task', 't0-fixture'), /approval requires --approver/)
  assert.match(
    failMessage('approve', '--task', 't0-fixture', '--approver', 'independent-reviewer-1'),
    /approver must be different from the reviewer/
  )
  assert.match(failMessage('approve', '--task', 't0-fixture', '--approver', 'x'), /invalid approver id/)
  // 类型守卫要在每个身份入口都单独钉一次：approve 与 review 共用 assertAgentId，只测 review
  // 一侧的话，把守卫挪进 review 分支、approve 退回原样，测试仍是绿的。
  assert.match(
    failMessage('approve', '--task', 't0-fixture', '--approver'),
    /invalid approver id: true; expected a string/
  )
  const approvedState = JSON.parse(run('approve', '--task', 't0-fixture', '--approver', 'handoff-owner-2'))
  assert.equal(approvedState.phase, 'approved')
  assert.equal(approvedState.approval.approver, 'handoff-owner-2')
  assert.ok(approvedState.events.some(event => event.event === 'approve'))

  // verify 只记录证据、不执行任何东西，所以结果必须由使用者显式给出：省略 --result
  // 不能等于让内核替人宣布通过。
  assert.match(
    failMessage('verify', '--task', 't0-fixture', '--name', 'fixture test'),
    /missing required option --result/
  )
  assert.match(
    failMessage('verify', '--task', 't0-fixture', '--name', 'fixture test', '--result', 'maybe'),
    /invalid verification result: maybe/
  )
  // 显式 pass 也不够：验证必须覆盖已提交内容，脏工作区照样拦。
  assert.match(
    failMessage('verify', '--task', 't0-fixture', '--name', 'fixture test', '--result', 'pass'),
    /uncommitted changes; verification must cover a committed diff/
  )
  git('commit', '-m', 't0 change')
  const committedGuard = JSON.parse(run('guard', '--task', 't0-fixture'))
  assert.equal(committedGuard.enforced, true)
  // commit 后内容未变：hash 跨 commit 边界保持一致，guard 仍放行并回报跑过的检查清单。
  assert.equal(committedGuard.live.stale, false)
  assert.deepEqual(committedGuard.checks, [])
  const verified = JSON.parse(run('verify', '--task', 't0-fixture', '--name', 'fixture test', '--result', 'pass'))
  assert.equal(verified.verification.at(-1).result, 'pass')
  assert.equal(verified.verification.at(-1).headSha, git('rev-parse', 'HEAD'))

  // 验证后再次编辑：done 被拦截，重新 freeze → review → approve → commit → verify → done。
  fs.writeFileSync(path.join(fixture, 'src', 'change.ts'), 'export const value = 2\n')
  assert.match(failMessage('done', '--task', 't0-fixture'), /is stale for task t0-fixture/)
  run('freeze', '--task', 't0-fixture')
  run('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'independent-reviewer-1')
  run('approve', '--task', 't0-fixture', '--approver', 'user-approver')
  git('commit', '-am', 't0 change v2')
  run('verify', '--task', 't0-fixture', '--name', 'fixture test v2', '--result', 'pass')
  // done 只看最后一条验证：一次失败的复跑会顶掉之前的 pass 记录。
  run('verify', '--task', 't0-fixture', '--name', 'fixture test v2 rerun', '--result', 'fail')
  assert.match(failMessage('done', '--task', 't0-fixture'), /does not have a passing latest verification/)
  run('verify', '--task', 't0-fixture', '--name', 'fixture test v2', '--result', 'pass')
  const finished = JSON.parse(run('done', '--task', 't0-fixture'))
  assert.equal(finished.phase, 'done')
  assert.ok(finished.events.some(event => event.event === 'done'))

  // task 完结后 worktree 释放，guard 回到 enforced:false。
  assert.equal(JSON.parse(spawn('guard').stdout).enforced, false)

  // T0 的 review 与 approval 仍双双强制，所以「缺 review」不是一条能走通的捷径：没有 review 就
  // 走不到 reviewed，approve 随之被挡；guard 与 done 则各自要求 approved。三个断言缺任何一处，
  // T0 都会退化成 T1 那条免审路径。
  run('new', '--task', 't0-no-review', '--level', 't0', '--owner', 't0-owner')
  run('start', '--task', 't0-no-review')
  fs.writeFileSync(path.join(fixture, 't0-no-review.txt'), 't0 needs review\n')
  run('freeze', '--task', 't0-no-review')
  assert.match(
    failMessage('approve', '--task', 't0-no-review', '--approver', 't0-owner'),
    /in phase frozen; expected reviewed/
  )
  assert.match(failMessage('guard', '--task', 't0-no-review'), /in phase frozen; expected approved/)
  assert.match(failMessage('done', '--task', 't0-no-review'), /in phase frozen; expected approved/)
  run('drop', '--task', 't0-no-review', '--reason', 't0 review gate covered', '--by', 'fixture-sweeper-1')
  git('add', '-A')
  git('commit', '-m', 't0 review gate covered')

  // T1 的 review 可选，两条路径各走一遍。记了 review 的这条：subagent 风格的 reviewer id 照记，
  // approval 与 review 成对（由 owner coder-1 自己批，这正是单 agent 工作流的最小身份组合），
  // 所以缺 approve 时 guard 与 done 都要拦。
  const t1Created = JSON.parse(run('new', '--task', 't1-fixture', '--level', 't1', '--owner', 'coder-1'))
  assert.equal(t1Created.review.required, false)
  run('start', '--task', 't1-fixture')
  fs.writeFileSync(path.join(fixture, 't1.txt'), 't1\n')
  run('freeze', '--task', 't1-fixture')
  const t1Reviewed = JSON.parse(
    run('review', '--task', 't1-fixture', '--result', 'pass', '--reviewer', 'subagent-review-1')
  )
  assert.equal(t1Reviewed.review.reviewer, 'subagent-review-1')
  assert.match(failMessage('guard', '--task', 't1-fixture'), /in phase reviewed; expected approved/)
  assert.match(failMessage('done', '--task', 't1-fixture'), /in phase reviewed; expected approved/)
  run('approve', '--task', 't1-fixture', '--approver', 'coder-1')
  git('commit', '-m', 't1 change')
  run('verify', '--task', 't1-fixture', '--name', 't1 test', '--result', 'pass')
  // 未验证不得 done：done 只认 state 里的证据，不接受口头保证。
  fs.writeFileSync(path.join(fixture, 't1.txt'), 't1 again\n')
  run('freeze', '--task', 't1-fixture')
  run('review', '--task', 't1-fixture', '--result', 'pass', '--reviewer', 'subagent-review-1')
  run('approve', '--task', 't1-fixture', '--approver', 'user-approver')
  git('commit', '-am', 't1 change v2')
  assert.match(
    failMessage('done', '--task', 't1-fixture'),
    /does not have a passing latest verification|changed after verification/
  )
  run('verify', '--task', 't1-fixture', '--name', 't1 test v2', '--result', 'pass')
  const t1Done = JSON.parse(run('done', '--task', 't1-fixture'))
  assert.equal(t1Done.phase, 'done')

  // T1 没记 review 的那条：approval 与 review 成对，所以 approval 也不产生，路径收窄成
  // freeze → verify → done，guard 只要求冻结快照一致。专属 worktree 与 ≥1 条 pass 验证一项不减。
  run('new', '--task', 't1-no-review', '--level', 't1', '--owner', 'single-agent-owner')
  run('start', '--task', 't1-no-review')
  fs.writeFileSync(path.join(fixture, 't1-no-review.txt'), 'no review needed\n')
  // 未 freeze 就到不了提交与收尾：这一档的 commit gate 与 done 都要求 frozen 相位，那是规则表
  // 「T1 freeze 必须」在机器上唯一剩下的落点（专属 worktree 由 new/start 的干净检查守着，验证由
  // done 的 pass 记录把着，都不由这两行负责）。记了 review 的 T1 走不到这条分支——review 一旦记录，
  // pass 或 fail 都让 approvalRequired 为真、改走要求 approved 的那条，所以只覆盖无 review 路径
  // 就是这个分支的完整覆盖，而不是少测了另一种 T1。
  assert.match(failMessage('guard', '--task', 't1-no-review'), /in phase active; expected frozen/)
  assert.match(failMessage('done', '--task', 't1-no-review'), /in phase active; expected frozen/)
  run('freeze', '--task', 't1-no-review')
  // 验证仍是硬 gate：快照齐了、也没有 review 挡着，没有 pass 记录照样不许收尾。
  assert.match(failMessage('done', '--task', 't1-no-review'), /does not have a passing latest verification/)
  // 快照一致是这条路径唯一的 diff 边界：冻结后动一个字节，guard 当场拦下。
  fs.appendFileSync(path.join(fixture, 't1-no-review.txt'), 'edited after freeze\n')
  assert.match(failMessage('guard', '--task', 't1-no-review'), /has changes after its last freeze/)
  run('freeze', '--task', 't1-no-review')
  const noReviewGuard = JSON.parse(run('guard', '--task', 't1-no-review'))
  assert.equal(noReviewGuard.enforced, true)
  assert.equal(noReviewGuard.live.stale, false)
  git('commit', '-m', 't1 change without review')
  run('verify', '--task', 't1-no-review', '--name', 't1 no-review test', '--result', 'pass')
  // hash 一致这条校验横跨 commit 边界继续生效：提交之后再动一个字节，done 照样被拦。
  fs.appendFileSync(path.join(fixture, 't1-no-review.txt'), 'edited after commit\n')
  assert.match(failMessage('done', '--task', 't1-no-review'), /is stale for task t1-no-review/)
  run('freeze', '--task', 't1-no-review')
  git('commit', '-am', 't1 change without review v2')
  run('verify', '--task', 't1-no-review', '--name', 't1 no-review test v2', '--result', 'pass')
  const noReviewDone = JSON.parse(run('done', '--task', 't1-no-review'))
  assert.equal(noReviewDone.phase, 'done')
  assert.equal(noReviewDone.review.result, null)
  assert.equal(noReviewDone.approval.granted, false)

  // T2 快速通道：start 后即可提交，无需 freeze/review/approve/verify。
  const t2Created = JSON.parse(run('new', '--task', 't2-fixture', '--level', 't2'))
  assert.equal(t2Created.review.required, false)
  run('start', '--task', 't2-fixture')
  fs.writeFileSync(path.join(fixture, 't2.txt'), 't2\n')
  const t2Guard = JSON.parse(run('guard', '--task', 't2-fixture'))
  assert.equal(t2Guard.enforced, true)
  assert.deepEqual(t2Guard.checks, [])
  // T2 不进入证据链：review/approve 直接被级别 gate 挡回。
  assert.match(
    failMessage('review', '--task', 't2-fixture', '--result', 'pass', '--reviewer', 'independent-reviewer-1'),
    /level t2; review is not part of its path/
  )
  assert.match(
    failMessage('approve', '--task', 't2-fixture', '--approver', 'user-approver'),
    /level t2; approval is not part of its path/
  )
  git('add', 't2.txt')
  git('commit', '-m', 't2 change')
  const t2Done = JSON.parse(run('done', '--task', 't2-fixture'))
  assert.equal(t2Done.phase, 'done')

  // 空冻结被拒绝，--allow-empty 仅用于有意为空的 task。
  run('new', '--task', 'empty-fixture', '--level', 't2')
  run('start', '--task', 'empty-fixture')
  assert.match(failMessage('freeze', '--task', 'empty-fixture'), /has no changes to freeze/)
  const emptyAllowed = JSON.parse(run('freeze', '--task', 'empty-fixture', '--allow-empty'))
  assert.equal(emptyAllowed.phase, 'frozen')

  // drop：reason 要写清楚、署名人要是可比对 id，因为它是不可逆终态——重新 freeze 也能推翻已
  // 冻结的证据，但之后还能走完整流程，dropped 之后必须另建 task。
  assert.match(
    failMessage('drop', '--task', 'empty-fixture', '--reason', 'superseded by t0-fixture'),
    /missing required option --by/
  )
  assert.match(
    failMessage('drop', '--task', 'empty-fixture', '--reason', 'why', '--by', 'fixture-sweeper-1'),
    /at least 10 non-space characters/
  )
  assert.match(
    failMessage('drop', '--task', 'empty-fixture', '--reason', 'superseded by t0-fixture', '--by', 'x'),
    /invalid drop author id/
  )
  const dropped = JSON.parse(
    run('drop', '--task', 'empty-fixture', '--reason', 'superseded by t0-fixture', '--by', 'fixture-sweeper-1')
  )
  assert.equal(dropped.phase, 'dropped')
  assert.ok(
    dropped.events.some(
      event => event.event === 'drop' && event.reason === 'superseded by t0-fixture' && event.by === 'fixture-sweeper-1'
    )
  )
  assert.equal(JSON.parse(spawn('guard').stdout).enforced, false)
  runFailure('drop', '--task', 'empty-fixture', '--reason', 'already dropped it here', '--by', 'fixture-sweeper-1')

  // 门槛的先后顺序也是契约：先解析 task、再核相位，最后才挑剔 reason/by。两个非法参数与一个
  // 不存在的 id 同时出现时报的必须是 id——否则「reason 太短」会把人引向完全无关的方向。
  assert.match(
    failMessage('drop', '--task', 'never-created', '--reason', 'short', '--by', 'x'),
    /task is not initialized: never-created/
  )
  assert.match(
    failMessage('drop', '--task', 'empty-fixture', '--reason', 'short', '--by', 'x'),
    /in phase dropped; expected open or active or frozen or reviewed or approved/
  )

  // 政策检查挂在两个边界上：T2 通常不 freeze，只挂 freeze 的检查对它形同不存在。
  run('new', '--task', 't2-checks-fixture', '--level', 't2')
  run('start', '--task', 't2-checks-fixture')
  fs.mkdirSync(path.join(fixture, '.agents', 'checks'), { recursive: true })
  const policyCheck = path.join(fixture, '.agents', 'checks', 'policy-check.sh')
  const writePolicyCheck = body => {
    fs.writeFileSync(policyCheck, body)
    fs.chmodSync(policyCheck, 0o755)
  }
  writePolicyCheck('#!/bin/sh\necho policy violated >&2\nexit 1\n')
  fs.writeFileSync(path.join(fixture, 't2-checks.txt'), 't2 checks\n')
  assert.match(failMessage('guard', '--task', 't2-checks-fixture'), /check policy-check\.sh failed; commit aborted/)
  writePolicyCheck('#!/bin/sh\nexit 0\n')
  // 可执行位是挂载条件：没有 +x 的文件不参与政策检查，所以不能指望它兜底。
  fs.writeFileSync(path.join(fixture, '.agents', 'checks', 'not-executable.sh'), '#!/bin/sh\nexit 1\n')
  assert.deepEqual(JSON.parse(run('guard', '--task', 't2-checks-fixture')).checks, ['policy-check.sh'])
  git('add', '-A')
  git('commit', '-m', 't2 policy checks')
  assert.equal(JSON.parse(run('done', '--task', 't2-checks-fixture')).phase, 'done')

  // freeze 侧：检查失败即中止快照，成功后检查清单进事件。
  run('new', '--task', 'checks-fixture', '--level', 't1')
  run('start', '--task', 'checks-fixture')
  writePolicyCheck('#!/bin/sh\necho policy violated >&2\nexit 1\n')
  fs.writeFileSync(path.join(fixture, 'checks.txt'), 'checks\n')
  assert.match(failMessage('freeze', '--task', 'checks-fixture'), /check policy-check\.sh failed; freeze aborted/)
  writePolicyCheck('#!/bin/sh\nexit 0\n')
  const frozenWithChecks = JSON.parse(run('freeze', '--task', 'checks-fixture'))
  assert.ok(frozenWithChecks.events.at(-1).checks.includes('policy-check.sh'))
  run('drop', '--task', 'checks-fixture', '--reason', 'checks covered', '--by', 'fixture-sweeper-1')
  git('add', '-A')
  git('commit', '-m', 'freeze policy checks covered')

  // guard 侧的 T0/T1 路径：检查挂在放行出口，证据链齐备也躲不过，否则「无豁免」只覆盖了
  // T2 之外的一半。检查内容一变快照就 stale，所以让它按工作区外的标记文件决定成败。
  const policyMarker = path.join(os.tmpdir(), `greypan-policy-blocked-${process.pid}`)
  fs.rmSync(policyMarker, { force: true })
  writePolicyCheck(`#!/bin/sh\nif [ -e '${policyMarker}' ]; then echo policy violated >&2; exit 1; fi\nexit 0\n`)
  git('add', '-A')
  git('commit', '-m', 'marker-driven commit-boundary check')
  run('new', '--task', 't1-commit-checks-fixture', '--level', 't1', '--owner', 'coder-2')
  run('start', '--task', 't1-commit-checks-fixture')
  fs.writeFileSync(path.join(fixture, 't1-commit-checks.txt'), 'guarded at the commit boundary\n')
  run('freeze', '--task', 't1-commit-checks-fixture')
  run('review', '--task', 't1-commit-checks-fixture', '--result', 'pass', '--reviewer', 'subagent-review-2')
  run('approve', '--task', 't1-commit-checks-fixture', '--approver', 'user-approver')
  fs.writeFileSync(policyMarker, '')
  assert.match(
    failMessage('guard', '--task', 't1-commit-checks-fixture'),
    /check policy-check\.sh failed; commit aborted/
  )
  fs.rmSync(policyMarker, { force: true })
  const t1CommittedGuard = JSON.parse(run('guard', '--task', 't1-commit-checks-fixture'))
  assert.deepEqual(t1CommittedGuard.checks, ['policy-check.sh'])
  git('commit', '-m', 't1 commit-boundary checks')
  run('verify', '--task', 't1-commit-checks-fixture', '--name', 't1 commit-boundary checks', '--result', 'pass')
  assert.equal(JSON.parse(run('done', '--task', 't1-commit-checks-fixture')).phase, 'done')

  // changeset 政策：存在性不够，还得起码是一份能被 changesets 解析、按需写出正文的声明。
  const changesetCheck = path.join(fixture, '.agents', 'checks', 'changeset-required')
  fs.copyFileSync(path.join(repoRoot, '.agents', 'checks', 'changeset-required'), changesetCheck)
  fs.chmodSync(changesetCheck, 0o755)
  git('add', '-A')
  git('commit', '-m', 'install changeset policy check')
  run('new', '--task', 'no-changeset-fixture', '--level', 't2')
  run('start', '--task', 'no-changeset-fixture')
  fs.writeFileSync(path.join(fixture, 'note.txt'), 'no changeset here\n')
  assert.match(failMessage('guard', '--task', 'no-changeset-fixture'), /changeset missing: no staged \.changeset/)
  run('drop', '--task', 'no-changeset-fixture', '--reason', 'missing changeset covered', '--by', 'fixture-sweeper-1')
  git('add', '-A')
  git('commit', '-m', 'note without changeset')
  run('new', '--task', 'changeset-fixture', '--level', 't2')
  run('start', '--task', 'changeset-fixture')
  fs.mkdirSync(path.join(fixture, '.changeset'), { recursive: true })
  // commit.md 允许纯 docs/chore 用只含两行 --- 的空壳声明「无版本影响」，检查必须放行。
  fs.writeFileSync(path.join(fixture, '.changeset', 'docs-only.md'), '---\n---\n')
  // 但留在盘上没 add 的 changeset 不算数：guard 放行的那次提交内容就是 index，changeset
  // 不进 index 等于这个 PR 不带 changeset，正是本检查要拦的形态。
  assert.match(failMessage('guard', '--task', 'changeset-fixture'), /changeset missing: no staged \.changeset/)
  git('add', '--', '.changeset/docs-only.md')
  assert.equal(JSON.parse(run('guard', '--task', 'changeset-fixture')).enforced, true)
  // 声明了包却不写正文：版本 PR 会往公共包的 CHANGELOG 里塞一条空描述。空格与非 ASCII 文件名
  // 各占一条：前者钉住 `for file in $files` 的切词，后者钉住 core.quotePath 的转义（转义后的
  // "\344\275\240.md" 匹配不上路径规则，畸形文件会静默漏检）。缩进、引号包住的值、行尾注释各占
  // 一条：changesets 的 frontmatter 是 YAML，这三种写法都照样解析出 bump，只认 `key: patch` 行尾
  // 字面形态的话，声明就会躲过正文要求。
  const noSummary = "---\n'@greypan/js-kit': patch\n---\n"
  for (const [name, body] of [
    ['pkg.md', noSummary],
    ['has space.md', noSummary],
    ['归属.md', noSummary],
    ['indented.md', "---\n  '@greypan/js-kit': patch\n---\n"],
    ['quoted.md', '---\n\'@greypan/js-kit\': "patch"\n---\n'],
    ['commented.md', "---\n'@greypan/js-kit': patch # bump for the demo fix\n---\n"]
  ]) {
    const file = path.join(fixture, '.changeset', name)
    fs.writeFileSync(file, body)
    git('add', '--', path.join('.changeset', name))
    assert.match(
      failMessage('guard', '--task', 'changeset-fixture'),
      // 连单位一起核对：pkg 数的是命中版本声明的行数而不是包数，报错把它换算成 bump 个数就是假话。
      new RegExp(`changeset has no summary: \\.changeset/${name} declares a package bump on 1 line`)
    )
    fs.rmSync(file)
    git('add', '-A')
  }
  fs.writeFileSync(
    path.join(fixture, '.changeset', 'pkg.md'),
    "---\n'@greypan/js-kit': patch\n---\n\nSay what changed.\n"
  )
  git('add', '--', '.changeset/pkg.md')
  assert.equal(JSON.parse(run('guard', '--task', 'changeset-fixture')).enforced, true)
  // 内容也必须取自 index，不能回落到工作区的同名文件：两个边界核实的都是「将被留下的那份
  // 声明」。正反各一例，少一侧的实现都能让另一侧变绿：index 无正文而工作区补好了（改了没 add）
  // 必须拦住，否则这次提交带的就是那条空描述；index 合法而工作区已删必须放行，否则一次
  // `rm` 就把合规提交拦成「读不到文件」。
  fs.writeFileSync(path.join(fixture, '.changeset', 'blob.md'), noSummary)
  git('add', '--', '.changeset/blob.md')
  fs.writeFileSync(path.join(fixture, '.changeset', 'blob.md'), `${noSummary}\nWritten after staging, never staged.\n`)
  assert.match(
    failMessage('guard', '--task', 'changeset-fixture'),
    /changeset has no summary: \.changeset\/blob\.md declares a package bump on 1 line/
  )
  git('add', '--', '.changeset/blob.md')
  assert.equal(JSON.parse(run('guard', '--task', 'changeset-fixture')).enforced, true)
  fs.rmSync(path.join(fixture, '.changeset', 'blob.md'))
  assert.equal(JSON.parse(run('guard', '--task', 'changeset-fixture')).enforced, true)
  git('add', '-A')
  // 不以成对 `---` 开头的文件不会被 changesets 解析，不能顶数。三条判据各钉一个分支：分隔线不足
  // 两处（changesets 直接 throw），以及分隔线之前还有散落内容——后者是仓库刻意比解析器更严：
  // changesets 的正则非锚定，setext 标题那种文件它照样读出 frontmatter，但一份正文前面压着别的
  // 东西的声明不是给读者看的。断言必须带上各自的尾巴：两条 malformed 消息共享前缀，只比前缀的话
  // 删掉 `fence < 2` 那条判据，prose 会以「content before its first --- line」继续被拦、测试全绿，
  // 而漏检已经发生。真正只有该分支拦得住的形状是单条分隔线（pre=0，判据缺失时会被完整放行）。
  for (const [name, body, reason] of [
    ['prose.md', 'just prose, no delimiters\n', 'has no paired --- frontmatter block'],
    ['single-fence.md', '---\nSay what changed.\n', 'has no paired --- frontmatter block'],
    [
      'preamble.md',
      "Title\n---\n'@greypan/js-kit': patch\n---\nSay what changed.\n",
      'has content before its first --- line'
    ]
  ]) {
    const file = path.join(fixture, '.changeset', name)
    fs.writeFileSync(file, body)
    git('add', '--', path.join('.changeset', name))
    assert.match(
      failMessage('guard', '--task', 'changeset-fixture'),
      new RegExp(`changeset malformed: \\.changeset/${name} ${reason}`)
    )
    fs.rmSync(file)
    git('add', '-A')
  }
  // 只算 changesets 真正会读的文件：@changesets/read 取 .changeset 顶层与 pre/ 下的条目，再按
  // basename 排除点前缀与 README.md（不区分大小写）、AGENTS.md、CLAUDE.md、GEMINI.md。这些文件
  // 参与不了发布，滤在「有没有 changeset」这一步之前，否则改一行 .changeset/AGENTS.md 就能拿一
  // 个永远不会发布的东西过关。`nested/` 那一条钉住路径规则只放过 pre/：写成 `.*` 的话，子目录
  // 文件会被当成顶层文件读，报错里出现一个 changesets 根本不看的路径。
  fs.rmSync(path.join(fixture, '.changeset'), { recursive: true, force: true })
  git('add', '-A')
  for (const name of [
    'README.md',
    'readme.md',
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.ignored.md',
    'nested/inside.md',
    // 再嵌一层同名目录：pathspec 会把这种文件交进来，而它的路径里出现了两次 `.changeset/`。正则不
    // 锚定 `^` 就能从后一个 `.changeset/` 起算命中，于是一份 changesets 永远不会读的
    // `.changeset/.changeset/inside.md` 也能冒充「本 PR 带了声明」。
    '.changeset/inside.md'
  ]) {
    const file = path.join(fixture, '.changeset', name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, "---\n'@greypan/js-kit': patch\n---\n\nSay what changed.\n")
    git('add', '--', path.join('.changeset', name))
    assert.match(failMessage('guard', '--task', 'changeset-fixture'), /changeset missing: no staged \.changeset/)
    git('rm', '--cached', '--quiet', '--', path.join('.changeset', name))
    fs.rmSync(file)
  }
  git('add', '-A')
  // 小写的 agents/claude/gemini.md 反过来必须算数：@changesets/read 的忽略表里只有 README 带 /i，
  // 另外三个是大小写敏感的字符串比较，所以小写名会被真的读进发布流程。它们既得能满足「带没带
  // changeset」，也必须过内容核对——把大小写一起 `-i` 滤掉的话，一份只有一条分隔线的
  // `.changeset/claude.md` 就能借别的声明过关、自己躲开检查，然后让整批 changesets 读取 throw。
  for (const name of ['agents.md', 'claude.md', 'gemini.md']) {
    const file = path.join(fixture, '.changeset', name)
    fs.writeFileSync(file, "---\n'@greypan/js-kit': patch\n---\n\nSay what changed.\n")
    git('add', '--', path.join('.changeset', name))
    assert.equal(JSON.parse(run('guard', '--task', 'changeset-fixture')).enforced, true)
    fs.writeFileSync(file, '---\nSay what changed.\n')
    git('add', '--', path.join('.changeset', name))
    assert.match(
      failMessage('guard', '--task', 'changeset-fixture'),
      new RegExp(`changeset malformed: \\.changeset/${name} has no paired --- frontmatter block`)
    )
    git('rm', '--cached', '--quiet', '--', path.join('.changeset', name))
    fs.rmSync(file)
  }
  git('add', '-A')
  // pre/ 必须算数：它是 changesets 除顶层外唯一读的目录，不认就会把一份合法的预发布声明拦成
  // 「没带 changeset」。
  const preRelease = path.join('.changeset', 'pre', 'inside.md')
  fs.mkdirSync(path.join(fixture, '.changeset', 'pre'), { recursive: true })
  fs.writeFileSync(path.join(fixture, preRelease), "---\n'@greypan/js-kit': patch\n---\n\nSay what changed.\n")
  git('add', '--', preRelease)
  assert.equal(JSON.parse(run('guard', '--task', 'changeset-fixture')).enforced, true)
  git('rm', '--cached', '--quiet', '--', preRelease)
  fs.rmSync(path.join(fixture, preRelease))
  git('add', '-A')
  // base 解析不了时要报「跑不了」，不能报「没带 changeset」：前者说明历史被 rewrite 或被 GC，
  // 后者会把人支去补一份本来就存在的声明。内核总注入有效 base，所以这条只能直接执行脚本；对照组
  // 用真实 HEAD，证明新守卫不会把正常路径一起拦成同一条消息。
  const runCheckDirectly = base =>
    spawnSync('/bin/sh', [changesetCheck], {
      cwd: fixture,
      env: { ...process.env, AGENT_TASK_BASE_SHA: base },
      encoding: 'utf8'
    }).stderr
  assert.match(runCheckDirectly('0'.repeat(40)), /changeset check cannot run: base '0{40}' is not a commit/)
  assert.match(runCheckDirectly(git('rev-parse', 'HEAD')), /changeset missing: no staged \.changeset/)

  // base 落在合并提交上时（#214）：newTask 把 baseSha 钉在建 task 那一刻的 HEAD，先合并 main、
  // 后建 task 的次序就让本分支自己的 changeset 全落在 base 之前，上面那条只看 base 之后 index 的
  // 判据于是误报 missing。这两条用真实的两父合并提交把 fallback 的两个方向都钉住。
  // fixture 是裸 git 仓，没有 remote ref；fallback 以 `refs/remotes/origin/main` 为「main 侧」的
  // 锚点，所以先在分叉点立一个。用完删掉，免得后面的用例看见一个假的 main。
  git('update-ref', 'refs/remotes/origin/main', git('rev-parse', 'HEAD'))
  // main 自己带一份 changeset：反向用例要靠它证明「base 里躺着的那份是 main 自带的」，所以它必须
  // 真的在 main 的历史里，不能只存在于某个分支。
  fs.writeFileSync(path.join(fixture, '.changeset', 'main-side.md'), '---\n---\n')
  git('add', '-A')
  git('commit', '-m', 'main brings its own changeset')
  git('update-ref', 'refs/remotes/origin/main', git('rev-parse', 'HEAD'))
  // 正向：分支带自己的 changeset，base 是含它的合并提交 → 必须放行。先确认主判据单独看是空的，
  // 否则这条用例可能在 fallback 完全失效时也绿（那时改动 staged 就能过，测不到新判据）。
  git('checkout', '-q', '-b', 'carried-changeset-branch')
  fs.writeFileSync(path.join(fixture, '.changeset', 'carried.md'), '---\n---\n')
  git('add', '-A')
  git('commit', '-m', 'branch carries its own changeset')
  git('checkout', '-q', 'main')
  fs.writeFileSync(path.join(fixture, 'main-moved.txt'), 'main moved on\n')
  git('add', '-A')
  git('commit', '-m', 'main advances past the fork point')
  // main 被合并进来之前必须 fetch 过：fallback 用「base 的每个合并侧都已是 origin/main 的祖先」
  // 来判断 main 侧够不够新，origin/main 落后时它拒绝走 fallback（见下面 stale 那条）。
  git('update-ref', 'refs/remotes/origin/main', git('rev-parse', 'HEAD'))
  git('checkout', '-q', 'carried-changeset-branch')
  git('merge', '--no-edit', 'main')
  const carriedBase = git('rev-parse', 'HEAD')
  // 两父合并提交才是 #214 的真实形状；断言它确实是 merge，否则下面那条「主判据为空」可能是因为
  // 历史压根没分叉，测的就不是合并提交这条路径。
  assert.equal(git('rev-list', '--parents', '-n', '1', carriedBase).split(' ').length, 3)
  // base 已含这份 changeset，所以 `git diff --cached <base>` 对 .changeset 是空的：放行只能来自
  // 「base 之前本分支带进来的 changeset 也算数」这条 fallback。
  assert.equal(git('diff', '--cached', '--name-only', '--diff-filter=d', carriedBase, '--', '.changeset'), '')
  assert.equal(
    spawnSync('/bin/sh', [changesetCheck], {
      cwd: fixture,
      env: { ...process.env, AGENT_TASK_BASE_SHA: carriedBase },
      encoding: 'utf8'
    }).status,
    0
  )
  git('checkout', '-q', 'main')
  git('branch', '-D', 'carried-changeset-branch')
  // 反向（fail-closed 的底线）：空 PR 靠在 main 上已有的 changeset 过关，绝不能成立。这里分支不带
  // 任何 changeset，base 树里那份来自 main——它的提交在 main 上，不在 `origin/main..base` 里。
  git('checkout', '-q', '-b', 'empty-pr-branch')
  fs.writeFileSync(path.join(fixture, 'empty-pr.txt'), 'work without a changeset\n')
  git('add', '-A')
  git('commit', '-m', 'branch work with no changeset')
  git('merge', '--no-edit', 'main')
  const emptyPrBase = git('rev-parse', 'HEAD')
  // base 树里确实躺着 main 那份 changeset：拦住它的必须是「那是 main 自带的」这条理由，而不是
  // 「base 里恰好没有 changeset」——后者会让这条用例在判据写错时也绿。
  assert.match(git('ls-tree', '-r', '--name-only', emptyPrBase, '--', '.changeset'), /\.changeset\/main-side\.md/)
  assert.match(
    spawnSync('/bin/sh', [changesetCheck], {
      cwd: fixture,
      env: { ...process.env, AGENT_TASK_BASE_SHA: emptyPrBase },
      encoding: 'utf8'
    }).stderr,
    /changeset missing: no staged \.changeset/
  )
  git('checkout', '-q', 'main')
  git('branch', '-D', 'empty-pr-branch')

  // 第三条：origin/main 落后时必须**整体拒绝** fallback。这条钉的是 fail-closed 最容易被漏掉的那
  // 个方向——main 自己新增的 changeset 被合并进 base 后，它的提交「不在 origin/main 上」，于是
  // 区间判据会把它当成本分支带来的。main 侧一旦不够新，本分支带来的那份也就无法与之区分，所以
  // 正确做法是整条 fallback 不走（报 missing，把人拦下），而不是放行一个说不清归属的名单。
  git('checkout', '-q', '-b', 'stale-main-branch')
  fs.writeFileSync(path.join(fixture, '.changeset', 'branch-own.md'), '---\n---\n')
  fs.writeFileSync(path.join(fixture, 'stale-work.txt'), 'work\n')
  git('add', '-A')
  git('commit', '-m', 'branch carries its own changeset')
  git('checkout', '-q', 'main')
  fs.writeFileSync(path.join(fixture, '.changeset', 'main-side-late.md'), '---\n---\n')
  fs.writeFileSync(path.join(fixture, 'main-late.txt'), 'main moved\n')
  git('add', '-A')
  git('commit', '-m', 'main moves and brings its own changeset')
  // 故意**不**更新 origin/main：它还停在分叉点，main 的新提交对它是未知的。
  git('checkout', '-q', 'stale-main-branch')
  git('merge', '--no-edit', 'main')
  const staleBase = git('rev-parse', 'HEAD')
  fs.writeFileSync(path.join(fixture, 'stale-work.txt'), 'work, staged\n')
  git('add', '--', 'stale-work.txt')
  // 断言前提：main 那份 changeset 确实躺在 base 的树里（否则这条用例可能只是因为「base 里没有
  // changeset」而绿，测不到 origin/main 新鲜度这一层）。
  assert.match(git('ls-tree', '-r', '--name-only', staleBase, '--', '.changeset'), /main-side-late\.md/)
  assert.match(
    spawnSync('/bin/sh', [changesetCheck], {
      cwd: fixture,
      env: { ...process.env, AGENT_TASK_BASE_SHA: staleBase },
      encoding: 'utf8'
    }).stderr,
    /changeset missing: no staged \.changeset/
  )
  // 从 HEAD 恢复，index 与工作区一起复位：只 `git checkout -- <file>` 会把 index 里那份 staged
  // 内容写回工作区，切分支时照样撞上「local changes would be overwritten」。
  git('checkout', 'HEAD', '--', 'stale-work.txt')
  git('checkout', '-q', 'main')
  git('branch', '-D', 'stale-main-branch')
  git('update-ref', '-d', 'refs/remotes/origin/main')
  run('drop', '--task', 'changeset-fixture', '--reason', 'changeset policy covered', '--by', 'fixture-sweeper-1')
  // 卸载政策检查并清掉 fixture 里的 changeset：后续用例不再携带 changeset，留着这道
  // 政策会让它们的 guard 失败。
  fs.rmSync(path.join(fixture, '.changeset'), { recursive: true, force: true })
  fs.rmSync(changesetCheck)
  git('add', '-A')
  git('commit', '-m', 'uninstall changeset policy check')

  // format-clean：与 task 无关的 check-only 格式化 gate，所以三条提交路径都得跑到它——无 active
  // task、T2 的 commit、T1 的 freeze。fixture 里没有 node_modules，真的 vp/stylelint 起不来，
  // 于是把工具入口换成记账 stub：这里断言的是「哪些文件交给了哪个工具」和「失败拦不拦」，
  // 不是 oxfmt 会不会格式化（那是 check-code 与真实仓库里的事）。
  const formatCheck = path.join(fixture, '.agents', 'checks', 'format-clean')
  const formatStub = path.join(fixture, 'format-tool-stub.sh')
  fs.writeFileSync(
    formatStub,
    [
      '#!/bin/sh',
      'tool=$1',
      'shift',
      // 探测调用（带 --help）直接退出、不记账：它不带文件路径，记下来就会往「哪些路径交给了哪个
      // 工具」的日志里掺进噪声，让下面那些整行断言比的不是路径清单。
      'for arg in "$@"; do',
      '  [ "$arg" = --help ] && exit 0',
      'done',
      'for arg in "$@"; do',
      // 记账只收磁盘上真存在的路径：子命令名 `check` 同样不以 - 开头，收了就混进下面的整行断言。
      '  [ -f "$arg" ] || continue',
      // 不以 - 开头的参数才是文件路径（`${arg#-}` 剥掉前导连字符，剥不动就说明没有）。
      '  [ "${arg#-}" = "$arg" ] && printf \'%s|%s\\n\' "$tool" "$arg" >> "$FORMAT_STUB_LOG"',
      'done',
      'if [ "$tool" = gofmt ]; then',
      '  [ -f "$FORMAT_STUB_DIRTY_GO" ] || exit 0',
      '  for arg in "$@"; do [ "${arg#-}" = "$arg" ] && printf \'%s\\n\' "$arg"; done',
      '  exit 0',
      'fi',
      '[ -f "$FORMAT_STUB_FAIL" ] || exit 0',
      // 失败说明故意写 stdout（不是 stderr）：真工具把「哪些文件不过」写在 stdout，内核只有把两段
      // 都留下才不会把检查给出的理由丢掉。下面 /stub: vp found issues/ 那条断言钉的就是这件事。
      'echo "stub: $tool found issues"',
      'exit 1'
    ].join('\n') + '\n'
  )
  fs.chmodSync(formatStub, 0o755)
  fs.copyFileSync(path.join(repoRoot, '.agents', 'checks', 'format-clean'), formatCheck)
  fs.chmodSync(formatCheck, 0o755)
  const turboCheck = path.join(fixture, '.agents', 'checks', 'turbo-cache-invariant')
  fs.writeFileSync(turboCheck, '#!/bin/sh\nexit 0\n')
  fs.chmodSync(turboCheck, 0o755)
  const formatLog = path.join(fixture, 'format-tool-calls.log')
  const failMarker = path.join(fixture, 'format-stub-fail')
  const dirtyGoMarker = path.join(fixture, 'format-stub-dirty-go')
  Object.assign(process.env, {
    AGENT_VP_CMD: `sh ${formatStub} vp`,
    AGENT_STYLELINT_CMD: `sh ${formatStub} stylelint`,
    AGENT_GOFMT_CMD: `sh ${formatStub} gofmt`,
    FORMAT_STUB_LOG: formatLog,
    FORMAT_STUB_FAIL: failMarker,
    FORMAT_STUB_DIRTY_GO: dirtyGoMarker
  })
  // 空格路径与非 ASCII 路径都必须作为**一个** arg 到达工具：按行传清单再用位置参数收，劈开就
  // 会变成「一个不存在的文件」+「一个恰好 matching 的 glob」。
  fs.mkdirSync(path.join(fixture, 'demo 目录'), { recursive: true })
  fs.writeFileSync(path.join(fixture, 'demo 目录', 'a b.mjs'), 'export const a = 1\n')
  fs.writeFileSync(path.join(fixture, 'probe.css'), 'a { color: red; }\n')
  fs.writeFileSync(path.join(fixture, 'probe.go'), 'package main\n')
  fs.writeFileSync(path.join(fixture, 'ghost.mjs'), 'untracked, so never checked\n')
  git('add', 'demo 目录/a b.mjs', 'probe.css', 'probe.go')
  const noTaskFormatGuard = spawn('guard')
  assert.equal(noTaskFormatGuard.status, 0)
  assert.deepEqual(JSON.parse(noTaskFormatGuard.stdout).checks, ['format-clean', 'turbo-cache-invariant'])
  const formatCalls = fs.readFileSync(formatLog, 'utf8')
  // 空格 + 非 ASCII 路径必须作为**一个** arg 到达工具，承重的是「正例 + 条数」这一对：日志只收磁盘
  // 上真存在的路径，所以一旦参数被空白劈开（`demo`、`目录/a`、`b.mjs` 都不是文件），那条路径就一条
  // 都记不上，vp 的行数从 3 掉到 2，两条断言同时红。反过来「日志里不多出别的行」由条数守住，不必
  // 写负例——负例比的 `vp|demo` 之类永远不可能出现，是不会红的断言。比整行内容而不写正则：$ 在没有
  // m 标志时只匹配整段输入的末尾。
  const formatCallLines = formatCalls.split(os.EOL)
  assert.ok(formatCallLines.includes('vp|demo 目录/a b.mjs'))
  assert.equal(formatCallLines.filter(line => line.startsWith('vp|')).length, 3)
  assert.match(formatCalls, /stylelint\|probe\.css/)
  assert.doesNotMatch(formatCalls, /stylelint\|probe\.go/)
  assert.match(formatCalls, /gofmt\|probe\.go/)
  assert.doesNotMatch(formatCalls, /gofmt\|probe\.css/)
  assert.doesNotMatch(formatCalls, /ghost\.mjs/)
  fs.rmSync(formatLog)

  // 覆盖度校验：白名单是无 task 路径上唯一的保证，而内核按「普通文件 + 执行位」挂载检查，所以
  // 丢掉 +x 必须硬失败并点名，不能静默放行（删文件、变成目录同形，这里只测最隐蔽的一种）。
  fs.chmodSync(formatCheck, 0o644)
  assert.match(failMessage('guard'), /always-on checks did not run: format-clean/)
  fs.chmodSync(formatCheck, 0o755)
  fs.chmodSync(turboCheck, 0o644)
  assert.match(failMessage('guard'), /always-on checks did not run: turbo-cache-invariant/)
  fs.chmodSync(turboCheck, 0o755)
  fs.rmSync(formatLog, { force: true })

  // 以 - 开头的暂存路径必须 fail-closed：调用形状是「flag 在前、路径在后」，仓库根一个真名叫
  // --fix 的文件会变成一个真的 fixer 开关，那正是本检查承诺不做的事（commit 期改写文件）。
  // 这里验证的是「不把它交给任何工具」，所以断言点在这条消息上，不看 stub 日志。
  fs.writeFileSync(path.join(fixture, '--fix'), 'export const fix = 1\n')
  git('add', '--', '--fix')
  assert.match(failMessage('guard'), /staged path '--fix' starts with '-' and would be parsed/)
  assert.equal(fs.existsSync(formatLog), false, 'a -prefixed path must never reach a formatter')
  git('rm', '--cached', '--quiet', '--', '--fix')
  fs.rmSync(path.join(fixture, '--fix'))

  // 被 git 引号化的路径同形：`core.quotePath=false` 只免掉非 ASCII 的转义，含 `"`、`\`、换行的
  // 名字照样包成 "probe\".mjs"。那一串不是路径，交给工具只会检一个不存在的文件——漏检比拦住
  // 提交更糟，所以一起 fail-closed。
  fs.writeFileSync(path.join(fixture, 'probe".mjs'), 'export const q = 1\n')
  git('add', '--', 'probe".mjs')
  assert.match(failMessage('guard'), /git C-quoted a staged path/)
  assert.equal(fs.existsSync(formatLog), false, 'a quoted path must never reach a formatter')
  git('rm', '--cached', '--quiet', '--', 'probe".mjs')
  fs.rmSync(path.join(fixture, 'probe".mjs'))

  // changeset 政策先装回来，再测「无 task 不跑它」：上面卸载过一次的 doesNotMatch 是恒真的，
  // 只有它装着、fixture 里又没有 .changeset 时，「无 task 只跑白名单」才是被证明的结论。
  fs.copyFileSync(path.join(repoRoot, '.agents', 'checks', 'changeset-required'), changesetCheck)
  fs.chmodSync(changesetCheck, 0o755)
  assert.deepEqual(JSON.parse(spawn('guard').stdout).checks, ['format-clean', 'turbo-cache-invariant'])

  // 无 task 时格式问题照样拦住提交，但不得顺带要求 changeset：政策检查核对的是 task 的交代物。
  fs.writeFileSync(failMarker, 'stub fails\n')
  const blockedNoTask = failMessage('guard')
  assert.match(blockedNoTask, /check format-clean failed; commit aborted/)
  assert.match(blockedNoTask, /stub: vp found issues/)
  // 提示必须说清 vp check 判的是格式/lint/类型三件事：只喊「跑 fixer」会把人推进
  // 「fix → 重新提交 → 同一条消息」的循环，因为 fixer 修不掉类型错误。
  assert.match(blockedNoTask, /never a type error/)
  assert.doesNotMatch(blockedNoTask, /changeset (missing|malformed|has no summary)/)
  assert.doesNotMatch(blockedNoTask, /task gate: not enforced/)

  // T2 边界：这道 gate 与 changeset 政策同时在。
  fs.mkdirSync(path.join(fixture, '.changeset'))
  fs.writeFileSync(
    path.join(fixture, '.changeset', 'format-t2.md'),
    "---\n'@greypan/js-kit': patch\n---\n\nFormat gate coverage.\n"
  )
  run('new', '--task', 'format-t2', '--level', 't2')
  run('start', '--task', 'format-t2')
  git('add', '-A')
  assert.match(failMessage('guard', '--task', 'format-t2'), /check format-clean failed; commit aborted/)
  fs.rmSync(failMarker)
  // 有 task 时跑全部检查：policy-check.sh 是上面 T2 政策用例留下的 stub（一直装在 fixture 里），
  // not-executable.sh 因为缺 +x 不参与——那正是上面两条的既有结论。
  assert.deepEqual(JSON.parse(run('guard', '--task', 'format-t2')).checks, [
    'changeset-required',
    'format-clean',
    'policy-check.sh',
    'turbo-cache-invariant'
  ])
  // T2 的干净豁免只到 start：工作区还有别人的在制品时 freeze 必须拒绝——`git add -A` 会把它们
  // 一起吸进快照（见 freeze）。反过来，起点干净的 T2 允许 freeze，否则「为留痕而 freeze」这条路
  // 就被顺手焊死了，而 verify 只认 frozen 之后的相位。
  const foreignWork = path.join(fixture, 'someone-else.txt')
  fs.writeFileSync(foreignWork, 'not mine\n')
  assert.match(
    failMessage('freeze', '--task', 'format-t2'),
    /level t2 and its worktree has uncommitted changes; freeze would stage them all/
  )
  fs.rmSync(foreignWork)
  git('add', '-A')
  git('commit', '-m', 't2 freeze coverage')
  assert.equal(JSON.parse(run('freeze', '--task', 'format-t2')).phase, 'frozen')
  run('drop', '--task', 'format-t2', '--reason', 'format gate covered at commit boundary', '--by', 'fixture-sweeper-1')

  // freeze 边界：归一化之后还有一层只读核对，所以 fix-code 没跑成的仓库也拦得住。freeze 先
  // `git add -A`，所以这里只需要往工作区丢一个标记文件，它就进入暂存清单。
  fs.rmSync(changesetCheck)
  fs.rmSync(path.join(fixture, '.changeset'), { recursive: true, force: true })
  git('add', '-A')
  git('commit', '-m', 'install format policy check')
  run('new', '--task', 'format-t1', '--level', 't1')
  run('start', '--task', 'format-t1')
  fs.writeFileSync(failMarker, 'stub fails\n')
  assert.match(failMessage('freeze', '--task', 'format-t1'), /check format-clean failed; freeze aborted/)
  fs.rmSync(failMarker)
  // gofmt 分支单独钉一条：`gofmt -l` 退出码为 0、靠输出判定，是最容易被写错的一支。
  fs.writeFileSync(dirtyGoMarker, 'stub reports gofmt output\n')
  fs.writeFileSync(path.join(fixture, 'probe-two.go'), 'package main\n')
  const goFailure = failMessage('freeze', '--task', 'format-t1')
  assert.match(goFailure, /are not clean .* \(gofmt -w <files>/)
  assert.match(goFailure, /probe-two\.go/)
  fs.rmSync(dirtyGoMarker)
  run('drop', '--task', 'format-t1', '--reason', 'format gate covered at freeze boundary', '--by', 'fixture-sweeper-1')
  // 收尾：卸载这道检查并删掉 stub 与日志，否则后续用例的 guard 会因为找不到工具而硬失败，
  // 未跟踪的 stub 也会让 T1 用例的干净 worktree 前提不再成立。env 要一次清干净：留着
  // FORMAT_STUB_FAIL 会让后面任何真工具调用被 stub 拦成失败。
  // 陷阱：`.agents/checks/` 目录本身留着（fixture 里还有别的检查），所以覆盖度 gate 从这一刻起
  // 对**无 task 的 guard** 是硬失败的。后来新增这类用例时会撞上「always-on checks did not run」，
  // 那是预期行为，不是 bug——要跑得先把 format-clean 装回来。
  fs.rmSync(formatCheck)
  fs.rmSync(turboCheck)
  fs.rmSync(formatStub)
  fs.rmSync(formatLog, { force: true })
  for (const key of [
    'AGENT_VP_CMD',
    'AGENT_STYLELINT_CMD',
    'AGENT_GOFMT_CMD',
    'FORMAT_STUB_LOG',
    'FORMAT_STUB_FAIL',
    'FORMAT_STUB_DIRTY_GO'
  ])
    delete process.env[key]
  git('add', '-A')
  git('commit', '-m', 'uninstall format policy check')

  // issue：事后补挂接受全链接与 N/A，拒绝不安全形态。
  run('new', '--task', 'issue-fixture', '--level', 't2')
  const issueHint = spawn('status', '--task', 'issue-fixture')
  assert.match(issueHint.stderr, /has no linked issue/)
  run('issue', '--task', 'issue-fixture', '--ref', 'https://github.com/greypan/mono/issues/1')
  const issueState = JSON.parse(run('status', '--task', 'issue-fixture'))
  assert.equal(issueState.issue, 'https://github.com/greypan/mono/issues/1')
  runFailure('issue', '--task', 'issue-fixture', '--ref', 'http://github.com/greypan/mono/issues/2')
  runFailure('issue', '--task', 'issue-fixture', '--ref', '#42')

  // worktree 隔离：assign 到被占用 worktree 被拒；task 与 worktree 绑定后不可漂移。
  fs.rmSync(secondWorktree, { recursive: true, force: true })
  git('worktree', 'add', '-b', 'second-fixture', secondWorktree, 'HEAD')
  run('new', '--task', 'second-fixture', '--level', 't1', '--worktree', secondWorktree)
  runFailure('new', '--task', 'another-task', '--level', 't1', '--worktree', secondWorktree)
  // branch drift：worktree 脱离 task 绑定的分支后 guard 拒绝。
  git('-C', secondWorktree, 'checkout', '--detach', 'HEAD')
  const branchDrift = spawn('guard', '--task', 'second-fixture', '--worktree', secondWorktree)
  assert.equal(branchDrift.status, 1)
  assert.match(branchDrift.stderr, /belongs to branch/)
  run('drop', '--task', 'second-fixture', '--reason', 'isolation covered', '--by', 'fixture-sweeper-1')
  git('worktree', 'remove', '--force', secondWorktree)

  // 孤儿 state：state 目录搬进 $TMPDIR 之后由本机所有仓库共用，仓库删了它的 state 还留着。
  // 列举侧（guard 的候选筛选、worktree 占用检查）必须只看到当前仓库的，别处既不列也不删。
  // 这条 state 故意记着 fixture 自己的 worktree 且 phase=active：没有这道过滤，guard 会把它
  // 和本仓库的 issue-fixture 一起收进候选，然后以「多个 active task」硬失败。
  // worktree 写成 realpath 是必须的：resolveWorktree 会把候选与 worktree 都解析过软链，而 macOS
  // 的 os.tmpdir() 落在 /var（/private/var 的软链）后面，只按 mkdtemp 的原样字符串写，worktree
  // 过滤自己就会把它挡掉，这条用例将不再证明任何东西。
  const foreignState = {
    version: 1,
    taskId: 'foreign-repo-fixture',
    level: 't1',
    phase: 'active',
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    commonDir: path.join(os.tmpdir(), 'some-other-repo', '.git'),
    baseSha: '0'.repeat(40),
    branch: 'main',
    worktree: fs.realpathSync(fixture),
    owner: 'foreign-owner',
    issue: null,
    playbook: null,
    diffHash: null,
    review: { required: false, result: null, diffHash: null, reviewer: null, at: null },
    approval: { granted: false, diffHash: null, approver: null, at: null },
    verification: [],
    events: []
  }
  fs.writeFileSync(path.join(stateDir, 'foreign-repo-fixture.json'), `${JSON.stringify(foreignState, null, 2)}\n`)
  run('start', '--task', 'issue-fixture')
  const foreignGuard = spawn('guard')
  assert.equal(foreignGuard.status, 0)
  assert.equal(JSON.parse(foreignGuard.stdout).taskId, 'issue-fixture')
  // 定向命令仍按 id 读得到它，归属不符由 liveState 判定，而不是被列举过滤悄悄藏起来。
  assert.match(failMessage('status', '--task', 'foreign-repo-fixture'), /another Git repository/)
  fs.rmSync(path.join(stateDir, 'foreign-repo-fixture.json'))

  // 损坏 state 容错：目录扫描（guard 共享路径）对单个坏文件降级为警告并跳过，
  // 不阻塞其他 task；target task 的 loadState 保持硬失败。警告本身有归属边界——能证明属于
  // 别的仓库的坏 state 不刷屏（SCHEMA_VERSION 升版时全机旧 state 会同时变 unsupported，
  // 无边界就会把噪音推到每个仓库的 pre-commit 上）；归属不明的仍照常警告——空串 commonDir
  // 算缺归属而不是「属于别处」，saveState 写的 commonDir 是 realpath 结果，空串只来自损坏。
  fs.mkdirSync(stateDir, { recursive: true })
  fs.writeFileSync(path.join(stateDir, 'corrupt.json'), '{ not json')
  fs.writeFileSync(
    path.join(stateDir, 'wrong-version.json'),
    JSON.stringify({ version: 999, taskId: 'wrong-version', phase: 'open' })
  )
  fs.writeFileSync(
    path.join(stateDir, 'empty-owner.json'),
    JSON.stringify({ version: 999, taskId: 'empty-owner', phase: 'open', commonDir: '' })
  )
  fs.writeFileSync(
    path.join(stateDir, 'foreign-wrong-version.json'),
    JSON.stringify({
      version: 999,
      taskId: 'foreign-wrong-version',
      phase: 'active',
      commonDir: path.join(os.tmpdir(), 'some-other-repo', '.git')
    })
  )
  const tolerantGuard = spawn('guard')
  assert.equal(tolerantGuard.status, 0)
  assert.equal(JSON.parse(tolerantGuard.stdout).enforced, true)
  assert.match(tolerantGuard.stderr, /corrupt\.json/)
  assert.match(tolerantGuard.stderr, /wrong-version\.json/)
  assert.match(tolerantGuard.stderr, /empty-owner\.json/)
  assert.doesNotMatch(tolerantGuard.stderr, /foreign-wrong-version\.json/)
  runFailure('status', '--task', 'corrupt')
  runFailure('status', '--task', 'wrong-version')
  fs.rmSync(path.join(stateDir, 'corrupt.json'))
  fs.rmSync(path.join(stateDir, 'wrong-version.json'))
  fs.rmSync(path.join(stateDir, 'empty-owner.json'))
  fs.rmSync(path.join(stateDir, 'foreign-wrong-version.json'))
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
  fs.rmSync(secondWorktree, { recursive: true, force: true })
  fs.rmSync(path.dirname(stateDir), { recursive: true, force: true })
}

console.log('scripts/task.test.mjs: all assertions passed')
