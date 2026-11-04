import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta/contract'
import { describe, expect, it } from 'vite-plus/test'

import type { DemoLocale } from './examples'

/*
 * 语料接线的 contract test：两个 demo 的语料层逐字孪生，这里收拢为一份实现，宿主侧只注入
 * 自己的事实——meta loader（`import.meta.glob` 装配）、生成物目录、页面源目录与执行语言。
 * 「页面显示的代码 == markdown 围栏」「每条围栏落成可编译文件」「页面 ↔ 语料不互为孤儿」三条
 * 由本套件持有；生成器那侧的判据（篡改 / 孤儿 / 表格形状）在 `@greypan/md-to-meta` 的单测里；
 * 跨 app 的另一半（两端 theme.css 逐字节一致、meta 骨架一致）由 web-ui 包的 generated-parity.spec.ts 持有。
 */
export interface ExampleDocsContractOptions {
  /** 宿主装配的 meta loader。 */
  loadMeta: (locale: DemoLocale, component: string) => Promise<MetaNode[]>
  /** 语料目录（`packages/web-ui/docs`）。 */
  docsDir: string
  /** 本 app 的生成物目录；落盘代码文件按 `block.path` 相对它寻址。 */
  generatedDir: string
  /** 本端执行的语言围栏（只有它带 `load`）：react 端 `tsx`，vue 端 `vue`。 */
  execLanguage: string
  /** 手写组件目录，用于断言 `<组件>-demo` 目录已删。 */
  componentsDir: string
  /** 本端页面源目录：react 是 `routes/components`，vue 是 `pages/components`。 */
  pagesDir: string
  pageExt: '.tsx' | '.vue'
  /** 覆盖守卫文案里的框架名。 */
  framework: 'React' | 'Vue'
  /** demoImports 判据的反例：一条手写 demo 的 import 语句（与本端页面源码风格一致）。 */
  demoImportSample: string
  /** demoImports 判据的反例：`<ExampleDoc>` 自身壳的 import 语句。 */
  exampleDocImportSample: string
}

/** 中文是源语种（`.CN.md`），英文译文的文件名没有语种后缀。 */
function corpusOf(docsDir: string, suffix: string) {
  return readdirSync(docsDir)
    .filter(file => file.endsWith(suffix) && (suffix !== '.md' || !file.endsWith('.CN.md')))
    .sort()
}

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

/** 语种内的文件名与组件名。逐文档成用例：整份语料的冷 import 与 HTML 取文本压进一个用例会撞默认的 5s。 */
const entriesOf = (locale: { suffix: string; files: string[] }) =>
  locale.files.map(name => [name, name.slice(0, -locale.suffix.length)] as const)

/** 页面从 `@/components/` 引了什么，除 `<ExampleDoc>` 自身的壳以外。 */
const demoImports = (source: string) =>
  [...source.matchAll(/from '@\/components\/([^']+)'/g)]
    .map(match => match[1]!.split('/')[0]!)
    .filter(name => name !== 'example-doc')

/** 每条页面里 `<ExampleDoc component="…" />` 引用的组件名。 */
const componentsOf = (source: string) =>
  [...source.matchAll(/<ExampleDoc\s+component=["']([^"']+)["']/g)].map(match => match[1]!)

/**
 * 装配本端的语料接线 contract test；每个 demo 一份薄 spec，传注入后调用即完成全部断言。
 */
export function runExampleDocsContractTests(options: ExampleDocsContractOptions): void {
  const { loadMeta, docsDir, generatedDir, execLanguage, componentsDir, pagesDir, pageExt, framework } = options
  const docNames = corpusOf(docsDir, '.CN.md').map(file => file.replace(/\.CN\.md$/, ''))

  const localeSurfaces = [
    { label: 'zh-CN' as const, suffix: '.CN.md', files: corpusOf(docsDir, '.CN.md') },
    { label: 'en' as const, suffix: '.md', files: corpusOf(docsDir, '.md') }
  ]

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
            const exec = execLanguage === fence.lang
            expect(Boolean(block.load), `${name}/${index}/${fence.lang}：只有 ${execLanguage} 围栏带 load`).toBe(exec)
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

  const pages = readdirSync(pagesDir)
    .filter(file => file.endsWith(pageExt))
    .sort()

  describe('页面只剩 <ExampleDoc>', () => {
    it('全量语料都没有 `<组件>-demo` 手写目录', () => {
      for (const component of docNames) {
        const demoDir = path.resolve(componentsDir, `${component}-demo`)
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

  describe(`覆盖守卫（${framework} 页面侧）`, () => {
    it(`每个页面渲染自己那份 <ExampleDoc>`, () => {
      for (const file of pages) {
        const name = file.slice(0, -pageExt.length)
        const components = componentsOf(readFileSync(path.join(pagesDir, file), 'utf8'))
        expect(components, `${framework} 页面 ${name} 没有渲染 <ExampleDoc component="${name}" />`).toContain(name)
      }
    })

    it('每份 markdown 至少被一个页面渲染，不留孤儿语料；页面引用的 markdown 都存在', () => {
      const used = new Set(pages.flatMap(file => componentsOf(readFileSync(path.join(pagesDir, file), 'utf8'))))
      expect(
        docNames.filter(name => !used.has(name)),
        `这些 markdown 没有任何 ${framework} 页面渲染`
      ).toEqual([])
      expect(
        [...used].filter(name => !docNames.includes(name)),
        `${framework} 页面引用了不存在的 markdown`
      ).toEqual([])
    })

    it('判据本身能识别反例', () => {
      expect(componentsOf(`<ExampleDoc component="radio" />`)).toEqual(['radio'])
      expect(componentsOf(`<Doc component="radio" />`)).toEqual([])
      expect(demoImports(options.demoImportSample)).toEqual(['slider-demo'])
      expect(demoImports(options.exampleDocImportSample)).toEqual([])
    })
  })
}
