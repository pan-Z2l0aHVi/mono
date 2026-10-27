import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { demoFileContent, demoFileName, FLAVOR_LANG, visibleText } from '@greypan/md-to-comp'
import { render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vite-plus/test'

import ExampleDoc from '../components/example-doc'
import { exampleDocs as enExampleDocs, type ExampleDoc as ExampleDocData } from '../generated/en/examples'
import { exampleDocs as zhExampleDocs } from '../generated/zh-CN/examples'
import { loadExampleDocs, loadShellLocale, LocaleProvider } from '../i18n/locale'

// 本文件只验证生成清单与预览锚点映射，保留真实 getDemo，不加载全站运行示例。
vi.mock('../i18n/examples', async importOriginal => ({
  ...(await importOriginal<typeof import('../i18n/examples')>()),
  prepareExamples: async () => {}
}))

// 语料 join 的 React 侧：「示例显示 == markdown 围栏」「每条示例落成可编译文件」「页面 ↔ 语料
// 不互为孤儿」三条由本包持有；生成器那侧的判据（篡改 / 孤儿 / 表格形状）在 `@greypan/md-to-comp`
// 的单测里；跨 app 的另一半（两端生成数据逐字节一致、路由名集合 == Vue 页面名集合）由 web-ui 包的
// generated-parity.spec.ts 持有。「手写装饰件同源」那条住在两侧各自的 spec 里而不是 web-ui：
// `@greypan/web-ui#test` 的 turbo 输入只覆盖本包目录，只有 app 抄本漂移时它会命中缓存直接判绿，
// 断言一次都不跑；放在 app 侧则任一份被改到自己那一份，那一端的套件必然重新执行。
// 「产物是否新鲜」由 vite.config.ts 里的插件在测试期跑 checkArtifacts
// （只判不改），不在这份 spec 里重复。
const docsDir = path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs')
const zhDemosDir = path.resolve(import.meta.dirname, '../generated/zh-CN/demos')
const routesDir = path.resolve(import.meta.dirname, '../routes/components')

const FLAVOR = 'react' as const
/** 语料里的围栏语言由生成器那张表给出（react 写的是 `tsx`），在这里再抄一遍字符串就会跟着契约漂。 */
const FENCE_LANG = FLAVOR_LANG[FLAVOR]

/** 中文是源语种（`.CN.md`），英文译文的文件名没有语种后缀。 */
function corpusOf(suffix: string) {
  return readdirSync(docsDir)
    .filter(file => file.endsWith(suffix) && (suffix !== '.md' || !file.endsWith('.CN.md')))
    .sort()
}

interface LocaleSurface {
  label: string
  suffix: string
  files: string[]
  docsByName: Map<string, ExampleDocData>
  demosDir: string
}

// 两个语种各拿自己那一份生成数据与 demo 目录，过同一组判据：中文查 zh-CN 产物，英文查 en 产物。
const localeSurfaces: LocaleSurface[] = [
  {
    label: 'zh-CN',
    suffix: '.CN.md',
    docs: zhExampleDocs,
    demosDir: zhDemosDir
  },
  {
    label: 'en',
    suffix: '.md',
    docs: enExampleDocs,
    demosDir: path.resolve(import.meta.dirname, '../generated/en/demos')
  }
].map(({ label, suffix, docs, demosDir }) => ({
  label,
  suffix,
  files: corpusOf(suffix),
  docsByName: new Map(docs.map(doc => [doc.component, doc])),
  demosDir
}))

const docNames = corpusOf('.CN.md').map(file => file.replace(/\.CN\.md$/, ''))

/**
 * `## Samples` 里的 `###` 标题，按出现次序。标题就是示例的身份（id 由生成器从它派生），所以这份
 * 序列是 markdown 与生成数据之间可比的那个轴；`## API` 的小节标题不参与，它们不是示例。
 */
function sampleTitlesOf(markdown: string) {
  const titles: string[] = []
  let inSamples = false
  let fenced = false
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    if (/^##\s+/.test(line)) {
      inSamples = /^##\s+Samples\s*$/.test(line)
      continue
    }
    if (inSamples && /^###\s+/.test(line)) titles.push(line.replace(/^###\s+/, '').trim())
  }
  return titles
}

function fencesOf(markdown: string, lang: string) {
  return [...markdown.matchAll(new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\``, 'g'))].map(match => match[1])
}

/** 一侧的清单：页面文件名的有序列表 + 「文件名 → 它渲染的 `<ExampleDoc component>` 列表」。 */
interface Surface {
  used: Map<string, string[]>
}

function surfaceOf(dir: string, ext: string): Surface & { names: string[] } {
  const files = readdirSync(dir).filter(file => file.endsWith(ext))
  const bare = (file: string) => file.slice(0, -ext.length)
  return {
    names: files.map(bare).sort(),
    used: new Map(
      files.map(file => [
        bare(file),
        [...readFileSync(path.join(dir, file), 'utf8').matchAll(/<ExampleDoc\s[^>]*component="([^"]+)"/g)].map(
          match => match[1]
        )
      ])
    )
  }
}

// 四条覆盖判据里归本侧的三条写成纯函数，末尾用合成输入过一遍正负例：判据自己写错（例如把
// `includes` 写成恒真）会让三条同时变哑巴，而页面照样上线。`scripts/lib/web-ui-docs-inputs.mjs`
// 的 `coversCorpus` 是同一口径。
const rendersOwn = (surface: Surface, name: string) => surface.used.get(name)?.includes(name) ?? false
const unresolvedRefs = (surface: Surface, docs: string[]) =>
  [...new Set([...surface.used.values()].flat())].filter(name => !docs.includes(name))
const orphanDocs = (docs: string[], surfaces: Surface[]) => {
  const rendered = new Set(surfaces.flatMap(surface => [...surface.used.values()].flat()))
  return docs.filter(name => !rendered.has(name))
}
/** 页面从 `@/components/` 引了什么，除 `<ExampleDoc>` 自身的壳以外。 */
const demoImports = (source: string) =>
  [...source.matchAll(/from '@\/components\/([^']+)'/g)]
    .map(match => match[1].split('/')[0])
    .filter(name => name !== 'example-doc')

describe('示例显示与 markdown 围栏同源', () => {
  for (const locale of localeSurfaces) {
    it(`${locale.label}：每个示例的高亮 HTML 可见文本逐字等于围栏原文`, () => {
      let checked = 0
      for (const name of locale.files) {
        const component = name.slice(0, -locale.suffix.length)
        const doc = locale.docsByName.get(component)
        if (!doc) throw new Error(`${name}：生成数据里没有这个 component`)
        const markdown = readFileSync(path.join(docsDir, name), 'utf8')
        const fences = fencesOf(markdown, FENCE_LANG)
        expect(
          fences,
          `${name}：${FENCE_LANG} 围栏数 ${fences.length} 与示例数 ${doc.samples.length} 不一致`
        ).toHaveLength(doc.samples.length)
        fences.forEach((fence, index) => {
          const sample = doc.samples[index]
          expect(
            sample.html[FLAVOR],
            `${name}/${sample.title}/${FLAVOR}：高亮外框形状变了，Tailwind 那层边框与这里的取色会对不上`
          ).toMatch(/^<pre class="shiki shiki-themes github-light github-dark mdc-code"/)
          expect(
            visibleText(sample.html[FLAVOR]),
            `${name}/${sample.title}/${FLAVOR}：显示出来的代码与 markdown 围栏不是同一份字节`
          ).toBe(fence)
          checked += 1
        })
      }
      expect(checked).toBeGreaterThan(0)
    })
  }
})

describe('每条示例落成可编译文件', () => {
  for (const locale of localeSurfaces) {
    it(`${locale.label}：标题序列与生成数据同串，落盘文件与围栏逐字相同（只差行尾换行）`, () => {
      let demoCount = 0
      for (const name of locale.files) {
        const component = name.slice(0, -locale.suffix.length)
        const markdown = readFileSync(path.join(docsDir, name), 'utf8')
        const doc = locale.docsByName.get(component)
        if (!doc) throw new Error(`${name}：生成数据里没有这个 component`)
        expect(sampleTitlesOf(markdown), `${name}：markdown 里 \`## Samples\` 的标题序列与生成数据不是同一串`).toEqual(
          doc.samples.map(sample => sample.title)
        )
        const fences = fencesOf(markdown, FENCE_LANG)
        doc.samples.forEach((sample, index) => {
          demoCount += 1
          const file = path.join(locale.demosDir, demoFileName(component, sample.demoKey, FLAVOR))
          expect(existsSync(file), `${file} 不存在：示例「${sample.title}」必须落成组件文件`).toBe(true)
          expect(
            readFileSync(file, 'utf8'),
            `${file} 与 markdown 围栏不是同一份源码：显示的那份和被执行的那份漂移了`
          ).toBe(demoFileContent(fences[index]))
        })
      }
      expect(demoCount, '一篇示例都没有：「示例落成可编译文件」这条通道等于没被任何断言覆盖').toBeGreaterThan(0)
    })
  }
})

// 标题就是示例的身份，两份语料必须派生出相同的 demo 文件名。
describe('示例标题两侧同文', () => {
  it('CN 与 EN 的 `## Samples` 标题逐字相同', () => {
    for (const name of docNames) {
      const cn = sampleTitlesOf(readFileSync(path.join(docsDir, `${name}.CN.md`), 'utf8'))
      const en = sampleTitlesOf(readFileSync(path.join(docsDir, `${name}.md`), 'utf8'))
      expect(cn, `${name}：中文语料的示例标题与英文那一份不同文，两侧会派生出两套 demo 文件名`).toEqual(en)
    }
  })
})

// 迁移已经完成，所以这里不再有清单：`-demo` 目录按全量语料判不存在（任何一篇重新长出宿主外的
// 手写 demo 都会被抓住），「页面只剩 <ExampleDoc>」按实际存在的路由文件判——子组件文档（
// `button-group` 那 8 篇）挂在宿主路由里，本就没有自己的路由文件。
describe('页面只剩 <ExampleDoc>', () => {
  const surface = surfaceOf(routesDir, '.tsx')

  it('全量语料都没有 `<组件>-demo` 手写目录', () => {
    for (const component of docNames) {
      const demoDir = path.resolve(import.meta.dirname, '../components', `${component}-demo`)
      expect(existsSync(demoDir), `${demoDir} 还在：没有消费者的手写 demo 必须删掉`).toBe(false)
    }
  })

  it('每个路由只渲染 <ExampleDoc>，不引任何手写 demo', () => {
    for (const name of surface.names) {
      const route = path.join(routesDir, `${name}.tsx`)
      const extras = demoImports(readFileSync(route, 'utf8'))
      expect(extras, `${route}：页面只渲染 <ExampleDoc>，仍引入 ${extras.join('、')}`).toEqual([])
    }
  })
})

// 壳映射判在 jsdom（不挂真组件，只判壳真的把每条示例接上了生成的 demo）：预览区由壳自己的
// `import.meta.glob` 映射渲染，产物加载失败不影响判据；demo 真挂得出宿主由人工验收兜底，这里不重复。
describe('语料的壳映射（ExampleDoc）', () => {
  it('带锚点的示例由壳挂出预览区，顺序与生成数据的锚点序一致', async () => {
    for (const surface of localeSurfaces) {
      const locale = surface.label as 'zh-CN' | 'en'
      localStorage.setItem('locale', locale)
      await Promise.all([loadExampleDocs(locale), loadShellLocale(locale)])

      const { container, unmount } = render(
        createElement(
          LocaleProvider,
          null,
          createElement(
            'div',
            null,
            docNames.map(component =>
              createElement(ExampleDoc, { component, key: component, previewAnchorsOnly: true })
            )
          )
        )
      )
      await waitFor(() => expect(container.querySelectorAll('[data-example-doc]')).toHaveLength(docNames.length))
      const previewsByComponent = new Map(
        [...container.querySelectorAll<HTMLElement>('[data-example-doc]')].map(section => [
          section.dataset.exampleDoc!,
          [...section.querySelectorAll('[data-sample-preview]')].map(node => node.getAttribute('data-sample-preview'))
        ])
      )
      unmount()
      for (const component of docNames) {
        const doc = surface.docsByName.get(component)
        if (!doc) throw new Error(`${locale}/${component}：生成数据里没有这个 component`)
        expect(
          previewsByComponent.get(component),
          `${locale}/${component}：预览区与生成数据的锚点不是同一串（壳的 glob 映射或 demoKey 漂了）`
        ).toEqual(doc.samples.map(sample => sample.demoKey))
      }
    }
  }, 30_000)
})

describe('覆盖守卫（React 路由侧）', () => {
  const surface = surfaceOf(routesDir, '.tsx')

  it('每个路由渲染自己那份 <ExampleDoc>', () => {
    for (const name of surface.names)
      expect(rendersOwn(surface, name), `React 路由 ${name} 没有渲染 <ExampleDoc component="${name}" />`).toBe(true)
  })

  it('每份 markdown 至少被一个路由渲染，不留孤儿语料', () => {
    const orphaned = orphanDocs(docNames, [surface])
    expect(orphaned, `这些 markdown 没有任何 React 路由渲染：${orphaned.join('、')}`).toEqual([])
  })

  it('<ExampleDoc> 引用的 markdown 都存在', () => {
    const broken = unresolvedRefs(surface, docNames)
    expect(broken, `React 路由引用了不存在的 markdown：${broken.join('、')}`).toEqual([])
  })

  it('判据本身能识别反例', () => {
    expect(rendersOwn({ used: new Map([['radio', ['radio-group']]]) }, 'radio')).toBe(false)
    expect(orphanDocs(['radio', 'radio-group'], [{ used: new Map([['radio', ['radio']]]) }])).toEqual(['radio-group'])
    expect(unresolvedRefs({ used: new Map([['radio', ['radio', 'nope']]]) }, ['radio'])).toEqual(['nope'])
    expect(
      demoImports(`import Demo from '@/components/slider-demo'\nimport Doc from '@/components/example-doc'`)
    ).toEqual(['slider-demo'])
    expect(demoImports(`import Doc from '@/components/example-doc/index'`)).toEqual([])
  })
})

describe('手写装饰件跨 app 同源', () => {
  it('flavor-icons.ts 与另一端逐字节一致', () => {
    const own = path.resolve(import.meta.dirname, '../components/example-doc/flavor-icons.ts')
    const sibling = path.resolve(
      import.meta.dirname,
      '../../../vue-web-ui-demo/src/components/example-doc/flavor-icons.ts'
    )
    expect(readFileSync(own, 'utf8'), `本端与 vue 端的 flavor-icons.ts 抄本已经漂移`).toBe(
      readFileSync(sibling, 'utf8')
    )
  })
})
