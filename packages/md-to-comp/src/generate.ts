import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { fail } from './errors'
import { highlight, type FenceFlavor } from './highlight'
import { parseMarkdown, type ParsedDoc } from './markdown'
import { renderCss, renderModule, type ExampleDocPayload, type SamplePayload } from './render'
import { assertSelfContained, demoFileContent, demoFileName } from './sample'
import type { DocsLocale, GenerateOptions, GeneratedFile, MdToCompConfig } from './types'

export interface GenerateResult {
  files: GeneratedFile[]
  /** 每个 output 的组件示例目录；调用方按它清孤儿（见 `emit.ts`）。 */
  demosDirs: string[]
}

/** markdown 侧契约加上报错定位用的文件名与认领它的语种。 */
type ResolvedDoc = ParsedDoc & { sourceFile: string; locale: string }

export function demosDirOf(output: string, dir = 'demos'): string {
  return path.join(output, dir)
}

/** 同一文件能命中多个后缀时，最长的那个说了算：`.CN.md` 比 `.md` 更具体。 */
function localeFor(name: string, locales: readonly DocsLocale[]): DocsLocale | undefined {
  let match: DocsLocale | undefined
  for (const locale of locales)
    if (name.endsWith(locale.suffix) && (!match || locale.suffix.length > match.suffix.length)) match = locale
  return match
}

function readDocs(
  config: Pick<MdToCompConfig, 'input' | 'anchor' | 'flavors' | 'locales'>
): Map<string, ResolvedDoc[]> {
  if (!existsSync(config.input)) fail(`找不到 markdown 源目录：${config.input}`)
  const names = readdirSync(config.input)
    .filter(name => name.endsWith('.md'))
    .sort()
  if (names.length === 0) fail(`找不到 markdown 源文件：${config.input}`)

  const suffixes = config.locales.map(locale => locale.suffix).join('、')
  const docs = new Map<string, ResolvedDoc[]>()
  const seen = new Map<string, Map<string, string>>()
  for (const name of names) {
    const locale = localeFor(name, config.locales)
    if (!locale) fail(`${name}：文件名后缀不属于任何语种；配置认这些后缀：${suffixes}`)
    const component = name.slice(0, -locale.suffix.length)
    if (!component) fail(`${name}：去掉语种后缀 ${locale.suffix} 之后就没有组件名了`)
    const file = path.join(config.input, name)
    const doc = parseMarkdown(readFileSync(file, 'utf8'), file, {
      anchor: config.anchor,
      flavors: config.flavors,
      apiTables: locale.apiTables
    })
    // 文件名是这篇文档的身份：frontmatter 的 component 与它同名，文档树才有一个可预测的入口。
    if (doc.component !== component)
      fail(`${file}：frontmatter 的 component=${doc.component} 与文件名（去掉 ${locale.suffix}）不一致，必须同名`)
    // 同一语种里一篇文档只能有一个来源，否则产物里的 component 会撞车。
    const byComponent = seen.get(locale.locale) ?? new Map<string, string>()
    const previous = byComponent.get(component)
    if (previous) fail(`${file}：语种 ${locale.locale} 里的 ${component} 已经有来源 ${previous} 了`)
    byComponent.set(component, file)
    seen.set(locale.locale, byComponent)

    const list = docs.get(locale.locale) ?? []
    list.push({ ...doc, sourceFile: file, locale: locale.locale })
    docs.set(locale.locale, list)
  }
  return docs
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
 * 产物的文件名由引擎固定（`examples.ts` / `examples.css` 加 `dir/` 下的组件示例），所以同一语种
 * 的两个 output（React / Vue 两端）路径形状由引擎保证同形，「逐字节相同」这条断言不必先核对参数；
 * 不同语种的数据本就不同，断言按语种分组做。样式与语种无关，由 `styles` 只写一份，省略时回退成
 * 每个 output 一份——那时它们也必须逐字节相同。组件示例的围栏内容既是写进文件的字节，也是喂给
 * `highlight()` 的字节，所以「页面显示的那份源码」与「被执行的那份源码」同源；`assertSelfContained`
 * 挡的是片段被当成文件发出这一种形状。
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const locales = new Map<string, DocsLocale>()
  for (const locale of options.locales) {
    if (locales.has(locale.locale)) fail(`locales 里出现了重复的语种：${locale.locale}`)
    if (!locale.suffix.startsWith('.') || !locale.suffix.endsWith('.md'))
      fail(`语种 ${locale.locale} 的后缀 \`${locale.suffix}\` 必须以 \`.\` 开头、以 \`.md\` 结尾`)
    locales.set(locale.locale, locale)
  }
  const suffixes = new Set<string>()
  for (const locale of options.locales) {
    if (suffixes.has(locale.suffix)) fail(`两个语种用了同一个文件名后缀：${locale.suffix}`)
    suffixes.add(locale.suffix)
  }

  const outputPaths = new Set<string>()
  for (const output of options.outputs) {
    if (!options.flavors.includes(output.flavor))
      fail(`output 的 flavor \`${output.flavor}\` 不在配置的 flavors [${options.flavors.join(', ')}] 里`)
    if (!locales.has(output.locale))
      fail(`output 的语种 \`${output.locale}\` 不在配置的 locales [${[...locales.keys()].join(', ')}] 里`)
    // 同一目录出两套语料会在盘上互相覆盖，落盘结果取决于输出顺序。
    if (outputPaths.has(output.output)) fail(`两个 output 指向同一个目录：${output.output}`)
    outputPaths.add(output.output)
  }

  const dir = options.dir ?? 'demos'
  const docsByLocale = readDocs(options)
  for (const output of options.outputs)
    if ((docsByLocale.get(output.locale)?.length ?? 0) === 0)
      fail(`output ${output.output} 的语种 \`${output.locale}\` 没有任何 markdown 文件`)

  // 只给有 output 的语种生成模块：没有落点的语种（例如 Vue 侧只出中文，但语料目录里还有英文）
  // 不渲染高亮，省掉一半无消费者的计算。
  const modules = new Map<string, string>()
  for (const locale of new Set(options.outputs.map(output => output.locale)))
    modules.set(locale, renderModule(await buildPayloads(docsByLocale.get(locale) ?? [], options.flavors)))

  const css = renderCss(options.darkSelector)
  const files: GeneratedFile[] = []
  if (options.styles) files.push({ path: options.styles, content: css })
  const modulesByLocale = new Map<string, GeneratedFile[]>()

  for (const output of options.outputs) {
    const module = modules.get(output.locale)
    if (module === undefined) fail(`output ${output.output} 的语种 ${output.locale} 没有生成模块`)
    const file = { path: path.join(output.output, 'examples.ts'), content: module }
    files.push(file)
    const group = modulesByLocale.get(output.locale) ?? []
    group.push(file)
    modulesByLocale.set(output.locale, group)
    if (!options.styles) files.push({ path: path.join(output.output, 'examples.css'), content: css })
    for (const doc of docsByLocale.get(output.locale) ?? []) {
      for (const sample of doc.samples) {
        const code = sample.fences[output.flavor] ?? ''
        assertSelfContained(code, output.flavor, sample.title, doc.sourceFile)
        files.push({
          path: path.join(demosDirOf(output.output, dir), demoFileName(doc.component, sample.id, output.flavor)),
          content: demoFileContent(code)
        })
      }
    }
  }

  // 同一语种在两端出两份产物时，若内容不同，「文档只有一份来源」这句话就不成立了。
  for (const [locale, group] of modulesByLocale)
    for (const file of group)
      if (file.content !== group[0]?.content)
        fail(`语种 ${locale} 的两个 output 的 examples.ts 不一致：同一份 markdown 应产出同一份字节`)

  // 样式不分语种：落点只写一份时这条是自证，回退成多份时必须仍然逐字节相同。
  const cssFiles = files.filter(file => path.basename(file.path) === 'examples.css')
  for (const file of cssFiles)
    if (file.content !== cssFiles[0]?.content) fail(`多个 output 的 examples.css 不一致：样式与语种无关`)

  // 同名产物会互相覆盖，且覆盖结果取决于输出顺序；两条标题派生出同一个 id、output 目录配重都会走到这里。
  const paths = new Set<string>()
  for (const file of files) {
    if (paths.has(file.path)) fail(`产物路径重复：${file.path}（两个来源写出了同一个文件）`)
    paths.add(file.path)
  }

  return { files, demosDirs: options.outputs.map(output => demosDirOf(output.output, dir)) }
}
