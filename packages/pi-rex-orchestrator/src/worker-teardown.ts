/**
 * Worker 收尾与残留资源清理（`rex_close_worker` 与 `/rex-cleanup` 共用）。
 *
 * 严格遵循 fail-closed 顺序：
 * 1. 关闭 retired Block（每关掉一个立即出列并持久化，失败则整体中止，不动 worktree）；
 * 2. 关闭活跃 Block（`unconfirmed:` 占位符跳过；成功后置 `activeBlockClosed`）；
 * 3. 若有 worktree：先判定是否已合入/内容已落地（含 squash merge），未落地时仅在有 UI
 *    且用户显式确认后才提供无 PR 仓库本地 `git merge --no-ff` 兜底（合并前后二次校验
 *    `MERGE_HEAD` 与 `HEAD` 目标），合并失败只诊断不自动 `git merge --abort`。
 */

import {
  captureHeadTarget,
  cleanupWorktree,
  findMainRepo,
  mergeHint,
  probeMergeHead,
  runGit,
  type CleanupOutcome,
  type GitExec
} from './git-inspector'
import type { PiToolResult } from './pi-types'
import type { RexAdapter } from './rex-adapter'
import type { WorkerRegistry } from './state-machine'

export interface TeardownUiContext {
  hasUI: boolean
  ui: {
    confirm(title: string, message?: string): Promise<boolean>
    notify(message: string, type?: 'info' | 'warning' | 'error'): void
  }
}

export interface TeardownDeps {
  adapter: Pick<RexAdapter, 'blockClose'>
  registry: WorkerRegistry
  gitExec: GitExec
  persistRegistry(): void
}

function text(content: string, isError = false): PiToolResult {
  return { content: [{ type: 'text', text: content }], isError }
}

/**
 * 清理失败后给用户的手动补救命令。命令行只含可直接复制执行的内容，跳过条件
 * 单独成行；两条命令相互独立——cleanupWorktree 可能已经移除了 worktree、只是
 * 分支删除失败，`&&` 会让第一条必然失败的命令挡住真正需要执行的第二条。
 */
function manualCleanupHint(worktree: { path: string; branch: string }, branchDeleteCommand?: string): string {
  return [
    '请手动执行（已存在的步骤可跳过）：',
    `git worktree remove "${worktree.path}"`,
    branchDeleteCommand ?? `git branch -d "${worktree.branch}"`
  ].join('\n')
}

/** close / cleanup 共用的唯一措辞来源，保证落地判定与用户动作一致。 */
function formatCleanupOutcome(worktree: { path: string; branch: string }, outcome: CleanupOutcome): string {
  if (outcome.kind === 'removed') {
    return outcome.landedBy === 'content'
      ? `worktree 与分支 ${outcome.branch} 已清理：内容已在 ${outcome.baseRef ?? 'base'} 中（squash 合并），因此无需确认。`
      : `worktree 与分支 ${outcome.branch} 已清理。`
  }

  const target = outcome.worktreeRemoved ? `worktree 目录已移除，但分支 ${worktree.branch} 保留` : 'worktree 保留'
  const pathLine = outcome.worktreeRemoved ? undefined : `路径：${worktree.path}`

  if (outcome.unmerged && outcome.landing === 'not-landed') {
    return [
      `${target}：分支内容不在 ${outcome.baseRef ?? 'base'} 中。`,
      pathLine,
      '请现在二选一：',
      '1. 按该仓库自身流程合并（有 PR 流程走 PR；无 PR 流程确认后可本地 merge）；',
      '2. 确认废弃 → 用 force: true 清理。'
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n')
  }

  if (outcome.unmerged && outcome.landing === 'inconclusive') {
    const baseRef = outcome.baseRef ?? 'base'
    return [
      `${target}：无法自动判定分支内容是否已在 ${baseRef} 中。`,
      `判定原因：${outcome.landingDetail ?? outcome.reason}`,
      pathLine,
      '请现在二选一：',
      `1. 按该仓库自身流程合并（有 PR 流程走 PR；无 PR 流程确认后可本地 merge）；`,
      `2. 确认内容已在 ${baseRef}，或确认废弃 → 用 force: true 清理。`
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n')
  }

  if (outcome.worktreeRemoved && outcome.landedBy === 'content') {
    return `${target}：${outcome.reason}`
  }

  if (outcome.worktreeRemoved) {
    return `worktree 目录已移除，但分支清理失败：${outcome.reason}\n${manualCleanupHint(worktree, outcome.branchDeleteCommand)}`
  }
  return [`${target}：${outcome.reason}`, pathLine].filter((line): line is string => line !== undefined).join('\n')
}

export async function closeWorker(
  deps: TeardownDeps,
  params: { workerId: string; force?: boolean },
  ctx: TeardownUiContext
): Promise<PiToolResult> {
  const { adapter, registry, gitExec } = deps
  const worker = registry.get(params.workerId)
  if (!worker) return text(`未知 worker "${params.workerId}"。`, true)

  // 派生结果不明的 placeholder：真实 Block 可能在 Rex 里运行，而它的全新
  // worktree「干净且无独立提交」——非 force 清理会命中 clean+merged 判定，把
  // 可能正被使用的 worktree 删掉。必须过用户显式确认，无 UI 就保留。
  const unconfirmed = worker.blockId.startsWith('unconfirmed:')
  if (unconfirmed && worker.worktree) {
    if (!ctx.hasUI) {
      return text(
        [
          `worker ${worker.workerId} 的派生结果不明（blockId=${worker.blockId}）。`,
          '当前会话没有弹窗 UI，不能安全清理；worktree 保留：',
          `${worker.worktree.path}（branch ${worker.worktree.branch}）。`,
          '请先在 Rex Tab 确认没有该 label 的 Block 在跑，再在有 UI 的会话里清理。'
        ].join('\n'),
        true
      )
    }
    const confirmed = await ctx.ui.confirm(
      `清理未确认 worker ${worker.workerId} 的 worktree？`,
      '该 worker 的 rex run 曾返回异常：请先确认 Rex Tab 里没有对应 label 的 Block 在运行。' +
        '确认后执行 git worktree remove + git branch -D，未提交工作不可找回。'
    )
    if (!confirmed) {
      return text(
        [
          `用户拒绝清理，worker ${worker.workerId} 保持原状。`,
          `worktree：${worker.worktree.path}（branch ${worker.worktree.branch}）` +
            '——确认 Rex Tab 后重试 rex_close_worker。'
        ].join('\n'),
        true
      )
    }
  }

  if (params.force === true && !ctx.hasUI) {
    return text('force 关闭需要弹窗确认，当前会话没有 UI。请先征得用户同意。', true)
  }
  if (params.force === true) {
    const ok = await ctx.ui.confirm(
      '放弃未合并分支？',
      `${worker.worktree?.branch ?? worker.workerId} 将绕过祖先链与内容落地判定；force 会执行 git branch -D，尚未进入主分支的提交不可找回。`
    )
    if (!ok) return text('用户拒绝 force，worker 保持原状。', true)
  }

  // 任一真实 Block 关不掉（焦点占用/瞬时错误）就整体中止：Block 可能还活着，
  // 它的 cwd 就是这个 worktree——继续清理可能删掉运行中 worker 的工作区。
  // 顺序与记账：retired 先关、成功即出列（重试不再重复关）；活跃 Block 最后
  // 关成功后置 activeBlockClosed，重试跳过重复关闭。合成 blockId（unconfirmed:
  // 前缀）不指向真实 Block，直接跳过。
  const closeFailure = (blockId: string, reason: string) =>
    text(
      [
        `worker ${worker.workerId} 保持原状：Block ${blockId} 关闭失败（${reason}）。`,
        '未清理其 worktree（Block 可能仍在运行）；请先在 Rex Tab 确认该 Block 状态，稍后重试 rex_close_worker。'
      ].join('\n'),
      true
    )

  for (const blockId of worker.retiredBlockIds) {
    const closed: string | true = await adapter.blockClose(blockId).then(
      () => true as const,
      error => (error instanceof Error ? error.message : String(error))
    )
    if (closed !== true) return closeFailure(blockId, closed)
    registry.removeRetiredBlock(worker.workerId, blockId)
    // 关掉一个就落一次盘：后续 Block 失败早退时，已关闭的 retired 不能留在快照里。
    deps.persistRegistry()
  }
  if (!worker.activeBlockClosed && !unconfirmed) {
    const closed: string | true = await adapter.blockClose(worker.blockId).then(
      () => true as const,
      error => (error instanceof Error ? error.message : String(error))
    )
    if (closed !== true) return closeFailure(worker.blockId, closed)
    registry.markActiveBlockClosed(worker.workerId)
    deps.persistRegistry()
  }

  let cleanupNote: string | undefined
  if (worker.worktree) {
    const worktree = worker.worktree
    const mainCwd = worker.mainCwd ?? (await findMainRepo(gitExec, worker.cwd).catch(() => worker.cwd))
    let outcome = await cleanupWorktree(
      gitExec,
      { mainCwd, path: worktree.path, branch: worktree.branch },
      { force: unconfirmed || params.force === true }
    )
    // 干净但未确认落地：保留本地 merge 作为无 PR 流程仓库的兜底。任何 merge
    // 都必须再次显式确认；合并失败只诊断，不自动 abort，归属不明的处置交还用户。
    let mergedByUs = false
    if (outcome.kind === 'kept' && outcome.unmerged && ctx.hasUI && !unconfirmed && params.force !== true) {
      const mergeGateBefore = await probeMergeHead(gitExec, mainCwd)
      const targetBefore = await captureHeadTarget(gitExec, mainCwd)
      if (mergeGateBefore.kind !== 'clean') {
        const gateFailure =
          mergeGateBefore.kind === 'merging'
            ? `主仓正处于合并中：请先解决当前合并，再回来执行 ${mergeHint(worktree.branch)}`
            : `无法确认主仓合并状态（rev-parse exit ${mergeGateBefore.code}）：状态不明不发起代合并`
        cleanupNote = `${gateFailure}；worktree 保留在原处。\n${formatCleanupOutcome(worktree, outcome)}`
      } else if ('error' in targetBefore) {
        cleanupNote = `${targetBefore.error}：状态不明不发起代合并；worktree 保留在原处。\n${formatCleanupOutcome(worktree, outcome)}`
      } else {
        const mergeOk = await ctx.ui.confirm(
          `本地合并 ${worktree.branch}？`,
          [
            '按该仓库自身流程合并（有 PR 流程走 PR；无 PR 流程确认后可本地 merge）。',
            `确认后将在主仓执行 ${mergeHint(worktree.branch)}，成功则清理 worktree 与分支。`,
            '拒绝则保留现状，并继续给出仓库流程 / force 选择。'
          ].join('\n')
        )
        const mergeGateAfter = mergeOk ? await probeMergeHead(gitExec, mainCwd) : undefined
        const targetAfter =
          mergeOk && mergeGateAfter?.kind === 'clean' ? await captureHeadTarget(gitExec, mainCwd) : undefined
        if (!mergeOk) {
          cleanupNote = formatCleanupOutcome(worktree, outcome)
        } else if (mergeGateAfter?.kind !== 'clean') {
          cleanupNote =
            '确认期间主仓进入了合并状态（或状态不明）：为避免误伤你的合并，未执行代合并；worktree 保留在原处。\n' +
            formatCleanupOutcome(worktree, outcome)
        } else if (targetAfter === undefined || 'error' in targetAfter) {
          cleanupNote =
            '确认期间无法读取主仓 HEAD 状态：状态不明不发起代合并；worktree 保留在原处。\n' +
            formatCleanupOutcome(worktree, outcome)
        } else if (targetAfter.target !== targetBefore.target) {
          cleanupNote =
            `确认期间主仓目标发生变化（${targetBefore.target.slice(0, 40)} → ${targetAfter.target.slice(0, 40)}）：` +
            `拒绝在非预期分支上代合并；worktree 保留在原处。\n${formatCleanupOutcome(worktree, outcome)}`
        } else {
          try {
            await runGit(gitExec, mainCwd, ['merge', '--no-ff', worktree.branch])
            mergedByUs = true
          } catch (mergeError) {
            const failure = mergeError instanceof Error ? mergeError.message : String(mergeError)
            // 失败后的主仓状态无法可靠归因给本次操作：用户可以在毫秒级窗口里
            // 发起同分支合并、甚至分支 tip 恰好相同。自动 merge --abort 有
            // 毁掉用户合并进度的真实风险——代跑的合并失败只诊断、不处置。
            const headProbe = await probeMergeHead(gitExec, mainCwd)
            const diagnosis =
              headProbe.kind === 'clean'
                ? `本地合并未开始即失败（${failure}）：主仓仍在合并前状态。请先解决原因，再走仓库流程或重试 ${mergeHint(worktree.branch)}。`
                : headProbe.kind === 'merging'
                  ? `本地合并失败（${failure}），主仓当前存在进行中的合并。无法证明它属于本次操作，未执行 git merge --abort；请人工检查后决定继续解决或自行 abort。`
                  : `本地合并失败（${failure}），且无法读取主仓合并状态（rev-parse exit ${headProbe.code}）：请人工检查主仓后决定。`
            cleanupNote = `${diagnosis}\nworktree 保留在原处。\n${formatCleanupOutcome(worktree, outcome)}`
          }
          if (mergedByUs) {
            try {
              outcome = await cleanupWorktree(gitExec, { mainCwd, path: worktree.path, branch: worktree.branch }, {})
              if (outcome.kind === 'removed') {
                cleanupNote = `已按无 PR 流程本地合并并清理：${mergeHint(worktree.branch)}，分支已删除。`
              } else if (outcome.worktreeRemoved) {
                cleanupNote = formatCleanupOutcome(worktree, outcome)
              } else {
                cleanupNote = `本地合并已完成，但清理未完：${outcome.reason}\n${manualCleanupHint(worktree, outcome.branchDeleteCommand)}`
              }
            } catch (cleanupError) {
              cleanupNote =
                `本地合并已完成，但清理失败（${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}）：` +
                manualCleanupHint(worktree)
            }
          }
        }
      }
    }
    if (outcome.kind === 'removed') {
      // 清理完成即解除 registry 对 worktree 的跟踪：重复 /rex-cleanup 不再
      // 对已清理的 worker 重复跑清理，幂等也由 cleanupWorktree 兜底。
      registry.clearWorktree(worker.workerId)
    }
    cleanupNote ??= formatCleanupOutcome(worktree, outcome)
  }

  registry.markClosed(worker.workerId)
  deps.persistRegistry()
  return text([`worker ${worker.workerId} 已关闭。`, cleanupNote ?? '（无 worktree）'].join('\n'))
}

export async function cleanupWorkers(deps: TeardownDeps, ctx: TeardownUiContext): Promise<void> {
  const { adapter, registry, gitExec } = deps
  if (!ctx.hasUI) {
    ctx.ui.notify('请在有弹窗 UI 的会话里执行 /rex-cleanup', 'warning')
    return
  }
  const candidates = registry.list().filter(worker => worker.status === 'closed' || worker.retiredBlockIds.length > 0)
  if (candidates.length === 0) {
    ctx.ui.notify('没有需要回收的 worker', 'info')
    return
  }
  for (const worker of candidates) {
    const unconfirmed = worker.blockId.startsWith('unconfirmed:')
    const ok = await ctx.ui.confirm(
      `回收 ${worker.workerId} 的残留资源？`,
      unconfirmed
        ? '该 worker 派生结果不明：请先确认 Rex Tab 里没有对应 label 的 Block 在运行。确认后强制清理其 worktree 与分支。'
        : '将关闭其 retired Block；worktree 按已合并/干净与否自动处理或保留。'
    )
    if (!ok) continue
    // 关不掉的旧 Tab 留在 retired 列表等下次重试；清空跟踪会让它永远没人管。
    const closeFailures: string[] = []
    for (const blockId of worker.retiredBlockIds) {
      const closed = await adapter.blockClose(blockId).then(
        () => true,
        error => {
          closeFailures.push(`${blockId}: ${error instanceof Error ? error.message : String(error)}`)
          return false
        }
      )
      if (!closed) continue
      registry.removeRetiredBlock(worker.workerId, blockId)
      deps.persistRegistry()
    }
    if (closeFailures.length > 0) {
      ctx.ui.notify(
        `${worker.workerId} 有 ${closeFailures.length} 个旧 Tab 关闭失败，已留在待回收列表：\n${closeFailures.join('\n')}`,
        'warning'
      )
      // Block 关不掉就绝不动它的 worktree（Block 可能还在跑，cwd 就在里面），
      // 本轮跳过清理、保持跟踪，下轮重试。
      if (worker.worktree) {
        ctx.ui.notify(`${worker.workerId} 的 worktree 本轮不清理：先确认上述 Block 状态`, 'warning')
      }
      continue
    }
    if (worker.worktree && worker.status === 'closed') {
      // 清理命令要在主仓执行：worker.cwd 是即将被删除的 worktree 本身。
      const mainCwd = worker.mainCwd ?? (await findMainRepo(gitExec, worker.cwd).catch(() => worker.cwd))
      const outcome = await cleanupWorktree(
        gitExec,
        {
          mainCwd,
          path: worker.worktree.path,
          branch: worker.worktree.branch
        },
        // placeholder 的全新 worktree「干净且无独立提交」，非 force 会命中
        // clean+merged 判定误删可能正被使用的 worktree；用户已确认才 force。
        { force: unconfirmed }
      ).catch(error => ({
        kind: 'kept' as const,
        reason: String(error),
        path: worker.worktree?.path ?? '',
        branch: worker.worktree?.branch ?? '',
        mergeHint: mergeHint(worker.worktree?.branch ?? ''),
        unmerged: false,
        worktreeRemoved: false,
        branchDeleteCommand: undefined
      }))
      ctx.ui.notify(
        `${worker.workerId} ${formatCleanupOutcome(worker.worktree, outcome)}`,
        outcome.kind === 'removed' ? 'info' : 'warning'
      )
      // 清理完成解除跟踪：重复 /rex-cleanup 不再对已清理 worker 重复跑。
      if (outcome.kind === 'removed') {
        registry.clearWorktree(worker.workerId)
        deps.persistRegistry()
      }
    }
  }
}
