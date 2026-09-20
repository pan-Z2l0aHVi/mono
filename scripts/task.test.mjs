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
for (const bypass of ['--no-verify', 'HUSKY=0', 'VP_GIT_HOOKS=0'])
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

try {
  git('init', '-b', 'main')
  git('config', 'user.name', 'Test')
  git('config', 'user.email', 'test@example.com')
  fs.writeFileSync(path.join(fixture, 'README.md'), '# fixture\n')
  git('add', 'README.md')
  git('commit', '-m', 'fixture')

  // 无 active task 的 worktree：guard 放行但不强制。
  const untrackedGuard = JSON.parse(run('guard'))
  assert.equal(untrackedGuard.enforced, false)

  // 脏 worktree 不得建 task：快照基线必须干净。
  fs.writeFileSync(path.join(fixture, 'preexisting.txt'), 'must not be absorbed\n')
  runFailure('new', '--task', 'dirty-init', '--level', 't1')
  fs.rmSync(path.join(fixture, 'preexisting.txt'))

  // 级别词汇校验。
  runFailure('new', '--task', 'bad-level', '--level', 't3')
  runFailure('new', '--task', 'bad id', '--level', 't1')

  // T0 全流程：new → assign → start → freeze → re-freeze → review → approve → commit → verify → done。
  const created = JSON.parse(
    run('new', '--task', 't0-fixture', '--level', 't0', '--issue', 'N/A', '--owner', 'fixture-owner')
  )
  assert.equal(created.phase, 'open')
  assert.equal(created.level, 't0')
  assert.equal(created.review.required, true)
  assert.equal(created.baseSha, git('rev-parse', 'HEAD'))
  assert.ok(created.events.some(event => event.event === 'new'))

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

  const started = JSON.parse(run('start', '--task', 't0-fixture'))
  assert.equal(started.phase, 'active')

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

  // review fail：回到 active 修复，修复后重新 freeze。
  runFailure('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'fixture-owner')
  runFailure('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'bad id!')
  runFailure('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'ab')
  const failedReview = JSON.parse(
    run('review', '--task', 't0-fixture', '--result', 'fail', '--reviewer', 'independent-reviewer-1')
  )
  assert.equal(failedReview.phase, 'active')
  const refrozenAfterFail = JSON.parse(run('freeze', '--task', 't0-fixture'))
  assert.equal(refrozenAfterFail.phase, 'frozen')

  // 未 approve 前提交被 guard 拦截（guard 在 pre-commit 之外也可独立调用）。
  runFailure('guard', '--task', 't0-fixture')

  const approved = JSON.parse(
    run('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'independent-reviewer-1')
  )
  assert.equal(approved.phase, 'reviewed')
  const approvedState = JSON.parse(run('approve', '--task', 't0-fixture', '--approver', 'user-approver'))
  assert.equal(approvedState.phase, 'approved')
  assert.ok(approvedState.events.some(event => event.event === 'approve'))

  // 验证必须覆盖已提交内容：commit 前因脏工作区失败，commit 后通过。
  runFailure('verify', '--task', 't0-fixture', '--name', 'fixture test')
  git('commit', '-m', 't0 change')
  const committedGuard = JSON.parse(run('guard', '--task', 't0-fixture'))
  assert.equal(committedGuard.enforced, true)
  // commit 后内容未变：hash 跨 commit 边界保持一致，guard 仍放行。
  assert.equal(committedGuard.live.stale, false)
  const verified = JSON.parse(run('verify', '--task', 't0-fixture', '--name', 'fixture test'))
  assert.equal(verified.verification.at(-1).result, 'pass')
  assert.equal(verified.verification.at(-1).headSha, git('rev-parse', 'HEAD'))

  // 验证后再次编辑：done 被拦截，重新 freeze → review → approve → commit → verify → done。
  fs.writeFileSync(path.join(fixture, 'src', 'change.ts'), 'export const value = 2\n')
  runFailure('done', '--task', 't0-fixture')
  run('freeze', '--task', 't0-fixture')
  run('review', '--task', 't0-fixture', '--result', 'pass', '--reviewer', 'independent-reviewer-1')
  run('approve', '--task', 't0-fixture', '--approver', 'user-approver')
  git('commit', '-am', 't0 change v2')
  run('verify', '--task', 't0-fixture', '--name', 'fixture test v2')
  const finished = JSON.parse(run('done', '--task', 't0-fixture'))
  assert.equal(finished.phase, 'done')
  assert.ok(finished.events.some(event => event.event === 'done'))

  // task 完结后 worktree 释放，guard 回到 enforced:false。
  assert.equal(JSON.parse(run('guard')).enforced, false)

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
  run('verify', '--task', 't1-fixture', '--name', 't1 test')
  const t1Done = JSON.parse(run('done', '--task', 't1-fixture'))
  assert.equal(t1Done.phase, 'done')

  // T2 快速通道：start 后即可提交，无需 freeze/review/approve/verify。
  run('new', '--task', 't2-fixture', '--level', 't2')
  run('start', '--task', 't2-fixture')
  fs.writeFileSync(path.join(fixture, 't2.txt'), 't2\n')
  const t2Guard = JSON.parse(run('guard', '--task', 't2-fixture'))
  assert.equal(t2Guard.enforced, true)
  runFailure('review', '--task', 't2-fixture', '--result', 'pass', '--reviewer', 'independent-reviewer-1')
  runFailure('approve', '--task', 't2-fixture', '--approver', 'user-approver')
  git('add', 't2.txt')
  git('commit', '-m', 't2 change')
  const t2Done = JSON.parse(run('done', '--task', 't2-fixture'))
  assert.equal(t2Done.phase, 'done')

  // 空冻结被拒绝，--allow-empty 仅用于有意为空的 task。
  run('new', '--task', 'empty-fixture', '--level', 't2')
  run('start', '--task', 'empty-fixture')
  runFailure('freeze', '--task', 'empty-fixture')
  const emptyAllowed = JSON.parse(run('freeze', '--task', 'empty-fixture', '--allow-empty'))
  assert.equal(emptyAllowed.phase, 'frozen')

  // drop：带 reason 从任意未完结状态（含 frozen）落终态，guard 随之放行。
  const dropped = JSON.parse(run('drop', '--task', 'empty-fixture', '--reason', 'superseded by t0-fixture'))
  assert.equal(dropped.phase, 'dropped')
  assert.ok(dropped.events.some(event => event.event === 'drop' && event.reason === 'superseded by t0-fixture'))
  assert.equal(JSON.parse(run('guard')).enforced, false)
  runFailure('drop', '--task', 'empty-fixture', '--reason', 'already dropped')

  // checks：失败的仓库检查中止 freeze，检查文件须可执行。
  run('new', '--task', 'checks-fixture', '--level', 't1')
  run('start', '--task', 'checks-fixture')
  fs.mkdirSync(path.join(fixture, '.agents', 'checks'), { recursive: true })
  fs.writeFileSync(
    path.join(fixture, '.agents', 'checks', 'failing-check.sh'),
    '#!/bin/sh\necho policy violated >&2\nexit 1\n'
  )
  fs.chmodSync(path.join(fixture, '.agents', 'checks', 'failing-check.sh'), 0o755)
  fs.writeFileSync(path.join(fixture, 'checks.txt'), 'checks\n')
  assert.throws(() => run('freeze', '--task', 'checks-fixture'), /check failing-check\.sh failed/)
  fs.writeFileSync(path.join(fixture, '.agents', 'checks', 'failing-check.sh'), '#!/bin/sh\nexit 0\n')
  const frozenWithChecks = JSON.parse(run('freeze', '--task', 'checks-fixture'))
  assert.ok(frozenWithChecks.events.at(-1).checks.includes('failing-check.sh'))
  run('drop', '--task', 'checks-fixture', '--reason', 'checks covered')
  // 恢复干净工作区：freeze 已把检查文件与 checks.txt 收进 index，先删盘上副本
  // 再 reset --hard 清掉 staged 记录，后续用例的 new 依赖 clean 校验。
  fs.rmSync(path.join(fixture, 'checks.txt'), { force: true })
  fs.rmSync(path.join(fixture, '.agents'), { recursive: true, force: true })
  git('reset', '--hard', 'HEAD')

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
  run('drop', '--task', 'second-fixture', '--reason', 'isolation covered')
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
