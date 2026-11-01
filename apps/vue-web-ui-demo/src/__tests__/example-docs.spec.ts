import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { defineComponent, h } from 'vue'

import { MetaComp } from '../components/meta'
import { loadMeta } from '../i18n/examples'

// 语料 join 的 Vue 侧：「页面显示的代码 == markdown 围栏」「每条围栏落成可编译文件」「页面 ↔ 语料
// 不互为孤儿」三条由本包持有；生成器那侧的判据（篡改 / 孤儿 / 表格形状）在 `@greypan/md-to-meta`
// 的单测里；跨 app 的另一半（两端 theme.css 逐字节一致、meta 骨架一致）由 web-ui 包的
// generated-parity.spec.ts 持有。
const docsDir = path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs')
const generatedDir = path.resolve(import.meta.dirname, '../generated')
const pagesDir = path.resolve(import.meta.dirname, '../pages/components')

/** 本端只执行 vue 围栏：它们才是真组件；其余围栏只是源码。 */
const EXEC_LANGUAGES = ['vue']

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

describe('页面显示的代码与 markdown 围栏同源', () => {
  for (const locale of localeSurfaces) {
    it(`${locale.label}：每条围栏都落成 codeblock，可见文本逐字等于围栏原文`, async () => {
      let checked = 0
      for (const name of locale.files) {
        const component = name.slice(0, -locale.suffix.length)
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
      }
      expect(checked).toBeGreaterThan(0)
    })
  }
})

describe('每条围栏落成可编译代码文件', () => {
  for (const locale of localeSurfaces) {
    it(`${locale.label}：落盘文件与围栏逐字相同（只差行尾换行），load 只给 exec 语言`, async () => {
      let fileCount = 0
      for (const name of locale.files) {
        const component = name.slice(0, -locale.suffix.length)
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
      }
      expect(fileCount, '一条围栏都没有：这条通道等于没被任何断言覆盖').toBeGreaterThan(0)
    })
  }
})

describe('中英语料骨架一致', () => {
  it('节点 label 序列与标题逐字相同', async () => {
    for (const name of docNames) {
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
    }
  })
})

/* 页面从 `@/components/` 引了什么，除 `<ExampleDoc>` 自身的壳以外。 */
const demoImports = (source: string) =>
  [...source.matchAll(/from '@\/components\/([^']+)'/g)]
    .map(match => match[1].split('/')[0])
    .filter(name => name !== 'example-doc')

/** 每条页面里 `<ExampleDoc component="…" />` 引用的组件名。 */
const componentsOf = (source: string) =>
  [...source.matchAll(/<ExampleDoc\s+component=["']([^"']+)["']/g)].map(match => match[1]!)

const pages = readdirSync(pagesDir)
  .filter(file => file.endsWith('.vue'))
  .sort()

describe('页面只剩 <ExampleDoc>', () => {
  it('全量语料都没有 `<组件>-demo` 手写目录', () => {
    for (const component of docNames) {
      const demoDir = path.resolve(import.meta.dirname, '../components', `${component}-demo`)
      expect(existsSync(demoDir), `${demoDir} 还在：没有消费者的手写 demo 必须删掉`).toBe(false)
    }
  })

  it('每个页面只渲染 <ExampleDoc>，不引任何手写 demo', () => {
    for (const file of pages) {
      const page = path.join(pagesDir, file)
      const extras = demoImports(readFileSync(page, 'utf8'))
      expect(extras, `${page}：页面只渲染 <ExampleDoc>，仍引入 ${extras.join('、')}`).toEqual([])
    }
  })
})

describe('覆盖守卫（Vue 页面侧）', () => {
  it('每个页面渲染自己那份 <ExampleDoc>', () => {
    for (const file of pages) {
      const name = file.replace(/\.vue$/, '')
      const components = componentsOf(readFileSync(path.join(pagesDir, file), 'utf8'))
      expect(components, `Vue 页面 ${name} 没有渲染 <ExampleDoc component="${name}" />`).toContain(name)
    }
  })

  it('每份 markdown 至少被一个页面渲染，不留孤儿语料；页面引用的 markdown 都存在', () => {
    const used = new Set(pages.flatMap(file => componentsOf(readFileSync(path.join(pagesDir, file), 'utf8'))))
    expect(
      docNames.filter(name => !used.has(name)),
      '这些 markdown 没有任何 Vue 页面渲染'
    ).toEqual([])
    expect(
      [...used].filter(name => !docNames.includes(name)),
      'Vue 页面引用了不存在的 markdown'
    ).toEqual([])
  })

  it('判据本身能识别反例', () => {
    expect(componentsOf(`<ExampleDoc component="radio" />`)).toEqual(['radio'])
    expect(componentsOf(`<Doc component="radio" />`)).toEqual([])
    expect(demoImports(`import Demo from '@/components/slider-demo/index.vue'`)).toEqual(['slider-demo'])
    expect(demoImports(`import Doc from '@/components/example-doc/index.vue'`)).toEqual([])
  })
})

describe('通用 meta 渲染', () => {
  const sampleNodes = (content: string) =>
    [
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
        lang: 'vue',
        path: './codeblock/abc.vue',
        content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`,
        load: async () => ({ default: defineComponent({ render: () => h('span', { 'data-demo': true }, 'demo') }) })
      }
    ] as MetaNode[]

  it('按 label 渲染标题、列表、表格与代码块预览', async () => {
    const wrapper = mount(
      defineComponent({
        render: () => h('div', { class: 'mdm-markdown' }, [h(MetaComp, { nodes: sampleNodes('const answer = 42') })])
      })
    )
    expect(wrapper.find('h2').classes()).toEqual(['mdm-heading'])
    expect(wrapper.find('h2').attributes('id')).toBe('section-1')
    expect(wrapper.find('ul li').text()).toBe('item')
    expect(wrapper.find('table th').text()).toBe('Name')
    expect(wrapper.find('[data-codeblock="vue"]').exists()).toBe(true)
    expect(visibleText(wrapper.find('[data-code] pre').element.innerHTML)).toBe('const answer = 42')
    await flushPromises()
    expect(wrapper.find('[data-demo]').exists()).toBe(true)
  })

  it('preview 关闭时只渲染源码，不挂运行示例', () => {
    const wrapper = mount(MetaComp, {
      props: {
        preview: false,
        nodes: [{ label: 'codeblock', lang: 'vue', content: '<pre class="shiki mdm-code"><code>demo</code></pre>' }]
      }
    })
    expect(wrapper.find('[data-codeblock-preview]').exists()).toBe(false)
    expect(wrapper.find('[data-code] pre').exists()).toBe(true)
  })

  it('相邻的 tsx 与 vue 围栏合成一张卡，工具条切换两份源码', async () => {
    const fence = (lang: string, content: string) => ({
      label: 'codeblock',
      lang,
      content: `<pre class="shiki mdm-code"><code><span class="line"><span class="line-number">1</span>${content}</span></code></pre>`
    })
    // 自定义元素只在进入文档后升级，而 `mount` 默认渲染到游离节点：不挂到 body 就永远没有
    // shadowRoot，切换器里的可点击项也不存在。
    const wrapper = mount(MetaComp, {
      props: { nodes: [fence('tsx', 'react source'), fence('vue', 'vue source')] as MetaNode[] },
      attachTo: document.body
    })
    expect(wrapper.findAll('[data-codeblock]')).toHaveLength(1)
    expect(wrapper.find('[data-codeblock]').attributes('data-codeblock')).toBe('vue')

    const reactTrigger = wrapper
      .findAll('web-ui-segmented-trigger')
      .find(item => (item.element as { value?: string }).value === 'react')
    await flushPromises()
    // 切换器自身处理点击的是 shadowRoot 里的 `[role="option"]`，宿主节点上没有该监听。
    reactTrigger!.element.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!.click()

    await flushPromises()
    expect(wrapper.find('[data-codeblock]').attributes('data-codeblock')).toBe('tsx')
    expect(visibleText(wrapper.find('[data-code] pre').element.innerHTML)).toBe('react source')
    wrapper.unmount()
  })

  it('代码不足一屏时不挂折叠，超过一屏才出现展开按钮', () => {
    const fenceOf = (lines: number) => ({
      label: 'codeblock',
      lang: 'vue',
      content: `<pre class="shiki mdm-code"><code>${Array.from(
        { length: lines },
        (_, index) => `<span class="line"><span class="line-number">${index + 1}</span>line ${index + 1}</span>`
      ).join('\n')}</code></pre>`
    })
    const short = mount(MetaComp, { props: { nodes: [fenceOf(2)] as MetaNode[] } })
    expect(short.find('web-ui-collapse').exists()).toBe(false)
    expect(short.find('[data-toggle-code]').exists()).toBe(false)
    const tall = mount(MetaComp, { props: { nodes: [fenceOf(6)] as MetaNode[] } })
    expect(tall.find('web-ui-collapse').exists()).toBe(true)
    expect(tall.find('[data-toggle-code]').exists()).toBe(true)
  })
})
