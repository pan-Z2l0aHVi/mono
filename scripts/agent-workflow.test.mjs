import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
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
  assert.deepEqual(frozen.live.current.untrackedFiles, ['src/change.ts'])

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
  assert.match(run('check', '--task', 'workflow-fixture', '--phase', 'close'), /"ok": true/)
  const closed = JSON.parse(run('close', '--task', 'workflow-fixture'))
  assert.equal(closed.phase, 'closed')

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
  fs.rmSync(path.join(fixture, 'independent.txt'))
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

  const corruptState = path.join(fixture, '.git', 'agent-workflow', 'corrupt.json')
  fs.writeFileSync(corruptState, '{not-json}\n')
  runFailure('guard-commit')
} finally {
  if (fs.existsSync(duplicateWorktree)) git('worktree', 'remove', '--force', duplicateWorktree)
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('agent workflow tests passed')
