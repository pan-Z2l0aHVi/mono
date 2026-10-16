import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { braceAnchor } from '../anchor'
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
 * 同源，语料也自带，不再依赖仓库里那 30 篇真实文档。
 */

const CONFIG = {
  dir: 'demos',
  anchor: braceAnchor,
  flavors: ['react', 'vue'],
  apiTables: {
    columns: {
      Props: ['名称', '说明', '类型', '默认值'],
      Events: ['名称', '说明'],
      Slots: ['名称', '说明']
    }
  },
  darkSelector: "web-ui-theme[resolved-appearance='dark']"
} satisfies Omit<GenerateOptions, 'input' | 'outputs'>

// 围栏正文与围栏分开写：落盘文件必须等于正文 + 一个行尾换行，所以那条断言要的是正文本身。
const REACT_BODY = ['export default function Demo() {', '  return <web-ui-slider min={0}></web-ui-slider>', '}'].join(
  '\n'
)
const REACT_FENCE = ['```react', REACT_BODY, '```'].join('\n')

const VUE_BODY = ['<template>', '  <web-ui-slider :min="0"></web-ui-slider>', '</template>'].join('\n')
const VUE_FENCE = ['```vue', VUE_BODY, '```'].join('\n')

const DOC = [
  '---',
  'component: slider',
  'tag: web-ui-slider',
  '---',
  '',
  '范围滑块，支持刻度标记。',
  '',
  '## 示例',
  '',
  '### 基础 {#basic}',
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

/** 一份最小语料 + 两个 output；`patch` 用来把某一条判据单独弄歪。 */
function layout(patch: (source: string) => string = source => source) {
  const root = scratch()
  const input = path.join(root, 'docs')
  mkdirSync(input, { recursive: true })
  writeFileSync(path.join(input, 'slider.md'), patch(DOC))
  return {
    root,
    input,
    outputs: [
      { output: path.join(root, 'react-out'), flavor: 'react' as const },
      { output: path.join(root, 'vue-out'), flavor: 'vue' as const }
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

  it('语料本身的错在读到它的那一刻就失败', async () => {
    // frontmatter 的 component 与文件名不一致：产物按文件名走，这条不一致会让落点静默错位。
    const renamed = layout()
    writeFileSync(path.join(renamed.input, 'slider-renamed.md'), DOC)
    await expect(generate({ ...CONFIG, input: renamed.input, outputs: renamed.outputs })).rejects.toThrow(
      /与文件名不一致/
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
})
