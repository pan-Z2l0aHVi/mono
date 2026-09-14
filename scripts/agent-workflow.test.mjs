import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repoRoot, 'scripts', 'agent-workflow.mjs')
const preCommit = fs.readFileSync(path.join(repoRoot, '.vite-hooks', 'pre-commit'), 'utf8')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-agent-workflow-'))
const duplicateWorktree = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-agent-workflow-duplicate-'))

const stagedIndex = preCommit.indexOf('vp staged')
const guardIndex = preCommit.indexOf('pnpm agent:workflow guard-commit')
assert.ok(stagedIndex >= 0, 'pre-commit must run vp staged')
assert.ok(guardIndex > stagedIndex, 'pre-commit must run the workflow guard after vp staged')
for (const bypass of ['--no-verify', 'HUSKY=0', 'VP_GIT_HOOKS=0'])
  assert.equal(preCommit.includes(bypass), false, `pre-commit must not include ${bypass}`)
assert.ok(fs.statSync(path.join(repoRoot, '.vite-hooks', 'pre-commit')).mode & 0o111, 'pre-commit must be executable')

const git = (...args) => execFileSync('git', ['-C', fixture, ...args], { encoding: 'utf8' }).trim()
const run = (...args) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, AGENT_WORKFLOW_ROOT: fixture },
    encoding: 'utf8'
  })
const runFailure = (...args) =>
  assert.throws(
    () =>
      execFileSync(process.execPath, [script, ...args], {
        cwd: repoRoot,
        env: { ...process.env, AGENT_WORKFLOW_ROOT: fixture },
        encoding: 'utf8',
        stdio: 'pipe'
      }),
    /agent-workflow failed/
  )
// status 的 issue 缺失提示走 stderr，JSON 走 stdout；需要同时捕获两者。
const spawn = (...args) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, AGENT_WORKFLOW_ROOT: fixture },
    encoding: 'utf8'
  })

try {
  git('init', '-b', 'main')
  git('config', 'user.name', 'Test')
  git('config', 'user.email', 'test@example.com')
  fs.writeFileSync(path.join(fixture, 'README.md'), '# fixture\n')
  git('add', 'README.md')
  git('commit', '-m', 'fixture')

  const untrackedGuard = JSON.parse(run('guard-commit'))
  assert.equal(untrackedGuard.enforced, false)

  fs.writeFileSync(path.join(fixture, 'preexisting.txt'), 'must not be absorbed\n')
  runFailure('init', '--task', 'dirty-init', '--mode', 'direct')
  fs.rmSync(path.join(fixture, 'preexisting.txt'))

  const initialized = JSON.parse(run('init', '--task', 'workflow-fixture', '--mode', 'orchestrated'))
  assert.equal(initialized.phase, 'initialized')
  assert.equal(initialized.baseSha, git('rev-parse', 'HEAD'))

  fs.rmSync(duplicateWorktree, { recursive: true, force: true })
  git('worktree', 'add', '-b', 'duplicate-fixture', duplicateWorktree, 'HEAD')
  const duplicate = JSON.parse(
    run('init', '--task', 'duplicate-fixture', '--mode', 'direct', '--worktree', duplicateWorktree)
  )
  assert.equal(duplicate.phase, 'initialized')
  runFailure('assign', '--task', 'duplicate-fixture', '--role', 'lib-coder', '--worktree', fixture)
  fs.rmSync(path.join(fixture, '.git', 'agent-workflow', 'duplicate-fixture.json'))
  git('worktree', 'remove', '--force', duplicateWorktree)

  const reassigned = JSON.parse(
    run('assign', '--task', 'workflow-fixture', '--role', 'lib-coder', '--worktree', fixture)
  )
  assert.equal(reassigned.phase, 'assigned')
  assert.deepEqual(reassigned.roles, ['lib-coder'])

  fs.mkdirSync(path.join(fixture, 'src'))
  fs.writeFileSync(path.join(fixture, 'src', 'change.ts'), 'export const value = 1\n')
  const frozen = JSON.parse(run('freeze', '--task', 'workflow-fixture'))
  assert.equal(frozen.phase, 'frozen')
  assert.ok(frozen.diffHash)
  // freeze 会 git add -A 全量 staging：冻结集与 commit 起始的 staged 集收敛一致，
  // 原本 untracked 的文件进入 staged 状态并出现在相对 baseSha 的 diff 中。
  assert.deepEqual(frozen.live.current.untrackedFiles, [])
  assert.ok(frozen.live.current.trackedFiles.includes('src/change.ts'))
  assert.match(git('status', '--porcelain'), /^A  src\/change\.ts/m)

  // 冻结后继续编辑：旧证据 stale，必须能对当前 diff 重新冻结。
  fs.appendFileSync(path.join(fixture, 'src', 'change.ts'), '// refined after freeze\n')
  const refrozenFromFrozen = JSON.parse(run('freeze', '--task', 'workflow-fixture'))
  assert.equal(refrozenFromFrozen.phase, 'frozen')
  assert.notEqual(refrozenFromFrozen.diffHash, frozen.diffHash)

  const reviewed = JSON.parse(
    run('review', '--task', 'workflow-fixture', '--result', 'pass', '--reviewer', 'reviewer-1')
  )
  assert.equal(reviewed.phase, 'reviewed')
  runFailure('approve', '--task', 'workflow-fixture')
  const approved = JSON.parse(run('approve', '--task', 'workflow-fixture', '--approver', 'manager-1'))
  assert.equal(approved.phase, 'approved')
  assert.equal(approved.approval.diffHash, approved.diffHash)
  assert.equal(approved.approval.approver, 'manager-1')
  runFailure('check', '--task', 'workflow-fixture', '--phase', 'edit')
  assert.match(run('check', '--task', 'workflow-fixture', '--phase', 'commit'), /"ok": true/)
  const guarded = JSON.parse(run('guard-commit'))
  assert.equal(guarded.enforced, true)
  assert.equal(guarded.taskId, 'workflow-fixture')

  const originalMode = fs.statSync(path.join(fixture, 'src/change.ts')).mode & 0o777
  fs.chmodSync(path.join(fixture, 'src/change.ts'), originalMode === 0o644 ? 0o755 : 0o644)
  runFailure('guard-commit')
  fs.chmodSync(path.join(fixture, 'src/change.ts'), originalMode)

  fs.appendFileSync(path.join(fixture, 'src', 'change.ts'), 'export const second = 2\n')
  runFailure('check', '--task', 'workflow-fixture', '--phase', 'commit')
  runFailure('guard-commit')

  const refrozen = JSON.parse(run('freeze', '--task', 'workflow-fixture'))
  JSON.parse(run('review', '--task', 'workflow-fixture', '--result', 'pass', '--reviewer', 'reviewer-1'))
  JSON.parse(run('approve', '--task', 'workflow-fixture', '--approver', 'manager-1'))
  git('add', 'src/change.ts')
  git('commit', '-m', 'change')
  git('branch', 'drifted-fixture')
  git('switch', 'drifted-fixture')
  runFailure('verify', '--task', 'workflow-fixture', '--name', 'must remain on task branch')
  git('switch', 'main')
  runFailure('verify', '--task', 'workflow-fixture', '--name', 'must integrate first')
  assert.match(run('check', '--task', 'workflow-fixture', '--phase', 'integrate'), /"phase": "integrated"/)
  JSON.parse(run('verify', '--task', 'workflow-fixture', '--name', 'fixture test'))

  // ===== post-merge verification 与 close 硬校验（orchestrated） =====
  runFailure('close', '--task', 'workflow-fixture')
  runFailure('check', '--task', 'workflow-fixture', '--phase', 'close')
  runFailure('verify', '--task', 'workflow-fixture', '--name', 'post-merge without worktree', '--post-merge')
  runFailure(
    'verify',
    '--task',
    'workflow-fixture',
    '--name',
    'post-merge on task worktree',
    '--post-merge',
    '--worktree',
    fixture
  )
  // 非祖先 integration worktree：位于 baseSha，task 验证点不在其后代中
  const nonAncestor = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-agent-workflow-nonancestor-'))
  git('worktree', 'add', '-b', 'nonancestor-fixture', nonAncestor, initialized.baseSha)
  runFailure(
    'verify',
    '--task',
    'workflow-fixture',
    '--name',
    'not an ancestor',
    '--post-merge',
    '--worktree',
    nonAncestor
  )
  git('worktree', 'remove', '--force', nonAncestor)
  // 正向：整合 head 包含 task 验证点，post-merge 证据落盘后 close 通过
  const integration = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-agent-workflow-integration-'))
  git('worktree', 'add', '-b', 'integration-fixture', integration, 'HEAD')
  const postMerged = JSON.parse(
    run('verify', '--task', 'workflow-fixture', '--name', 'post-merge smoke', '--post-merge', '--worktree', integration)
  )
  assert.equal(postMerged.verification.at(-1).scope, 'post-merge')
  assert.match(run('check', '--task', 'workflow-fixture', '--phase', 'close'), /"ok": true/)
  const closed = JSON.parse(run('close', '--task', 'workflow-fixture'))
  assert.equal(closed.phase, 'closed')
  // close 后不允许再补任何验证证据
  runFailure('verify', '--task', 'workflow-fixture', '--name', 'after close', '--post-merge', '--worktree', integration)
  git('worktree', 'remove', '--force', integration)

  const status = JSON.parse(run('status', '--task', 'workflow-fixture', '--json'))
  assert.equal(status.phase, 'closed')
  assert.equal(status.stale, false)
  assert.equal(status.diffHash, refrozen.diffHash)

  const independent = JSON.parse(run('init', '--task', 'independent-review', '--mode', 'direct'))
  assert.equal(independent.phase, 'initialized')
  JSON.parse(
    run('assign', '--task', 'independent-review', '--role', 'lib-coder', '--owner', 'alice', '--worktree', fixture)
  )
  fs.writeFileSync(path.join(fixture, 'independent.txt'), 'review me\n')
  JSON.parse(run('freeze', '--task', 'independent-review'))
  runFailure('review', '--task', 'independent-review', '--result', 'pass', '--reviewer', 'alice')
  runFailure('review', '--task', 'independent-review', '--result', 'skip')

  // The independent task is still active, so finish it before reusing this fixture worktree.
  // freeze 的 git add -A 已把 independent.txt 写入 index，仅删文件会留下 staged 条目。
  fs.rmSync(path.join(fixture, 'independent.txt'))
  git('reset')
  fs.rmSync(path.join(fixture, '.git', 'agent-workflow', 'independent-review.json'))

  const optional = JSON.parse(run('init', '--task', 'optional-review', '--mode', 'direct', '--review', 'skip'))
  assert.equal(optional.review.required, false)
  JSON.parse(run('assign', '--task', 'optional-review', '--role', 'lib-coder', '--worktree', fixture))
  fs.writeFileSync(path.join(fixture, 'optional.txt'), 'no reviewer required\n')
  JSON.parse(run('freeze', '--task', 'optional-review'))
  const skipped = JSON.parse(run('review', '--task', 'optional-review', '--result', 'skip'))
  assert.equal(skipped.phase, 'reviewed')
  JSON.parse(run('approve', '--task', 'optional-review', '--approver', 'manager-1'))
  git('add', 'optional.txt')
  git('commit', '-m', 'optional review')
  JSON.parse(run('check', '--task', 'optional-review', '--phase', 'integrate'))
  JSON.parse(run('verify', '--task', 'optional-review', '--name', 'optional fixture test'))
  JSON.parse(run('verify', '--task', 'optional-review', '--name', 'optional fixture failure', '--result', 'fail'))
  runFailure('close', '--task', 'optional-review')
  JSON.parse(run('verify', '--task', 'optional-review', '--name', 'optional fixture test restored'))
  fs.appendFileSync(path.join(fixture, 'optional.txt'), 'changed after verification\n')
  runFailure('close', '--task', 'optional-review')
  fs.writeFileSync(path.join(fixture, 'optional.txt'), 'no reviewer required\n')
  JSON.parse(run('verify', '--task', 'optional-review', '--name', 'optional fixture test final'))
  JSON.parse(run('close', '--task', 'optional-review'))

  // ===== issue 纪律（schema v2） =====
  const withIssue = JSON.parse(
    run('init', '--task', 'issue-linked', '--mode', 'direct', '--issue', 'https://github.com/example/repo/issues/9')
  )
  assert.equal(withIssue.version, 2)
  assert.equal(withIssue.issue, 'https://github.com/example/repo/issues/9')
  for (const bad of ['http://github.com/example/repo/issues/9', '#9', 'https://x.dev/a b', 'issue-9'])
    runFailure('init', '--task', 'bad-issue', '--mode', 'direct', '--issue', bad)
  // issue-linked 仍占用 fixture worktree；校验矩阵已覆盖完毕，移除其状态后再建下一个 task。
  fs.rmSync(path.join(fixture, '.git', 'agent-workflow', 'issue-linked.json'))

  const plain = JSON.parse(run('init', '--task', 'issue-plain', '--mode', 'direct'))
  assert.equal(plain.issue, null)
  const plainStatus = spawn('status', '--task', 'issue-plain')
  assert.equal(plainStatus.status, 0)
  assert.match(plainStatus.stderr, /no linked issue/)
  assert.equal(JSON.parse(plainStatus.stdout).taskId, 'issue-plain')

  const attached = JSON.parse(
    run('issue', '--task', 'issue-plain', '--ref', 'https://github.com/example/repo/issues/9')
  )
  assert.equal(attached.issue, 'https://github.com/example/repo/issues/9')
  const linkedStatus = spawn('status', '--task', 'issue-plain')
  assert.equal(linkedStatus.status, 0)
  assert.equal(linkedStatus.stderr.includes('no linked issue'), false)
  assert.equal(JSON.parse(run('issue', '--task', 'issue-plain', '--ref', 'N/A')).issue, 'N/A')
  for (const bad of ['http://github.com/example/repo/issues/9', '#9', 'https://x.dev/a b', 'issue-9'])
    runFailure('issue', '--task', 'issue-plain', '--ref', bad)
  // closed 任务也接受补挂：issue 是追踪元数据而非证据链。
  const backfilled = JSON.parse(
    run('issue', '--task', 'optional-review', '--ref', 'https://github.com/example/repo/issues/1')
  )
  assert.equal(backfilled.issue, 'https://github.com/example/repo/issues/1')
  assert.equal(backfilled.phase, 'closed')

  // legacy v1 状态容忍：缺 issue 补 null、缺 scope 的 verification 条目按 task 处理。
  const legacy = JSON.parse(fs.readFileSync(path.join(fixture, '.git', 'agent-workflow', 'issue-plain.json'), 'utf8'))
  delete legacy.issue
  legacy.version = 1
  fs.writeFileSync(path.join(fixture, '.git', 'agent-workflow', 'legacy-v1.json'), JSON.stringify(legacy, null, 2))
  const legacyStatus = JSON.parse(spawn('status', '--task', 'legacy-v1').stdout)
  assert.equal(legacyStatus.version, 1)
  assert.equal(legacyStatus.issue, null)
  fs.rmSync(path.join(fixture, '.git', 'agent-workflow', 'legacy-v1.json'))
  fs.rmSync(path.join(fixture, '.git', 'agent-workflow', 'issue-plain.json'))

  const corruptState = path.join(fixture, '.git', 'agent-workflow', 'corrupt.json')
  fs.writeFileSync(corruptState, '{not-json}\n')
  runFailure('guard-commit')
} finally {
  if (fs.existsSync(duplicateWorktree)) git('worktree', 'remove', '--force', duplicateWorktree)
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('agent workflow tests passed')
