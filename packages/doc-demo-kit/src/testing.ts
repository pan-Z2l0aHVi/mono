import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { MetaNode } from '@greypan/md-to-meta'
import { visibleText } from '@greypan/md-to-meta/contract'
import { describe, expect, it } from 'vite-plus/test'

import type { DemoLocale } from './examples'

/*
 * 语料接线的轻量 contract test：宿主注入 meta loader、语料目录、生成物目录与执行语言。
 * 只检查两类高价值漂移：「页面显示的代码 == markdown 围栏」和「每条围栏落成可编译文件且 exec 语言带 load」。
 * 中英文结构、标题一致性与页面接线不在这里强约束；双语对齐由作者和 agent 维护，允许少量差异。
 * 生成器判据（篡改 / 孤儿 / 表格形状）在 `@greypan/md-to-meta` 的单测里。
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

/** 语种内的文件名与组件名。逐文档成用例：整份语料的冷 import 与 HTML 取文本压进一个用例会撞默认的 5s。 */
const entriesOf = (locale: { suffix: string; files: string[] }) =>
  locale.files.map(name => [name, name.slice(0, -locale.suffix.length)] as const)

/**
 * 装配本端的语料接线 contract test；只检查围栏源码、meta 与落盘代码文件的一致性。
 */
export function runExampleDocsContractTests(options: ExampleDocsContractOptions): void {
  const { loadMeta, docsDir, generatedDir, execLanguage } = options

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
}
