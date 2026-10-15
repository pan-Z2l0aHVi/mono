import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { readComponentSource } from './component-source'
import { DocError, fail } from './errors'
import { highlight, type SampleFlavor } from './highlight'
import { joinApi, type ApiRow } from './join'
import { assertSelfContained, demoFileName, isLiveSample } from './live'
import { parseMarkdown, type ParsedDoc } from './markdown'
import { renderCss, renderModule, type ExampleDocPayload, type ExampleSamplePayload } from './render'

export interface OutputTarget {
  /** 收到 `web-ui-examples.{ts,css}` 的目录，两个 app 各一份且逐字节相同。 */
  dir: string
  flavor: SampleFlavor
}

export interface GenerateOptions {
  docsDir: string
  componentsDir: string
  outputs: OutputTarget[]
}

export interface GeneratedFile {
  path: string
  content: string
}

/** markdown 侧契约 + 组件源码侧契约 join 完的结果。 */
type ResolvedDoc = Omit<ParsedDoc, 'api'> & { api: Record<'props' | 'events' | 'slots', ApiRow[]>; sourceFile: string }

/**
 * fence 原文与落盘文件之间只差一个行尾换行：POSIX 文本文件与格式化器都要求它以换行收尾，
 * 而 mdast 的 code 节点值不含它。等值断言按这一条写，不是「文件比围栏多一行空行」。
 */
export function demoFileContent(code: string): string {
  return `${code.trimEnd()}\n`
}

function readDocs(docsDir: string, componentsDir: string): ResolvedDoc[] {
  if (!existsSync(docsDir)) fail(`找不到 markdown 源目录：${docsDir}`)
  const names = readdirSync(docsDir)
    .filter(name => name.endsWith('.md'))
    .sort()
  if (names.length === 0) fail(`找不到 markdown 源文件：${docsDir}`)

  return names.map(name => {
    const file = path.join(docsDir, name)
    const doc = parseMarkdown(readFileSync(file, 'utf8'), file)
    // 文件名要等于 frontmatter 的 component：文件名同时是 demo 路由名，改名不同步会悄悄
    // 生成一条谁都渲染不到的数据（路由里 ExampleDoc 找的是路由名）。
    if (doc.component !== name.replace(/\.md$/, ''))
      fail(`${file}：frontmatter 的 component=${doc.component} 与文件名不一致，必须同名`)
    const contract = readComponentSource(componentsDir, doc.component)
    if (contract.tag !== doc.tag)
      fail(`${file}：frontmatter 声明 tag=${doc.tag}，但源码里是 @customElement('${contract.tag}')`)
    return {
      ...doc,
      sourceFile: file,
      api: {
        props: joinApi('props', contract, doc.api.props, file),
        events: joinApi('events', contract, doc.api.events, file),
        slots: joinApi('slots', contract, doc.api.slots, file)
      }
    }
  })
}

async function buildPayloads(docs: ResolvedDoc[]): Promise<ExampleDocPayload[]> {
  return Promise.all(
    docs.map(async doc => ({
      component: doc.component,
      tag: doc.tag,
      introHtml: doc.introHtml,
      api: (['props', 'events', 'slots'] as const)
        .map(key => ({ key, title: `${key[0].toUpperCase()}${key.slice(1)}`, rows: doc.api[key] }))
        .filter(section => section.rows.length > 0),
      samples: await Promise.all(
        doc.samples.map(async (sample): Promise<ExampleSamplePayload> => ({
          id: sample.id,
          title: sample.title,
          descriptionHtml: sample.descriptionHtml,
          html: {
            react: await highlight(sample.react, 'react', doc.sourceFile),
            vue: await highlight(sample.vue, 'vue', doc.sourceFile)
          },
          liveKey: sample.id
        }))
      )
    }))
  )
}

/**
 * 生成全部受版本控制的产物：两个 app 各一份 `web-ui-examples.{ts,css}`，外加带 `{#id}` 锚点的
 * 示例按 app 的 flavor 落成 `demos/<component>--<id>.<tsx|vue>`。
 *
 * live 示例的围栏内容既是写进文件的字节，也是喂给 `highlight()` 的字节，所以「页面显示的那份源码」
 * 与「被执行的那份源码」同源；`assertSelfContained` 挡的是片段被当成文件发出这一种形状。
 */
export async function generate(options: GenerateOptions): Promise<GeneratedFile[]> {
  const docs = readDocs(options.docsDir, options.componentsDir)
  const payloads = await buildPayloads(docs)
  const module = renderModule(payloads)
  const files: GeneratedFile[] = []

  for (const output of options.outputs) {
    files.push(
      { path: path.join(output.dir, 'web-ui-examples.ts'), content: module },
      { path: path.join(output.dir, 'web-ui-examples.css'), content: renderCss() }
    )
    for (const doc of docs) {
      for (const sample of doc.samples) {
        if (!isLiveSample(sample.id)) continue
        const code = output.flavor === 'react' ? sample.react : sample.vue
        assertSelfContained(code, output.flavor, sample.title, doc.sourceFile)
        files.push({
          path: path.join(output.dir, 'demos', demoFileName(doc.component, sample.id, output.flavor)),
          content: demoFileContent(code)
        })
      }
    }
  }

  // 两个 app 的数据必须逐字节相同，否则「同一份 markdown 出两份文档」这句话就不成立了。
  const modules = files.filter(file => file.path.endsWith('web-ui-examples.ts'))
  for (const file of modules)
    if (file.content !== modules[0].content) fail('两个 app 的 web-ui-examples.ts 不一致：生成器按设计应产出同一份字节')
  return files
}

export { DocError }
