import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it, vi } from 'vite-plus/test'

import { loadMeta, loadMetaDocs, metaFileOf, prepareExamples } from '../examples'

describe('meta 装载', () => {
  it('按语种选 `.CN` 与无后缀文件', () => {
    expect(metaFileOf('zh-CN', 'badge')).toBe('../generated/badge.CN.meta.js')
    expect(metaFileOf('en', 'badge')).toBe('../generated/badge.meta.js')
  })

  it('同一份模块只拉一次，返回同一个数组', async () => {
    const [first, second] = await Promise.all([loadMeta('zh-CN', 'badge'), loadMeta('zh-CN', 'badge')])
    expect(first).toBe(second)
  })

  it('中文与英文各拿自己那一份语料', async () => {
    const [zh, en] = await Promise.all([loadMeta('zh-CN', 'badge'), loadMeta('en', 'badge')])
    const firstParagraph = (nodes: MetaNode[]) => nodes.find(node => node.label === 'p')
    expect(firstParagraph(zh)?.content).toContain('角标')
    expect(firstParagraph(en)?.content).toContain('corner badge')
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
