import { describe, expect, it } from 'vite-plus/test'

import { parseMarkdown } from '../markdown'
import { renderMetaModule } from '../render'

describe('围栏 meta 透传与序列化', () => {
  it('无围栏 meta 时省略 meta 字段，保持序列化产出不含 meta 键', async () => {
    const parsed = await parseMarkdown('```ts\nconst x = 1\n```\n', 'plain.md', { exec: [] })
    expect(parsed.nodes).toHaveLength(1)
    expect('meta' in parsed.nodes[0]!).toBe(false)
    const rendered = renderMetaModule(parsed.nodes)
    expect(rendered).not.toContain('meta:')
  })

  it('存在围栏 meta 时写入 node.meta 并在 renderMetaModule 中安全序列化', async () => {
    const parsed = await parseMarkdown('```ts demo=parse-url title="URL"\nconst x = 1\n```\n', 'demo.md', {
      exec: []
    })
    expect(parsed.nodes[0]?.meta).toBe('demo=parse-url title="URL"')
    const rendered = renderMetaModule(parsed.nodes)
    expect(rendered).toContain('meta: "demo=parse-url title=\\"URL\\""')
  })
})
