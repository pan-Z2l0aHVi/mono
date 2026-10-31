/**
 * 依赖 `pi-memory` 工具的记忆后端。
 *
 * 只通过 pi-memory 暴露的 Pi 工具读写，不碰它的 SQLite：表结构与 `pinned` 列是它自己
 * ALTER 上去的实现细节，直连会在它升级时静默读错。
 *
 * 每次调用都可能失败（包没装、工具被禁用、scope 校验拒绝），失败必须把原因带回去，不能
 * 吞成空数组，否则「记忆没读到」和「后端坏了」在注入内容里长得一样。
 */

import type { MemoryBackend, OrchestrationFact, ToolCaller } from '../contracts'

import { isForeignOrchestrationKey, isOwnOrchestrationKey } from './keys'

/** pi-memory `memory_search` 的返回形状；只声明桥接读到的字段。 */
interface MemorySearchStructured {
  results?: ReadonlyArray<{ key?: unknown; value?: unknown; confidence?: unknown; source?: unknown }>
}

/** pi-memory 的 scope 闭集。桥接只用 `current`，见 `searchOrchestration`。 */
type SearchScope = 'current' | 'global' | 'all'

export interface PiMemoryBackendOptions {
  readonly callTool: ToolCaller
}

/**
 * `memory_search` 的结果既可能是 `structuredContent`，也可能只有文本。工具通道只回传
 * `{ ok, text }`（`executeTool` 的 structuredContent 在调用方已被压平成文本），所以这里
 * 从文本里解析出 `key: value (confidence: ..., source: ...)` 这种行。
 *
 * 解析失败返回空数组并不报错：注入是尽力而为的上下文，不值得因为一行格式变化就让整个
 * 会话启动失败。但后端调用本身失败（`ok === false`）必须抛出。
 */
function parseSearchText(text: string): OrchestrationFact[] {
  const facts: OrchestrationFact[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const match =
      /^(?<key>[A-Za-z0-9._-]+):\s*(?<value>.*?)(?:\s*\(confidence:\s*(?<confidence>[0-9.]+),\s*source:\s*(?<source>[^)]*)\))?$/.exec(
        line
      )
    if (!match?.groups?.key) continue
    const confidence = Number(match.groups.confidence ?? '0.95')
    facts.push({
      key: match.groups.key,
      value: match.groups.value.trim(),
      confidence: Number.isFinite(confidence) ? confidence : 0.95,
      source: match.groups.source?.trim() || 'pi-memory'
    })
  }
  return facts
}

/**
 * 把搜索结构化结果转成 fact 列表。`structuredContent` 在场时优先用它，避免走文本正则。
 */
export function factsFromSearchResult(
  structured: MemorySearchStructured | undefined,
  text: string
): OrchestrationFact[] {
  const rows = structured?.results
  if (!Array.isArray(rows)) return parseSearchText(text)
  const facts: OrchestrationFact[] = []
  for (const row of rows) {
    if (typeof row?.key !== 'string' || typeof row.value !== 'string') continue
    const confidence = typeof row.confidence === 'number' ? row.confidence : 0.95
    facts.push({
      key: row.key,
      value: row.value,
      confidence,
      source: typeof row.source === 'string' ? row.source : 'pi-memory'
    })
  }
  return facts
}

export function createPiMemoryBackend(options: PiMemoryBackendOptions): MemoryBackend {
  const { callTool } = options

  return {
    /**
     * 读当前仓库的编排记忆。
     *
     * 用 `scope: "current"`：pi-memory 在该 scope 下返回全局事实加当前仓库事实，所以结果里
     * 可能混入别的 key。筛选交给调用方（`filterOwnFacts`），这里只负责取回。
     */
    async search(query, { scope, limit }): Promise<OrchestrationFact[]> {
      const args: Record<string, unknown> = { scope, limit }
      if (query.trim()) args.query = query.trim()
      const result = await callTool('memory_search', args)
      if (!result.ok) throw new Error(`memory_search failed: ${result.text}`)
      return factsFromSearchResult(undefined, result.text)
    },

    async remember({ key, value, pinned }): Promise<void> {
      const args: Record<string, unknown> = { key, value }
      if (pinned) args.pinned = true
      const result = await callTool('memory_remember', args)
      if (!result.ok) throw new Error(`memory_remember failed: ${result.text}`)
    },

    async pin({ key, action }): Promise<void> {
      const result = await callTool('memory_pin', { action, key })
      if (!result.ok) throw new Error(`memory_pin failed: ${result.text}`)
    }
  }
}

/**
 * 只保留属于当前仓库的编排条目。
 *
 * 两个方向都要挡：`scope: "current"` 会带出全局事实（无 `project.` 前缀），`scope: "all"`
 * 会带出其他仓库的编排事实。注入的内容一旦跨仓库，重启 lead 就会看到别人的拒绝原因。
 */
export function filterOwnFacts(
  facts: readonly OrchestrationFact[],
  slug: string,
  options: { readonly allowForeign?: boolean } = {}
): OrchestrationFact[] {
  return facts.filter(fact => {
    if (!isOwnOrchestrationKey(fact.key, slug)) {
      if (isForeignOrchestrationKey(fact.key, slug)) return options.allowForeign === true
      return false
    }
    return true
  })
}

export type { SearchScope }
