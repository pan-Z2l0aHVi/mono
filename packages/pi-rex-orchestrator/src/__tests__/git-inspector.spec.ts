/**
 * git 验收与 worktree 生命周期。
 *
 * 用真实 `git init` / `git worktree add` 建临时仓库，不伪造 `.git` 文件：linked
 * worktree 的 `gitdir:` 布局差异只有真实 git 才能暴露。
 */

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  captureHeadTarget,
  cleanupWorktree,
  findMainRepo,
  probeMergeHead,
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
  new Promise<{ stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }>(resolve => {
    execFile('git', args, { cwd: options.cwd, env: process.env }, (error, stdout, stderr) => {
      resolve({
        stdout: String(stdout),
        stderr: String(stderr),
        code: error === null ? 0 : ((error as { code?: number }).code ?? 1),
        killed: false,
        truncated: false
      })
    })
  })

const gitExec: GitExec = runGitExec
const trackedGit =
  (commands: string[]): GitExec =>
  async (args, options) => {
    commands.push(args.join(' '))
    return gitExec(args, options)
  }

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

  it('squash 落地：钉住 base SHA 后逐路径比较并按探针 tip 原子删除', async () => {
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
    const baseSha = (await gitExec(['rev-parse', 'origin/main'], { cwd: repo })).stdout.trim()

    expect(await isBranchMerged(gitExec, repo, branch)).toBe(false)
    expect(await contentLanding(gitExec, repo, branch)).toBe('landed')
    const tip = (await gitExec(['rev-parse', `refs/heads/${branch}`], { cwd: repo })).stdout.trim()

    const commands: string[] = []
    const landed = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })
    expect(landed).toMatchObject({ kind: 'removed', landedBy: 'content', baseRef: 'origin/main', baseSha })
    const baseProbe = commands.indexOf('rev-parse origin/main')
    const tipProbe = commands.lastIndexOf(`rev-parse refs/heads/${branch}`)
    const nameOnly = commands.findIndex(command => command.startsWith('diff --name-only -z'))
    const mergeBases = commands.filter(command => command.startsWith('merge-base '))
    const quietCommands = commands.filter(command => command.startsWith('diff --quiet '))
    const quiet = commands.findIndex(command => command.startsWith('diff --quiet '))
    expect(baseSha).toMatch(/^[0-9a-f]{40}$/)
    expect(baseProbe).toBeGreaterThan(-1)
    expect(baseProbe).toBeLessThan(tipProbe)
    expect(tipProbe).toBeLessThan(nameOnly)
    expect(nameOnly).toBeLessThan(quiet)
    expect(mergeBases).toContain(`merge-base ${baseSha} ${tip}`)
    expect(quietCommands.length).toBeGreaterThan(0)
    for (const command of quietCommands) {
      const args = command.split(' ')
      expect(args[3]).toMatch(/^[0-9a-f]{40}$/)
      expect(args[3]).toBe(baseSha)
      expect(args[3]).not.toBe('origin/main')
    }
    expect(commands.some(command => command === 'merge-base origin/main ' + tip)).toBe(false)
    expect(commands.some(command => command.startsWith('diff --quiet --no-relative origin/main '))).toBe(false)
    expect(commands[quiet]).toContain('-- :(top,literal)a.txt')
    expect(commands).toContain(`update-ref -d refs/heads/${branch} ${tip}`)
    expect(commands.some(command => command === 'read-tree origin/main')).toBe(false)
    expect(commands.some(command => command.startsWith('apply '))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('主仓落后 baseRef 且工作树干净时，仍按引用内容识别 squash 落地', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-ref-content', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-ref-content`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })
    await gitExec(['remote', 'add', 'origin', '.'], { cwd: repo })
    await gitExec(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: repo })
    await gitExec(['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'], { cwd: repo })
    const baseSha = (await gitExec(['rev-parse', 'origin/main'], { cwd: repo })).stdout.trim()
    await commitFile(repo, 'unrelated.txt', 'advance main')
    expect((await gitExec(['status', '--porcelain'], { cwd: repo })).stdout).toBe('')

    const commands: string[] = []
    expect(await contentLanding(trackedGit(commands), repo, branch)).toBe('landed')
    expect(commands.some(command => command.startsWith('diff --name-only -z'))).toBe(true)
    expect(commands.some(command => command.startsWith(`diff --quiet --no-relative ${baseSha} `))).toBe(true)
    expect(commands.some(command => command.startsWith('diff --quiet --no-relative origin/main '))).toBe(false)
    expect(commands.some(command => command.startsWith('read-tree') || command.startsWith('apply '))).toBe(false)
    expect((await gitExec(['status', '--porcelain'], { cwd: repo })).stdout).toBe('')
  })

  it('会话从仓库子目录启动时仍按仓库根比较并识别 squash 落地', async () => {
    const repo = await makeRepo()
    await mkdir(path.join(repo, 'src'), { recursive: true })
    await commitFile(repo, 'src/x.ts', 'v1')
    const branch = worktreeBranch('session-subdir-landed', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-subdir-landed`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'src/x.ts', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), {
      mainCwd: path.join(repo, 'src'),
      path: wtPath,
      branch
    })

    expect(outcome).toMatchObject({ kind: 'removed', landedBy: 'content', baseRef: 'main' })
    expect(commands.some(command => command.includes('-- :(top,literal)src/x.ts'))).toBe(true)
    expect(commands.some(command => command.includes('-- :(literal)src/x.ts'))).toBe(false)
  })

  it('子目录内同名相对路径不能冒充仓库根路径并导致误删', async () => {
    const repo = await makeRepo()
    await mkdir(path.join(repo, 'src/src'), { recursive: true })
    await commitFile(repo, 'src/src/x.ts', 'decoy unchanged')
    const branch = worktreeBranch('session-subdir-decoy', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-subdir-decoy`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'src/x.ts', 'branch only')

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), {
      mainCwd: path.join(repo, 'src'),
      path: wtPath,
      branch
    })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'not-landed', baseRef: 'main' })
    expect(commands.some(command => command.includes('-- :(top,literal)src/x.ts'))).toBe(true)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('diff.relative=true 且从子目录启动时仍枚举子目录外改动，不误判 landed', async () => {
    const repo = await makeRepo()
    await mkdir(path.join(repo, 'src'), { recursive: true })
    await writeFile(path.join(repo, 'inside.ts'), 'root decoy unchanged', 'utf8')
    await writeFile(path.join(repo, 'src/inside.ts'), 'v1', 'utf8')
    await writeFile(path.join(repo, 'outside.txt'), 'v1', 'utf8')
    await gitExec(['add', '.'], { cwd: repo })
    await gitExec(['commit', '-m', 'baseline paths'], { cwd: repo })

    const branch = worktreeBranch('session-diff-relative', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-diff-relative`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await writeFile(path.join(wtPath, 'src/inside.ts'), 'branch inside', 'utf8')
    await writeFile(path.join(wtPath, 'outside.txt'), 'branch outside', 'utf8')
    await gitExec(['add', '.'], { cwd: wtPath })
    await gitExec(['commit', '-m', 'branch paths'], { cwd: wtPath })

    // 只落地子目录内文件；outside.txt 仍只存在于分支。
    await gitExec(['restore', '--source', branch, '--staged', '--worktree', 'src/inside.ts'], { cwd: repo })
    await gitExec(['commit', '-m', 'land only src/inside.ts'], { cwd: repo })

    const commands: string[] = []
    const relativeGit: GitExec = (args, options) => {
      commands.push(args.join(' '))
      return gitExec(['-c', 'diff.relative=true', ...args], options)
    }
    const outcome = await cleanupWorktree(relativeGit, {
      mainCwd: path.join(repo, 'src'),
      path: wtPath,
      branch
    })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'not-landed', baseRef: 'main' })
    expect(commands.some(command => command.startsWith('diff --name-only -z --no-relative'))).toBe(true)
    expect(commands.some(command => command.startsWith('diff --quiet --no-relative'))).toBe(true)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('任一路径内容不同：非祖先分支按 not-landed 保留', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-not-landed', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-not-landed`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'only in branch')
    const baseSha = (await gitExec(['rev-parse', 'main'], { cwd: repo })).stdout.trim()

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'not-landed', baseRef: 'main', baseSha })
    expect(commands.some(command => command.startsWith(`diff --quiet --no-relative ${baseSha} `))).toBe(true)
    expect(commands.some(command => command.startsWith('diff --quiet --no-relative main '))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('文件名带 pathspec magic 时仍按字面路径比较，不把缺失文件误判为落地', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-literal-path', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-literal-path`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await writeFile(path.join(wtPath, ':(exclude)*.txt'), 'must be compared', 'utf8')
    await gitExec(['add', '--all'], { cwd: wtPath })
    await gitExec(['commit', '-m', 'add literal pathspec filename'], { cwd: wtPath })

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'not-landed', baseRef: 'main' })
    expect(commands.some(command => command.includes('-- :(top,literal):(exclude)*.txt'))).toBe(true)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
  })

  it('非 UTF-8 文件名无法无损往返时返回 inconclusive，不删除 worktree 或分支', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-non-utf8', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-non-utf8`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')
    const decodedInvalidName = Buffer.from([0x66, 0x6f, 0x80, 0x6f]).toString('utf8')
    const ok = { stdout: '', stderr: '', code: 0, killed: false, truncated: false }

    const commands: string[] = []
    const invalidNameGit: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      if (args[0] === 'diff' && args.includes('--name-only')) return { ...ok, stdout: `${decodedInvalidName}\0` }
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(invalidNameGit, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'inconclusive', baseRef: 'main' })
    const detail = outcome.kind === 'kept' ? outcome.landingDetail : ''
    expect(detail).toContain('检测到无法无损往返的路径（可能含非 UTF-8 字节），拒绝自动判定')
    expect(detail).toContain(JSON.stringify('fo\uFFFDo'))
    expect(detail).toContain('此前已通过无损校验的路径数量：0')
    expect(commands.some(command => command.startsWith('diff --quiet'))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('diff --quiet 零退出但 literal pathspec 无对象时返回 inconclusive，不删除', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-empty-pathspec', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-empty-pathspec`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')
    const baseSha = (await gitExec(['rev-parse', 'main'], { cwd: repo })).stdout.trim()
    const tip = (await gitExec(['rev-parse', `refs/heads/${branch}`], { cwd: repo })).stdout.trim()
    const missingPath = 'missing-from-both-sides.txt'
    const ok = { stdout: '', stderr: '', code: 0, killed: false, truncated: false }

    const commands: string[] = []
    const emptyMatchGit: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      if (args[0] === 'diff' && args.includes('--name-only')) return { ...ok, stdout: `${missingPath}\0` }
      if (args[0] === 'diff' && args.includes('--quiet')) return ok
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(emptyMatchGit, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'inconclusive', baseRef: 'main' })
    const detail = outcome.kind === 'kept' ? outcome.landingDetail : ''
    expect(detail).toContain(`路径 ${JSON.stringify(missingPath)} 的 diff --quiet 返回 0`)
    expect(detail).toContain('literal pathspec 在 tip 与 merge-base 均未匹配任何对象')
    expect(commands.filter(command => command.startsWith('ls-tree -r -z '))).toEqual([
      `ls-tree -r -z ${tip} -- :(top,literal)${missingPath}`,
      `ls-tree -r -z ${baseSha} -- :(top,literal)${missingPath}`
    ])
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('重命名未完整落地时同时比较删除侧，不因新增侧同名同内容误判 landed', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-partial-rename', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-partial-rename`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await gitExec(['mv', 'a.txt', 'b.txt'], { cwd: wtPath })
    await gitExec(['commit', '-m', 'rename a to b'], { cwd: wtPath })

    // 主仓只新增了 b.txt，但旧路径 a.txt 仍存在；它不是这支重命名分支的完整落地。
    await writeFile(path.join(repo, 'b.txt'), 'v1', 'utf8')
    await gitExec(['add', 'b.txt'], { cwd: repo })
    await gitExec(['commit', '-m', 'add b without deleting a'], { cwd: repo })

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'not-landed', baseRef: 'main' })
    expect(commands.some(command => command.includes('--no-renames'))).toBe(true)
    expect(commands.some(command => command.includes('-- :(top,literal)a.txt'))).toBe(true)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
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
    const racingGit: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      const result = await gitExec(args, options)
      if (!advanced && args[0] === 'diff' && args.includes('--name-only') && result.code === 0) {
        await commitFile(wtPath, 'late.txt', 'landed after probe')
        advanced = true
      }
      return result
    }

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

  it('探针后分支已消失时按清理完成返回 removed，不把 update-ref no-op 当成已删', async () => {
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
    const racingGit: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      const result = await gitExec(args, options)
      if (!deleted && args[0] === 'worktree' && args[1] === 'remove' && result.code === 0) {
        const removed = await gitExec(['branch', '-D', branch], { cwd: repo })
        deleted = removed.code === 0
      }
      return result
    }

    const outcome = await cleanupWorktree(racingGit, { mainCwd: repo, path: wtPath, branch })

    expect(deleted).toBe(true)
    expect(outcome).toMatchObject({
      kind: 'removed',
      landedBy: 'content',
      baseRef: 'main'
    })
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(
      await gitExec(['rev-parse', '--verify', '-q', `refs/heads/${branch}`], { cwd: repo }).then(result => result.code)
    ).toBe(1)
  })

  it('内容落地分支仍被其他 linked worktree 检出时保留分支且不执行 update-ref', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-other-checkout', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-other-checkout-target`)
    const otherPath = path.join(repo, '..', `${path.basename(repo)}-other-checkout-holder`)
    dirs.push(wtPath, otherPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })
    await gitExec(['checkout', '--detach'], { cwd: wtPath })
    await gitExec(['worktree', 'add', otherPath, branch], { cwd: repo })

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      landedBy: 'content',
      worktreeRemoved: true
    })
    const reason = outcome.kind === 'kept' ? outcome.reason : ''
    expect(reason).toContain(`分支 ${branch} 仍被 ${await realpath(otherPath)} 检出，先解除检出再关闭`)
    expect(commands).toContain('worktree list --porcelain')
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('worktree 检出查询失败时保留内容落地分支并给出诊断', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-list-failed', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-list-failed`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    await gitExec(['merge', '--squash', branch], { cwd: repo })
    await gitExec(['commit', '-m', `squash ${branch}`], { cwd: repo })

    const commands: string[] = []
    const failingList: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      if (args[0] === 'worktree' && args[1] === 'list') {
        return { stdout: '', stderr: 'fatal: worktree list failed', code: 128, killed: false, truncated: false }
      }
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(failingList, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', landedBy: 'content', worktreeRemoved: true })
    const reason = outcome.kind === 'kept' ? outcome.reason : ''
    expect(reason).toContain('无法确认分支是否仍被其他 worktree 检出，拒绝删除')
    expect(reason).toContain('fatal: worktree list failed')
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('单条 diff --quiet 返回 128 时 inconclusive，保留分支并保留 stderr 摘要', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-quiet-128', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-quiet-128`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')
    const baseSha = (await gitExec(['rev-parse', 'main'], { cwd: repo })).stdout.trim()

    const commands: string[] = []
    const failingQuiet: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      if (args[0] === 'diff' && args.includes('--quiet')) {
        return { stdout: '', stderr: 'fatal: unable to read path', code: 128, killed: false, truncated: false }
      }
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(failingQuiet, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      unmerged: true,
      landing: 'inconclusive',
      baseRef: 'main'
    })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain(`git diff --quiet --no-relative ${baseSha}`)
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('exit 128')
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('fatal: unable to read path')
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('非祖先但 diff 为空的分支视为 landed，不执行路径比对', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-empty', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-empty-diff`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await gitExec(['commit', '--allow-empty', '-m', 'empty content'], { cwd: wtPath })
    expect(await isBranchMerged(gitExec, repo, branch)).toBe(false)

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'removed', landedBy: 'content' })
    expect(commands.some(command => command.startsWith('diff --name-only -z'))).toBe(true)
    expect(commands.some(command => command.startsWith('diff --quiet'))).toBe(false)
  })

  it('diff --name-only 返回 128 时 inconclusive，保留 worktree 且不尝试 branch -D', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-inconclusive', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-inconclusive`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')

    const commands: string[] = []
    const failingDiff: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      if (args[0] === 'diff' && args.includes('--name-only')) {
        return { stdout: '', stderr: 'fatal: diff exploded', code: 128, killed: false, truncated: false }
      }
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(failingDiff, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      unmerged: true,
      landing: 'inconclusive',
      baseRef: 'main'
    })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('git diff --name-only -z')
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('fatal: diff exploded')
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
  })

  it('主仓工作树含同内容不能影响引用比较，未提交分支仍保留', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-dirty-main', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-dirty-main`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'squashed')
    // 主仓 HEAD 仍是 base，但工作树里恰好有与分支相同的未提交内容。
    await writeFile(path.join(repo, 'a.txt'), 'squashed', 'utf8')
    expect((await gitExec(['status', '--porcelain'], { cwd: repo })).stdout).toContain('a.txt')
    const baseSha = (await gitExec(['rev-parse', 'main'], { cwd: repo })).stdout.trim()

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({
      kind: 'kept',
      unmerged: true,
      landing: 'not-landed',
      baseRef: 'main'
    })
    expect(commands.some(command => command.startsWith(`merge-base ${baseSha} `))).toBe(true)
    expect(commands.some(command => command.startsWith(`diff --quiet --no-relative ${baseSha} `))).toBe(true)
    expect(commands.some(command => command.startsWith('merge-base main '))).toBe(false)
    expect(commands.some(command => command.startsWith('diff --quiet --no-relative main '))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect(commands.some(command => command.startsWith('branch -D'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('diff --name-only zero-exit 但 truncated 时 inconclusive，绝不删除分支', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-name-truncated', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-name-truncated`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')

    const commands: string[] = []
    const truncated: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      if (args[0] === 'diff' && args.includes('--name-only')) {
        return { stdout: 'a.txt\0', stderr: '', code: 0, killed: false, truncated: true }
      }
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(truncated, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'inconclusive', baseRef: 'main' })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('truncated=true')
    expect(commands.some(command => command.startsWith('diff --quiet'))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
    expect(commands.some(command => command.startsWith('update-ref -d'))).toBe(false)
    expect((await gitExec(['branch', '--list', branch], { cwd: repo })).stdout).toContain(branch)
  })

  it('diff --name-only 被 killed 时 inconclusive，绝不删除分支', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'a.txt', 'v1')
    const branch = worktreeBranch('session-name-killed', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-name-killed`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    await commitFile(wtPath, 'a.txt', 'branch change')

    const killed: GitExec = async (args, options) => {
      if (args[0] === 'diff' && args.includes('--name-only')) {
        return { stdout: 'a.txt\0', stderr: '', code: 0, killed: true, truncated: false }
      }
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(killed, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'inconclusive', baseRef: 'main' })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('killed=true')
  })

  it('变更路径超过 200 时不截断放行，按 inconclusive 保留 worktree', async () => {
    const repo = await makeRepo()
    await commitFile(repo, 'base.txt', 'v1')
    const branch = worktreeBranch('session-too-many', 'w-1')
    const wtPath = path.join(repo, '..', `${path.basename(repo)}-too-many`)
    dirs.push(wtPath)
    await createWorktree(gitExec, { mainCwd: repo, path: wtPath, branch })
    for (let index = 0; index < 201; index += 1) {
      await writeFile(path.join(wtPath, `file-${index}.txt`), String(index), 'utf8')
    }
    await gitExec(['add', '.'], { cwd: wtPath })
    await gitExec(['commit', '-m', 'many changed paths'], { cwd: wtPath })

    const commands: string[] = []
    const outcome = await cleanupWorktree(trackedGit(commands), { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: true, landing: 'inconclusive', baseRef: 'main' })
    expect(outcome.kind === 'kept' ? outcome.landingDetail : '').toContain('201 个变更路径')
    expect(commands.some(command => command.startsWith('diff --quiet'))).toBe(false)
    expect(commands.some(command => command.startsWith('worktree remove'))).toBe(false)
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
    const recordingGit: GitExec = async (args, options) => {
      commands.push(args.join(' '))
      return gitExec(args, options)
    }
    const outcome = await cleanupWorktree(recordingGit, { mainCwd: repo, path: wtPath, branch })

    expect(outcome).toMatchObject({ kind: 'kept', unmerged: false })
    expect(commands.some(command => command.startsWith('diff --name-only'))).toBe(false)
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

describe('MERGE_HEAD gate & findMainRepo (fail-closed)', () => {
  it('probeMergeHead strictly separates clean (1), merging (0), and unknown (128 / killed / truncated)', async () => {
    const cleanExec = async () => ({ stdout: '', stderr: '', code: 1, killed: false, truncated: false })
    expect(await probeMergeHead(cleanExec, '/repo')).toEqual({ kind: 'clean' })

    const mergingExec = async () => ({ stdout: 'deadbeef\n', stderr: '', code: 0, killed: false, truncated: false })
    expect(await probeMergeHead(mergingExec, '/repo')).toEqual({ kind: 'merging' })

    const errExec = async () => ({ stdout: '', stderr: 'fatal', code: 128, killed: false, truncated: false })
    expect(await probeMergeHead(errExec, '/repo')).toEqual({ kind: 'unknown', code: 128 })

    const killedExec = async () => ({ stdout: '', stderr: '', code: 1, killed: true, truncated: false })
    expect(await probeMergeHead(killedExec, '/repo')).toEqual({ kind: 'unknown', code: 1 })

    const truncatedExec = async () => ({ stdout: '', stderr: '', code: 1, killed: false, truncated: true })
    expect(await probeMergeHead(truncatedExec, '/repo')).toEqual({ kind: 'unknown', code: 1 })
  })

  it('captureHeadTarget pins branch + sha, handles detached HEAD, and fails closed on killed/truncated', async () => {
    const branchExec = async (args: string[]) =>
      args[0] === 'symbolic-ref'
        ? { stdout: 'refs/heads/main\n', stderr: '', code: 0, killed: false, truncated: false }
        : { stdout: 'abc123\n', stderr: '', code: 0, killed: false, truncated: false }
    expect(await captureHeadTarget(branchExec, '/repo')).toEqual({ target: 'refs/heads/main@abc123' })

    const detachedExec = async (args: string[]) =>
      args[0] === 'symbolic-ref'
        ? { stdout: '', stderr: '', code: 1, killed: false, truncated: false }
        : { stdout: 'def456\n', stderr: '', code: 0, killed: false, truncated: false }
    expect(await captureHeadTarget(detachedExec, '/repo')).toEqual({ target: '(detached)@def456' })

    const killedExec = async () => ({ stdout: 'abc\n', stderr: '', code: 0, killed: true, truncated: false })
    expect('error' in (await captureHeadTarget(killedExec, '/repo'))).toBe(true)
  })

  it('findMainRepo strips trailing /.git and whitespace', async () => {
    const exec = async () => ({
      stdout: '/workspace/main/.git\n',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    })
    expect(await findMainRepo(exec, '/workspace/wt')).toBe('/workspace/main')
  })
})
