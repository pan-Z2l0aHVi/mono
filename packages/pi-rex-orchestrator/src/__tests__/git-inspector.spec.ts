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
  createWorktree,
  inspectChanges,
  isBranchMerged,
  isWorktreeClean,
  scanIgnoredDeps,
  snapshotBase,
  worktreeBranch,
  worktreeDirtyNote
} from '../git-inspector'

const dirs: string[] = []

const gitExec = (args: string[], options: { cwd: string }) =>
  new Promise<{ stdout: string; stderr: string; code: number }>(resolve => {
    execFile('git', args, { cwd: options.cwd }, (error, stdout, stderr) => {
      resolve({
        stdout: String(stdout),
        stderr: String(stderr),
        code: error === null ? 0 : ((error as { code?: number }).code ?? 1)
      })
    })
  })

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

  it('干净且已合并才自动清理并删分支；未合并保留并给出合回命令', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session1', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-wt1`)
    dirs.push(wtPath) // 只登记 worktree 目录本身；dirname 是 tmpdir()，递归删除会波及他人
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'w.txt', 'in worktree')

    const dirtyOutcome = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    expect(dirtyOutcome.kind).toBe('kept')
    expect(dirtyOutcome.kind === 'kept' ? dirtyOutcome.mergeHint : '').toContain('git merge --no-ff')

    // 丢弃 worktree 里的提交（回到干净状态）但分支仍未合并：非 force 仍保留。
    await gitExec(['checkout', '--', '.'], { cwd: wtPath }).catch(() => undefined)
    await gitExec(['reset', '--hard', 'HEAD'], { cwd: wtPath })
    expect(await isWorktreeClean(gitExec, wtPath)).toBe(true)
    expect(await isBranchMerged(gitExec, repo, branch)).toBe(false)

    const unmerged = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    expect(unmerged.kind).toBe('kept')

    // force：未合并分支走 branch -D，worktree 移除，分支删除。
    const forced = await cleanupWorktree(gitExec, { mainCwd: repo, path: wtPath, branch }, { force: true })
    expect(forced.kind).toBe('removed')
    const branches = await gitExec(['branch', '--list', branch], { cwd: repo })
    expect(branches.stdout.trim()).toBe('')
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
