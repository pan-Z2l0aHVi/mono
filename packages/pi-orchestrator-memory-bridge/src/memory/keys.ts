/**
 * 编排记忆的键与仓库分区。
 *
 * 键的形状是 `<kind>.<repo-key>.<slot-kind>.<slot>`，**不以 `project.` 开头**。这一点是刻意的：
 * `pi-memory` 只对 `project.*` 键做 slug 校验（`isVisibleInCurrentScope`），非 `project.` 前缀
 * 的键是全局的，任何目录下都能写、能 pin、能被注入。而它算 slug 的方式是「`.git` 所在目录名」，
 * 在 linked worktree 里就是 worktree 名——用 `project.` 前缀会把同一仓库的编排记忆按 worktree
 * 切开，正是要避免的事。
 *
 * 分区靠我们自己写进键里的 `<repo-key>`（见 `repo-identity.ts`）：`mono` 及其所有 worktree 得到
 * 同一个 key，其他仓库得到各自的 key。
 */

import type { AnchorKind } from '../contracts'
import { normalizeRepoKey } from '../repo-identity'

/** 所有编排键的公共前缀。不用 `project.`，理由见文件头。 */
const ROOT = 'orchestration'

/**
 * 生成稳定键。
 *
 * `slot` 由锚点内容派生（见 `anchors/extract.ts`），同一逻辑事件重复触发必须得到同一个键：
 * `pi-memory` 的 `setSemantic` 对同一 key 是 upsert，所以重复写入不会堆出多条记录。
 */
export function orchestrationKey(repoKey: string, kind: AnchorKind, slot: string): string {
  const normalized = slot
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  if (!normalized) throw new Error('orchestrationKey: empty slot')
  return `${orchestrationPrefix(repoKey)}${kind}.${normalized}`
}

/**
 * `<root>.<repo-key>.` —— 本仓库全部编排键的公共前缀。
 *
 * `repoKey` 在这里再归一一次：身份解析已归一，但键一旦带空格或 CJK，`memory_search` 的
 * 文本行（`^(?<key>[A-Za-z0-9._-]+):`）就解析不出整条记录，召回会恒为空。归一是幂等的。
 */
export function orchestrationPrefix(repoKey: string): string {
  return `${ROOT}.${normalizeRepoKey(repoKey)}.`
}

/** 判断一个键是否属于当前仓库的编排记忆。 */
export function isOwnOrchestrationKey(key: string, repoKey: string): boolean {
  return key.toLowerCase().startsWith(orchestrationPrefix(repoKey).toLowerCase())
}

/**
 * 判断一个键是否属于**其他**仓库的编排记忆。
 *
 * `memory_search` 在 `scope: "all"` 下会返回所有仓库的事实，`scope: "current"` 也会带上全局
 * 事实。注入或召回前必须把别的仓库的编排键挡掉，否则重启 lead 会看到别人的拒绝原因。
 */
export function isForeignOrchestrationKey(key: string, repoKey: string): boolean {
  const lower = key.toLowerCase()
  if (!lower.startsWith(`${ROOT}.`)) return false
  return !isOwnOrchestrationKey(key, repoKey)
}

/** 提取键里的 slot-kind（`decision` / `rejection`），用于排序与展示。 */
export function slotKindOf(key: string): string | undefined {
  const parts = key.split('.')
  // orchestration.<repo>.<kind>.<slot> —— kind 在倒数第二位。
  return parts.length >= 4 ? parts[parts.length - 2] : undefined
}
