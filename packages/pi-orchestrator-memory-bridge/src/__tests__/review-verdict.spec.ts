/**
 * reviewer 真实 verdict 的解析。
 *
 * 输入取自真实运行产生的 `<ledger>/slices/<slice>.review.md`：文件开头是 orchestrator 写
 * 的 `VERDICT: <details 里抓到的值>`（可能是模板抢先命中的假值），中间夹着 reviewer 模板
 * 的说明文字，末尾才是 reviewer 的真实结论。解析必须取最后一个非模板的单值行。
 */

import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import {
  parseReviewConclusion,
  parseReviewVerdict,
  readReviewConclusion,
  readReviewVerdict
} from '../anchors/review-verdict'

/** 复刻真实文件的骨架：假 verdict 在前，模板说明居中，真 verdict 在末尾。 */
const realShape = (realVerdict: string) => `# Review of bridge-probe-2

VERDICT: APPROVE
REASON: <one or two sentences>
GAPS:
<bullet list of gaps, or
  NONE>

  - APPROVE means the evidence
  satisfies the stated acceptance
  criteria.
  - REJECT means evidence is
  missing or a criterion is
  demonstrably unmet. List the
  gaps.
  - RE_PLAN means the slice is
  blocked materially and needs a
  different approach.

  Return a verdict line VERDICT:
  APPROVE | REJECT | RE_PLAN, a
  REASON line, and a GAPS list.

⏺ VERDICT: ${realVerdict}
  REASON: The acceptance criterion
  is not met.
`

describe('parseReviewVerdict', () => {
  it('跳过模板枚举与开头的假值，取末尾的真实结论', () => {
    expect(parseReviewVerdict(realShape('REJECT'))).toBe('REJECT')
  })

  it('真实结论是 RE_PLAN 时也取它', () => {
    expect(parseReviewVerdict(realShape('RE_PLAN'))).toBe('RE_PLAN')
  })

  it('真实结论是 APPROVE 时返回 APPROVE', () => {
    expect(parseReviewVerdict(realShape('APPROVE'))).toBe('APPROVE')
  })

  it('只有模板枚举行时返回 UNKNOWN', () => {
    const templateOnly = `
  Return a verdict line VERDICT: APPROVE | REJECT | RE_PLAN
  - APPROVE means the evidence satisfies the stated acceptance criteria.
  - REJECT means evidence is missing or a criterion is demonstrably unmet.
`
    expect(parseReviewVerdict(templateOnly)).toBe('UNKNOWN')
  })

  it('空文本返回 UNKNOWN', () => {
    expect(parseReviewVerdict('')).toBe('UNKNOWN')
  })

  it('大小写与中文冒号都能识别', () => {
    expect(parseReviewVerdict('⏺ verdict： reject')).toBe('REJECT')
    expect(parseReviewVerdict('VERDICT:Reject')).toBe('REJECT')
  })

  it('带前缀装饰（⏺ - *）不影响识别', () => {
    expect(parseReviewVerdict('⏺ VERDICT: REJECT')).toBe('REJECT')
    expect(parseReviewVerdict('- VERDICT: REJECT')).toBe('REJECT')
    expect(parseReviewVerdict('  * VERDICT: REJECT')).toBe('REJECT')
  })

  it('同行带理由时仍取该 verdict', () => {
    expect(parseReviewVerdict('VERDICT: REJECT because the file is missing')).toBe('REJECT')
  })
})

describe('readReviewVerdict', () => {
  it('读真实文件取末尾结论', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'verdict-spec-'))
    const file = join(dir, 'bridge.review.md')
    await writeFile(file, realShape('REJECT'), 'utf8')

    await expect(readReviewVerdict(file)).resolves.toBe('REJECT')
  })

  it('路径缺失或文件不存在时返回 UNKNOWN 且不抛错', async () => {
    await expect(readReviewVerdict(undefined)).resolves.toBe('UNKNOWN')
    await expect(readReviewVerdict('/nonexistent/path.review.md')).resolves.toBe('UNKNOWN')
  })
})

describe('parseReviewConclusion', () => {
  /** 真实文件形态：假 verdict + 模板占位符在前，真实结论与理由在末尾。 */
  const real = `# Review of final-check

VERDICT: APPROVE
REASON: <one or two sentences>
GAPS:
<bullet list of gaps, or
  NONE>

  Return a verdict line VERDICT: APPROVE | REJECT | RE_PLAN, a
  REASON line, and a GAPS list.

⏺ VERDICT: REJECT
  REASON: The acceptance criterion requires /tmp/does-not-exist-xyz.txt
  to exist with 500 lines, but the file does not exist.
  GAPS:

  - Target file does not exist (independently confirmed: MISSING).
  - No test or verification artifact was supplied.

───────────────────────────────────
❯
  ⏵⏵ auto mode on (shift+tab to cycle)
`

  it('取末尾真实 verdict，不取开头的假 APPROVE', () => {
    expect(parseReviewConclusion(real).verdict).toBe('REJECT')
  })

  it('取真实 reason 而不是模板占位符', () => {
    const { reason } = parseReviewConclusion(real)
    expect(reason).not.toContain('<one or two sentences>')
    expect(reason).toContain('does not exist')
  })

  it('取真实 gaps 而不是模板占位符', () => {
    const { gaps } = parseReviewConclusion(real)
    expect(gaps).not.toContain('bullet list of gaps')
    expect(gaps).toContain('Target file does not exist')
  })

  it('在装饰行（窗口分隔、提示符）处停止收集', () => {
    const { gaps } = parseReviewConclusion(real)
    expect(gaps).not.toContain('auto mode on')
    expect(gaps).not.toContain('❯')
  })

  it('没有真实 verdict 时返回空结论', () => {
    const result = parseReviewConclusion('VERDICT: APPROVE | REJECT | RE_PLAN')
    expect(result).toEqual({ verdict: 'UNKNOWN', reason: '', gaps: '' })
  })

  it('空文本返回空结论', () => {
    expect(parseReviewConclusion('')).toEqual({ verdict: 'UNKNOWN', reason: '', gaps: '' })
  })
})

describe('readReviewConclusion', () => {
  it('路径缺失时返回空结论且不抛错', async () => {
    await expect(readReviewConclusion(undefined)).resolves.toEqual({ verdict: 'UNKNOWN', reason: '', gaps: '' })
    await expect(readReviewConclusion('/nonexistent/x.review.md')).resolves.toEqual({
      verdict: 'UNKNOWN',
      reason: '',
      gaps: ''
    })
  })
})
