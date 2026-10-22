import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { demoFileContent, demoFileName, FLAVOR_LANG, visibleText } from '@greypan/md-to-comp'
import { describe, expect, it } from 'vite-plus/test'

import { exampleDocs } from '../generated/examples'

// 语料 join 的 React 侧：「示例显示 == markdown 围栏」「带锚点的示例落成可编译文件」「页面 ↔ 语料
// 不互为孤儿」三条由本包持有；生成器那侧的判据（篡改 / 孤儿 / 表格形状）在 `@greypan/md-to-comp`
// 的单测里；跨 app 的另一半（两端生成数据逐字节一致、路由名集合 == Vue 页面名集合）由 web-ui 包的
// generated-parity.spec.ts 持有。「手写装饰件同源」那条住在两侧各自的 spec 里而不是 web-ui：
// `@greypan/web-ui#test` 的 turbo 输入只覆盖本包目录，只有 app 抄本漂移时它会命中缓存直接判绿，
// 断言一次都不跑；放在 app 侧则任一份被改到自己那一份，那一端的套件必然重新执行。
// 「产物是否新鲜」由 vite.config.ts 里的插件在测试期跑 checkArtifacts
// （只判不改），不在这份 spec 里重复。
const docsDir = path.resolve(import.meta.dirname, '../../../../packages/web-ui/docs')
const demosDir = path.resolve(import.meta.dirname, '../generated/demos')
const routesDir = path.resolve(import.meta.dirname, '../routes/components')

const FLAVOR = 'react' as const
/** 语料里的围栏语言由生成器那张表给出（react 写的是 `tsx`），在这里再抄一遍字符串就会跟着契约漂。 */
const FENCE_LANG = FLAVOR_LANG[FLAVOR]

const corpusFiles = readdirSync(docsDir)
  .filter(file => file.endsWith('.md'))
  .sort()
const docNames = corpusFiles.map(file => file.replace(/\.md$/, ''))
const docByName = new Map(exampleDocs.map(doc => [doc.component, doc]))

/** `### 受控值 {#controlled}`：锚点存在即代表这条示例被落成了组件文件。 */
function anchoredSamples(markdown: string) {
  return [...markdown.matchAll(/^###\s+(.+?)\s+\{#([a-z0-9-]+)\}\s*$/gm)].map(match => ({
    title: match[1],
    id: match[2]
  }))
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
  it('每个示例的高亮 HTML 可见文本逐字等于围栏原文', () => {
    let checked = 0
    for (const name of corpusFiles) {
      const component = name.replace(/\.md$/, '')
      const doc = docByName.get(component)
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
})

describe('带锚点的示例落成可编译文件', () => {
  it('落盘文件与围栏逐字相同（只差行尾换行）', () => {
    let demoCount = 0
    for (const name of corpusFiles) {
      const component = name.replace(/\.md$/, '')
      const markdown = readFileSync(path.join(docsDir, name), 'utf8')
      const doc = docByName.get(component)
      if (!doc) throw new Error(`${name}：生成数据里没有这个 component`)
      for (const anchor of anchoredSamples(markdown)) {
        demoCount += 1
        const sample = doc.samples.find(candidate => candidate.title === anchor.title)
        if (!sample) throw new Error(`${name}：带锚点的示例「${anchor.title}」没进生成数据`)
        expect(sample.demoKey, `${name}/${anchor.title}：生成数据里的 demoKey 不是锚点`).toBe(anchor.id)
        const fence = fencesOf(markdown, FENCE_LANG)[doc.samples.indexOf(sample)]
        const file = path.join(demosDir, demoFileName(component, anchor.id, FLAVOR))
        expect(
          existsSync(file),
          `${file} 不存在：带 \`### ${anchor.title} {#${anchor.id}}\` 的示例必须落成组件文件`
        ).toBe(true)
        expect(
          readFileSync(file, 'utf8'),
          `${file} 与 markdown 围栏不是同一份源码：显示的那份和被执行的那份漂移了`
        ).toBe(demoFileContent(fence))
      }
    }
    expect(demoCount, '一篇带锚点的示例都没有：「示例落成可编译文件」这条通道等于没被任何断言覆盖').toBeGreaterThan(0)
  })
})

// 过渡期清单：已迁到「docs 全量生成」的文档。每迁完一篇就加进来；全部迁完后删除本清单，
// 并在生成配置里开启 requireDemo，让漏锚点直接在生成阶段失败。清单里的文档断言的是「每条
// 示例都有锚点」，补上锚点测试天然覆盖不到的那半边。
const migratedDocs = [
  'avatar',
  'badge',
  'button',
  'checkbox',
  'collapse',
  'drawer',
  'editable-text',
  'empty',
  'icon',
  'input',
  'input-number',
  'layout',
  'middle-ellipsis',
  'radio',
  'slider',
  'spinner',
  'svg-draw-lines',
  'switch',
  'textarea',
  'theme'
]

describe('已迁移文档的每条示例都能渲染', () => {
  it('迁移清单里没有漏掉锚点的示例', () => {
    for (const component of migratedDocs) {
      const doc = docByName.get(component)
      if (!doc) throw new Error(`${component}：生成数据里没有这个 component`)
      expect(doc.samples.length, `${component}：已迁移文档一条示例都没有`).toBeGreaterThan(0)
      for (const sample of doc.samples) {
        if (!sample.demoKey) throw new Error(`${component}/${sample.title}：已迁移文档里的示例必须带 \`{#id}\` 锚点`)
        const file = path.join(demosDir, demoFileName(component, sample.demoKey, FLAVOR))
        expect(existsSync(file), `${file} 不存在：已迁移文档的示例必须落成可预览的组件文件`).toBe(true)
      }
    }
  })

  it('已迁移文档的页面只剩 <ExampleDoc>，手写 demo 已删除', () => {
    for (const component of migratedDocs) {
      const route = path.join(routesDir, `${component}.tsx`)
      const extras = demoImports(readFileSync(route, 'utf8'))
      expect(extras, `${route}：迁移后的页面只渲染 <ExampleDoc>，仍引入 ${extras.join('、')}`).toEqual([])
      const demoDir = path.resolve(import.meta.dirname, '../components', `${component}-demo`)
      expect(existsSync(demoDir), `${demoDir} 还在：迁移后没有消费者的手写 demo 必须删掉`).toBe(false)
    }
  })
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
