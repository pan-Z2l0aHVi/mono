/**
 * 编排记忆的召回。
 *
 * 事件钩子拿不到 `ctx.executeTool`，所以 `before_agent_start` 无法查询 `pi-memory`。本扩展
 * 因此不做自动注入，改为在工具上下文里按需召回——`orchestration_memory_recall` 的 `execute()`
 * 有这个能力。
 *
 * 召回结果只来自 `pi-memory`，单一权威源，没有本地缓存可以失真。
 */

import type { MemoryBackend, OrchestrationFact } from '../contracts'
import type { RepoIdentity } from '../repo-identity'

import { isOwnOrchestrationKey } from './keys'

/** 一次召回的结果。 */
export interface RecallResult {
  readonly facts: readonly OrchestrationFact[]
  readonly rejected: number
  readonly decisions: number
  readonly truncated: boolean
}

/**
 * 从后端取回本仓库的编排记忆。
 *
 * `scope: "all"` 会返回别的仓库的编排键与全局事实，所以拿到之后必须按 `repoKey` 过滤；
 * 不信任的键一律丢弃，宁可少召回也不能跨仓库串味。
 *
 * `limit` 给得比实际展示多一点：过滤会丢掉一部分，取少了会看不到本仓库的旧条目。
 */
export async function recallOrchestration(
  backend: MemoryBackend,
  identity: RepoIdentity,
  options: { limit?: number } = {}
): Promise<RecallResult> {
  const limit = options.limit ?? 100
  const raw = await backend.search('', { scope: 'all', limit })
  const facts = raw.filter(fact => isOwnOrchestrationKey(fact.key, identity.key))

  let rejected = 0
  let decisions = 0
  for (const fact of facts) {
    const lower = fact.key.toLowerCase()
    if (lower.includes('.rejection.')) rejected += 1
    else if (lower.includes('.decision.')) decisions += 1
  }

  return {
    facts,
    rejected,
    decisions,
    // 过滤后条数等于原始上限，说明可能还有没取回的条目。
    truncated: raw.length >= limit
  }
}

/** 渲染成给人看的文本；模型也会读到同一份。 */
export function renderRecall(identity: RepoIdentity, result: RecallResult): string {
  if (result.facts.length === 0) {
    return `No orchestration memory recorded for ${identity.key} yet.`
  }
  const lines = [
    `Orchestration memory for ${identity.key} (${identity.root}): ${result.facts.length} item(s) — ${result.rejected} rejection(s), ${result.decisions} decision(s).`
  ]
  for (const fact of sortForDisplay(result.facts)) lines.push(`- ${fact.key}: ${fact.value}`)
  if (result.truncated) lines.push('(more items may exist; raise limit to see them)')
  return lines.join('\n')
}

/** 拒绝排在决策之前：拒绝是下一次计划最需要避免的东西。 */
function sortForDisplay(facts: readonly OrchestrationFact[]): OrchestrationFact[] {
  return [...facts].sort((left, right) => {
    const leftRejected = left.key.toLowerCase().includes('.rejection.')
    const rightRejected = right.key.toLowerCase().includes('.rejection.')
    if (leftRejected !== rightRejected) return leftRejected ? -1 : 1
    return left.key.localeCompare(right.key)
  })
}
