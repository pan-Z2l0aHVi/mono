/**
 * 全覆盖只读验收与 git worktree 生命周期。
 *
 * 验收视图以 `base_commit` 为基线：`git diff <base> --stat`（覆盖 Committed + Staged +
 * Unstaged 的已跟踪改动）+ `git log <base>..HEAD` + 与初始脏文件集对比出的 Untracked
 * 新文件预览。零提交仓库（`base_commit === null`）降级为 `git status --porcelain`，
 * 并禁用 Worktree 选项（V3-04）。
 *
 * 清理是保守契约：Worktree 只有在 `git status --porcelain` 为空 **且** 分支已合进主仓
 * `HEAD` 时才自动 `git worktree remove` + `git branch -d`；否则保留并报告路径，废弃
 * 分支的 `git branch -D` 必须显式 `force`。Pi 绝不自动 merge，只在汇报里给出合回命令。
 */

export type GitExec = (
  args: string[],
  options: { cwd: string }
) => Promise<{ stdout: string; stderr: string; code: number }>

/** lock 文件在验收视图里排除：全量 stat 会把依赖噪声顶满。 */
const LOCK_EXCLUDES = [':!package-lock.json', ':!pnpm-lock.yaml', ':!yarn.lock']

export interface BaseSnapshot {
  baseCommit: string | null
  /** worker 派生前主工作区的脏文件（`git status --porcelain` 输出行）。 */
  dirty: string[]
}

export interface InspectOptions {
  /** 只看单个路径的受控 diff。 */
  path?: string
  /** untracked 新文本文件预览的最大行数。 */
  previewLines?: number
  /** 各部分输出的字符上限，防单次 tool result 撑爆上下文。 */
  maxChars?: number
}

export async function runGit(exec: GitExec, cwd: string, args: string[]): Promise<string> {
  const result = await exec(args, { cwd })
  if (result.code !== 0) {
    throw new Error(
      `git ${args[0]} 失败（exit ${result.code}）: ${(result.stderr || result.stdout).trim().slice(0, 300)}`
    )
  }
  return result.stdout
}

/** 记录 worker 派生瞬间的基线。全新空仓库记 `base_commit === null`。 */
export async function snapshotBase(exec: GitExec, cwd: string): Promise<BaseSnapshot> {
  const rev = await exec(['rev-parse', '--verify', 'HEAD'], { cwd })
  const baseCommit = rev.code === 0 ? rev.stdout.trim() : null
  const status = await runGit(exec, cwd, ['status', '--porcelain'])
  return { baseCommit, dirty: status.split('\n').filter(line => line.trim() !== '') }
}

function untrackedPaths(lines: readonly string[]): string[] {
  return lines.filter(line => line.startsWith('?? ')).map(line => line.slice(3).trim())
}

function isUntrackedNew(line: string, initialDirty: readonly string[]): boolean {
  if (!line.startsWith('?? ')) return false
  const path = line.slice(3).trim()
  return !initialDirty.some(dirty => dirty.startsWith('?? ') && dirty.slice(3).trim() === path)
}

/** 验收视图；零提交仓库降级为 status + 新文件预览。 */
export async function inspectChanges(
  exec: GitExec,
  deps: { readFile(path: string): Promise<string> },
  cwd: string,
  base: BaseSnapshot,
  options: InspectOptions = {}
): Promise<string> {
  const maxChars = options.maxChars ?? 6000
  const sections: string[] = []
  const statusNow = (await runGit(exec, cwd, ['status', '--porcelain'])).split('\n').filter(l => l.trim() !== '')

  if (base.baseCommit === null) {
    sections.push('## 零提交仓库：无 HEAD 基线，以下为当前 status')
    sections.push(statusNow.length === 0 ? '(工作区干净)' : statusNow.join('\n'))
  } else {
    const log = await runGit(exec, cwd, ['log', `${base.baseCommit}..HEAD`, '--oneline'])
    sections.push('## 提交')
    sections.push(log.trim() === '' ? '(无新提交)' : log.trim())
    const stat = await runGit(exec, cwd, ['diff', base.baseCommit, '--stat', '--', ...LOCK_EXCLUDES])
    sections.push('## 已跟踪改动（Committed + Staged + Unstaged）')
    sections.push(stat.trim() === '' ? '(无)' : stat.trim())
    if (options.path) {
      const detail = await runGit(exec, cwd, ['diff', base.baseCommit, '--', options.path])
      sections.push(`## 路径 diff: ${options.path}`)
      sections.push(detail.trim() === '' ? '(无)' : detail.trim())
    }
  }

  const fresh = statusNow.filter(line => isUntrackedNew(line, base.dirty))
  if (fresh.length > 0) {
    const previewLines = options.previewLines ?? 20
    const previews: string[] = []
    for (const line of fresh.slice(0, 20)) {
      const filePath = untrackedPaths([line])[0]
      if (filePath === undefined) continue
      let content: string
      try {
        content = await deps.readFile(`${cwd}/${filePath}`)
      } catch {
        continue
      }
      if (content.includes('\0')) {
        previews.push(`### ${filePath}\n(二进制文件，跳过预览)`)
        continue
      }
      const clipped = content.split('\n').slice(0, previewLines).join('\n')
      previews.push(`### ${filePath}\n${clipped}`)
    }
    sections.push('## Untracked 新文件（相对 worker 派生前）')
    sections.push(previews.length === 0 ? '(均为非文本或不可读)' : previews.join('\n\n'))
  } else {
    sections.push('## Untracked 新文件\n(无)')
  }

  const report = sections.join('\n\n')
  return report.length > maxChars ? `${report.slice(0, maxChars)}\n…(截断，可用 path 参数缩小范围)` : report
}

/** 主工作区有未提交改动时给 ask_user 的提示（V3-04）。 */
export function worktreeDirtyNote(dirty: readonly string[]): string | undefined {
  return dirty.length === 0
    ? undefined
    : `注意：新 Worktree 基于当前 HEAD 检出，不包含主目录未提交的本地改动（当前有 ${dirty.length} 条脏记录）。`
}

export interface WorktreeSetup {
  mainCwd: string
  path: string
  branch: string
}

export const WORKTREE_BRANCH_PREFIX = 'pi-orch'

export function worktreeBranch(shortSession: string, workerId: string): string {
  return `${WORKTREE_BRANCH_PREFIX}/${shortSession}/${workerId}`
}

/** 主仓库常见被忽略的依赖；存在即在 brief 里告知 worker。 */
export async function scanIgnoredDeps(
  deps: { exists(path: string): Promise<boolean> },
  cwd: string,
  candidates: readonly string[] = ['.env', '.env.local', 'node_modules', '.venv']
): Promise<string[]> {
  const found: string[] = []
  for (const name of candidates) {
    if (await deps.exists(`${cwd}/${name}`)) found.push(name)
  }
  return found
}

export async function createWorktree(exec: GitExec, setup: WorktreeSetup): Promise<void> {
  await runGit(exec, setup.mainCwd, ['worktree', 'add', '-b', setup.branch, setup.path, 'HEAD'])
}

/** worktree 工作区是否干净。 */
export async function isWorktreeClean(exec: GitExec, worktreePath: string): Promise<boolean> {
  const status = await runGit(exec, worktreePath, ['status', '--porcelain'])
  return status.trim() === ''
}

/** 分支是否已合进主仓 HEAD。 */
export async function isBranchMerged(exec: GitExec, mainCwd: string, branch: string): Promise<boolean> {
  const merged = await runGit(exec, mainCwd, ['branch', '--merged', 'HEAD'])
  return merged
    .split('\n')
    .map(line => line.replace(/^[*+ ]*/, '').trim())
    .includes(branch)
}

export type CleanupOutcome =
  | { kind: 'removed'; branch: string }
  | { kind: 'kept'; reason: string; path: string; branch: string; mergeHint: string }

/** 汇报里给用户的合回命令；Pi 绝不自动执行 merge。 */
export function mergeHint(branch: string): string {
  return `git merge --no-ff ${branch}`
}

/**
 * 安全清理（V3-04）：干净且已合并才自动 `git worktree remove` + `git branch -d`；
 * `force` 时对未合并分支走 `git branch -D`（仍要求 worktree 先移除或已不存在）。
 */
export async function cleanupWorktree(
  exec: GitExec,
  setup: WorktreeSetup,
  options: { force?: boolean } = {}
): Promise<CleanupOutcome> {
  const clean = await isWorktreeClean(exec, setup.path).catch(() => false)
  const merged = await isBranchMerged(exec, setup.mainCwd, setup.branch).catch(() => false)
  if (!clean) {
    return {
      kind: 'kept',
      reason: 'worktree 存在未提交改动，需用户合并或确认废弃后通过 /rex-cleanup 二次确认删除',
      path: setup.path,
      branch: setup.branch,
      mergeHint: mergeHint(setup.branch)
    }
  }
  if (!merged && options.force !== true) {
    return {
      kind: 'kept',
      reason: '分支未合并进主仓 HEAD；确认放弃时用 /rex-cleanup 的 force 选项（git branch -D）',
      path: setup.path,
      branch: setup.branch,
      mergeHint: mergeHint(setup.branch)
    }
  }
  const removal = await exec(['worktree', 'remove', setup.path], { cwd: setup.mainCwd })
  if (removal.code !== 0 && !(await isWorktreeGone(exec, setup))) {
    return {
      kind: 'kept',
      reason: `git worktree remove 失败: ${removal.stderr.trim().slice(0, 200)}`,
      path: setup.path,
      branch: setup.branch,
      mergeHint: mergeHint(setup.branch)
    }
  }
  const branchArgs = merged ? ['branch', '-d', setup.branch] : ['branch', '-D', setup.branch]
  const branchResult = await exec(branchArgs, { cwd: setup.mainCwd })
  if (branchResult.code !== 0) {
    return {
      kind: 'kept',
      reason: `worktree 已移除，但分支清理失败: ${branchResult.stderr.trim().slice(0, 200)}（手动执行 git ${branchArgs.join(' ')}）`,
      path: setup.path,
      branch: setup.branch,
      mergeHint: mergeHint(setup.branch)
    }
  }
  return { kind: 'removed', branch: setup.branch }
}

async function isWorktreeGone(exec: GitExec, setup: WorktreeSetup): Promise<boolean> {
  const list = await runGit(exec, setup.mainCwd, ['worktree', 'list', '--porcelain'])
  return !list.split('\n').some(line => line.startsWith('worktree ') && line.slice(9) === setup.path)
}
