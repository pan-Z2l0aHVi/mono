import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it } from 'vite-plus/test'

import { resolveReadmeLinks } from '../readme'

describe('README 链接', () => {
  it('将嵌套节点中的相对链接指向文档源，保留外部链接和原始数据', () => {
    const nodes: MetaNode[] = [
      {
        label: 'ul',
        children: [
          { label: 'li', content: '<a href="./docs/button.md">Button</a> <a href="https://example.com">External</a>' }
        ]
      }
    ]
    const result = resolveReadmeLinks(nodes, 'https://example.com/repo')
    expect(result[0]?.children?.[0]?.content).toBe(
      '<a href="https://example.com/repo/docs/button.md">Button</a> <a href="https://example.com">External</a>'
    )
    expect(nodes[0]?.children?.[0]?.content).toContain('href="./docs/button.md"')
  })
})
