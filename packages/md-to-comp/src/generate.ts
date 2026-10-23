import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { fail } from './errors'
import { highlight, type FenceFlavor } from './highlight'
import { parseMarkdown, type ParsedDoc } from './markdown'
import { renderCss, renderModule, type ExampleDocPayload, type SamplePayload } from './render'
import { assertSelfContained, demoFileContent, demoFileName, emitsDemoFile } from './sample'
import type { GenerateOptions, GeneratedFile, MdToCompConfig } from './types'

export interface GenerateResult {
  files: GeneratedFile[]
  /** 每个 output 的组件示例目录；调用方按它清孤儿（见 `emit.ts`）。 */
  demosDirs: string[]
}

/** markdown 侧契约加上报错定位用的文件名。 */
type ResolvedDoc = ParsedDoc & { sourceFile: string }

export function demosDirOf(output: string, dir = 'demos'): string {
  return path.join(output, dir)
}

function readDocs(config: Pick<MdToCompConfig, 'input' | 'anchor' | 'flavors' | 'apiTables'>): ResolvedDoc[] {
  if (!existsSync(config.input)) fail(`找不到 markdown 源目录：${config.input}`)
  const names = readdirSync(config.input)
    .filter(name => name.endsWith('.md'))
    .sort()
  if (names.length === 0) fail(`找不到 markdown 源文件：${config.input}`)

  return names.map(name => {
    const file = path.join(config.input, name)
    const doc = parseMarkdown(readFileSync(file, 'utf8'), file, config)
    // 文件名是这篇文档的身份：frontmatter 的 component 与它同名，文档树才有一个可预测的入口。
    if (doc.component !== name.replace(/\.md$/, ''))
      fail(`${file}：frontmatter 的 component=${doc.component} 与文件名不一致，必须同名`)
    return { ...doc, sourceFile: file }
  })
}

async function buildPayloads(docs: ResolvedDoc[], flavors: readonly FenceFlavor[]): Promise<ExampleDocPayload[]> {
  return Promise.all(
    docs.map(async doc => ({
      component: doc.component,
      tag: doc.tag,
      introHtml: doc.introHtml,
      api: doc.api,
      samples: await Promise.all(
        doc.samples.map(async (sample): Promise<SamplePayload> => {
          const html: Record<string, string> = {}
          for (const flavor of flavors)
            html[flavor] = await highlight(sample.fences[flavor] ?? '', flavor, doc.sourceFile)
          return {
            id: sample.id,
            title: sample.title,
            descriptionHtml: sample.descriptionHtml,
            html,
            demoKey: sample.id
          }
        })
      )
    }))
  )
}

/**
 * 编排一次生成：input 目录 → 每个 output 的产物集合。
 *
 * 产物的文件名由引擎固定（`examples.ts` / `examples.css` 加 `dir/` 下的组件示例），所以两个
 * output 的路径形状由引擎保证同形，「逐字节相同」这条断言不必先核对参数。组件示例的围栏内容既是
 * 写进文件的字节，也是喂给 `highlight()` 的字节，所以「页面显示的那份源码」与「被执行的那份源码」
 * 同源；`assertSelfContained` 挡的是片段被当成文件发出这一种形状。
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  for (const output of options.outputs)
    if (!options.flavors.includes(output.flavor))
      fail(`output 的 flavor \`${output.flavor}\` 不在配置的 flavors [${options.flavors.join(', ')}] 里`)

  const dir = options.dir ?? 'demos'
  const docs = readDocs(options)
  if (options.requireDemo)
    for (const doc of docs)
      for (const sample of doc.samples)
        if (!emitsDemoFile(sample.id))
          fail(
            `${doc.sourceFile}：示例「${sample.title}」没有 \`{#id}\` 锚点；requireDemo 开启时每条示例都要落成组件文件`
          )
  const payloads = await buildPayloads(docs, options.flavors)
  const module = renderModule(payloads)
  const css = renderCss(options.darkSelector)
  const files: GeneratedFile[] = []

  for (const output of options.outputs) {
    files.push(
      { path: path.join(output.output, 'examples.ts'), content: module },
      { path: path.join(output.output, 'examples.css'), content: css }
    )
    for (const doc of docs) {
      for (const sample of doc.samples) {
        if (!emitsDemoFile(sample.id)) continue
        const code = sample.fences[output.flavor] ?? ''
        assertSelfContained(code, output.flavor, sample.title, doc.sourceFile)
        files.push({
          path: path.join(demosDirOf(output.output, dir), demoFileName(doc.component, sample.id, output.flavor)),
          content: demoFileContent(code)
        })
      }
    }
  }

  // 同一份 markdown 出两份产物时，若内容不同，「文档只有一份来源」这句话就不成立了。
  for (const name of ['examples.ts', 'examples.css']) {
    const group = files.filter(file => path.basename(file.path) === name)
    for (const file of group)
      if (file.content !== group[0]?.content) fail(`两个 output 的 ${name} 不一致：同一份 markdown 应产出同一份字节`)
  }

  return { files, demosDirs: options.outputs.map(output => demosDirOf(output.output, dir)) }
}
