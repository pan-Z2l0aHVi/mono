/**
 * 编排键与召回。
 *
 * 两个要点：
 * 1. 键**不以 `project.` 开头**。`pi-memory` 只对 `project.*` 键做 slug 校验，而它的 slug 在
 *    linked worktree 里是 worktree 名——带 `project.` 前缀会把同一仓库的编排记忆按 worktree 切开。
 * 2. 召回必须挡掉别的仓库的编排键：`scope: "all"` 会把它们一起返回。
 */

import { describe, expect, it, vi } from 'vite-plus/test'

import type { MemoryBackend, OrchestrationFact } from '../contracts'
import {
  orchestrationKey,
  orchestrationPrefix,
  isOwnOrchestrationKey,
  isForeignOrchestrationKey,
  slotKindOf
} from '../memory/keys'
import { recallOrchestration, renderRecall } from '../memory/recall'
import type { RepoIdentity } from '../repo-identity'

const IDENTITY: RepoIdentity = {
  key: 'mono-a1b2c3',
  root: '/Users/x/mono',
  name: 'mono',
  isGit: true
}

const fact = (key: string, value = 'v'): OrchestrationFact => ({
  key,
  value,
  confidence: 0.95,
  source: 'test'
})

describe('键的形状', () => {
  it('不以 project. 开头（否则会被 pi-memory 按 worktree slug 拦下）', () => {
    const key = orchestrationKey('mono-a1b2c3', 'decision', 'abcdef1234567890')

    expect(key).toBe('orchestration.mono-a1b2c3.decision.abcdef1234567890')
    expect(key.startsWith('project.')).toBe(false)
  })

  it('decision 与 rejection 用同一前缀、不同 kind 段', () => {
    const prefix = orchestrationPrefix(IDENTITY.key)

    expect(orchestrationKey(IDENTITY.key, 'decision', 'x')).toBe(`${prefix}decision.x`)
    expect(orchestrationKey(IDENTITY.key, 'rejection', 'x')).toBe(`${prefix}rejection.x`)
  })

  it('slot 被规范化：小写、非字母数字折成连字符、去首尾', () => {
    expect(orchestrationKey('r', 'decision', '  Hello World!!  ')).toBe('orchestration.r.decision.hello-world')
  })

  it('slot 截断到 96 字符', () => {
    const key = orchestrationKey('r', 'decision', 'a'.repeat(200))
    expect(key.split('.').at(-1)).toHaveLength(96)
  })

  it('空 slot 抛错，而不是生成一个以点结尾的键', () => {
    expect(() => orchestrationKey('r', 'decision', '   ')).toThrow()
    expect(() => orchestrationKey('r', 'decision', '!!!')).toThrow()
  })
})

describe('归属判定', () => {
  it('自己的键', () => {
    expect(isOwnOrchestrationKey('orchestration.mono-a1b2c3.rejection.x', IDENTITY.key)).toBe(true)
  })

  it('别的仓库的编排键算外来', () => {
    expect(isForeignOrchestrationKey('orchestration.other-repo-123456.rejection.x', IDENTITY.key)).toBe(true)
    expect(isOwnOrchestrationKey('orchestration.other-repo-123456.rejection.x', IDENTITY.key)).toBe(false)
  })

  it('非编排的全局键既不算自己的也不算外来', () => {
    for (const key of ['workflow.some-fact', 'project.mono-a1b2c3.other', 'pref.editor']) {
      expect(isOwnOrchestrationKey(key, IDENTITY.key)).toBe(false)
      expect(isForeignOrchestrationKey(key, IDENTITY.key)).toBe(false)
    }
  })

  it('前缀匹配不会因为 repo-key 是别人的前缀而出错', () => {
    // mono-a1b2c3 与 mono-a1b2c36 前缀不同，后者不该算自己的。
    expect(isOwnOrchestrationKey('orchestration.mono-a1b2c36.rejection.x', 'mono-a1b2c3')).toBe(false)
  })

  it('大小写不敏感', () => {
    expect(isOwnOrchestrationKey('ORCHESTRATION.MONO-A1B2C3.rejection.x', IDENTITY.key)).toBe(true)
  })
})

describe('slotKindOf', () => {
  it('取出 kind 段', () => {
    expect(slotKindOf('orchestration.mono-a1b2c3.rejection.abc')).toBe('rejection')
    expect(slotKindOf('orchestration.mono-a1b2c3.decision.abc')).toBe('decision')
  })

  it('形状不符时返回 undefined', () => {
    expect(slotKindOf('workflow.x')).toBeUndefined()
    expect(slotKindOf('')).toBeUndefined()
  })
})

describe('recallOrchestration', () => {
  const backendReturning = (facts: OrchestrationFact[]) =>
    ({ search: vi.fn(async () => facts) }) as unknown as MemoryBackend

  it('只保留本仓库的编排键', async () => {
    const backend = backendReturning([
      fact('orchestration.mono-a1b2c3.rejection.a', 'mine'),
      fact('orchestration.other-repo-123456.rejection.b', 'theirs'),
      fact('workflow.global-fact', 'unrelated')
    ])

    const result = await recallOrchestration(backend, IDENTITY)

    expect(result.facts.map(item => item.key)).toEqual(['orchestration.mono-a1b2c3.rejection.a'])
  })

  it('分别统计 rejection 与 decision', async () => {
    const backend = backendReturning([
      fact('orchestration.mono-a1b2c3.rejection.a'),
      fact('orchestration.mono-a1b2c3.rejection.b'),
      fact('orchestration.mono-a1b2c3.decision.c')
    ])

    const result = await recallOrchestration(backend, IDENTITY)

    expect(result.rejected).toBe(2)
    expect(result.decisions).toBe(1)
  })

  it('结果条数达到上限时标记 truncated', async () => {
    const many = Array.from({ length: 5 }, (_, index) => fact(`orchestration.mono-a1b2c3.decision.${index}`))
    const result = await recallOrchestration(backendReturning(many), IDENTITY, { limit: 5 })

    expect(result.truncated).toBe(true)
  })

  it('没有结果时不标记 truncated', async () => {
    const result = await recallOrchestration(backendReturning([]), IDENTITY)
    expect(result.truncated).toBe(false)
  })

  it('后端失败时向上抛，由调用方转成 isError', async () => {
    const backend = {
      search: vi.fn(async () => {
        throw new Error('store down')
      })
    } as unknown as MemoryBackend
    await expect(recallOrchestration(backend, IDENTITY)).rejects.toThrow('store down')
  })
})

describe('renderRecall', () => {
  it('空结果给出明确说明', () => {
    const text = renderRecall(IDENTITY, { facts: [], rejected: 0, decisions: 0, truncated: false })
    expect(text).toContain('No orchestration memory recorded')
    expect(text).toContain('mono-a1b2c3')
  })

  it('列出条目并给出统计与仓库路径', () => {
    const text = renderRecall(IDENTITY, {
      facts: [fact('orchestration.mono-a1b2c3.rejection.a', 'REJECT: no tests')],
      rejected: 1,
      decisions: 0,
      truncated: false
    })

    expect(text).toContain('mono-a1b2c3')
    expect(text).toContain('/Users/x/mono')
    expect(text).toContain('1 rejection(s)')
    expect(text).toContain('REJECT: no tests')
  })

  it('拒绝排在决策之前', () => {
    const text = renderRecall(IDENTITY, {
      facts: [
        fact('orchestration.mono-a1b2c3.decision.a', 'DECISION-ITEM'),
        fact('orchestration.mono-a1b2c3.rejection.b', 'REJECTION-ITEM')
      ],
      rejected: 1,
      decisions: 1,
      truncated: false
    })

    expect(text.indexOf('REJECTION-ITEM')).toBeLessThan(text.indexOf('DECISION-ITEM'))
  })

  it('truncated 时提示可以调大 limit', () => {
    const text = renderRecall(IDENTITY, {
      facts: [fact('orchestration.mono-a1b2c3.decision.a')],
      rejected: 0,
      decisions: 1,
      truncated: true
    })
    expect(text).toContain('more items may exist')
  })
})
