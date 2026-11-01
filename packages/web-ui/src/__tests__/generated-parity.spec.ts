import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

// 语料 join 的跨 app 一半，由语料所有者（本包）持有：两个 demo 拿到的必须是逐字节相同的 source
// markdown 产物与样式，「视觉一致」由此变成结构保证，而不是靠人肉同步两份文件；两端页面结构也要
// 对齐（路由名集合 == 页面名集合，#362 起不要求 1:1，只要求两侧集合相等）。各侧自己的判据
// （显示 == 围栏、落盘文件 == 围栏、页面 ↔ 语料不互为孤儿）分别住在两个 demo 的 example-docs.spec.ts
// 里；生成器那侧的判据在 `@greypan/md-to-meta` 的单测里。
const root = path.resolve(import.meta.dirname, '../../../..')
const reactGenerated = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated')
const vueGenerated = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated')
const reactRoutes = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'routes', 'components')
const vuePages = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'pages', 'components')

const only = (a: string[], b: string[]) => a.filter(value => !b.includes(value))
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(value => b.includes(value))
const filesIn = (dir: string) => readdirSync(dir).sort()
const metaFilesIn = (dir: string) => filesIn(dir).filter(name => name.endsWith('.meta.js'))

/**
 * meta 里唯一跟宿主有关的一处：`exec` 命中的围栏多一行字面 thunk。两侧 `exec` 语言不同
 * （React 走 `tsx`、Vue 走 `vue`），所以比对前只摘掉这一段，其余必须逐字节相同。
 */
const withoutLoad = (module: string) => module.replace(/, load: \(\) => import\('[^']+'\)/g, '')

describe('两端生成物同源', () => {
  it('生成文件集合一致', () => {
    const reactFiles = filesIn(reactGenerated)
    const vueFiles = filesIn(vueGenerated)
    expect(reactFiles.length, '两侧生成目录都为空：对齐判据空转').toBeGreaterThan(0)
    expect(vueFiles, '两端生成目录必须产出同一批文件').toEqual(reactFiles)
  })

  it('codeblock 目录逐字节一致', () => {
    const reactBlocks = path.join(reactGenerated, 'codeblock')
    const vueBlocks = path.join(vueGenerated, 'codeblock')
    const names = filesIn(reactBlocks)
    expect(names.length, 'codeblock 目录为空：对齐判据空转').toBeGreaterThan(0)
    expect(filesIn(vueBlocks), '两端 codeblock 文件集合必须一致').toEqual(names)
    for (const name of names) {
      expect(readFileSync(path.join(vueBlocks, name), 'utf8'), `codeblock/${name} 在两端必须逐字节一致`).toBe(
        readFileSync(path.join(reactBlocks, name), 'utf8')
      )
    }
  })

  it('theme.css 逐字节一致', () => {
    expect(readFileSync(path.join(vueGenerated, 'theme.css'), 'utf8')).toBe(
      readFileSync(path.join(reactGenerated, 'theme.css'), 'utf8')
    )
  })

  it.each(metaFilesIn(reactGenerated).map(name => [name]))('meta 模块 %s 除 load 外逐字节一致', name => {
    expect(
      withoutLoad(readFileSync(path.join(vueGenerated, name), 'utf8')),
      `${name} 的文档结构必须与 React 端一致`
    ).toBe(withoutLoad(readFileSync(path.join(reactGenerated, name), 'utf8')))
  })

  it('并排的类型声明逐字节一致，且每份 meta 都有', () => {
    const names = metaFilesIn(reactGenerated)
    for (const name of names) {
      const declaration = name.replace(/\.js$/, '.d.ts')
      expect(filesIn(reactGenerated), `缺少 ${declaration}`).toContain(declaration)
      expect(
        withoutLoad(readFileSync(path.join(vueGenerated, declaration), 'utf8')),
        `${declaration} 在两端必须一致`
      ).toBe(withoutLoad(readFileSync(path.join(reactGenerated, declaration), 'utf8')))
    }
  })

  // `load` 是宿主 `exec` 语言的判据：React 只把 `.tsx` 围栏当可执行示例，Vue 只认 `.vue`。
  // 所有围栏照常落盘，所以两端的 codeblock 目录相同，差的是哪几条围栏带 `load`。
  it.each([
    ['react-web-ui-demo', reactGenerated, '.tsx'],
    ['vue-web-ui-demo', vueGenerated, '.vue']
  ] as const)('%s 的 load 只挂在 %s 围栏上，且指向真实文件', (app, dir, extension) => {
    const blocks = filesIn(path.join(dir, 'codeblock'))
    const loadLines = metaFilesIn(dir)
      .map(name => readFileSync(path.join(dir, name), 'utf8'))
      .join('\n')
      .split('\n')
      .filter(line => line.includes('load: () => import('))
    expect(loadLines.length, `${app} 没有任何可执行围栏`).toBeGreaterThan(0)

    for (const line of loadLines) {
      const specifier = line.match(/load: \(\) => import\('([^']+)'\)/)?.[1]
      if (!specifier) throw new Error(`load 没有字面 specifier：${line.slice(0, 120)}`)
      const relativePath = specifier.replace('./codeblock/', '')
      expect(relativePath.endsWith(extension), `${app} 的 load 指向了非 ${extension} 围栏：${relativePath}`).toBe(true)
      expect(blocks, `${app} 的 load 指向了不存在的文件：${relativePath}`).toContain(relativePath)
    }
  })

  // 英文译文逐篇手写到 `<name>.md`，机器不判译文质量，但「哪篇有译文」是集合关系：中文有而英文没有
  // 会让英文站整页空白，英文有而中文没有会让英文产物多出没有源语料的孤儿。
  // CHANGELOG 是唯一例外：上游只提供英文版，它是英文站独有的输入。
  it('中英文档集合对齐（CHANGELOG 只存在于英文）', () => {
    const names = metaFilesIn(reactGenerated)
    const zhNames = names.filter(name => name.endsWith('.CN.meta.js')).map(name => name.replace('.CN.meta.js', ''))
    const enNames = names.filter(name => !name.endsWith('.CN.meta.js')).map(name => name.replace('.meta.js', ''))
    expect(zhNames.length, '没有中文语料：对齐判据空转').toBeGreaterThan(0)
    expect(only(enNames, zhNames), '英文独有的文档只能是 CHANGELOG').toEqual(['CHANGELOG'])
    expect(only(zhNames, enNames), `英文缺译文：${only(zhNames, enNames).join(', ')}`).toEqual([])
  })
})

describe('手写表格从 markdown 一路走到产物', () => {
  it('单元格里的 \\| 转义在产物里还原成 |', () => {
    const button = readFileSync(path.join(reactGenerated, 'button.meta.js'), 'utf8')
    // md 里写的是 `` `'primary' \| 'secondary' \| …` ``，meta 里必须是解掉转义后的整格文本。
    expect(button).toContain(`content: "<code>'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'</code>"`)
    expect(button).toContain(`content: "<code>'glass'</code>"`)
  })

  it('表格按结构落成 table > tr > th/td，而不是拼成一段字符串', () => {
    const collapse = readFileSync(path.join(reactGenerated, 'collapse.meta.js'), 'utf8')
    expect(collapse).toContain(`label: 'table',`)
    expect(collapse).toContain(`{ label: 'th', content: "Name" }`)
    expect(collapse).toContain(`{ label: 'td', content: "<code>open</code>" }`)
    // 名字与描述一起钉住：只钉名字不够，dropdown.md 也有同名的一行。
    expect(collapse).toMatch(/label: 'td', content: "Notification after a user-gesture toggle:/)
  })
})

describe('两端页面结构对齐', () => {
  // 规则一：路由名集合 == 页面名集合：两端不许各自漂移。子组件不单开页面
  // （radio-group 挂在 radio 页，dropdown-item 同时挂在 dropdown 与 context-menu 两页），
  // 一一对应就成了一条与意图相反的门槛，改判集合相等。
  it('React 路由名集合 == Vue 页面名集合', () => {
    const reactNames = readdirSync(reactRoutes)
      .filter(file => file.endsWith('.tsx'))
      .map(file => file.slice(0, -4))
      .sort()
    const vueNames = readdirSync(vuePages)
      .filter(file => file.endsWith('.vue'))
      .map(file => file.slice(0, -4))
      .sort()
    expect(
      sameSet(reactNames, vueNames),
      `React 路由与 Vue 页面不同步；仅路由有：${only(reactNames, vueNames).join('、')}；仅页面有：${only(vueNames, reactNames).join('、')}`
    ).toBe(true)
    expect(reactNames.length, '两侧页面都为空：对齐判据空转').toBeGreaterThan(0)
  })

  it('sameSet 判据本身能识别差异', () => {
    expect(sameSet(['a', 'b'], ['a', 'c'])).toBe(false)
    expect(sameSet(['a', 'b'], ['b', 'a'])).toBe(true)
  })
})
