/**
 * 编排调用的进行中登记（D1 修复）。
 *
 * 背景缺陷：桥接的全部副作用（pane 搬迁、看板任务、reviewer 登记）都绑在 `tool_result`
 * 上。`herdr_dispatch` 的 prompt 等待超时会 **throw**，结果只有一个 `isError` 的
 * tool_result、没有 `details`（pane id、ledger 都不在），于是搬迁、建任务一次都不发生，
 * worker 的 pane 被留在当前 tab。这里补一条与 tool_result 无关的登记链路：
 *
 * 1. `tool_call` 时（并发闸门放行后）从事件的 `input` 里登记 name / role / timeout；
 * 2. `tool_result` 到达即结算——正常路径与现在完全一致，登记只负责兜底；
 * 3. 没等到 tool_result（超时、校验失败、会话在调用中途结束）时，用 `herdr agent list`
 *    按 name 扫描，把仍然在场的 pane 与登记对上，交还调用方做搬迁与建任务。
 *
 * 纯逻辑模块：这里不做 I/O，也不构造 board 动作之外的具体写盘。注册表是会话内存状态，
 * reload 后由 Pi 重建，丢到的只有中断会话的兜底能力，可以接受。
 */

import { boardActionForWatch, taskTitle, type BoardAction } from '../board/sync'
import type { HerdrAgentEntry } from '../contracts'

/** 一次已放行、尚未结算的编排调用。 */
export interface InFlightEntry {
  /** `herdr_dispatch` 或 `herdr_review`。 */
  readonly toolName: string
  /** agent 名：worker 用 slice 名，reviewer 用 reviewer 名。与 `herdr agent list` 的 `name` 对齐。 */
  readonly name: string
  /** dispatch 的角色；review 没有。 */
  readonly role?: string
  /** 调用携带的超时（毫秒）；只用于诊断说明，不参与扫描逻辑。 */
  readonly timeout?: number
}

/** 进行中登记表。同名重复登记以后者为准。 */
export interface InFlightRegistry {
  /** 把一次工具调用登记进来。 */
  add(entry: Omit<InFlightEntry, 'timeout'> & { timeout?: number }): void
  /** 结算并移除该名字的登记；不存在返回 undefined。能给 toolName 时用它精确定位。 */
  settle(name: string, toolName?: string): InFlightEntry | undefined
  /** 工具结果的 details.name；details 缺失（isError 路径）或名字缺失时不结算。 */
  settleFromResultName(details: unknown, toolName?: string): InFlightEntry | undefined
  /** 当前全部未结算的登记。 */
  open(): readonly InFlightEntry[]
  clear(): void
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function createInFlightRegistry(): InFlightRegistry {
  const entries = new Map<string, Omit<InFlightEntry, 'timeout'>>()
  return {
    add(entry) {
      const name = nonEmpty(entry.name)
      if (!name || (entry.toolName !== 'herdr_dispatch' && entry.toolName !== 'herdr_review')) return
      entries.set(entry.toolName === 'herdr_dispatch' ? `dispatch:${name}` : `review:${name}`, {
        ...entry,
        name,
        ...(entry.timeout === undefined ? {} : { timeout: entry.timeout })
      })
    },
    settle(name, toolName) {
      const trimmed = nonEmpty(name)
      if (!trimmed) return undefined
      // toolName 缺省时两个命名空间都试：调用方拿不准的场合先到 dispatch 再补 review。
      const prefixes =
        toolName === 'herdr_review' ? ['review'] : toolName === 'herdr_dispatch' ? ['dispatch'] : ['dispatch', 'review']
      for (const prefix of prefixes) {
        const entry = `${prefix}:${trimmed}`
        const found = entries.get(entry)
        if (found) {
          entries.delete(entry)
          return { ...found }
        }
      }
      return undefined
    },
    settleFromResultName(details, toolName) {
      if (typeof details !== 'object' || details === null) return undefined
      const name = (details as { name?: unknown }).name
      const trimmed = typeof name === 'string' ? name.trim() : undefined
      if (!trimmed) return undefined
      return this.settle(trimmed, toolName)
    },
    open() {
      return [...entries.values()]
    },
    clear() {
      entries.clear()
    }
  }
}

/** worker 调用返回的 agent 终态里，表示「已经自己跑完」的那两种（D3 判据）。 */
export function isWorkerSelfSettled(status: string | undefined): boolean {
  const value = status?.trim().toLowerCase()
  return value === 'done' || value === 'idle'
}

/**
 * 扫描结果里登记条目的落点。
 *
 * - `matched`：`agent list` 里有同名且带 pane 的 agent；调用方据此搬迁 pane、合成看板动作。
 * - `missing`：列表里没有同名 agent——两种可能：调用在校验阶段就失败（pane 从未创建），
 *   或 agent 进程已退出。都只能如实记录，不能编造状态。
 */
export interface ReconciliationCandidate {
  readonly entry: InFlightEntry
  readonly agent?: HerdrAgentEntry
}

function findAgent(agents: readonly HerdrAgentEntry[], name: string): HerdrAgentEntry | undefined {
  return agents.find(entry => entry.name?.trim() === name)
}

/** 把未结算的登记与 herdr 的 agent 列表对齐；不做任何副作用。 */
export function matchInFlight(
  open: readonly InFlightEntry[],
  agents: readonly HerdrAgentEntry[]
): { matched: readonly ReconciliationCandidate[]; missing: readonly InFlightEntry[] } {
  const matched: ReconciliationCandidate[] = []
  const missing: InFlightEntry[] = []
  for (const entry of open) {
    const agent = findAgent(agents, entry.name)
    if (agent?.pane_id) matched.push({ entry, agent })
    else missing.push(entry)
  }
  return { matched, missing }
}

/**
 * 兜底路径的看板动作：把一条「结果丢失」的 dispatch 还原成它应有的看板状态。
 *
 * - agent 已自结算（`done` / `idle`）：与 watch-done 同构地落到 `in_review`，避免 D3 在兜底
 *   路径上复发——很多 slice 不再跑 watch，直接从 in_review 验收。
 * - 仍在跑或状态不清：`in_progress`，描述里写 role（pane 信息调用方有 pane id 时再补）。
 * - review 调用：不走看板（verdict 必须来自 review 文件，兜底路径没有可信结论）。
 */
export function inFlightBoardAction(
  entry: InFlightEntry,
  agentStatus?: string,
  paneId?: string
): BoardAction | undefined {
  if (entry.toolName !== 'herdr_dispatch') return undefined
  if (isWorkerSelfSettled(agentStatus)) {
    return boardActionForWatch({ action: 'watch', name: entry.name, status: 'done' })
  }
  const aspects = [`role: ${entry.role ?? 'unknown'} (recovered from dispatch timeout)`]
  if (paneId) aspects.push(`pane: ${paneId}`)
  return {
    kind: 'add_task',
    title: taskTitle(entry.name),
    status: 'in_progress',
    description: aspects.join(' | '),
    intent: 'dispatch'
  }
}
