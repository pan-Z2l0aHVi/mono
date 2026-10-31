/**
 * 从 orchestrator 的 tool result 里提取写入锚点。
 *
 * 只读 `details`，不读 `content` 文本：orchestrator 把结构化的 `approved` / `verdict` /
 * `reason` / `gaps` 放进 `details`，文本是给人看的，措辞随时会变。锚点只保存决策要点，
 * 不保存 worker 终端输出、代码 diff 或文件内容——这些既不该进记忆，也不该进 system prompt。
 */

import { createHash } from 'node:crypto'

import type { AnchorKind, PendingAnchor } from '../contracts'

import { readReviewConclusion, type ParsedVerdict, type ReviewConclusion } from './review-verdict'

/** orchestrator `herdr_plan` 的 details 形状（只取桥接用到的字段）。 */
interface PlanDetails {
  action?: string
  approved?: boolean
  ledger?: string
  objective?: string
  slices?: number
}

/** orchestrator `herdr_review` 的 details 形状（只取桥接用到的字段）。 */
interface ReviewDetails {
  action?: string
  slice?: string
  verdict?: string
  reason?: string
  gaps?: string
  reviewFile?: string
}

/** 触发写决策的记忆槽位：计划获批写一条，拒绝写另一条。 */
export function isPlanApproved(details: unknown): details is PlanDetails {
  if (typeof details !== 'object' || details === null) return false
  const value = details as PlanDetails
  return value.action === 'plan' && value.approved === true
}

/**
 * 判断一次 review 是否需要写入拒绝记忆。
 *
 * orchestrator 的 verdict 是 `APPROVE | REJECT | RE_PLAN | UNKNOWN`。`RE_PLAN` 同样意味着
 * 上一轮计划不成立，必须记；`UNKNOWN` 是解析失败，也记——下一次 lead 需要知道「有一轮
 * review 没给出结论」，否则会当成已通过。
 */
export function isRejectedReview(details: unknown): details is ReviewDetails {
  if (typeof details !== 'object' || details === null) return false
  const value = details as ReviewDetails
  if (value.action !== 'review') return false
  const verdict = value.verdict?.toUpperCase()
  return verdict === 'REJECT' || verdict === 'RE_PLAN' || verdict === 'UNKNOWN'
}

/**
 * 稳定槽位。
 *
 * 同一份 plan / 同一次 review 重复触发必须得到同一个键：pi-memory 的 `setSemantic` 对同一
 * key 是 upsert，于是「重复触发」自然收敛成一条记录，不会堆出多份重复记忆。槽位取内容的
 * 哈希前缀而不是时间戳，正是为了让重放幂等。
 */
export function stableSlot(parts: ReadonlyArray<string | undefined>): string {
  const payload = parts.map(part => (part ?? '').trim()).join('\u0000')
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

/**
 * 计划获批时的记忆值。
 *
 * 只留下一次决策需要的历史：切片数量、objective（若 details 恰好带）、ledger 位置。不含
 * acceptance 正文与 worker brief——那些在 ledger 文件里，记忆不该成为第二份拷贝。
 */
export function planDecisionValue(details: PlanDetails): string {
  // orchestrator 的 details 只带 `slices: <number>`（切片数量），切片名与 objective 都在
  // ledger 的 plan.md 里，没有进 details。所以这里能记的只有「几个切片 + ledger 位置」；
  // 编一句 objective 比留空更糟，缺了就不写。
  const parts = ['approved plan']
  if (typeof details.slices === 'number') parts.push(`${details.slices} slice(s)`)
  if (details.objective?.trim()) parts.push(`objective: ${details.objective.trim()}`)
  if (details.ledger) parts.push(`ledger: ${details.ledger}`)
  return parts.join(' | ')
}

/**
 * 审查拒绝时的记忆值。
 *
 * `reason` 与 `gaps` 是 lead 下一轮唯一需要的两件事：为什么被拒、还差什么。其余细节（raw
 * output、review 全文路径）留在 ledger 的 review 文件里。
 */
export function reviewRejectionValue(details: ReviewDetails): string {
  const verdict = (details.verdict ?? 'UNKNOWN').toUpperCase()
  const slice = details.slice?.trim() || '(unnamed slice)'
  const reason = details.reason?.trim() || '(no reason recorded)'
  const gaps = details.gaps?.trim()
  const parts = [`${verdict} on slice ${slice}: ${reason}`]
  if (gaps && gaps.toUpperCase() !== 'NONE') parts.push(`gaps: ${collapse(gaps)}`)
  return parts.join(' | ')
}

/** 把多行 gaps 压成单行，避免一条记忆里塞进整段列表。 */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 600)
}

/** 从 plan details 生成待写入锚点；不满足获批条件时返回 undefined。 */
export function anchorFromPlan(details: unknown): PendingAnchor | undefined {
  if (!isPlanApproved(details)) return undefined
  return {
    kind: 'decision',
    slot: stableSlot([details.objective, details.ledger]),
    value: planDecisionValue(details)
  }
}

/** 从 review details 生成待写入锚点；未拒绝时返回 undefined。 */
export function anchorFromReview(details: unknown): PendingAnchor | undefined {
  if (!isRejectedReview(details)) return undefined
  return {
    kind: 'rejection',
    slot: stableSlot([details.slice, details.verdict, details.reason]),
    value: reviewRejectionValue(details)
  }
}

/**
 * 按工具名分派锚点。
 *
 * 只在 tool 名精确匹配时动作：桥接扩展不重新实现 orchestrator 的工具，也不猜别家的
 * `details` 形状。
 *
 * review 分支要用 `details.reviewFile` 回读真实结论（`herdr_review` 的正则会被 reviewer
 * 模板里的枚举抢先命中，导致 `details.verdict` 恒为 APPROVE），所以这里是异步的。
 */
export async function anchorFromToolResult(
  toolName: string,
  details: unknown,
  readConclusion: (reviewFile: string | undefined) => Promise<ReviewConclusion> = readReviewConclusion
): Promise<PendingAnchor | undefined> {
  if (toolName === 'herdr_plan') return anchorFromPlan(details)
  if (toolName !== 'herdr_review' || !isReviewResult(details)) return undefined

  // `details.verdict` / `reason` / `gaps` 都不可信：orchestrator 用同一个正则从 pane 抓，
  // 先命中的是 reviewer 模板里的枚举与占位符。所以一律回读 review 文件，以 reviewer 的
  // 真实输出为准。文件读不到时才退回 details（那条路径仍能识别真 REJECT）。
  const conclusion = await readConclusion(details.reviewFile)
  const verdict: ParsedVerdict =
    conclusion.verdict === 'UNKNOWN'
      ? ((details.verdict ?? 'UNKNOWN').toUpperCase() as ParsedVerdict)
      : conclusion.verdict

  if (verdict !== 'REJECT' && verdict !== 'RE_PLAN') return undefined

  // 优先用文件里的真实 reason/gaps；文件缺这两段时退回 details（可能是模板占位符，但至少
  // 不为空）。占位符已在 `parseReviewConclusion` 里被清成空串。
  const reason = conclusion.reason || details.reason || ''
  const gaps = conclusion.gaps || details.gaps || ''

  return {
    kind: 'rejection',
    slot: stableSlot([details.slice, verdict, reason]),
    value: reviewRejectionValue({ ...details, verdict, reason, gaps })
  }
}

/** details 看起来是一次 review 结果（不判 verdict，只在回读兜底时用作前置条件）。 */
function isReviewResult(details: unknown): details is ReviewDetails {
  if (typeof details !== 'object' || details === null) return false
  const value = details as ReviewDetails
  return value.action === 'review'
}

export type { AnchorKind }
