/**
 * `herdr_dispatch` 的并发上限。
 *
 * Herdr 的 `agent list` 里每个历史 worker pane 仍然具名（进程还活着，只是 idle），所以
 * 「具名」不等于「在跑」。槽位只按 Herdr 的生命周期状态占用：`working` / `blocked` 是正在
 * 占用 worker 的状态；`idle` / `done` 表示等待输入（Herdr skill 的定义），`unknown` 无法
 * 判定——按 fail open 不计入，否则一台识别不出状态的 Herdr 会让 dispatch 永久被拒。
 *
 * reviewer 走 `herdr_review`，不占 worker 槽位，但 reason 里单独列出，用户能分清是谁占着
 * 终端。
 */

import type { HerdrAgentEntry } from '../contracts'

/** 占用 worker 槽位的 Herdr 生命周期状态。 */
const RUNNING_STATUSES: ReadonlySet<string> = new Set(['working', 'blocked'])

/** 具名且正在占用槽位的 agent。 */
export function isRunningNamedAgent(entry: HerdrAgentEntry): boolean {
  if (!entry.name?.trim()) return false
  const status = entry.agent_status?.trim().toLowerCase()
  return status !== undefined && RUNNING_STATUSES.has(status)
}

export interface RunningAgents {
  readonly workers: readonly string[]
  readonly reviewers: readonly string[]
}

/** 把正在跑的具名 agent 按 worker / reviewer 分开。reviewer 名单由 `herdr_review` 的结果登记。 */
export function runningAgents(
  agents: ReadonlyArray<HerdrAgentEntry>,
  reviewerNames: ReadonlySet<string>
): RunningAgents {
  const workers: string[] = []
  const reviewers: string[] = []
  for (const entry of agents) {
    if (!isRunningNamedAgent(entry)) continue
    const name = entry.name!.trim()
    if (reviewerNames.has(name)) reviewers.push(name)
    else workers.push(name)
  }
  return { workers: workers.sort(), reviewers: reviewers.sort() }
}

export type DispatchLimitVerdict =
  | { readonly allowed: true; readonly workers: readonly string[]; readonly reviewers: readonly string[] }
  | {
      readonly allowed: false
      readonly workers: readonly string[]
      readonly reviewers: readonly string[]
      readonly reason: string
    }

export interface DispatchLimitInput {
  readonly agents: ReadonlyArray<HerdrAgentEntry>
  readonly maxConcurrentWorkers: number
  readonly reviewerNames: ReadonlySet<string>
}

/**
 * 判定这次 dispatch 是否还能再起一个 worker。
 *
 * 达到上限才拒绝（不提前一个）；reason 带当前 worker 名、上限值与出路，避免模型直接重试
 * 同一个必然失败的调用。
 */
export function evaluateDispatchLimit(input: DispatchLimitInput): DispatchLimitVerdict {
  const { workers, reviewers } = runningAgents(input.agents, input.reviewerNames)
  const limit = input.maxConcurrentWorkers

  if (workers.length < limit) return { allowed: true, workers, reviewers }

  const reviewerLine =
    reviewers.length > 0 ? `另有正在跑的 reviewer（${reviewers.join(', ')}），不计入 worker 上限。` : undefined

  return {
    allowed: false,
    workers,
    reviewers,
    reason: [
      `dispatch 被并发上限拦住：当前有 ${workers.length} 个 worker 正在跑（${workers.join(', ')}），上限 ${limit}。`,
      ...(reviewerLine ? [reviewerLine] : []),
      '等其中一个完成（herdr_watch 跟到 DONE / BLOCKED），或调高 ~/.pi/agent/pi-herdr-orchestrator/config.json 里的 shepherd.maxConcurrentWorkers。'
    ].join('\n')
  }
}
