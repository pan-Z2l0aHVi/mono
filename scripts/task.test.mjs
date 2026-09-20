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

// pre-commit 边界：guard 是唯一门禁，归一化只发生在 freeze；不允许任何绕过形态。
assert.ok(preCommit.includes('pnpm task guard'), 'pre-commit must run the task guard')
assert.equal(preCommit.includes('vp staged'), false, 'pre-commit must not run vp staged')
assert.equal(preCommit.includes('agent-workflow'), false, 'pre-commit must not reference the retired workflow script')
// 三个旁路变量都要点名：上游 `h` 包装脚本认 HUSKY / VP_GIT_HOOKS / VITE_GIT_HOOKS 三个，
// pre-commit 自己若出现任何一个，就等于门禁自带后门。
for (const bypass of ['--no-verify', 'HUSKY=0', 'VP_GIT_HOOKS=0', 'VITE_GIT_HOOKS=0'])
  assert.equal(preCommit.includes(bypass), false, `pre-commit must not include ${bypass}`)
assert.ok(fs.statSync(path.join(repoRoot, '.vite-hooks', 'pre-commit')).mode & 0o111, 'pre-commit must be executable')

const git = (...args) => execFileSync('git', ['-C', fixture, ...args], { encoding: 'utf8' }).trim()
const run = (...args) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, AGENT_TASK_ROOT: fixture },
    encoding: 'utf8'
  })
const runFailure = (...args) =>
  assert.throws(
    () =>
      execFileSync(process.execPath, [script, ...args], {
        cwd: repoRoot,
        env: { ...process.env, AGENT_TASK_ROOT: fixture },
        encoding: 'utf8',
        stdio: 'pipe'
      }),
    /task failed/
  )
// status 的 issue 缺失提示走 stderr，JSON 走 stdout；需要同时捕获两者。
const spawn = (...args) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, AGENT_TASK_ROOT: fixture },
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
  assert.match(untrackedGuard.stderr, /pnpm task new/)

  // 脏 worktree 不得建 task：快照基线必须干净。
  fs.writeFileSync(path.join(fixture, 'preexisting.txt'), 'must not be absorbed\n')
  runFailure('new', '--task', 'dirty-init', '--level', 't1')
  fs.rmSync(path.join(fixture, 'preexisting.txt'))

  // 清单里必须是「将被提交的那个名字」。staged 重命名在 porcelain 里渲染成 `old -> new`，只按
  // 固定偏移取整段就会把旧路径当成未提交改动报出去——使用者会去翻一个根本没动过的文件。
  git('mv', 'README.md', 'FIXTURE-NOTE.md')
  const renameFailure = failMessage('new', '--task', 'rename-init', '--level', 't2')
  assert.match(renameFailure, /FIXTURE-NOTE\.md/)
  assert.doesNotMatch(renameFailure, /README\.md/)
  git('mv', 'FIXTURE-NOTE.md', 'README.md')

  // 级别词汇校验。
  runFailure('new', '--task', 'bad-level', '--level', 't3')
  runFailure('new', '--task', 'bad id', '--level', 't1')

  // owner 也是一次身份申报，不是自由文本：owner/reviewer/approver/署名人之间的约束全部是
  // 「字符串互不相等」，放任 `ab` 或 `bad id!` 当 owner，「≠ owner」比的就是字形而不是人。
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
  assert.ok(created.events.some(event => event.event === 'new'))

  // `--` 只终止选项解析：其后的内容既不是选项也不是位置参数，不改变任何行为。
  assert.equal(JSON.parse(run('status', '--task', 't0-fixture', '--', 'run', 'pnpm', 'test')).taskId, 't0-fixture')
  // 尤其是尾随的 --task 不能被回读成选项——漏掉前面的 --task 仍然要报错。
  assert.match(failMessage('status', '--', '--task', 't0-fixture'), /missing required option --task/)

  // assign：owner/roles 改派并留痕（preflight 第二步）。
  const assigned = JSON.parse(run('assign', '--task', 't0-fixture', '--owner', 'fixture-owner', '--roles', 'manager'))
  assert.equal(assigned.owner, 'fixture-owner')
  assert.deepEqual(assigned.roles, ['manager'])
  assert.ok(assigned.events.some(event => event.event === 'assign'))

  // --roles 只接受存在 Role Contract 的角色；未知值整条失败且不落盘。
  const reassigned = JSON.parse(run('assign', '--task', 't0-fixture', '--roles', 'manager,lib-coder'))
  assert.deepEqual(reassigned.roles, ['manager', 'lib-coder'])
  runFailure('assign', '--task', 't0-fixture', '--roles', 'bogus-role')
  assert.deepEqual(JSON.parse(run('status', '--task', 't0-fixture')).roles, ['manager', 'lib-coder'])

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

  // 声明了 fix:code 但依赖未安装：freeze 必须失败并指引安装，不允许静默跳过归一化。
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ scripts: { 'fix:code': 'true' } }))
  fs.appendFileSync(path.join(fixture, 'src', 'change.ts'), '// pending edit\n')
  assert.throws(
    () =>
      execFileSync(process.execPath, [script, 'freeze', '--task', 't0-fixture'], {
        cwd: repoRoot,
        env: { ...process.env, AGENT_TASK_ROOT: fixture },
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

  // review 身份是机器约束，不是约定：owner 自审、形状不合法的 id 都要给出具体条款。
  assert.match(
    failMessage('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'fixture-owner'),
    /is or was an owner of this task/
  )
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
  // 字符、形状合法。不挡类型，同一个身份就能以 true 与 'true' 两种字形同时骗过「≠ owner」和
  // 「≠ reviewer」这两条比对。
  assert.match(
    failMessage('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer'),
    /invalid reviewer id: true; expected a string/
  )
  // 独立性核对的是 owner 历史而不是某一时刻的字段：assign 没有相位限制，只比现值就会被
  // 「先把 owner 派给别人、再以那个 id 自审」绕开。
  run('assign', '--task', 't0-fixture', '--owner', 'handoff-owner-2')
  assert.match(
    failMessage('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'handoff-owner-2'),
    /is or was an owner of this task/
  )
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

  // approval 与 review 用同一套 id 形状，且三方互不相同：owner 批自己的活、reviewer 批自己
  // 刚审过的 diff，都不构成独立授权。这里的 fixture-owner 已不是当前 owner，拒它的正是历史。
  assert.match(failMessage('approve', '--task', 't0-fixture'), /approval requires --approver/)
  assert.match(
    failMessage('approve', '--task', 't0-fixture', '--approver', 'fixture-owner'),
    /is or was an owner of this task/
  )
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
  const approvedState = JSON.parse(run('approve', '--task', 't0-fixture', '--approver', 'user-approver'))
  assert.equal(approvedState.phase, 'approved')
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

  // T1：review 强制，允许 subagent 风格 id；approval 与验证同样必经。
  run('new', '--task', 't1-fixture', '--level', 't1', '--owner', 'coder-1')
  run('start', '--task', 't1-fixture')
  fs.writeFileSync(path.join(fixture, 't1.txt'), 't1\n')
  run('freeze', '--task', 't1-fixture')
  const t1Reviewed = JSON.parse(
    run('review', '--task', 't1-fixture', '--result', 'pass', '--reviewer', 'subagent-review-1')
  )
  assert.equal(t1Reviewed.review.reviewer, 'subagent-review-1')
  run('approve', '--task', 't1-fixture', '--approver', 'user-approver')
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

  // T2 快速通道：start 后即可提交，无需 freeze/review/approve/verify。
  run('new', '--task', 't2-fixture', '--level', 't2')
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
  run('drop', '--task', 'changeset-fixture', '--reason', 'changeset policy covered', '--by', 'fixture-sweeper-1')
  // 卸载政策检查并清掉 fixture 里的 changeset：后续用例不再携带 changeset，留着这道
  // 政策会让它们的 guard 失败。
  fs.rmSync(path.join(fixture, '.changeset'), { recursive: true, force: true })
  fs.rmSync(changesetCheck)
  git('add', '-A')
  git('commit', '-m', 'uninstall changeset policy check')

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

  // 损坏 state 容错：目录扫描（guard 共享路径）对单个坏文件降级为警告并跳过，
  // 不阻塞其他 task；target task 的 loadState 保持硬失败。
  run('start', '--task', 'issue-fixture')
  fs.mkdirSync(path.join(fixture, '.git', 'tasks'), { recursive: true })
  fs.writeFileSync(path.join(fixture, '.git', 'tasks', 'corrupt.json'), '{ not json')
  fs.writeFileSync(
    path.join(fixture, '.git', 'tasks', 'wrong-version.json'),
    JSON.stringify({ version: 999, taskId: 'wrong-version', phase: 'open' })
  )
  const tolerantGuard = spawn('guard')
  assert.equal(tolerantGuard.status, 0)
  assert.equal(JSON.parse(tolerantGuard.stdout).enforced, true)
  assert.match(tolerantGuard.stderr, /corrupt\.json/)
  assert.match(tolerantGuard.stderr, /wrong-version\.json/)
  runFailure('status', '--task', 'corrupt')
  runFailure('status', '--task', 'wrong-version')
  fs.rmSync(path.join(fixture, '.git', 'tasks', 'corrupt.json'))
  fs.rmSync(path.join(fixture, '.git', 'tasks', 'wrong-version.json'))
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
  fs.rmSync(secondWorktree, { recursive: true, force: true })
}

console.log('scripts/task.test.mjs: all assertions passed')
