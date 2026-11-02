import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { writeArtifacts } from '../emit'
import { generate } from '../generate'
import type { ResolvedOptions } from '../types'

/*
 * `generate()` 这条端到端路径：一份语料 → 一个 output 的产物集合。`markdown.spec.ts` 判的是结构投影，
 * `emit.spec.ts` 用的是合成产物，这里补的是两者之间那一段——真实生成出来的字节与落盘形状。
 */

const TSX_BODY = ['export default function Demo() {', '  return <web-ui-button>按钮</web-ui-button>', '}'].join('\n')
const TSX_FENCE = ['```tsx', TSX_BODY, '```'].join('\n')
const VUE_BODY = ['<template>', '  <web-ui-button>按钮</web-ui-button>', '</template>'].join('\n')
const VUE_FENCE = ['```vue', VUE_BODY, '```'].join('\n')

const DOC = [
  '# Button',
  '',
  '按钮组件。',
  '',
  TSX_FENCE,
  '',
  VUE_FENCE,
  '',
  '## Usage',
  '',
  '| 属性 | 说明 |',
  '| --- | --- |',
  '| `variant` | 视觉变体 |',
  ''
].join('\n')

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function scratch(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'md-to-meta-generate-'))
  dirs.push(dir)
  return dir
}

function layout(patch: (source: string) => string = source => source) {
  const root = scratch()
  const docs = path.join(root, 'docs')
  mkdirSync(docs, { recursive: true })
  writeFileSync(path.join(docs, 'button.CN.md'), patch(DOC))
  return { root, docs }
}

function resolve(root: string, input = './docs/*.md', exec: string[] = ['tsx']): ResolvedOptions {
  return {
    root,
    input: [input],
    output: path.join(root, 'out'),
    exec,
    darkSelector: "html[data-theme='dark']"
  }
}

describe('generate', () => {
  it('平铺出 meta 模块、类型声明与主题样式，围栏落成代码文件', async () => {
    const { root } = layout()
    const { files, output } = await generate(resolve(root))
    writeArtifacts(files, output)

    const module = readFileSync(path.join(output, 'button.CN.meta.js'), 'utf8')
    // 生成物是可直接 lint 的模块：命名 default，而不是匿名 default export。
    expect(module).toContain('const meta = [')
    expect(module).toContain('export default meta')
    expect(module).toContain("label: 'h1', id: 'section-1'")
    expect(module).toContain("label: 'table'")
    // 命中 exec 的围栏才带字面 specifier 的加载 thunk。
    expect(module).toMatch(/load: \(\) => import\('\.\/codeblock\/[\da-f]{12}\.tsx'\)/)
    expect(module).not.toMatch(/load: \(\) => import\('\.\/codeblock\/[\da-f]{12}\.vue'\)/)

    const codeFiles = readdirSync(path.join(output, 'codeblock')).sort()
    expect(codeFiles).toEqual(
      expect.arrayContaining([expect.stringMatching(/\.tsx$/), expect.stringMatching(/\.vue$/)])
    )
    const tsxFile = codeFiles.find(name => name.endsWith('.tsx'))
    expect(readFileSync(path.join(output, 'codeblock', tsxFile ?? ''), 'utf8')).toBe(`${TSX_BODY}\n`)

    const dts = readFileSync(path.join(output, 'button.CN.meta.d.ts'), 'utf8')
    expect(dts).toContain("import type { MetaNode } from '@greypan/md-to-meta'")
    expect(dts).toContain('declare const meta: MetaNode[]')

    const css = readFileSync(path.join(output, 'theme.css'), 'utf8')
    expect(css).toContain('.mdm-markdown')
    expect(css).toContain("html[data-theme='dark']")
  })

  it('不同语言各自落一个扩展名，exec 不参与扩展名映射', async () => {
    const { root } = layout()
    const { files } = await generate(resolve(root, './docs/*.md', []))
    const module = files.find(file => file.path.endsWith('button.CN.meta.js'))?.content ?? ''
    expect(module).not.toContain('load:')
    // 扩展名就是围栏语言名，不维护第二张映射表。
    expect(files.map(file => path.basename(file.path))).toEqual(
      expect.arrayContaining([expect.stringMatching(/\.tsx$/), expect.stringMatching(/\.vue$/), 'theme.css'])
    )
  })

  it('跨文档的相同围栏只落一个文件', async () => {
    const { root, docs } = layout()
    writeFileSync(path.join(docs, 'button.md'), DOC)
    const { files } = await generate(resolve(root, './docs/*.md', []))
    expect(files.filter(file => file.path.includes(`${path.sep}codeblock${path.sep}`)).length).toBe(2)
  })

  it('同一 output 里重名直接报错，并指出两个来源', async () => {
    const root = scratch()
    mkdirSync(path.join(root, 'docs', 'a'), { recursive: true })
    mkdirSync(path.join(root, 'docs', 'b'), { recursive: true })
    writeFileSync(path.join(root, 'docs', 'a', 'button.md'), DOC)
    writeFileSync(path.join(root, 'docs', 'b', 'button.md'), DOC)
    await expect(generate(resolve(root, './docs/**/*.md'))).rejects.toThrow(
      /产物重名：button\.meta\.js.*a\/button\.md.*b\/button\.md/s
    )
  })

  it('input 匹配到非 markdown 文件时报错，不静默漏掉', async () => {
    const { root } = layout()
    writeFileSync(path.join(root, 'docs', 'notes.txt'), 'not markdown\n')
    await expect(generate(resolve(root, './docs/*'))).rejects.toThrow(/只接受 \.md 文件.*notes\.txt/s)
  })

  it('input 什么也没匹配到时失败', async () => {
    const { root } = layout()
    expect(root).toBeTruthy()
    await expect(generate(resolve(root, './docs/nothing/*.md'))).rejects.toThrow(/没有匹配到任何文件/)
  })

  it('同一份输入生成两次，产出字节完全相同', async () => {
    const { root } = layout()
    const first = await generate(resolve(root))
    const second = await generate(resolve(root))
    expect(second.files).toEqual(first.files)
  })
})
