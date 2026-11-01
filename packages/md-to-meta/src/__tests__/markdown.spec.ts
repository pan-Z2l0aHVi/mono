import { describe, expect, it } from 'vite-plus/test'

import { parseMarkdown } from '../markdown'

/*
 * 解析器的判据只有一条：markdown 的结构原样变成 meta。这里不测任何宿主的业务契约——
 * 示例小节、API 表、语种都不属于引擎，engine 只认 CommonMark 结构与围栏。
 */

const TSX_BODY = ['const App = () => <div>hello</div>', 'export default App'].join('\n')
const BASH_BODY = 'pnpm build'
const PLAIN_BODY = 'plain text'

const DOC = [
  '# Button',
  '',
  '支持 **加粗** 与 `代码`。',
  '',
  '- 条目一',
  '- 条目二',
  '',
  '1. 第一',
  '2. 第二',
  '',
  '| 属性 | 说明 |',
  '| --- | --- |',
  '| `variant` | 联合类型 `a` \\| `b` |',
  '',
  '> 引用',
  '',
  '---',
  '',
  '![截图](./shot.png)',
  '',
  '```tsx',
  TSX_BODY,
  '```',
  '',
  '```bash',
  BASH_BODY,
  '```',
  '',
  '```',
  PLAIN_BODY,
  '```',
  ''
].join('\n')

describe('parseMarkdown 的结构投影', () => {
  it('标题按文档顺序拿到 section-<n>，行内标记渲染成 HTML', async () => {
    const { nodes } = await parseMarkdown(DOC, 'button.md', { exec: [] })
    expect(nodes[0]).toEqual({ label: 'h1', id: 'section-1', content: 'Button' })
    expect(nodes[1]?.content).toContain('<strong>加粗</strong>')
    expect(nodes[1]?.content).toContain('<code>代码</code>')
  })

  it('列表、引用与分隔线按结构嵌套', async () => {
    const { nodes } = await parseMarkdown(DOC, 'button.md', { exec: [] })
    const ul = nodes.find(node => node.label === 'ul')
    expect(ul?.children).toEqual([
      { label: 'li', content: '条目一' },
      { label: 'li', content: '条目二' }
    ])
    const ol = nodes.find(node => node.label === 'ol')
    expect(ol?.children?.map(child => child.content)).toEqual(['第一', '第二'])
    const quote = nodes.find(node => node.label === 'blockquote')
    expect(quote?.children?.[0]).toEqual({ label: 'p', content: '引用' })
    expect(nodes.some(node => node.label === 'hr')).toBe(true)
  })

  it('表格按行解析，`\\|` 还原成字面竖线', async () => {
    const { nodes } = await parseMarkdown(DOC, 'button.md', { exec: [] })
    const table = nodes.find(node => node.label === 'table')
    expect(table?.children?.[0]?.children?.map(cell => cell.label)).toEqual(['th', 'th'])
    expect(table?.children?.[0]?.children?.map(cell => cell.content)).toEqual(['属性', '说明'])
    const body = table?.children?.[1]?.children
    expect(body?.[0]).toEqual({ label: 'td', content: '<code>variant</code>' })
    // 单元格里的 `\|` 先还原再按行内 markdown 渲染，不能被切成一列。
    expect(body?.[1]?.content).toBe('联合类型 <code>a</code> | <code>b</code>')
  })

  it('独立的图片提成结构化节点', async () => {
    const { nodes } = await parseMarkdown(DOC, 'button.md', { exec: [] })
    expect(nodes.find(node => node.label === 'img')).toEqual({ label: 'img', src: './shot.png', alt: '截图' })
  })

  it('所有围栏都落盘，扩展名即语言名，无语言落 .txt', async () => {
    const { nodes, codeFiles } = await parseMarkdown(DOC, 'button.md', { exec: [] })
    const blocks = nodes.filter(node => node.label === 'codeblock')
    expect(blocks.map(block => block.lang)).toEqual(['tsx', 'bash', ''])
    expect(blocks.map(block => block.path)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\.\/codeblock\/[\da-f]{12}\.tsx$/),
        expect.stringMatching(/^\.\/codeblock\/[\da-f]{12}\.bash$/),
        expect.stringMatching(/^\.\/codeblock\/[\da-f]{12}\.txt$/)
      ])
    )
    expect(codeFiles.map(file => file.content)).toEqual(
      expect.arrayContaining([`${TSX_BODY}\n`, `${BASH_BODY}\n`, `${PLAIN_BODY}\n`])
    )
  })

  it('只有命中 exec 的语言才带 load 标记', async () => {
    const { nodes } = await parseMarkdown(DOC, 'button.md', { exec: ['tsx'] })
    const blocks = nodes.filter(node => node.label === 'codeblock')
    expect(blocks[0]?.load).toBeTypeOf('function')
    expect(blocks[1]?.load).toBeUndefined()
    expect(blocks[2]?.load).toBeUndefined()
  })

  it('相同围栏只落一个代码文件', async () => {
    const doc = ['```tsx', TSX_BODY, '```', '', '```tsx', TSX_BODY, '```'].join('\n')
    const { codeFiles } = await parseMarkdown(doc, 'dup.md', { exec: [] })
    expect(codeFiles).toHaveLength(1)
  })

  it('彻底没有 frontmatter：开头的 --- 就是一条分隔线', async () => {
    const doc = ['---', 'component: button', '---', '', '# Button'].join('\n')
    const { nodes } = await parseMarkdown(doc, 'button.md', { exec: [] })
    expect(nodes[0]).toEqual({ label: 'hr' })
    expect(nodes.some(node => node.label === 'h1')).toBe(true)
  })

  it('围栏语言名不能带路径分隔符', async () => {
    await expect(parseMarkdown('```a/b\nx\n```', 'bad.md', { exec: [] })).rejects.toThrow(/路径分隔符/)
  })
})
