/**
 * git 验收与 worktree 生命周期。
 *
 * 用真实 `git init` / `git worktree add` 建临时仓库，不伪造 `.git` 文件：linked
 * worktree 的 `gitdir:` 布局差异只有真实 git 才能暴露。
 */

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  cleanupWorktree,
  contentLanding,
  createWorktree,
  inspectChanges,
  isBranchMerged,
  scanIgnoredDeps,
  snapshotBase,
  worktreeBranch,
  worktreeDirtyNote,
  type GitExec,
  type GitExecOptions
} from '../git-inspector'

const dirs: string[] = []

const runGitExec = (args: string[], options: GitExecOptions) =>
  new Promise<{ stdout: string; stderr: string; code: number }>(resolve => {
    execFile('git', args, { cwd: options.cwd, env: { ...process.env, ...options.env } }, (error, stdout, stderr) => {
      resolve({
        stdout: String(stdout),
        stderr: String(stderr),
        code: error === null ? 0 : ((error as { code?: number }).code ?? 1)
      })
    })
  })

const gitExec: GitExec = Object.assign(runGitExec, { supportsEnv: true as const })
const gitExecWithoutEnv: GitExec = (args, options) => runGitExec(args, { cwd: options.cwd })

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi-rex-git-'))
  dirs.push(dir)
  await gitExec(['init', '--initial-branch=main'], { cwd: dir })
  await gitExec(['config', 'user.email', 't@t'], { cwd: dir })
  await gitExec(['config', 'user.name', 't'], { cwd: dir })
  return dir
}

async function commitFile(repo: string, name: string, content: string): Promise<void> {
  await writeFile(path.join(repo, name), content, 'utf8')
  await gitExec(['add', name], { cwd: repo })
  await gitExec(['commit', '-m', `add ${name}`], { cwd: repo })
}

afterEach(async () => {
  // worktree 挂着时先 prune 再删，避免残留注册表影响同仓库后续用例。
  for (const dir of dirs.splice(0)) {
    await gitExec(['worktree', 'prune', '--force'], { cwd: dir }).catch(() => undefined)
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
})

describe('基线快照', () => {
  it('零提交仓库 base_commit 为 null', async () => {
    const repo = await makeRepo()
    const snapshot = await snapshotBase(gitExec, repo)
    expect(snapshot.baseCommit).toBeNull()
    expect(snapshot.dirty).toEqual([])
  })

  it('脏文件进 dirty 列表', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    await writeFile(path.join(repo, 'b.txt'), 'dirty', 'utf8')
    const snapshot = await snapshotBase(gitExec, repo)
    expect(snapshot.baseCommit).toMatch(/^[0-9a-f]{40}$/)
    expect(snapshot.dirty).toEqual(['?? b.txt'])
  })
})

describe('全覆盖验收视图', () => {
  it('覆盖 committed + staged + unstaged 与 untracked 预览', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const base = await snapshotBase(gitExec, repo)

    // committed：新提交
    await commitFile(repo, 'c.txt', 'committed')
    // staged：暂存改动
    await writeFile(path.join(repo, 's.txt'), 'staged', 'utf8')
    await gitExec(['add', 's.txt'], { cwd: repo })
    // unstaged：已跟踪文件再改
    await writeFile(path.join(repo, 'a.txt'), 'v1-unstaged', 'utf8')
    // untracked 新文件
    await writeFile(path.join(repo, 'new.txt'), '第一行\n第二行', 'utf8')

    const report = await inspectChanges(
      gitExec,
      { readFile: async filePath => (await import('node:fs/promises')).readFile(filePath, 'utf8') },
      repo,
      base,
      { previewLines: 1 }
    )
    expect(report).toContain('## 提交')
    expect(report).toContain('add c.txt')
    expect(report).toContain('## 已跟踪改动')
    expect(report).toContain('a.txt')
    expect(report).toContain('s.txt')
    expect(report).toContain('## Untracked 新文件')
    expect(report).toContain('### new.txt')
    expect(report).toContain('第一行')
    expect(report).not.toContain('第二行')
  })

  it('新目录内的文件逐文件出现在验收预览（PR 审查 Block 2）', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const base = await snapshotBase(gitExec, repo)
    await mkdir(path.join(repo, 'newdir'), { recursive: true })
    await writeFile(path.join(repo, 'newdir/inside.txt'), 'inner', 'utf8')

    const report = await inspectChanges(
      gitExec,
      { readFile: async filePath => (await import('node:fs/promises')).readFile(filePath, 'utf8') },
      repo,
      base,
      {}
    )
    expect(report).toContain('### newdir/inside.txt')
    expect(report).toContain('inner')
    expect(report).not.toContain('均为非文本或不可读')
  })

  it('派生前已有 untracked 目录：目录内新增文件仍算 fresh（PR 审查 Block 2）', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    await mkdir(path.join(repo, 'olddir'), { recursive: true })
    await writeFile(path.join(repo, 'olddir/existing.txt'), 'old', 'utf8')
    const base = await snapshotBase(gitExec, repo)
    await writeFile(path.join(repo, 'olddir/added.txt'), 'new', 'utf8')

    const report = await inspectChanges(
      gitExec,
      { readFile: async filePath => (await import('node:fs/promises')).readFile(filePath, 'utf8') },
      repo,
      base,
      {}
    )
    expect(report).toContain('### olddir/added.txt')
    expect(report).not.toContain('### olddir/existing.txt')
  })

  it('createWorktree 以显式 baseCommit 为检出起点（PR 审查 Should fix）', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const first = (await gitExec(['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim()
    await commitFile(repo, 'b.txt', 'v2')
    const branch = worktreeBranch('review5', 'w-5')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-wt5`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch }, first)
    const head = (await gitExec(['rev-parse', 'HEAD'], { cwd: wtPath })).stdout.trim()
    expect(head).toBe(first)
  })

  it('零提交仓库降级为 status 视图', async () => {
    const repo = await makeRepo()
    await writeFile(path.join(repo, 'x.txt'), 'x', 'utf8')
    const report = await inspectChanges(
      gitExec,
      { readFile: async () => '' },
      repo,
      { baseCommit: null, dirty: [] },
      {}
    )
    expect(report).toContain('零提交仓库')
    expect(report).toContain('?? x.txt')
  })

  it('派生前已存在的脏文件不算 Untracked 新文件', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    await writeFile(path.join(repo, 'old.txt'), 'pre-existing', 'utf8')
    const base = await snapshotBase(gitExec, repo)
    const report = await inspectChanges(gitExec, { readFile: async () => '' }, repo, base, {})
    expect(report).toContain('## Untracked 新文件\n(无)')
  })
})

describe('worktree 生命周期（V3-04）', () => {
  it('worktreeDirtyNote 只在主工作区脏时出现', () => {
    expect(worktreeDirtyNote([])).toBeUndefined()
    expect(worktreeDirtyNote(['?? x'])).toContain('HEAD')
  })

  it('scanIgnoredDeps 报出存在项（含被 ignore 的仓库级 agent 本地配置）', async () => {
    const repo = await makeRepo()
    await mkdir(path.join(repo, 'node_modules')).catch(() => undefined)
    await mkdir(path.join(repo, '.claude'), { recursive: true }).catch(() => undefined)
    await writeFile(path.join(repo, '.env'), 'k=v', 'utf8')
    await writeFile(path.join(repo, '.claude/settings.local.json'), '{}', 'utf8')
    const found = await scanIgnoredDeps(
      {
        exists: async filePath =>
          (await import('node:fs/promises')).stat(filePath).then(
            () => true,
            () => false
          )
      },
      repo
    )
    expect(found).toContain('.env')
    expect(found).toContain('node_modules')
    expect(found).toContain('.claude/settings.local.json')
  })

  it('squash 落地：非祖先分支通过反向 apply 识别，并按探针 tip 原子删除', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session1', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-wt1`)
    dirs.push(wtPath) // 只登记 worktree 目录本身；dirname 是 tmpdir()，递归删除会波及他人
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })
    await gitExec(['remote', 'add', 'origin', '.'], { cwd: repo })
    await gitExec(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: repo })
    await gitExec(['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'], { cwd: repo })

    expect(await isBranchMerged(gitExec, repo, branch)).toBe(false)
    expect(await contentLanding(gitExec, repo, branch)).toBe('landed')
    const tip = (await gitExec(['rev-parse', `refs/heads/${branch}`], { cwd: repo })).stdout.trim()

    const commands: string[] = []
    const trackedGit: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        return gitExec(args, options)
      },
      { supportsEnv: true as const }
    )
    const landed = await cleanupWorktree(trackedGit, { mainCwd: repo, path: wtPath, branch })
    expect(landed).toMatchObject({ kind: 'removed', landedBy: 'content', baseRef: 'origin/main' })
    expect(commands.indexOf(`rev-parse refs/heads/${branch}`)).toBeLessThan(
      commands.findIndex(command => command.startsWith('diff --binary'))
    )
    expect(commands).toContain(`update-ref -d refs/heads/${branch} ${tip}`)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('临时 GIT_INDEX_FILE 对照 baseRef 的树，主仓落后时仍可识别 squash 落地', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-temp-index', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-temp-index`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })
    await gitExec(['remote', 'add', 'origin', '.'], { cwd: repo })
    await gitExec(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: repo })
    await gitExec(['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'], { cwd: repo })
    await commitFile(repo, 'unrelated.txt', 'advance main')
    expect((await gitExec(['status', '--porcelain'], { cwd: repo })).stdout).toBe('')

    const calls: Array<{ args: string[]; env?: Record<string, string> }> = []
    const trackedGit: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        calls.push({ args, env: options.env })
        return gitExec(args, options)
      },
      { supportsEnv: true as const }
    )
    expect(await contentLanding(trackedGit, repo, branch)).toBe('landed')
    expect(calls.some(call => call.args[0] === 'read-tree' && call.args[1] === 'origin/main')).toBe(true)
    expect(
      calls.some(
        call =>
          call.args[0] === 'apply' &&
          call.args.includes('--cached') &&
          call.env?.GIT_INDEX_FILE?.startsWith(path.join(tmpdir(), 'pi-rex-landing-'))
      )
    ).toBe(true)
    expect((await gitExec(['status', '--porcelain'], { cwd: repo })).stdout).toBe('')
  })

  it('反向 apply 失败：非祖先分支按 not-landed 保留', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-not-landed', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-not-landed`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'only in branch')

    const commands: string[] = []
    const trackedGit: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        return gitExec(args, options)
      },
      { supportsEnv: true as const }
    )
    const outcome = await cleanupWorktree(trackedGit, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'not-landed', baseRef: 'main' })
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('探针后分支 tip 前移时保留分支并重新判定，绝不以旧 tip 强删', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-tip-race', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-tip-race`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })
    const oldTip = (await gitExec(['rev-parse', `refs/heads/${branch}`], { cwd: repo })).stdout.trim()

    const commands: string[] = []
    let advanced = false
    const racingGit: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        const result = await gitExec(args, options)
        if (!advanced && args[0] === 'apply' && args.includes('--cached') && result.code === 0) {
          await commitFile(wtPath, 'late.txt', 'landed after probe')
          advanced = true
        }
        return result
      },
      { supportsEnv: true as const }
    )

    const outcome = await cleanupWorktree(racingGit, { mainCwd: repo, path: wtPath, branch })
    const newTip = (await gitExec(['rev-parse', `refs/heads/${branch}`], { cwd: repo })).stdout.trim()

    expect(advanced).toBe(true)
    expect(newTip).not.toBe(oldTip)
    expect(outcome).toMatchObject({
      kind: 'kept',
      landedBy: 'content',
      worktreeRemoved: true
    })
    expect(outcome.kind === 'kept' ? outcome.reason : '').toContain('分支在探针之后被推进，已重新判定前请再次关闭')
    expect(commands).toContain(`update-ref -d refs/heads/${branch} ${oldTip}`)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
    expect((await gitExec(['rev-parse', `refs/heads/${branch}`], { cwd: repo })).stdout.trim()).toBe(newTip)
  })

  it('探针后分支已消失时保留清理状态并重新判定，不把 update-ref no-op 当成已删', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-tip-missing', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-tip-missing`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })

    const commands: string[] = []
    let deleted = false
    const racingGit: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        const result = await gitExec(args, options)
        if (!deleted && args[0] === 'worktree' && args[1] === 'remove' && result.code === 0) {
          const removed = await gitExec(['branch', '-D', branch], { cwd: repo })
          deleted = removed.code === 0
        }
        return result
      },
      { supportsEnv: true as const }
    )

    const outcome = await cleanupWorktree(racingGit, { mainCwd: repo, path: wtPath, branch })

    expect(deleted).toBe(true)
    expect(outcome).toMatchObject({
      kind: 'kept',
      landedBy: 'content',
      worktreeRemoved: true
    })
    expect(outcome.kind === 'kept' ? outcome.reason : '').toContain('分支在探针之后被推进或删除')
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(
      await gitExec(['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { cwd: repo }).then(result => result.code)
    ).toBe(1)
  })

  it('反向 apply 返回 128 时 inconclusive，保留分支并保留 stderr 摘要', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-apply-128', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-apply-128`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')

    const commands: string[] = []
    const failingApply: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        if (args[0] === 'apply') {
          return { stdout: '', stderr: 'fatal: patch stream is corrupt', code: 128 }
        }
        return gitExec(args, options)
      },
      { supportsEnv: true as const }
    )
    const outcome = await cleanupWorktree(failingApply, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      unmerged: true,
      landing: 'inconclusive',
      baseRef: 'main'
    })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('git apply --reverse --check --cached')
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('exit 128')
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('fatal: patch stream is corrupt')
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('非祖先但 diff 为空的分支视为 landed，无需反向 apply patch', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-empty', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-empty-diff`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await gitExec(['commit', '--allow-empty', '-m', 'empty content'], { cwd: wtPath })
    expect(await isBranchMerged(gitExec, repo, branch)).toBe(false)

    const commands: string[] = []
    const trackedGit: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        return gitExec(args, options)
      },
      { supportsEnv: true as const }
    )
    const outcome = await cleanupWorktree(trackedGit, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'removed', landedBy: 'content' })
    expect(commands.some(command => command.startsWith('apply --reverse'))).toBe(false)
  })

  it('git diff 失败时 inconclusive，保留 worktree 且不尝试 branch -D', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-inconclusive', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-inconclusive`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')

    const commands: string[] = []
    const failingDiff: GitExec = Object.assign(
      async (args: string[], options: GitExecOptions) => {
        commands.push(args.join(' '))
        if (args[0] === 'diff') {
          return { stdout: '', stderr: 'fatal: diff exploded', code: 128 }
        }
        return gitExec(args, options)
      },
      { supportsEnv: true as const }
    )
    const outcome = await cleanupWorktree(failingDiff, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      unmerged: true,
      landing: 'inconclusive',
      baseRef: 'main'
    })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('git diff --binary')
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('fatal: diff exploded')
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('无 env 支持时即使主仓工作树含同内容也 fail closed，不删除未落地分支', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-dirty-main', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-dirty-main`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    // 主仓 HEAD 仍是 base，但工作树里恰好有与分支相同的未提交内容。旧降级路径会
    // 对这块可变工作树做反向 apply，从而把从未进入 base 的分支误判为 landed。
    await writeFile(path.join(repo, 'a.txt'), 'squashed', 'utf8')
    expect((await gitExec(['status', '--porcelain'], { cwd: repo })).stdout).toContain('a.txt')

    const commands: string[] = []
    const noEnvWithLog: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      return gitExecWithoutEnv(args, options)
    }
    const outcome = await cleanupWorktree(noEnvWithLog, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      unmerged: true,
      landing: 'inconclusive',
      baseRef: 'main'
    })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain(
      '宿主无法提供临时 index（缺少 env(1) 能力），拒绝用主仓工作树冒充 base 树'
    )
    expect(commands.some(command => command.startsWith('merge-base'))).toBe(false)
    expect(commands.some(command => command.startsWith('diff --binary'))).toBe(false)
    expect(commands.some(command => command.startsWith('apply --reverse'))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('dirty worktree 即使内容已 squash 落地也保留，且不执行落地探针', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-dirty', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-dirty-landed`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })
    await writeFile(path.join(wtPath, 'dirty.txt'), 'keep me', 'utf8')

    const commands: string[] = []
    const trackedGit: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(trackedGit, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: false })
    expect(commands.some(command => command.startsWith('diff --binary'))).toBe(false)
    expect(commands.some(command => command.startsWith('apply --reverse'))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
  })

  it('目录被 rm -rf 但注册还在（prunable）时 force 清理仍能收尾；重复清理幂等（codex exec 六轮 #2/#3）', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session2', 'w-2')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-wt2`)
    dirs.push(wtPath) // 只登记 worktree 目录本身；dirname 是 tmpdir()，递归删除会波及他人
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'w.txt', 'in worktree')
    // 模拟用户 rm -rf 了 worktree 目录：git status 不可用，注册残留为 prunable。
    await rm(wtPath, { recursive: true, force: true })

    // 非 force：目录没了但分支未合并（还有没合回去的提交），保留。
    const unmergedOutcome = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    expect(unmergedOutcome.kind).toBe('kept')
    expect(unmergedOutcome.kind === 'kept' ? unmergedOutcome.worktreeRemoved : false).toBe(true)

    // force：git worktree remove 自己裁决 prunable 注册，随后 branch -D 收尾。
    const forced = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch }, { force: true })
    expect(forced.kind).toBe('removed')
    const branches = await gitExec(['branch', '--list', branch], { cwd: repo })
    expect(branches.stdout.trim()).toBe('')

    // 幂等：worktree 与分支都没了，再跑一次按已清理回报，不误报「分支未合并」。
    const again = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    expect(again.kind).toBe('removed')
  })

  it('.git 丢失后 prune 移除注册但目录仍在时按残留保留，不误报 removed（codex exec 十一轮 #1）', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('review4', 'w-4')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-wt4`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await writeFile(path.join(wtPath, 'kept.txt'), 'residue', 'utf8')
    // worktree 的 .git 是文件；删掉后注册失效，prune 会移除注册但目录与文件仍在。
    await rm(path.join(wtPath, '.git'), { force: true })
    await gitExec(['worktree', 'prune', '--expire', 'now'], { cwd: repo })

    const outcome = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch }, { force: true })
    expect(outcome.kind).toBe('kept')
    expect(outcome.kind === 'kept' ? outcome.reason : '').toContain('目录仍在磁盘上')
    // 目录仍在：不得声称已移除。
    expect(outcome.kind === 'kept' ? outcome.worktreeRemoved : true).toBeFalsy()
  })

  it('分支被手工删（detached）而 worktree 仍在时不误报已清理；force 收尾（codex exec 七轮 #3）', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('review3', 'w-3')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-wt3`)
    dirs.push(wtPath) // 只登记 worktree 目录本身；dirname 是 tmpdir()，递归删除会波及他人
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    // detached HEAD 后分支可从主仓删除；worktree 里留未提交内容。
    await gitExec(['checkout', '--detach'], { cwd: wtPath })
    await writeFile(path.join(wtPath, 'uncommitted.txt'), 'x', 'utf8')
    await gitExec(['branch', '-D', branch], { cwd: repo })

    // 非 force：分支没了但 worktree 还在，绝不能报 removed（否则上层解除跟踪、
    // 留下不可见残留）。
    const outcome = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    expect(outcome.kind).toBe('kept')
    expect(outcome.kind === 'kept' ? outcome.reason : '').toContain('分支已被删除')

    // force：只移除 worktree（--force 丢弃未提交内容），不再跑 branch -D。
    const forced = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch }, { force: true })
    expect(forced.kind).toBe('removed')
  })
})
