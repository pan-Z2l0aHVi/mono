import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

// 语料 join 的跨 app 一半，由语料所有者（本包）持有：两个 demo 拿到的必须是逐字节相同的数据与
// 样式，「视觉一致」由此变成结构保证，而不是靠人肉同步两份文件；两端页面结构也要对齐（路由名
// 集合 == 页面名集合，#362 起不要求 1:1，只要求两侧集合相等）。各侧自己的判据（显示 == 围栏、
// 落盘文件 == 围栏、页面 ↔ 语料不互为孤儿）分别住在两个 demo 的 example-docs.spec.ts 里；
// 生成器那侧的判据在 `@greypan/md-to-comp` 的单测里。
const root = path.resolve(import.meta.dirname, '../../../..')
const reactGenerated = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated')
const reactZh = path.join(reactGenerated, 'zh-CN')
const reactEn = path.join(reactGenerated, 'en')
const vueGenerated = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated')
const reactRoutes = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'routes', 'components')
const vuePages = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'pages', 'components')

const only = (a: string[], b: string[]) => a.filter(value => !b.includes(value))
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(value => b.includes(value))

describe('两端生成物同源', () => {
  const reactModule = readFileSync(path.join(reactZh, 'examples.ts'), 'utf8')
  const reactEnModule = readFileSync(path.join(reactEn, 'examples.ts'), 'utf8')
  const vueModule = readFileSync(path.join(vueGenerated, 'examples.ts'), 'utf8')
  const reactDemoManifest = readFileSync(path.join(reactZh, 'demo-manifest.ts'), 'utf8')
  const reactEnDemoManifest = readFileSync(path.join(reactEn, 'demo-manifest.ts'), 'utf8')
  const vueDemoManifest = readFileSync(path.join(vueGenerated, 'demo-manifest.ts'), 'utf8')
  const vueEnDemoManifest = readFileSync(path.join(vueGenerated, 'en', 'demo-manifest.ts'), 'utf8')

  it('中文语种的 examples.ts 逐字节一致', () => {
    expect(reactModule, 'react 的中文数据与 vue demo 的生成数据必须逐字节一致').toBe(vueModule)
  })

  it('demo 清单在同语种两端逐字节一致，且包含新增示例', () => {
    expect(reactDemoManifest, '中文 demo 清单必须与 Vue 站一致').toBe(vueDemoManifest)
    expect(reactEnDemoManifest, '英文 demo 清单必须与 Vue 站一致').toBe(vueEnDemoManifest)
    expect(reactDemoManifest).toContain("'progress--basic'")
    expect(reactEnDemoManifest).toContain("'progress--basic'")
  })

  it('examples.css 逐字节一致', () => {
    expect(
      readFileSync(path.join(reactGenerated, 'examples.css'), 'utf8'),
      'react 与 vue demo 的生成样式必须逐字节一致'
    ).toBe(readFileSync(path.join(vueGenerated, 'examples.css'), 'utf8'))
  })

  // 英文译文逐篇手写到 `<name>.md`，机器不判译文质量，但「哪篇有译文」是集合关系：中文有而英文没有
  // 会让英文站整页空白，英文有而中文没有会让英文产物多出没有源语料的孤儿。
  it('英文语种与中文语种收同一批文档，且单独成一份', () => {
    const componentsOf = (module: string) => [...module.matchAll(/"component": "([^"]+)"/g)].map(m => m[1])
    expect(reactEnModule, '英文语种应有自己的生成数据').not.toBe(reactModule)
    expect(
      componentsOf(reactEnModule),
      `英文缺译文：${only(componentsOf(reactModule), componentsOf(reactEnModule)).join(', ')}`
    ).toEqual(componentsOf(reactModule))
  })

  // 断言的是「手写的值列从 markdown 的表格一路走到产物」这件事本身：md 里写的是
  // `` `'primary' \| 'secondary' \| …` ``，产物里必须是解掉转义后的 `'primary' | 'secondary' | …`，
  // 所以这一条同时是 `\|` 往返的判据。行是 `string[][]`，列序按 markdown 原样保留。
  it('手写值列从 markdown 一路走到产物（\\| 往返）', () => {
    expect(reactModule).toMatch(
      /"variant",\n\s*"<p>视觉变体[^"]*<\/p>",\n\s*"'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'",\n\s*"'glass'"/
    )
    expect(reactModule).toMatch(/'button' \| 'submit' \| 'reset'/)
  })

  // button.md 没写 ### Events 小节，所以它不该凭空长出一张 Events 表。按「下一个 component 条目」
  // 切片，不写死紧随其后的组件名——文档集增长后，button 后面未必还是 collapse。
  it('没写的 API 小节不会凭空长出表', () => {
    const start = reactModule.indexOf('"component": "button"')
    expect(start).toBeGreaterThan(-1)
    const next = reactModule.indexOf('"component": "', start + 1)
    expect(reactModule.slice(start, next)).not.toContain('"key": "events"')
  })

  // 把名字与那句中文描述一起钉住：表格是这份数据的唯一来源，量的是「手写进 collapse.md 的一行
  // 完整走到产物」。只钉名字不够——dropdown.md 也有一行 `open-change`，那会替它过关。
  it('手写的名称与描述逐字落到产物', () => {
    expect(reactModule).toMatch(/"open-change",\n\s*"<p>用户手势开合后的通知：/)
    expect(reactModule).toMatch(/"content",\n\s*"<p>collapse content。/)
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
