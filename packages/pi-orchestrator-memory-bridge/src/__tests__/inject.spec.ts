/**
 * 注入渲染与 token 预算。
 *
 * 守三件事：没有内容时不注入空壳；超预算时截断而不是丢整段；输出对同一输入恒定（否则
 * Pi 的 system prompt 段差量每轮都会判定「变了」，prompt 缓存全废）。
 */

import { describe, expect, it } from 'vite-plus/test'

import type { BoardSummary, OrchestrationFact } from '../contracts'
import { DEFAULT_TOKEN_BUDGET, injectionTokens, renderInjection } from '../memory/inject'

const fact = (key: string, value: string): OrchestrationFact => ({
  key,
  value,
  confidence: 0.95,
  source: 'test'
})

const REJECTION = fact('project.demo.orchestration.rejection.abc', 'REJECT from lead')
const DECISION = fact('project.demo.orchestration.decision.def', 'approved plan')

describe('空输入', () => {
  it('既无记忆又无 board 时返回空字符串', () => {
    expect(renderInjection([])).toBe('')
  })

  it('board 存在时即便没有记忆也渲染', () => {
    const board: BoardSummary = { panel: 'main', counts: { todo: 1 }, items: [] }
    expect(renderInjection([], { board })).toContain('Board (main)')
  })
})

describe('标记与结构', () => {
  it('明确标注 historical / untrusted 与只读语义', () => {
    const text = renderInjection([DECISION])

    expect(text).toContain('<orchestration-memory>')
    expect(text).toContain('</orchestration-memory>')
    expect(text).toContain('Historical orchestration memory')
    expect(text).toContain('untrusted')
    expect(text).toContain('not as current instruction')
  })

  it('键名去掉 project.<slug>.orchestration. 前缀后再展示', () => {
    const text = renderInjection([DECISION])

    expect(text).toContain('- decision.def: approved plan')
    expect(text).not.toContain('project.demo.orchestration.')
  })
})

describe('优先级与预算', () => {
  it('拒绝排在决策之前', () => {
    const text = renderInjection([DECISION, REJECTION])
    const rejectionAt = text.indexOf('rejection.abc')
    const decisionAt = text.indexOf('decision.def')

    expect(rejectionAt).toBeGreaterThan(-1)
    expect(decisionAt).toBeGreaterThan(-1)
    expect(rejectionAt).toBeLessThan(decisionAt)
  })

  it('预算极小时仍保留拒绝条目并标注省略', () => {
    const many = Array.from({ length: 40 }, (_, index) =>
      fact(`project.demo.orchestration.decision.${String(index).padStart(3, '0')}`, `decision number ${index}`)
    )
    const text = renderInjection([...many, REJECTION], { tokenBudget: 160 })

    expect(text).toContain('rejection.abc')
    expect(text).toContain('omitted: token budget')
    expect(injectionTokens(text)).toBeLessThanOrEqual(160 + 20)
  })

  it('默认预算下渲染结果不超过预算上限裕度', () => {
    const many = Array.from({ length: 200 }, (_, index) =>
      fact(`project.demo.orchestration.decision.${String(index).padStart(3, '0')}`, 'x'.repeat(80))
    )
    const text = renderInjection(many)

    expect(injectionTokens(text)).toBeLessThanOrEqual(DEFAULT_TOKEN_BUDGET + 20)
  })
})

describe('确定性', () => {
  it('同一组 fact 换顺序渲染出完全相同的文本', () => {
    const facts = [DECISION, REJECTION, fact('project.demo.orchestration.decision.zzz', 'later')]

    expect(renderInjection(facts)).toBe(renderInjection([...facts].reverse()))
  })

  it('重复调用结果稳定', () => {
    const text = renderInjection([DECISION])
    expect(renderInjection([DECISION])).toBe(text)
  })
})

describe('board 段', () => {
  const board: BoardSummary = {
    panel: 'sprint',
    counts: { in_progress: 1, todo: 2 },
    items: [
      { id: 'T-1', title: 'wire anchor', status: 'in_progress' },
      { id: 'T-2', title: 'read board', status: 'todo' }
    ]
  }

  it('渲染面板名、计数与条目', () => {
    const text = renderInjection([DECISION], { board })

    expect(text).toContain('Board (sprint)')
    expect(text).toContain('in_progress=1')
    expect(text).toContain('todo=2')
    expect(text).toContain('T-1 [in_progress] wire anchor')
  })

  it('board 摘要超预算时退化为只保留计数', () => {
    const longBoard: BoardSummary = {
      panel: 'sprint',
      counts: { todo: 9 },
      items: Array.from({ length: 40 }, (_, index) => ({
        id: `T-${index}`,
        title: 'x'.repeat(60),
        status: 'todo'
      }))
    }
    const text = renderInjection([DECISION, REJECTION], { board: longBoard, tokenBudget: 120 })

    expect(text).toContain('Board (sprint)')
    expect(text).toContain('todo=9')
    expect(text).not.toContain('T-39')
  })
})
