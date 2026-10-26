import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { checkArtifacts, writeArtifacts } from '../emit'
import { generate } from '../generate'
import type { GenerateOptions } from '../types'

/*
 * `generate()` 这条端到端路径：一份语料 → 产物集合 → 落盘 / 判新鲜度。`markdown.spec.ts` 判的是
 * 「表写歪了认不认」，`emit.spec.ts` 用的是合成产物，这里补的是两者之间那一段——真实生成出来的字节
 * 与它们的关系。
 *
 * 这一档替掉了仓库根原来那批「喂一份被篡改的 markdown 副本给 CLI」的 fixture：那时 fixture 要通过
 * 一个已构建的 `dist` 才能跑引擎，dist 陈旧就会静默判旧引擎。就地调 `generate()` 之后，判据与实现
 * 同源，语料也自带，不再依赖仓库里那 39 篇真实文档。
 */

const CONFIG = {
  dir: 'demos',
  flavors: ['react', 'vue'],
  locales: [
    {
      locale: 'zh-CN',
      suffix: '.CN.md',
      apiTables: {
        columns: {
          Props: ['名称', '说明', '类型', '默认值'],
          Events: ['名称', '说明'],
          Slots: ['名称', '说明']
        }
      }
    },
    {
      locale: 'en',
      suffix: '.md',
      apiTables: {
        columns: {
          Props: ['Name', 'Description', 'Type', 'Default'],
          Events: ['Name', 'Description'],
          Slots: ['Name', 'Description']
        }
      }
    }
  ],
  darkSelector: "web-ui-theme[resolved-appearance='dark']"
} satisfies Omit<GenerateOptions, 'input' | 'outputs'>

// 围栏正文与围栏分开写：落盘文件必须等于正文 + 一个行尾换行，所以那条断言要的是正文本身。
const REACT_BODY = ['export default function Demo() {', '  return <web-ui-slider min={0}></web-ui-slider>', '}'].join(
  '\n'
)
const REACT_FENCE = ['```tsx', REACT_BODY, '```'].join('\n')

const VUE_BODY = ['<template>', '  <web-ui-slider :min="0"></web-ui-slider>', '</template>'].join('\n')
const VUE_FENCE = ['```vue', VUE_BODY, '```'].join('\n')

const DOC = [
  '---',
  'component: slider',
  'tag: web-ui-slider',
  '---',
  '',
  '范围 slider，支持刻度标记。',
  '',
  '## Samples',
  '',
  '### Basic',
  '',
  REACT_FENCE,
  '',
  VUE_FENCE,
  '',
  '## API',
  '',
  '### Props',
  '',
  '| 名称 | 说明 | 类型 | 默认值 |',
  '| ---- | ---- | ---- | ---- |',
  '| `min` | 最小值。 | `number` | `0` |',
  '',
  '### Events',
  '',
  '| 名称 | 说明 |',
  '| ---- | ---- |',
  '| `input` | 拖拽过程中触发。 |',
  '',
  '### Known limitations',
  '',
  '`peek` 模式下不支持嵌套。',
  ''
].join('\n')

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function scratch(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'md-to-comp-generate-'))
  dirs.push(dir)
  return dir
}

/**
 * 中文源的对应译文：示例标题两侧同文（它就是派生 id 的那一份身份），换掉的只有散文与 API 列名。
 */
const EN_DOC = DOC.replace('范围 slider，支持刻度标记。', 'A range slider with tick marks.')
  .replace('| 名称 | 说明 | 类型 | 默认值 |', '| Name | Description | Type | Default |')
  .replace('| `min` | 最小值。 | `number` | `0` |', '| `min` | Minimum value. | `number` | `0` |')
  .replace('| 名称 | 说明 |', '| Name | Description |')
  .replace('| `input` | 拖拽过程中触发。 |', '| `input` | Fired while dragging. |')
  .replace('`peek` 模式下不支持嵌套。', 'Nesting is not supported in `peek` mode.')

/** 一份最小语料 + 两个 output；`patch` 用来把某一条判据单独弄歪。 */
function layout(patch: (source: string) => string = source => source) {
  const root = scratch()
  const input = path.join(root, 'docs')
  mkdirSync(input, { recursive: true })
  writeFileSync(path.join(input, 'slider.CN.md'), patch(DOC))
  return {
    root,
    input,
    outputs: [
      { output: path.join(root, 'react-out'), flavor: 'react' as const, locale: 'zh-CN' },
      { output: path.join(root, 'vue-out'), flavor: 'vue' as const, locale: 'zh-CN' }
    ]
  }
}

describe('generate', () => {
  it('围栏原文落成组件文件，两份 output 的数据逐字节一致', async () => {
    const { input, outputs } = layout()
    const { files, demosDirs } = await generate({ ...CONFIG, input, outputs })
    writeArtifacts(files, demosDirs)

    const reactDemo = path.join(outputs[0].output, 'demos', 'slider--basic.tsx')
    const vueDemo = path.join(outputs[1].output, 'demos', 'slider--basic.vue')
    // 落盘文件是 app 真正编译执行的那份源码：它比围栏只多一个行尾换行，其余逐字相同。两个 flavor 同一条判据。
    expect(readFileSync(reactDemo, 'utf8')).toBe(`${REACT_BODY}\n`)
    expect(readFileSync(vueDemo, 'utf8')).toBe(`${VUE_BODY}\n`)

    const data = outputs.map(output => readFileSync(path.join(output.output, 'examples.ts'), 'utf8'))
    const style = outputs.map(output => readFileSync(path.join(output.output, 'examples.css'), 'utf8'))
    expect(data[0]).toBe(data[1])
    expect(style[0]).toBe(style[1])
    expect(style[0]).toContain(CONFIG.darkSelector)
    // Markdown 正文版式也由生成器统一产出：宿主只挂 class，所有 demo 页共用这一份取值。
    expect(style[0]).toContain('.mdc-markdown')
    expect(style[0]).toContain('.mdc-heading')
    expect(style[0]).toContain('color: #37352f')
    expect(style[0]).toContain('h2.mdc-heading')
    // 正文字号跟宿主正文 token，不抄 Notion 的 16px：抄回来会让文档正文比组件里的文字还大。
    expect(style[0]).toContain('font-size: var(--wui-font-size, 14px)')
    // 语料里不留硬编码的正文字号。表格不重复这条声明、只靠继承拿字号（Chromium 的 UA 样式表
    // 没给 table 写 font，实测继承成立），渲染出来到底几 px 由两端 browser spec 量。
    expect(style[0]).not.toContain('font-size: 14px')

    // 刚落盘的产物与产出集合一致：这就是两个 demo 的 `turbo test` 在 `VITEST` 下跑的那一句。
    expect(() => checkArtifacts(files, demosDirs)).not.toThrow()
  })

  it('产物被改歪一个字节就报出那个文件——app 的测试档正是靠它拦下漂移', async () => {
    const { input, outputs } = layout()
    const { files, demosDirs } = await generate({ ...CONFIG, input, outputs })
    writeArtifacts(files, demosDirs)

    const tampered = path.join(outputs[0].output, 'demos', 'slider--basic.tsx')
    writeFileSync(tampered, `${readFileSync(tampered, 'utf8')}// 手改了一个字节\n`)
    expect(() => checkArtifacts(files, demosDirs)).toThrow(/slider--basic\.tsx/)
  })

  it('上一轮遗留的组件文件被清掉，checkArtifacts 先把孤儿报出来', async () => {
    const { input, outputs } = layout()
    const orphan = path.join(outputs[0].output, 'demos', 'slider--gone.tsx')
    mkdirSync(path.dirname(orphan), { recursive: true })
    writeFileSync(orphan, 'export default function Demo() {\n  return null\n}\n')

    const { files, demosDirs } = await generate({ ...CONFIG, input, outputs })
    // 孤儿不被任何 markdown 引用，字节断言盖不到它，但它照样会被 app 的 import.meta.glob 编进构建。
    expect(() => checkArtifacts(files, demosDirs)).toThrow(/slider--gone\.tsx/)
    writeArtifacts(files, demosDirs)
    expect(() => checkArtifacts(files, demosDirs)).not.toThrow()
  })

  it('标题派生不出 id 时整次生成中断，不落半套产物', async () => {
    const { input, outputs } = layout(source => source.replace('### Basic', '### Basic {#basic}'))
    await expect(generate({ ...CONFIG, input, outputs })).rejects.toThrow(/还写着 `\{#\.\.\.\}` 锚点/)
    expect(existsSync(path.join(outputs[0].output))).toBe(false)
  })

  it('语料本身的错在读到它的那一刻就失败', async () => {
    // frontmatter 的 component 与文件名不一致：产物按文件名走，这条不一致会让落点静默错位。
    const renamed = layout()
    writeFileSync(path.join(renamed.input, 'slider-renamed.CN.md'), DOC)
    await expect(generate({ ...CONFIG, input: renamed.input, outputs: renamed.outputs })).rejects.toThrow(
      /与文件名（去掉 \.CN\.md）不一致/
    )

    const missing = layout()
    await expect(
      generate({ ...CONFIG, input: path.join(missing.root, 'nope'), outputs: missing.outputs })
    ).rejects.toThrow(/找不到 markdown 源目录/)
  })

  it('output 的 flavor 不在配置的 flavors 里就失败', async () => {
    const { input, outputs } = layout()
    await expect(generate({ ...CONFIG, input, flavors: ['react'], outputs })).rejects.toThrow(/不在配置的 flavors/)
  })

  it('语种按最长后缀分开生成：同语种跨框架逐字节一致，样式只写一份', async () => {
    const { root, input } = layout()
    writeFileSync(path.join(input, 'slider.md'), EN_DOC)
    const styles = path.join(root, 'styles', 'examples.css')
    const outputs = [
      { output: path.join(root, 'react-zh'), flavor: 'react' as const, locale: 'zh-CN' },
      { output: path.join(root, 'react-en'), flavor: 'react' as const, locale: 'en' },
      { output: path.join(root, 'vue-zh'), flavor: 'vue' as const, locale: 'zh-CN' }
    ]
    const { files, demosDirs } = await generate({ ...CONFIG, input, outputs, styles })
    writeArtifacts(files, demosDirs)

    const zh = readFileSync(path.join(root, 'react-zh', 'examples.ts'), 'utf8')
    const en = readFileSync(path.join(root, 'react-en', 'examples.ts'), 'utf8')
    // 示例标题两侧同文：它现在就是派生 id 的那份身份，译文把它改成别的串等于换掉文件名。
    expect(zh).toContain('"title": "Basic"')
    expect(en).toContain('"title": "Basic"')
    // 分语种落在简介与表头上：译文语料不该把中文简介带进产物。
    expect(zh).toContain('范围 slider')
    expect(en).not.toContain('范围 slider')
    // 同一语种的两个 output 是「同一份来源」：跨框架的数据必须逐字节一致。
    expect(readFileSync(path.join(root, 'vue-zh', 'examples.ts'), 'utf8')).toBe(zh)

    // 样式与语种无关：只写 styles 这一份，output 目录里不再各写一份。
    expect(existsSync(styles)).toBe(true)
    expect(existsSync(path.join(root, 'react-zh', 'examples.css'))).toBe(false)
    expect(existsSync(path.join(root, 'react-en', 'examples.css'))).toBe(false)

    // 两个语种各自落 demo：component 与派生 id 同串，目录不同，互不覆盖。
    expect(existsSync(path.join(root, 'react-zh', 'demos', 'slider--basic.tsx'))).toBe(true)
    expect(existsSync(path.join(root, 'react-en', 'demos', 'slider--basic.tsx'))).toBe(true)
  })

  it('认领不到语种后缀的文件直接失败，不静默漏掉一篇文档', async () => {
    const { input, outputs } = layout()
    writeFileSync(path.join(input, 'slider.md'), EN_DOC)
    const zhOnly = CONFIG.locales.filter(locale => locale.locale === 'zh-CN')
    await expect(generate({ ...CONFIG, locales: zhOnly, input, outputs })).rejects.toThrow(/不属于任何语种/)
  })

  it('output 指向没有文档的语种时失败，不写出空模块', async () => {
    const { root, input, outputs } = layout()
    await expect(
      generate({
        ...CONFIG,
        input,
        outputs: [...outputs, { output: path.join(root, 'en-out'), flavor: 'react', locale: 'en' }]
      })
    ).rejects.toThrow(/没有任何 markdown/)
  })

  it('两个 output 指向同一个目录时失败，不靠输出顺序决定谁覆盖谁', async () => {
    const { input, outputs } = layout()
    await expect(
      generate({ ...CONFIG, input, outputs: [outputs[0], { ...outputs[1], output: outputs[0].output }] })
    ).rejects.toThrow(/同一个目录/)
  })
})
