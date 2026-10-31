/**
 * 从 review 文件正文里恢复 reviewer 的真实结论。
 *
 * `herdr_review` 用正则扫描 reviewer pane 的输出抓 verdict，而 reviewer 模板本身包含
 * `VERDICT: APPROVE | REJECT | RE_PLAN` 与「APPROVE means …」这类说明文字。扫描先命中模板，
 * 于是 `details.verdict` 经常恒为 `APPROVE`——即使 reviewer 真实写的是 `REJECT`。
 *
 * 桥接不改 orchestrator（不 fork），只在自己这一侧兜底：`details.reviewFile` 指向的
 * `<ledger>/slices/<slice>.review.md` 里保留了完整输出，真实结论在末尾。这里的判据是
 *
 * 1. 只认「单值」行：`VERDICT: APPROVE` 这种，排除带 `|` 的模板枚举；
 * 2. 排除模板说明行（`Return a verdict line VERDICT:` 的续行、以及夹在模板上下文里的枚举）；
 * 3. 多个候选时取**最后**一个——reviewer 的最终结论总在输出末尾。
 */

import { readFile } from 'node:fs/promises'

/** reviewer 可能给出的结论。`UNKNOWN` 表示文件里没有可用的结论行。 */
export type ParsedVerdict = 'APPROVE' | 'REJECT' | 'RE_PLAN' | 'UNKNOWN'

/**
 * 单值 verdict 行。
 *
 * 允许前缀装饰（`⏺`、`-`、`*`、缩进）与大小写差异；显式排除含 `|` 的枚举行。末尾允许
 * 跟随其它文字（有些 reviewer 把理由写在同一行）。
 */
const SINGLE_VERDICT = /VERDICT\s*[:：]\s*(APPROVE|REJECT|RE_PLAN)\b(?!\s*\|)/i

/**
 * 模板说明行。
 *
 * reviewer 模板里那句 `Return a verdict line VERDICT: APPROVE | REJECT | RE_PLAN` 的折行
 * 片段，以及「APPROVE means the evidence satisfies…」这类解释，都不是结论。
 */
const TEMPLATE_HINTS = [
  /\|\s*REJECT/i,
  /\bReturn a verdict line\b/i,
  /\bmeans the evidence\b/i,
  /\bmeans the slice is blocked\b/i,
  /\bList the gaps\b/i,
  /\bbullet list of gaps\b/i
]

function isTemplateLine(line: string): boolean {
  return TEMPLATE_HINTS.some(pattern => pattern.test(line))
}

/**
 * 从 review 文件正文里取真实 verdict。
 *
 * 取最后一个非模板的单值行；一个都没有时返回 `UNKNOWN`。
 */
export function parseReviewVerdict(text: string): ParsedVerdict {
  let found: ParsedVerdict = 'UNKNOWN'
  for (const line of text.split('\n')) {
    if (isTemplateLine(line)) continue
    const match = SINGLE_VERDICT.exec(line)
    const value = match?.[1]?.toUpperCase()
    if (value === 'APPROVE' || value === 'REJECT' || value === 'RE_PLAN') found = value
  }
  return found
}

/**
 * 读 `details.reviewFile` 并取真实 verdict。
 *
 * 文件缺失或不可读时返回 `UNKNOWN`：兜底是尽力而为，读不到不该让锚点逻辑抛错。
 * 路径来自 orchestrator 的 `details`，这里不自行拼接——ledger 目录是可配置的。
 */
export async function readReviewVerdict(reviewFile: string | undefined): Promise<ParsedVerdict> {
  return (await readReviewConclusion(reviewFile)).verdict
}

/**
 * 读 `details.reviewFile` 并取完整结论。
 *
 * 文件缺失或不可读时返回一个全空的结论：兜底是尽力而为，读不到不该让锚点逻辑抛错。
 * 路径来自 orchestrator 的 `details`，这里不自行拼接——ledger 目录是可配置的。
 */
export async function readReviewConclusion(reviewFile: string | undefined): Promise<ReviewConclusion> {
  if (!reviewFile) return { verdict: 'UNKNOWN', reason: '', gaps: '' }
  let text: string
  try {
    text = await readFile(reviewFile, 'utf8')
  } catch {
    return { verdict: 'UNKNOWN', reason: '', gaps: '' }
  }
  return parseReviewConclusion(text)
}

/**
 * reviewer 的完整结论段落。
 *
 * `details.reason` 与 `details.gaps` 和 verdict 有同一问题：orchestrator 用同一个正则从
 * pane 抓，先命中的是模板占位符（`<one or two sentences>`、`<bullet list of gaps, or NONE>`）。
 * 真实内容在最后一个 `VERDICT:` 之后，所以从那里往下取 `REASON:` 与 `GAPS:` 段。
 */
export interface ReviewConclusion {
  readonly verdict: ParsedVerdict
  readonly reason: string
  readonly gaps: string
}

/** reviewer 折叠后的输出会把段落折行；这里按「下一条已知标签」切段而不是按空行切。 */
const LABEL = /^\s*(VERDICT|REASON|GAPS)\s*[:：]/i

function isPlaceholder(text: string): boolean {
  return /^<.*>$/.test(text.trim())
}

/**
 * 从 review 文件正文里取真实结论。
 *
 * 定位最后一个「非模板」的单值 `VERDICT:` 行，然后从它开始收集直到文本结束，按标签切出
 * `REASON` 与 `GAPS`。占位符（`<one or two sentences>` 之类）一律当作缺失。
 */
export function parseReviewConclusion(text: string): ReviewConclusion {
  const lines = text.split('\n')
  let start = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || isTemplateLine(line)) continue
    const match = SINGLE_VERDICT.exec(line)
    const value = match?.[1]?.toUpperCase()
    if (value === 'APPROVE' || value === 'REJECT' || value === 'RE_PLAN') start = index
  }
  if (start === -1) return { verdict: 'UNKNOWN', reason: '', gaps: '' }

  const verdict = SINGLE_VERDICT.exec(lines[start] ?? '')?.[1]?.toUpperCase() as ParsedVerdict
  let current: 'REASON' | 'GAPS' | undefined
  const reason: string[] = []
  const gaps: string[] = []
  for (const raw of lines.slice(start + 1)) {
    const label = LABEL.exec(raw)?.[1]?.toUpperCase()
    if (label === 'REASON') {
      current = 'REASON'
      const rest = raw.replace(/^\s*REASON\s*[:：]/i, '').trim()
      if (rest) reason.push(rest)
      continue
    }
    if (label === 'GAPS') {
      current = 'GAPS'
      const rest = raw.replace(/^\s*GAPS\s*[:：]/i, '').trim()
      if (rest) gaps.push(rest)
      continue
    }
    // 窗口与提示符等装饰行到此为止。
    if (/^[─❯⏵✻]/.test(raw) || /auto mode on/.test(raw)) break
    if (current === 'REASON') reason.push(raw.trim())
    else if (current === 'GAPS') gaps.push(raw.trim())
  }

  const join = (parts: string[]) => parts.join(' ').replace(/\s+/g, ' ').trim()

  const joinedReason = join(reason)
  const joinedGaps = join(gaps)
  return {
    verdict,
    reason: isPlaceholder(joinedReason) ? '' : joinedReason,
    gaps: isPlaceholder(joinedGaps) ? '' : joinedGaps
  }
}
