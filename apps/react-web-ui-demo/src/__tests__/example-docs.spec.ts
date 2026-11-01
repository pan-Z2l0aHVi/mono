import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta'
import { render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vite-plus/test'

import { MetaComp } from '../components/meta'
import { loadMeta } from '../i18n/examples'

// 语料 join 的 React 侧：「页面显示的代码 == markdown 围栏」「每条围栏落成可编译文件」「页面 ↔ 语料
// 不互为孤儿」三条由本包持有；生成器那侧的判据（篡改 / 孤儿 / 表格形状）在 `@greypan/md-to-meta`
// 的单测里；跨 app 的另一半（两端 theme.css 逐字节一致、meta 骨架一致）由 web-ui 包的
// generated-parity.spec.ts 持有。
const docsDir = path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs')
const generatedDir = path.resolve(import.meta.dirname, '../generated')
const routesDir = path.resolve(import.meta.dirname, '../routes/components')

/** 本端只执行 tsx 围栏：它们才是真组件；其余围栏只是源码。 */
const EXEC_LANGUAGES = ['tsx']

/** 中文是源语种（`.CN.md`），英文译文的文件名没有语种后缀。 */
function corpusOf(suffix: string) {
  return readdirSync(docsDir)
    .filter(file => file.endsWith(suffix) && (suffix !== '.md' || !file.endsWith('.CN.md')))
    .sort()
}

const docNames = corpusOf('.CN.md').map(file => file.replace(/\.CN\.md$/, ''))

interface Fence {
  lang: string
  code: string
}

/** markdown 里的围栏按出现顺序取出；行内围栏在语料里不存在，只需要顶层扫描。 */
function fencesOf(markdown: string): Fence[] {
  const fences: Fence[] = []
  let open: { lang: string; lines: string[] } | null = null
  for (const line of markdown.split('\n')) {
    if (open) {
      if (line.startsWith('```')) {
        fences.push({ lang: open.lang, code: open.lines.join('\n') })
        open = null
      } else {
        open.lines.push(line)
      }
      continue
    }
    const match = /^```(\S*)/.exec(line)
    if (match) open = { lang: match[1] ?? '', lines: [] }
  }
  return fences
}

function codeblocksOf(nodes: MetaNode[]): MetaNode[] {
  return nodes.flatMap(node => (node.label === 'codeblock' ? [node] : node.children ? codeblocksOf(node.children) : []))
}

function headingsOf(nodes: MetaNode[]): MetaNode[] {
  return nodes.filter(node => /^h[1-6]$/.test(node.label))
}

/**
 * `## API` 之前的标题两侧同文（示例标题是专业术语）；API 小节本身的列名与说明是译文。
 * 没有 API 小节的文档整份都在比较范围内。
 */
function headingsBeforeApi(nodes: MetaNode[]): MetaNode[] {
  const api = nodes.findIndex(node => node.label === 'h2' && node.content === 'API')
  return headingsOf(api === -1 ? nodes : nodes.slice(0, api))
}

interface LocaleSurface {
  label: 'zh-CN' | 'en'
  suffix: string
  files: string[]
}

const localeSurfaces: LocaleSurface[] = [
  { label: 'zh-CN', suffix: '.CN.md', files: corpusOf('.CN.md') },
  { label: 'en', suffix: '.md', files: corpusOf('.md') }
]

/** 语种内的文件名与组件名。逐文档成用例：整份语料的冷 import 与 HTML 取文本压进一个用例会撞默认的 5s。 */
const entriesOf = (locale: LocaleSurface) =>
  locale.files.map(name => [name, name.slice(0, -locale.suffix.length)] as const)

describe('页面显示的代码与 markdown 围栏同源', () => {
  for (const locale of localeSurfaces) {
    for (const [name, component] of entriesOf(locale)) {
      it(`${locale.label}：${name} 的每条围栏都落成 codeblock，可见文本逐字等于围栏原文`, async () => {
        let checked = 0
        const markdown = readFileSync(path.join(docsDir, name), 'utf8')
        const fences = fencesOf(markdown)
        const blocks = codeblocksOf(await loadMeta(locale.label, component))
        expect(blocks, `${name}：围栏数 ${fences.length} 与 meta 里的 codeblock 数不一致`).toHaveLength(fences.length)
        blocks.forEach((block, index) => {
          const fence = fences[index]!
          expect(block.lang, `${name}/${index}：围栏语言与 meta 不同`).toBe(fence.lang)
          expect(
            block.content,
            `${name}/${index}/${fence.lang}：高亮外框形状变了，Tailwind 那层边框与这里的取色会对不上`
          ).toMatch(/^<pre class="shiki shiki-themes github-light github-dark mdm-code"/)
          expect(
            visibleText(block.content ?? ''),
            `${name}/${index}/${fence.lang}：页面显示的代码与 markdown 围栏不是同一份字节`
          ).toBe(fence.code)
          checked += 1
        })
        expect(checked).toBeGreaterThan(0)
      })
    }
  }
})

describe('每条围栏落成可编译代码文件', () => {
  for (const locale of localeSurfaces) {
    for (const [name, component] of entriesOf(locale)) {
      it(`${locale.label}：${name} 的落盘文件与围栏逐字相同（只差行尾换行），load 只给 exec 语言`, async () => {
        let fileCount = 0
        const markdown = readFileSync(path.join(docsDir, name), 'utf8')
        const fences = fencesOf(markdown)
        const blocks = codeblocksOf(await loadMeta(locale.label, component))
        blocks.forEach((block, index) => {
          const fence = fences[index]!
          const exec = EXEC_LANGUAGES.includes(fence.lang)
          expect(
            Boolean(block.load),
            `${name}/${index}/${fence.lang}：只有 ${EXEC_LANGUAGES.join('、')} 围栏带 load`
          ).toBe(exec)
          expect(block.path, `${name}/${index}：meta 没记住代码文件路径`).toBeTruthy()

          const file = path.resolve(generatedDir, block.path!)
          expect(existsSync(file), `${file} 不存在：每条围栏都必须落成代码文件`).toBe(true)
          expect(
            readFileSync(file, 'utf8'),
            `${file} 与 markdown 围栏不是同一份源码：显示的那份和被执行的那份漂移了`
          ).toBe(`${fence.code.trimEnd()}\n`)
          fileCount += 1
        })
        expect(fileCount, '一条围栏都没有：这条通道等于没被任何断言覆盖').toBeGreaterThan(0)
      })
    }
  }
})

describe('中英语料骨架一致', () => {
  for (const name of docNames) {
    it(`${name}：节点 label 序列与标题逐字相同`, async () => {
      const zh = await loadMeta('zh-CN', name)
      const en = await loadMeta('en', name)
      expect(
        zh.map(node => node.label),
        `${name}：中英 meta 的节点序列不同，译文改变了文档结构`
      ).toEqual(en.map(node => node.label))
      expect(
        headingsBeforeApi(zh).map(node => node.content),
        `${name}：\`## API\` 之前的标题（示例标题与 API 标题）是两侧同文的专业术语`
      ).toEqual(headingsBeforeApi(en).map(node => node.content))
    })
  }
})

/* 页面从 `@/components/` 引了什么，除 `<ExampleDoc>` 自身的壳以外。 */
const demoImports = (source: string) =>
  [...source.matchAll(/from '@\/components\/([^']+)'/g)]
    .map(match => match[1].split('/')[0])
    .filter(name => name !== 'example-doc')

/** 每条路由里 `<ExampleDoc component="…" />` 引用的组件名。 */
const componentsOf = (source: string) =>
  [...source.matchAll(/<ExampleDoc\s+component=["']([^"']+)["']/g)].map(match => match[1]!)

const routes = readdirSync(routesDir)
  .filter(file => file.endsWith('.tsx'))
  .sort()

describe('页面只剩 <ExampleDoc>', () => {
  it('全量语料都没有 `<组件>-demo` 手写目录', () => {
    for (const component of docNames) {
      const demoDir = path.resolve(import.meta.dirname, '../components', `${component}-demo`)
      expect(existsSync(demoDir), `${demoDir} 还在：没有消费者的手写 demo 必须删掉`).toBe(false)
    }
  })

  it('每个路由只渲染 <ExampleDoc>，不引任何手写 demo', () => {
    for (const file of routes) {
      const route = path.join(routesDir, file)
      const extras = demoImports(readFileSync(route, 'utf8'))
      expect(extras, `${route}：页面只渲染 <ExampleDoc>，仍引入 ${extras.join('、')}`).toEqual([])
    }
  })
})

describe('覆盖守卫（React 路由侧）', () => {
  it('每个路由渲染自己那份 <ExampleDoc>', () => {
    for (const file of routes) {
      const name = file.replace(/\.tsx$/, '')
      const components = componentsOf(readFileSync(path.join(routesDir, file), 'utf8'))
      expect(components, `React 路由 ${name} 没有渲染 <ExampleDoc component="${name}" />`).toContain(name)
    }
  })

  it('每份 markdown 至少被一个路由渲染，不留孤儿语料；路由引用的 markdown 都存在', () => {
    const used = new Set(routes.flatMap(file => componentsOf(readFileSync(path.join(routesDir, file), 'utf8'))))
    expect(
      docNames.filter(name => !used.has(name)),
      '这些 markdown 没有任何 React 路由渲染'
    ).toEqual([])
    expect(
      [...used].filter(name => !docNames.includes(name)),
      'React 路由引用了不存在的 markdown'
    ).toEqual([])
  })

  it('判据本身能识别反例', () => {
    expect(componentsOf(`<ExampleDoc component="radio" />`)).toEqual(['radio'])
    expect(componentsOf(`<Doc component="radio" />`)).toEqual([])
    expect(
      demoImports(`import Demo from '@/components/slider-demo'\nimport Doc from '@/components/example-doc'`)
    ).toEqual(['slider-demo'])
  })
})

describe('通用 meta 渲染', () => {
  const sample = (content: string) =>
    createElement(
      'div',
      { className: 'mdm-markdown' },
      createElement(MetaComp, {
        nodes: [
          { label: 'h2', id: 'section-1', content: 'Samples' },
          { label: 'p', content: 'A <strong>paragraph</strong>' },
          { label: 'ul', children: [{ label: 'li', content: 'item' }] },
          {
            label: 'table',
            children: [
              {
                label: 'tr',
                children: [
                  { label: 'th', content: 'Name' },
                  { label: 'td', content: 'Value' }
                ]
              }
            ]
          },
          {
            label: 'codeblock',
            lang: 'tsx',
            path: './codeblock/abc.tsx',
            content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`,
            load: async () => ({ default: () => createElement('span', { 'data-demo': true }, 'demo') })
          }
        ] as MetaNode[]
      })
    )

  it('按 label 渲染标题、列表、表格与代码块预览', async () => {
    const { container } = render(sample('const answer = 42'))
    const heading = container.querySelector('h2')
    expect(heading?.className).toBe('mdm-heading')
    expect(heading?.id).toBe('section-1')
    expect(container.querySelector('ul li')?.textContent).toBe('item')
    expect(container.querySelector('table th')?.textContent).toBe('Name')
    expect(container.querySelector('[data-codeblock="tsx"]')).toBeTruthy()
    expect(visibleText(container.querySelector('[data-code] pre')?.innerHTML ?? '')).toBe('const answer = 42')
    await waitFor(() => expect(container.querySelector('[data-demo]')).toBeTruthy())
  })

  it('preview 关闭时只渲染源码，不挂运行示例', async () => {
    const { container } = render(
      createElement(MetaComp, {
        nodes: [{ label: 'codeblock', lang: 'tsx', content: '<pre class="shiki mdm-code"><code>demo</code></pre>' }]
      })
    )
    expect(container.querySelector('[data-codeblock-preview]')).toBeNull()
    expect(container.querySelector('[data-code] pre')).toBeTruthy()
  })

  it('相邻的 tsx 与 vue 围栏合成一张卡，工具条切换两份源码', async () => {
    const fence = (lang: string, content: string) => ({
      label: 'codeblock',
      lang,
      content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`
    })
    const { container } = render(
      createElement(MetaComp, {
        nodes: [fence('tsx', 'react source'), fence('vue', 'vue source')] as MetaNode[]
      })
    )
    expect(container.querySelectorAll('[data-codeblock]')).toHaveLength(1)
    const card = container.querySelector('[data-codeblock]')!
    expect(card.getAttribute('data-codeblock')).toBe('tsx')

    const vueTrigger = [...card.querySelectorAll('web-ui-segmented-trigger')].find(item => item.value === 'vue')
    await waitFor(() => expect(vueTrigger?.shadowRoot?.querySelector('[role="option"]')).toBeTruthy())
    vueTrigger!.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!.click()

    await waitFor(() => expect(card.getAttribute('data-codeblock')).toBe('vue'))
    expect(visibleText(card.querySelector('[data-code] pre')?.innerHTML ?? '')).toBe('vue source')
  })

  it('代码不足一屏时不挂折叠，超过一屏才出现展开按钮', () => {
    const fenceOf = (lines: number) => ({
      label: 'codeblock',
      lang: 'tsx',
      content: `<pre class="shiki mdm-code"><code>${Array.from(
        { length: lines },
        (_, index) => `<span class="line"><span class="line-number">${index + 1}</span>line ${index + 1}</span>`
      ).join('\n')}</code></pre>`
    })
    const short = render(createElement(MetaComp, { nodes: [fenceOf(2)] as MetaNode[] }))
    expect(short.container.querySelector('web-ui-collapse')).toBeNull()
    expect(short.container.querySelector('[data-toggle-code]')).toBeNull()
    const tall = render(createElement(MetaComp, { nodes: [fenceOf(6)] as MetaNode[] }))
    expect(tall.container.querySelector('web-ui-collapse')).toBeTruthy()
    expect(tall.container.querySelector('[data-toggle-code]')).toBeTruthy()
  })
})
