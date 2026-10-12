import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const generator = path.join(root, 'scripts', 'generate-web-ui-examples.mjs')
const docsDir = path.join(root, 'docs', 'examples', 'web-ui')
const outputs = [
  path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'),
  path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated')
]

function runGenerator(args, cwd = root) {
  return spawnSync(process.execPath, [generator, ...args], { cwd, encoding: 'utf8' })
}

// 受版本控制的生成物必须等于生成器此刻的输出——这是「表格不与组件漂移」在 CI 里的落点，
// 因为改组件源码或改 markdown 而不重新生成，会在 `ci:test-scripts` 上直接红。
const check = runGenerator(['--check'])
assert.equal(check.status, 0, `generated files are stale:\n${check.stderr}`)

const modules = outputs.map(dir => readFileSync(path.join(dir, 'web-ui-examples.ts'), 'utf8'))
const styles = outputs.map(dir => readFileSync(path.join(dir, 'web-ui-examples.css'), 'utf8'))

// 两个 demo 拿到的必须是逐字节相同的数据与样式：issue 的「视觉一致」由此变成结构保证，
// 而不是靠人肉同步两份文件。
assert.equal(modules[0], modules[1], 'react 与 vue demo 的生成数据必须逐字节一致')
assert.equal(styles[0], styles[1], 'react 与 vue demo 的生成样式必须逐字节一致')

// 断言的是「值来自组件源码」这件事本身：这些类型与默认值只写在 packages/web-ui 的
// `@property` 装饰器与常量数组里，markdown 只提供中文描述。
assert.match(
  modules[0],
  /"name": "variant",\n\s*"type": "'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'",\n\s*"default": "'glass'"/
)
assert.match(modules[0], /"type": "button \| submit \| reset"/)
// button 没有公共事件，所以它不该凭空长出一张 Events 表。按「下一个 component 条目」切片，
// 不写死紧随其后的组件名——文档集增长到全部组件后，button 后面已经不是 collapse 了。
const buttonStart = modules[0].indexOf('"component": "button"')
const nextComponent = modules[0].indexOf('"component": "', buttonStart + 1)
const button = modules[0].slice(buttonStart, nextComponent)
assert.ok(!button.includes('"key": "events"'), 'button 没有 $events，不应生成 Events 小节')
// collapse 的 `open-change` 来自 `declare readonly $events`，`content` 来自 `<slot name="content">`。
assert.match(modules[0], /"name": "open-change",\n\s*"type": "CustomEvent<\{ open: boolean \}>"/)
assert.match(modules[0], /"name": "content",/)

// Vue SFC 的 <template> 必须真的被着色：曾有一条「锚定缺失的分支把整段标签吞掉」的缺陷，
// 表现就是模板内容原样漏过、只剩 {{ }} 插值被着色。这里钉住标签与属性两种 token。
const vueSamples = [...modules[0].matchAll(/"(?:react|vue)": "((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse(`"${m[1]}"`))
const templateSample = vueSamples.find(html => html.includes('hl-tag'))
assert.ok(templateSample, 'Vue 示例里必须存在被着色的标签 token')
assert.ok(templateSample.includes('class="hl-attr"'), 'Vue 模板属性必须被着色')
assert.ok(
  vueSamples.some(html => html.includes('v-for')),
  'Vue 模板正文不能整段漏过——标签属性与文本都要出现在高亮结果里'
)
assert.ok(
  vueSamples.some(html => html.includes('"hl-tag">script') && html.includes('"hl-keyword">import')),
  'Vue SFC 的 <script> 段必须按 TS 着色'
)

// ── 覆盖守卫：路由 ↔ markdown ↔ ExampleDoc 三方必须同名同量 ──
// 生成器只能保证「写了 markdown 的组件与源码一致」；整条路由漏写 markdown、或路由没有渲染
// ExampleDoc 时，它一句话都不说。issue #217 要的是「每个组件都有示例」，所以把这条 join 也钉在
// CI 上：任一边少一条、或多出孤儿，都直接红——上一轮被拒正是「只接了 2 条路由却全绿」。
const routesDir = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'routes', 'components')
const pagesDir = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'pages', 'components')
const routeNames = readdirSync(routesDir)
  .filter(file => file.endsWith('.tsx'))
  .map(file => file.replace(/\.tsx$/, ''))
  .sort()
const pageNames = readdirSync(pagesDir)
  .filter(file => file.endsWith('.vue'))
  .map(file => file.replace(/\.vue$/, ''))
  .sort()
const docNames = readdirSync(docsDir)
  .filter(file => file.endsWith('.md'))
  .map(file => file.replace(/\.md$/, ''))
  .sort()
const sameNames = (a, b) => a.length === b.length && a.every((value, index) => value === b[index])
const only = (a, b) => a.filter(value => !b.includes(value))
assert.ok(
  sameNames(routeNames, docNames),
  `React 路由与 markdown 覆盖不一致；仅路由有：${only(routeNames, docNames)}；仅 markdown 有：${only(docNames, routeNames)}`
)
assert.ok(
  sameNames(pageNames, docNames),
  `Vue 页面与 markdown 覆盖不一致；仅页面有：${only(pageNames, docNames)}；仅 markdown 有：${only(docNames, pageNames)}`
)
for (const name of docNames) {
  // 用正则而不是字面串：允许 ExampleDoc 带其它属性、属性间空白变化，别让一次换行把守卫变成假红。
  const usage = new RegExp(`<ExampleDoc\\s[^>]*component="${name}"`)
  assert.ok(
    usage.test(readFileSync(path.join(routesDir, `${name}.tsx`), 'utf8')),
    `React 路由 ${name}.tsx 没有渲染 <ExampleDoc component="${name}" />`
  )
  assert.ok(
    usage.test(readFileSync(path.join(pagesDir, `${name}.vue`), 'utf8')),
    `Vue 页面 ${name}.vue 没有渲染 <ExampleDoc component="${name}" />`
  )
}

// ── fail-closed：两侧任何一边漂移都必须让生成器非零退出 ──
const scratch = mkdtempSync(path.join(tmpdir(), 'web-ui-examples-'))
try {
  const scratchDocs = path.join(scratch, 'docs')
  const scratchOut = path.join(scratch, 'out')
  // 固定用 button.md，不取「排序第一个」：按字母序下一个是 badge.md 之类，一旦那个组件
  // 没有 Props 表，这条负例就会因为与本改动无关的原因失败。文件存在性先自己核一遍。
  const fixtureName = 'button.md'
  assert.ok(readdirSync(docsDir).includes(fixtureName), `fixture：${docsDir} 里找不到 ${fixtureName}，这条负例不承重`)
  const source = readFileSync(path.join(docsDir, fixtureName), 'utf8')
  // 按行定位 Props 表，不写死表格对齐方式：oxfmt 会给 markdown 表格补空格，
  // 任何「照抄表头字面量」的 fixture 都会在格式化后失效。
  const lines = source.split('\n')
  const propsIndex = lines.findIndex(line => line.trim() === '### Props')
  assert.notEqual(propsIndex, -1, `fixture：${fixtureName} 里找不到 ### Props`)
  const separatorIndex = lines.findIndex((line, index) => index > propsIndex && /^\|\s*:?-{2,}/.test(line))
  assert.notEqual(separatorIndex, -1, `fixture：${fixtureName} 的 Props 表没有分隔行`)
  const markup = [
    ...lines.slice(0, separatorIndex + 1),
    '| `not-a-real-prop` | 源码里没有这个属性。 |',
    ...lines.slice(separatorIndex + 1)
  ].join('\n')
  const missing = [...lines.slice(0, separatorIndex + 1), ...lines.slice(separatorIndex + 2)].join('\n')

  // 主线：正常副本必须能生成，证明这个 seam 可用，失败不是因为路径写错。
  mkdirSync(scratchDocs, { recursive: true })
  writeFileSync(path.join(scratchDocs, fixtureName), source)
  const okRun = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.equal(okRun.status, 0, `干净的 markdown 副本必须能通过：\n${okRun.stderr}`)

  // 反向：markdown 多写一个源码里不存在的 prop，必须被拦下。
  assert.notEqual(markup, source, '测试 fixture 没改动到 Props 表，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), markup)
  const extra = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(extra.status, 0, 'markdown 多写一个源码里没有的 prop 时生成器必须失败')
  assert.match(extra.stderr, /not-a-real-prop/)

  // 反向：删掉源码里某个 prop 的描述行，也必须被拦下（否则表格会静默缺行）。
  assert.notEqual(missing, source, '测试 fixture 没删掉任何描述行，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), missing)
  const removed = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(removed.status, 0, '源码里有 prop 但 markdown 没描述时生成器必须失败')
  assert.match(removed.stderr, /没有描述行/)

  // 反向：文件名与 frontmatter 的 component 不一致（生成器新增的守卫）。
  writeFileSync(path.join(scratchDocs, fixtureName), source)
  writeFileSync(path.join(scratchDocs, 'button-renamed.md'), source)
  const renamed = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(renamed.status, 0, 'frontmatter 的 component 与文件名不一致时必须失败')
  assert.match(renamed.stderr, /与文件名不一致/)
  rmSync(path.join(scratchDocs, 'button-renamed.md'))

  // 反向：同一张表里出现重名字段（生成器新增的守卫，重名会被 Map 静默吞掉一行）。
  const duplicated = [
    ...lines.slice(0, separatorIndex + 1),
    lines[separatorIndex + 1],
    ...lines.slice(separatorIndex + 1)
  ].join('\n')
  assert.notEqual(duplicated, source, '测试 fixture 没复制出重名行，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), duplicated)
  const duplicate = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(duplicate.status, 0, 'markdown 表里出现重名字段时生成器必须失败')
  assert.match(duplicate.stderr, /重复的字段名/)

  // 反向：示例代码块用了 react / vue 之外的语言（生成器新增的守卫，否则会被静默丢掉）。
  const wrongFence = source.replace('```react', '```html')
  assert.notEqual(wrongFence, source, '测试 fixture 没换掉任何代码块语言，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), wrongFence)
  const fence = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(fence.status, 0, '示例代码块语言不是 react / vue 时生成器必须失败')
  assert.match(fence.stderr, /语言必须是 react 或 vue/)
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

console.log('generate-web-ui-examples tests passed')
