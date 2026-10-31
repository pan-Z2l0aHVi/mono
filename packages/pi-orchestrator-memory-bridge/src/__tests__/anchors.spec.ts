/**
 * 锚点提取与键名稳定性。
 *
 * 守两件事：
 * 1. 只有真正的「计划获批」「审查拒绝」才产生锚点，APPROVE 不能写拒绝记忆。
 * 2. 同一逻辑事件重复触发得到同一个键——pi-memory 的 `setSemantic` 对同 key 是 upsert，
 *    键稳定就意味着重放幂等，不会堆出重复记忆。
 */

import { describe, expect, it } from 'vite-plus/test'

import {
  anchorFromPlan,
  anchorFromReview,
  anchorFromToolResult,
  isPlanApproved,
  isRejectedReview,
  stableSlot
} from '../anchors/extract'

const planDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'plan',
  approved: true,
  ledger: '/repo/.herdr-runs',
  // orchestrator 实际只发切片数量，不发 objective 与切片名。
  slices: 2,
  ...overrides
})

const reviewDetails = (overrides: Record<string, unknown> = {}) => ({
  action: 'review',
  slice: 'bridge',
  verdict: 'REJECT',
  reason: 'no tests for the injection budget',
  gaps: 'missing: budget spec',
  reviewFile: '/repo/.herdr-runs/slices/bridge.review.md',
  ...overrides
})

describe('计划获批锚点', () => {
  it('获批时产出 decision 锚点，记录切片数量与 ledger', () => {
    const anchor = anchorFromPlan(planDetails())

    expect(anchor?.kind).toBe('decision')
    expect(anchor?.value).toContain('2 slice(s)')
    expect(anchor?.value).toContain('/repo/.herdr-runs')
    // details 里没有 objective 时不能编造
    expect(anchor?.value).not.toContain('objective')
  })

  it('details 恰好带 objective 时才记录它', () => {
    const anchor = anchorFromPlan(planDetails({ objective: 'ship the memory bridge' }))
    expect(anchor?.value).toContain('objective: ship the memory bridge')
  })

  it('未获批或缺失 approved 时不产出锚点', () => {
    expect(anchorFromPlan(planDetails({ approved: false }))).toBeUndefined()
    expect(anchorFromPlan({ action: 'plan' })).toBeUndefined()
    expect(anchorFromPlan(undefined)).toBeUndefined()
    expect(anchorFromPlan('plan')).toBeUndefined()
  })

  it('details 不是 plan action 时不产出锚点', () => {
    expect(anchorFromPlan({ action: 'dispatch', approved: true })).toBeUndefined()
  })

  it('details 带对象数组时不把 scope / acceptance 正文写进记忆', () => {
    const anchor = anchorFromPlan(
      planDetails({
        slices: [
          {
            name: 'bridge',
            scope: 'SECRET-SCOPE-TEXT',
            acceptance: 'SECRET-ACCEPTANCE-TEXT',
            evidence: 'SECRET-EVIDENCE-TEXT'
          }
        ]
      })
    )

    expect(anchor?.value).not.toContain('SECRET')
  })
})

describe('审查拒绝锚点', () => {
  it.each(['REJECT', 'RE_PLAN', 'UNKNOWN'])('%s 产出 rejection 锚点', verdict => {
    const anchor = anchorFromReview(reviewDetails({ verdict }))

    expect(anchor?.kind).toBe('rejection')
    expect(anchor?.value).toContain(verdict === 'REJECT' ? 'REJECT' : verdict)
  })

  it('APPROVE 不产出拒绝锚点', () => {
    expect(anchorFromReview(reviewDetails({ verdict: 'APPROVE' }))).toBeUndefined()
  })

  it('verdict 小写也能识别', () => {
    expect(isRejectedReview(reviewDetails({ verdict: 'reject' }))).toBe(true)
  })

  it('带 reason 与 gaps', () => {
    const anchor = anchorFromReview(reviewDetails())

    expect(anchor?.value).toContain('no tests for the injection budget')
    expect(anchor?.value).toContain('missing: budget spec')
  })

  it('gaps 为 NONE 时不追加这一项', () => {
    const anchor = anchorFromReview(reviewDetails({ gaps: 'NONE' }))

    expect(anchor?.value).not.toContain('gaps:')
  })

  it('多行 gaps 压成单行', () => {
    const anchor = anchorFromReview(reviewDetails({ gaps: 'line one\nline two\n  line three' }))

    expect(anchor?.value).toContain('line one line two line three')
  })

  it('不包含 review 原文件路径或 raw output', () => {
    const anchor = anchorFromReview(reviewDetails())
    expect(anchor?.value).not.toContain('.review.md')
  })
})

describe('键名幂等性', () => {
  it('同样的 details 两次得到同一个 slot', () => {
    const first = anchorFromReview(reviewDetails())
    const second = anchorFromReview(reviewDetails())

    expect(first?.slot).toBe(second?.slot)
  })

  it('plan 重放（slices 顺序不同但 objective 与 ledger 相同）仍是同一个 slot', () => {
    const first = anchorFromPlan(planDetails())
    const second = anchorFromPlan(planDetails())

    expect(first?.slot).toBe(second?.slot)
  })

  it('不同 ledger 得到不同 slot', () => {
    const first = anchorFromPlan(planDetails())
    const second = anchorFromPlan(planDetails({ ledger: '/repo/.other-runs' }))

    expect(first?.slot).not.toBe(second?.slot)
  })

  it('不同 slice 或 verdict 得到不同 slot', () => {
    expect(anchorFromReview(reviewDetails({ slice: 'a' }))?.slot).not.toBe(
      anchorFromReview(reviewDetails({ slice: 'b' }))?.slot
    )
    expect(anchorFromReview(reviewDetails({ verdict: 'REJECT' }))?.slot).not.toBe(
      anchorFromReview(reviewDetails({ verdict: 'RE_PLAN' }))?.slot
    )
  })

  it('slot 是固定长度十六进制，可安全用作键片段', () => {
    expect(stableSlot(['x'])).toMatch(/^[0-9a-f]{16}$/)
    expect(stableSlot([])).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('按工具名分派', () => {
  const never = async () => ({ verdict: 'UNKNOWN' as const, reason: '', gaps: '' })

  it('只认 herdr_plan 与 herdr_review', async () => {
    expect((await anchorFromToolResult('herdr_plan', planDetails(), never))?.kind).toBe('decision')
    expect((await anchorFromToolResult('herdr_review', reviewDetails(), never))?.kind).toBe('rejection')
    expect(await anchorFromToolResult('herdr_dispatch', planDetails(), never)).toBeUndefined()
    expect(await anchorFromToolResult('bash', planDetails(), never)).toBeUndefined()
    expect(await anchorFromToolResult('herdr_plan', reviewDetails(), never)).toBeUndefined()
  })
})

/**
 * orchestrator 的 verdict 解析缺陷的兜底。
 *
 * `herdr_review` 的正则会被 reviewer 模板里的 `VERDICT: APPROVE | REJECT | RE_PLAN` 抢先
 * 命中，导致 `details.verdict` 经常是假的 APPROVE。桥接回读 `<ledger>/slices/<slice>.review.md`
 * 取 reviewer 的真实结论。
 */
describe('verdict 兜底', () => {
  /** details 说 APPROVE，但 review 文件里 reviewer 判 REJECT 的典型情形。 */
  const falseApprove = () => ({
    action: 'review',
    slice: 'bridge-probe',
    verdict: 'APPROVE',
    reason: '<one or two sentences>',
    gaps: '',
    reviewFile: '/repo/.herdr-runs/slices/bridge-probe.review.md'
  })

  const conclusion =
    (verdict: 'APPROVE' | 'REJECT' | 'RE_PLAN' | 'UNKNOWN', reason = '', gaps = '') =>
    async () => ({ verdict, reason, gaps })

  it('details 说 APPROVE 但文件里是 REJECT 时写 rejection 锚点', async () => {
    const anchor = await anchorFromToolResult(
      'herdr_review',
      falseApprove(),
      conclusion('REJECT', 'criterion unmet', 'file missing')
    )

    expect(anchor?.kind).toBe('rejection')
    expect(anchor?.value).toContain('REJECT')
    expect(anchor?.value).toContain('criterion unmet')
    expect(anchor?.value).toContain('file missing')
  })

  it('RE_PLAN 同样写 rejection', async () => {
    const anchor = await anchorFromToolResult('herdr_review', falseApprove(), conclusion('RE_PLAN'))
    expect(anchor?.kind).toBe('rejection')
  })

  it('文件里也是 APPROVE 时不写', async () => {
    expect(await anchorFromToolResult('herdr_review', falseApprove(), conclusion('APPROVE'))).toBeUndefined()
  })

  it('回读失败（UNKNOWN）且 details 说 APPROVE 时不写', async () => {
    expect(await anchorFromToolResult('herdr_review', falseApprove(), conclusion('UNKNOWN'))).toBeUndefined()
  })

  it('回读失败但 details 本身是 REJECT 时仍写（退回 details）', async () => {
    const anchor = await anchorFromToolResult('herdr_review', reviewDetails(), conclusion('UNKNOWN'))
    expect(anchor?.kind).toBe('rejection')
  })

  it('优先用文件里的真实 reason，不用 details 的模板占位符', async () => {
    const anchor = await anchorFromToolResult(
      'herdr_review',
      falseApprove(),
      conclusion('REJECT', 'the file does not exist')
    )

    expect(anchor?.value).not.toContain('<one or two sentences>')
    expect(anchor?.value).toContain('the file does not exist')
  })

  it('非 review 的 details 不回读文件', async () => {
    let called = false
    const anchor = await anchorFromToolResult('herdr_review', { action: 'dispatch' }, async () => {
      called = true
      return { verdict: 'REJECT' as const, reason: '', gaps: '' }
    })

    expect(anchor).toBeUndefined()
    expect(called).toBe(false)
  })

  it('回读到的 verdict 参与 slot 计算：同一 slice 的 REJECT 与 RE_PLAN 不同键', async () => {
    const reject = await anchorFromToolResult('herdr_review', falseApprove(), conclusion('REJECT'))
    const replan = await anchorFromToolResult('herdr_review', falseApprove(), conclusion('RE_PLAN'))

    expect(reject?.slot).not.toBe(replan?.slot)
  })
})

describe('类型守卫', () => {
  it('isPlanApproved 只认 approved === true', () => {
    expect(isPlanApproved(planDetails())).toBe(true)
    expect(isPlanApproved(planDetails({ approved: 'true' }))).toBe(false)
    expect(isPlanApproved(null)).toBe(false)
  })
})
