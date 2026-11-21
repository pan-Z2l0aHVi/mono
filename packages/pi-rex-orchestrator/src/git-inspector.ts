/**
 * 全覆盖只读验收与 git worktree 生命周期。
 *
 * 验收视图以 `base_commit` 为基线：`git diff <base> --stat`（覆盖 Committed + Staged +
 * Unstaged 的已跟踪改动）+ `git log <base>..HEAD` + 与初始脏文件集对比出的 Untracked
 * 新文件预览。零提交仓库（`base_commit === null`）降级为 `git status --porcelain`，
 * 并禁用 Worktree 选项（V3-04）。
 *
 * 清理是保守契约：Worktree 只有在 `git status --porcelain` 为空 **且** 分支已合进主仓
 * `HEAD` 或分支内容已经落地到 base 时才自动清理。内容落地同时覆盖普通 merge 与
 * squash merge；废弃分支的 `git branch -D` 必须显式 `force`。清理幂等：worktree
 * 与分支都已不存在时按已清理回报。
 */

import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'

export interface GitExecOptions {
  cwd: string
}

export interface GitExec {
  (
    args: string[],
    options: GitExecOptions
  ): Promise<{ stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }>
}

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
  const status = await runGit(exec, cwd, ['status', '--porcelain', '-z', '--untracked-files=all'])
  return { baseCommit, dirty: parseStatusZ(status).map(statusLine) }
}

export interface StatusEntry {
  /** 两位状态码，如 `??`、` M`、`R `。 */
  code: string
  path: string
}

/** 条目转回 porcelain 显示行（基线与报告共用同一种记账形态）。 */
export function statusLine(entry: StatusEntry): string {
  return `${entry.code} ${entry.path}`
}

/**
 * 解析 `git status --porcelain -z --untracked-files=all`：
 * 逐文件列出 untracked（默认会把新目录折叠成 `?? dir/`，验收预览因此读不到
 * 目录内的文件），`-z` 消除路径引号转义。renames/copies 的原始路径是紧随其后的
 * 独立字段，需要一并跳过。
 */
export function parseStatusZ(stdout: string): StatusEntry[] {
  const fields = stdout.split('\0')
  const entries: StatusEntry[] = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (field === undefined || field.length < 4) continue
    const code = field.slice(0, 2)
    entries.push({ code, path: field.slice(3) })
    if (code[0] === 'R' || code[0] === 'C') index += 1
  }
  return entries
}

function isUntrackedNew(entry: StatusEntry, initialDirty: readonly string[]): boolean {
  return entry.code === '??' && !initialDirty.includes(statusLine(entry))
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
  const statusEntries = parseStatusZ(await runGit(exec, cwd, ['status', '--porcelain', '-z', '--untracked-files=all']))

  if (base.baseCommit === null) {
    sections.push('## 零提交仓库：无 HEAD 基线，以下为当前 status')
    sections.push(statusEntries.length === 0 ? '(工作区干净)' : statusEntries.map(statusLine).join('\n'))
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

  const fresh = statusEntries.filter(entry => isUntrackedNew(entry, base.dirty))
  if (fresh.length > 0) {
    const previewLines = options.previewLines ?? 20
    const previews: string[] = []
    for (const entry of fresh.slice(0, 20)) {
      const filePath = entry.path
      let content: string
      try {
        content = await deps.readFile(`${cwd}/${filePath}`)
      } catch {
        previews.push(`### ${filePath}\n(读取失败，跳过预览)`)
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

/** 主仓库常见被忽略的依赖与本地配置；存在即在 brief 里告知 worker（worktree 里没有）。 */
export async function scanIgnoredDeps(
  deps: { exists(path: string): Promise<boolean> },
  cwd: string,
  candidates: readonly string[] = ['.env', '.env.local', 'node_modules', '.venv', '.claude/settings.local.json']
): Promise<string[]> {
  const found: string[] = []
  for (const name of candidates) {
    if (await deps.exists(`${cwd}/${name}`)) found.push(name)
  }
  return found
}

/** 从指定起点创建 worktree 分支；起点缺省 HEAD，传入 snapshotBase 的 baseCommit 可保证验收基线与检出起点一致。 */
export async function createWorktree(exec: GitExec, setup: WorktreeSetup, baseCommit?: string): Promise<void> {
  await runGit(exec, setup.mainCwd, ['worktree', 'add', '-b', setup.branch, setup.path, baseCommit ?? 'HEAD'])
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

export type ContentLanding = 'landed' | 'not-landed' | 'inconclusive'
type LandedBy = 'ancestor' | 'content'

interface ContentLandingProbe {
  landing: ContentLanding
  baseRef?: string
  detail?: string
  /** 内容探针实际验证的分支 tip；仅在 landed 时存在。 */
  landedTip?: string
}

function gitFailure(
  args: string[],
  result: { stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }
): string {
  const output = (result.stderr || result.stdout).trim().slice(0, 200) || '(无 stderr)'
  return `git ${args.join(' ')}（exit ${result.code}, killed=${result.killed}, truncated=${result.truncated}）: ${output}`
}

/**
 * 内容落地探针。它先钉住分支 tip 与 merge-base，再逐路径比较 baseRef 与 tip 的最终
 * 内容；这是「base 中这些路径的最终内容与分支一致」的保守判定。squash merge 后仍可
 * 识别，而 base 后续又改过同一路径时会返回 not-landed 并交还用户确认，绝不误删。
 * 函数只读仓库引用，不读取工作树、不使用 ambient index，也不产生 patch 输出。
 */
async function inspectContentLanding(
  exec: GitExec,
  mainCwd: string,
  branch: string,
  baseRef?: string
): Promise<ContentLandingProbe> {
  const complete = (result: { code: number; killed: boolean; truncated: boolean }): boolean =>
    result.code === 0 && !result.killed && !result.truncated
  let resolvedBase = baseRef
  const baseFailures: string[] = []
  if (resolvedBase === undefined) {
    const originHeadArgs = ['rev-parse', '--verify', '-q', 'refs/remotes/origin/HEAD']
    const originHead = await exec(originHeadArgs, { cwd: mainCwd })
    if (complete(originHead)) {
      const originSymbolicArgs = ['symbolic-ref', '-q', 'refs/remotes/origin/HEAD']
      const originSymbolic = await exec(originSymbolicArgs, { cwd: mainCwd })
      const remoteRef = originSymbolic.stdout.trim()
      if (complete(originSymbolic) && remoteRef.startsWith('refs/remotes/')) {
        resolvedBase = remoteRef.slice('refs/remotes/'.length)
      } else {
        baseFailures.push(gitFailure(originSymbolicArgs, originSymbolic))
      }
    } else {
      baseFailures.push(gitFailure(originHeadArgs, originHead))
    }
  }

  if (resolvedBase === undefined) {
    const mainArgs = ['rev-parse', '--verify', '-q', 'refs/heads/main']
    const mainProbe = await exec(mainArgs, { cwd: mainCwd })
    if (complete(mainProbe)) resolvedBase = 'main'
    else baseFailures.push(gitFailure(mainArgs, mainProbe))
  }

  if (resolvedBase === undefined) {
    const currentBranchArgs = ['symbolic-ref', '-q', '--short', 'HEAD']
    const currentBranch = await exec(currentBranchArgs, { cwd: mainCwd })
    const name = currentBranch.stdout.trim()
    if (complete(currentBranch) && name !== '') resolvedBase = name
    else baseFailures.push(gitFailure(currentBranchArgs, currentBranch))
  }

  if (resolvedBase === undefined) {
    return { landing: 'inconclusive', detail: `无法解析 baseRef；${baseFailures.join('；')}` }
  }

  const tipArgs = ['rev-parse', `refs/heads/${branch}`]
  const tip = await exec(tipArgs, { cwd: mainCwd })
  const landedTip = tip.stdout.trim()
  if (!complete(tip) || landedTip === '') {
    return { landing: 'inconclusive', baseRef: resolvedBase, detail: gitFailure(tipArgs, tip) }
  }

  const mergeBaseArgs = ['merge-base', resolvedBase, landedTip]
  const mergeBase = await exec(mergeBaseArgs, { cwd: mainCwd })
  const mergeBaseSha = mergeBase.stdout.trim()
  if (!complete(mergeBase) || mergeBaseSha === '') {
    return { landing: 'inconclusive', baseRef: resolvedBase, detail: gitFailure(mergeBaseArgs, mergeBase) }
  }

  const pathArgs = ['diff', '--name-only', '-z', mergeBaseSha, landedTip]
  const listed = await exec(pathArgs, { cwd: mainCwd })
  if (!complete(listed)) {
    return { landing: 'inconclusive', baseRef: resolvedBase, detail: gitFailure(pathArgs, listed) }
  }
  const changedPaths = listed.stdout.split('\0').filter(changedPath => changedPath !== '')
  if (changedPaths.length === 0) return { landing: 'landed', baseRef: resolvedBase, landedTip }
  if (changedPaths.length > 200) {
    return {
      landing: 'inconclusive',
      baseRef: resolvedBase,
      detail: `分支涉及 ${changedPaths.length} 个变更路径，超过每路径确认上限 200；无法安全自动删除`
    }
  }

  for (const changedPath of changedPaths) {
    // 名称来自仓库内容，必须按 literal pathspec 解释，避免 `:(exclude)...` 之类的文件名
    // 让 quiet diff 意外匹配空集合并返回 0。
    const literalPathspec = `:(literal)${changedPath}`
    const quietArgs = ['diff', '--quiet', resolvedBase, landedTip, '--', literalPathspec]
    const quiet = await exec(quietArgs, { cwd: mainCwd })
    if (quiet.killed || quiet.truncated) {
      return { landing: 'inconclusive', baseRef: resolvedBase, detail: gitFailure(quietArgs, quiet) }
    }
    if (quiet.code === 0) continue
    if (quiet.code === 1) {
      return { landing: 'not-landed', baseRef: resolvedBase, detail: gitFailure(quietArgs, quiet) }
    }
    return { landing: 'inconclusive', baseRef: resolvedBase, detail: gitFailure(quietArgs, quiet) }
  }
  return { landing: 'landed', baseRef: resolvedBase, landedTip }
}

export async function contentLanding(
  exec: GitExec,
  mainCwd: string,
  branch: string,
  baseRef?: string
): Promise<ContentLanding> {
  return (await inspectContentLanding(exec, mainCwd, branch, baseRef)).landing
}

export type CleanupOutcome =
  | {
      kind: 'removed'
      branch: string
      landedBy?: LandedBy
      baseRef?: string
    }
  | {
      kind: 'kept'
      reason: string
      path: string
      branch: string
      /** 合回命令；是否执行由调用方在用户明确同意后决定。 */
      mergeHint: string
      /** 干净但内容未确认落地：调用方据此给出 PR / force 二选一。 */
      unmerged: boolean
      landedBy?: LandedBy
      landing?: Exclude<ContentLanding, 'landed'>
      baseRef?: string
      /** inconclusive 时给用户看的命令与 stderr 摘要。 */
      landingDetail?: string
      /**
       * worktree 目录已移除、只剩分支没删掉。调用方的提示必须按实际状态给：
       * 此时不能再声称「worktree 保留」，补救里 `git worktree remove` 必然失败。
       */
      worktreeRemoved?: boolean
      /** 实际使用的分支删除命令（`branch -d/-D` 或带旧 tip 的 `update-ref -d`）：补救提示按它给。 */
      branchDeleteCommand?: string
    }

/** 合回命令；执行与否由调用方按用户确认决定。 */
export function mergeHint(branch: string): string {
  return `git merge --no-ff ${branch}`
}

/**
 * 安全清理（V3-04）：干净且已合并（祖先链或内容落地）才自动清理；
 * `force` 时对未合并分支走 `git branch -D`（仍要求 worktree 先移除或已不存在）。
 * 幂等：worktree 与分支都已清理时返回 removed，重复 `/rex-cleanup` 不会误报。
 * 目录不可用（被 rm -rf / 损坏）时把裁决交给 `git worktree remove`——它认得
 * prunable 注册残留与路径规范化，自建字符串比对在 `/var` 与 `/private/var`
 * 这类 canonical 差异上会判错。
 */
export async function cleanupWorktree(
  exec: GitExec,
  setup: WorktreeSetup,
  options: { force?: boolean } = {}
): Promise<CleanupOutcome> {
  // 分支探针严格按退出码解释：0 存在、1 不存在、其余（128 等）是查询失败。
  // 查询失败不能当「已清理」——detached HEAD + 手删分支的真实场景里，分支没了
  // 但 worktree 还注册着、还可能有未提交内容，误报 removed 会让上层解除跟踪、
  // 留下不可见的残留工作区。
  const branchProbe = await exec(['rev-parse', '--verify', '-q', `refs/heads/${setup.branch}`], {
    cwd: setup.mainCwd
  })
  if (branchProbe.code !== 0 && branchProbe.code !== 1) {
    return {
      kind: 'kept',
      reason: `分支状态查询失败（exit ${branchProbe.code}）: ${branchProbe.stderr.trim().slice(0, 200)}`,
      path: setup.path,
      branch: setup.branch,
      mergeHint: mergeHint(setup.branch),
      unmerged: false
    }
  }
  if (branchProbe.code === 1) {
    const registered = await isWorktreeRegistered(exec, setup).catch(() => true)
    const dirUsable = (await exec(['status', '--porcelain'], { cwd: setup.path })).code === 0
    if (!registered && !dirUsable) return { kind: 'removed', branch: setup.branch }
    if (options.force !== true) {
      return {
        kind: 'kept',
        reason: '分支已被删除，但 worktree 仍存在或仍注册；手动 git worktree remove，或确认后 force 关闭自动清理',
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: false
      }
    }
    // force 且分支已没了：只移除 worktree，不再对不存在的分支跑 branch -D。
    // 目录里可能有未提交内容（detached 场景），force 语义下由 git --force 丢弃。
    const removal = await exec(['worktree', 'remove', '--force', setup.path], { cwd: setup.mainCwd })
    if (removal.code !== 0) {
      return {
        kind: 'kept',
        reason: `分支已删除但 git worktree remove 失败: ${removal.stderr.trim().slice(0, 200)}`,
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: false
      }
    }
    return { kind: 'removed', branch: setup.branch }
  }

  let landedBy: LandedBy | undefined
  let landing: Exclude<ContentLanding, 'landed'> | undefined
  let baseRef: string | undefined
  let landingDetail: string | undefined
  let landedTip: string | undefined

  const canReuseBranch = async (): Promise<boolean> => {
    if (await isBranchMerged(exec, setup.mainCwd, setup.branch).catch(() => false)) {
      landedBy = 'ancestor'
      return true
    }
    const probe = await inspectContentLanding(exec, setup.mainCwd, setup.branch)
    baseRef = probe.baseRef
    landingDetail = probe.detail
    if (probe.landing === 'landed' && probe.landedTip !== undefined) {
      landedBy = 'content'
      landedTip = probe.landedTip
      return true
    }
    if (probe.landing === 'landed') {
      landing = 'inconclusive'
      landingDetail = '内容落地探针没有返回已验证的分支 tip，拒绝删除'
    } else {
      landing = probe.landing
    }
    return false
  }

  const statusResult = await exec(['status', '--porcelain'], { cwd: setup.path })
  if (statusResult.code !== 0) {
    // 目录不存在或不可用：git worktree remove 自己会安全裁决（含 prunable 状态）。
    // remove 失败不等于注册还在——上次清理可能已把注册移走（"is not a working
    // tree"）：注册确实不在了就当目录与注册均已清理，落到分支阶段。
    const removal = await exec(['worktree', 'remove', setup.path], { cwd: setup.mainCwd })
    if (removal.code !== 0) {
      const stillRegistered = await isWorktreeRegistered(exec, setup).catch(() => true)
      if (stillRegistered) {
        return {
          kind: 'kept',
          reason: `worktree 不可用且 git worktree remove 失败（status: ${statusResult.stderr.trim().slice(0, 120)}）: ${removal.stderr.trim().slice(0, 200)}`,
          path: setup.path,
          branch: setup.branch,
          mergeHint: mergeHint(setup.branch),
          unmerged: false
        }
      }
      // 注册已不在 ≠ 目录已消失：worktree 的 .git 丢失后 prune 会移除注册，但目录与
      // 文件仍在磁盘上。目录仍存在时按残留保留，绝不当作已清理。
      if (await pathExists(setup.path)) {
        return {
          kind: 'kept',
          reason: 'worktree 注册已被清理，但目录仍在磁盘上（可能残留文件）；手动删除该目录后即完成清理',
          path: setup.path,
          branch: setup.branch,
          mergeHint: mergeHint(setup.branch),
          unmerged: false
        }
      }
    }
    // 目录已没了，但分支上可能还有没合回去的提交：不经 force 不得删。
    if (options.force !== true && !(await canReuseBranch())) {
      return {
        kind: 'kept',
        reason: 'worktree 目录已不存在，但分支内容尚未确认落地；先走 PR 合并，或确认废弃后用 force 关闭',
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: true,
        landing,
        baseRef,
        landingDetail,
        worktreeRemoved: true
      }
    }
  } else {
    if (statusResult.stdout.trim() !== '') {
      return {
        kind: 'kept',
        reason: 'worktree 存在未提交改动，需用户走 PR 合并或确认废弃后通过 /rex-cleanup 二次确认删除',
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: false
      }
    }
    if (options.force !== true && !(await canReuseBranch())) {
      return {
        kind: 'kept',
        reason: '分支内容尚未确认落地；先走 PR 合并，或确认废弃后用 force 清理',
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: true,
        landing,
        baseRef,
        landingDetail
      }
    }
    const removal = await exec(['worktree', 'remove', setup.path], { cwd: setup.mainCwd })
    if (removal.code !== 0) {
      return {
        kind: 'kept',
        reason: `git worktree remove 失败: ${removal.stderr.trim().slice(0, 200)}`,
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: false
      }
    }
  }
  // 内容落地分支必须用探针见过的旧 tip 原子删除；tip 变化时保留分支等待重判。
  // 祖先链仍走 branch -d，显式 force 仍走 branch -D。
  const contentDelete = landedBy === 'content' && options.force !== true
  let branchArgs: string[]
  if (contentDelete) {
    if (landedTip === undefined) {
      return {
        kind: 'kept',
        reason: '内容落地成功但没有记录已验证的分支 tip，拒绝删除',
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: false,
        landedBy,
        baseRef,
        worktreeRemoved: true
      }
    }
    // `update-ref -d <ref> <old>` 对已不存在的 ref 会成功 no-op；先确认分支仍存在，
    // 再让 update-ref 原子校验 tip。探针后分支已消失说明外部已完成这部分清理。
    const existingArgs = ['rev-parse', '--verify', '-q', `refs/heads/${setup.branch}`]
    const existing = await exec(existingArgs, { cwd: setup.mainCwd })
    if (existing.code !== 0) {
      if (existing.code === 1 && !existing.killed && !existing.truncated) {
        return { kind: 'removed', branch: setup.branch, landedBy, baseRef }
      }
      return {
        kind: 'kept',
        reason:
          existing.code === 1
            ? '分支在探针之后被推进或删除，已重新判定前请再次关闭；删除前已找不到该分支，未改用 -D'
            : `分支在探针之后被推进或删除，已重新判定前请再次关闭；${gitFailure(existingArgs, existing)}`,
        path: setup.path,
        branch: setup.branch,
        mergeHint: mergeHint(setup.branch),
        unmerged: false,
        landedBy,
        baseRef,
        worktreeRemoved: true,
        branchDeleteCommand: `git ${existingArgs.join(' ')}`
      }
    }
    branchArgs = ['update-ref', '-d', `refs/heads/${setup.branch}`, landedTip]
  } else {
    branchArgs = ['branch', options.force === true ? '-D' : '-d', setup.branch]
  }
  const branchResult = await exec(branchArgs, { cwd: setup.mainCwd })
  if (branchResult.code !== 0) {
    return {
      kind: 'kept',
      reason: contentDelete
        ? `分支在探针之后被推进，已重新判定前请再次关闭；${gitFailure(branchArgs, branchResult)}`
        : `worktree 已移除，但分支清理失败: ${branchResult.stderr.trim().slice(0, 200)}（手动执行 git ${branchArgs.join(' ')}）`,
      path: setup.path,
      branch: setup.branch,
      mergeHint: mergeHint(setup.branch),
      unmerged: false,
      landedBy,
      baseRef,
      worktreeRemoved: true,
      branchDeleteCommand: `git ${branchArgs.join(' ')}`
    }
  }
  return {
    kind: 'removed',
    branch: setup.branch,
    ...(landedBy === undefined ? {} : { landedBy }),
    ...(landedBy === 'content' && baseRef !== undefined ? { baseRef } : {})
  }
}

/**
 * worktree 是否仍注册在主仓。块级解析 `worktree list --porcelain` 并按 canonicalized
 * 路径比对：macOS 上 Git 输出 `/private/var/...` 而调用方可能拿 `/var/...`，
 * `path.resolve` 不消解符号链接，二者会判错。
 */
async function isWorktreeRegistered(exec: GitExec, setup: WorktreeSetup): Promise<boolean> {
  const list = await runGit(exec, setup.mainCwd, ['worktree', 'list', '--porcelain'])
  const registeredPaths = await Promise.all(
    list
      .split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => canonicalize(line.slice(9)))
  )
  const setupPath = await canonicalize(setup.path)
  return registeredPaths.some(registeredPath => registeredPath === setupPath)
}

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await stat(pathname)
    return true
  } catch {
    return false
  }
}

/**
 * canonical 化一个可能已不存在的路径：realpath 到最近存在的祖先，再把不存在的
 * 尾段拼回去。路径尚存在时就是普通 realpath。
 */
async function canonicalize(pathname: string): Promise<string> {
  let current = pathname
  const missingTail: string[] = []
  for (;;) {
    try {
      const resolved = await realpath(current)
      return missingTail.length === 0 ? resolved : path.join(resolved, ...missingTail)
    } catch {
      const parent = path.dirname(current)
      if (parent === current) return path.join(current, ...missingTail)
      missingTail.unshift(path.basename(current))
      current = parent
    }
  }
}
