import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it, vi } from 'vite-plus/test'

import { loadMeta, loadMetaDocs, prepareExamples } from '../examples'

describe('meta 装载（本端 glob 接线；引擎判据在 kit 的 examples 用例）', () => {
  it('同一份模块只拉一次，返回同一个数组', async () => {
    const [first, second] = await Promise.all([loadMeta('zh-CN', 'badge'), loadMeta('zh-CN', 'badge')])
    expect(first).toBe(second)
  })

  it('中文与英文各拿自己那一份语料', async () => {
    const [zh, en] = await Promise.all([loadMeta('zh-CN', 'badge'), loadMeta('en', 'badge')])
    const paragraphs = (nodes: MetaNode[]) => nodes.filter(node => node.label === 'p').map(node => node.content ?? '')
    expect(paragraphs(zh).some(text => text.includes('角标'))).toBe(true)
    expect(paragraphs(en).some(text => text.includes('corner badge'))).toBe(true)
    expect(paragraphs(zh)[0]).toContain('href="./badge.md"')
    expect(paragraphs(en)[0]).toContain('href="./badge.CN.md"')
  })

  it('loadMetaDocs 按组件名聚合成 Map', async () => {
    const docs = await loadMetaDocs('zh-CN', ['badge', 'back-top'])
    expect([...docs.keys()]).toEqual(['badge', 'back-top'])
    expect(docs.get('back-top')).toHaveLength((await loadMeta('zh-CN', 'back-top')).length)
  })

  it('prepareExamples 预载所有带 load 的代码块', async () => {
    const load = vi.fn<() => Promise<unknown>>(async () => undefined)
    const docs = new Map<string, MetaNode[]>([
      [
        'demo',
        [
          { label: 'codeblock', lang: 'vue', load },
          { label: 'codeblock', lang: 'tsx' },
          { label: 'p', content: 'text' }
        ]
      ],
      ['plain', [{ label: 'codeblock', lang: 'tsx' }]]
    ])
    await prepareExamples(docs)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
