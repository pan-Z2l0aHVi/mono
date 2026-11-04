import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it, vi } from 'vite-plus/test'

import { createMetaLoader, metaFileOf, prepareExamples } from '../examples'

const moduleOf = (nodes: MetaNode[]) => async () => ({ default: nodes })

describe('语料文件名契约', () => {
  it('按语种选 `.CN` 与无后缀文件', () => {
    expect(metaFileOf('zh-CN', 'badge')).toBe('badge.CN.meta.js')
    expect(metaFileOf('en', 'badge')).toBe('badge.meta.js')
  })
})

describe('meta 装载', () => {
  function setup() {
    const badgeZh: MetaNode[] = [{ label: 'p', content: 'zh' }]
    const badgeEn: MetaNode[] = [{ label: 'p', content: 'en' }]
    const modules = {
      '../generated/badge.CN.meta.js': moduleOf(badgeZh),
      '../generated/badge.meta.js': moduleOf(badgeEn)
    }
    const loader = createMetaLoader({
      modules,
      resolve: (locale, component) => `../generated/${metaFileOf(locale, component)}`
    })
    return { loader, badgeZh, badgeEn }
  }

  it('同一份模块只拉一次，返回同一个数组', async () => {
    const { loader, badgeZh } = setup()
    const [first, second] = await Promise.all([loader.loadMeta('zh-CN', 'badge'), loader.loadMeta('zh-CN', 'badge')])
    expect(first).toBe(second)
    expect(first).toBe(badgeZh)
  })

  it('中文与英文各拿自己那一份语料', async () => {
    const { loader, badgeZh, badgeEn } = setup()
    const [zh, en] = await Promise.all([loader.loadMeta('zh-CN', 'badge'), loader.loadMeta('en', 'badge')])
    expect(zh).toBe(badgeZh)
    expect(en).toBe(badgeEn)
  })

  it('模块缺失时报错并带上键名', async () => {
    const { loader } = setup()
    await expect(loader.loadMeta('zh-CN', 'missing')).rejects.toThrow('Generated meta module is missing from glob')
  })

  it('装载失败不缓存，下次调用会重试', async () => {
    let attempts = 0
    const loader = createMetaLoader({
      modules: {
        'a.meta.js': () => {
          attempts += 1
          if (attempts === 1) return Promise.reject(new Error('network'))
          return Promise.resolve({ default: [{ label: 'p' }] as MetaNode[] })
        }
      },
      resolve: (_locale, component) => `${component}.meta.js`
    })
    await expect(loader.loadMeta('en', 'a')).rejects.toThrow('network')
    await expect(loader.loadMeta('en', 'a')).resolves.toEqual([{ label: 'p' }])
    expect(attempts).toBe(2)
  })

  it('loadMetaDocs 按组件名聚合成 Map，重复组件名去重', async () => {
    const { loader } = setup()
    const docs = await loader.loadMetaDocs('zh-CN', ['badge', 'badge'])
    expect([...docs.keys()]).toEqual(['badge'])
  })
})

describe('prepareExamples 预载', () => {
  it('预载所有带 load 的代码块', async () => {
    const load = vi.fn<() => Promise<unknown>>(async () => undefined)
    const docs = new Map<string, MetaNode[]>([
      [
        'demo',
        [
          { label: 'codeblock', lang: 'tsx', load },
          { label: 'codeblock', lang: 'vue' },
          { label: 'p', content: 'text' }
        ]
      ],
      ['plain', [{ label: 'codeblock', lang: 'vue' }]]
    ])
    await prepareExamples(docs)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
