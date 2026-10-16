import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const generator = path.join(root, 'scripts', 'generate-web-ui-examples.mjs')
const docsDir = path.join(root, 'docs', 'examples', 'web-ui')
const outputs = [
  { dir: path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'), flavor: 'react', ext: 'tsx' },
  { dir: path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated'), flavor: 'vue', ext: 'vue' }
]

function runGenerator(args, cwd = root) {
  return spawnSync(process.execPath, [generator, ...args], { cwd, encoding: 'utf8' })
}

// 受版本控制的生成物必须等于生成器此刻的输出——这是「文档不与产物漂移」在 CI 里的落点，
// 因为改 markdown 而不重新生成，会在 `ci:test-scripts` 上直接红。
const check = runGenerator(['--check'])
assert.equal(check.status, 0, `generated files are stale:\n${check.stderr}`)

const modules = outputs.map(output => readFileSync(path.join(output.dir, 'examples.ts'), 'utf8'))
const styles = outputs.map(output => readFileSync(path.join(output.dir, 'examples.css'), 'utf8'))

// 两个 demo 拿到的必须是逐字节相同的数据与样式：issue 的「视觉一致」由此变成结构保证，
// 而不是靠人肉同步两份文件。
assert.equal(modules[0], modules[1], 'react 与 vue demo 的生成数据必须逐字节一致')
assert.equal(styles[0], styles[1], 'react 与 vue demo 的生成样式必须逐字节一致')

// 生成物是 TS（带 interface 声明），node 不能直接 import，所以取那段 JSON 字面量自己解析。
// 这是测试里刻意重复的一次「读」，不是引擎的一部分。
function payloadOf(module) {
  const match = /= (\[[\s\S]*\])\s*$/.exec(module)
  if (!match) throw new Error('生成物里找不到 exampleDocs 的数组字面量')
  return JSON.parse(match[1])
}

const docs = payloadOf(modules[0])
const docsByName = new Map(docs.map(doc => [doc.component, doc]))

/**
 * 高亮 HTML 的可见文本。
 *
 * 先剥标签再解实体：shiki 把正文里的 `<` 与 `&` 写成 `&#x3C;` / `&#x26;`，所以剩下的尖括号
 * 一律是标记本身，剥标签不会把代码里的标签当成标记。顺序反了就会把 `<web-ui-button>` 吃掉。
 * 实体必须一趟解完（一个 alternation 正则），分几趟解会把源码里字面写着的 `&quot;` 解两遍变成 `"`。
 */
function visibleText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&#x([\da-f]+);|&#(\d+);|&([a-z]+);/gi, (whole, hex, dec, name) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
    if (dec) return String.fromCodePoint(Number.parseInt(dec, 10))
    return { amp: '&', quot: '"' }[name?.toLowerCase()] || whole
  })
}

// 给上面这个解码器自己的一条判据：`&#x26;quot;` 是源码里字面写着 `&quot;` 时 shiki 的写法。
assert.equal(visibleText('<span>&#x26;quot; &#x3C;b></span>'), '&quot; <b>')

function fencesOf(markdown, lang) {
  return [...markdown.matchAll(new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\``, 'g'))].map(match => match[1])
}

// `### 受控值 {#controlled}`：锚点存在即代表这条示例被落成了组件文件。
function anchoredSamples(markdown) {
  return [...markdown.matchAll(/^###\s+(.+?)\s+\{#([a-z0-9-]+)\}\s*$/gm)].map(match => ({
    title: match[1],
    id: match[2]
  }))
}

// 断言的是「类型与默认值从 markdown 的四列表格一路走到产物」这件事本身：md 里写的是
// `` `'primary' \| 'secondary' \| …` ``，产物里必须是解掉转义后的 `'primary' | 'secondary' | …`，
// 所以这一条同时是 `\|` 往返的判据。
assert.match(
  modules[0],
  /"name": "variant",\n\s*"type": "'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'",\n\s*"default": "'glass'"/
)
assert.match(modules[0], /"type": "button \| submit \| reset"/)
// button.md 没写 ### Events 小节，所以它不该凭空长出一张 Events 表。按「下一个 component 条目」切片，
// 不写死紧随其后的组件名——文档集增长到全部组件后，button 后面已经不是 collapse 了。
const buttonStart = modules[0].indexOf('"component": "button"')
const nextComponent = modules[0].indexOf('"component": "', buttonStart + 1)
const button = modules[0].slice(buttonStart, nextComponent)
assert.ok(!button.includes('"key": "events"'), 'button.md 没写 ### Events 小节，不应生成 Events 数据')
// 这两条把名字与那句中文描述一起钉住：表格是这份数据的唯一来源，所以量的是「手写进 collapse.md 的
// 一行完整走到产物」。只钉名字不够——dropdown.md 也有一行 `open-change`，那会替它过关。
assert.match(modules[0], /"name": "open-change",\n\s*"descriptionHtml": "<p>开合请求。/)
assert.match(modules[0], /"name": "content",\n\s*"descriptionHtml": "<p>折叠内容。/)

// ── 不变式一：页面显示的那份源码，逐字就是 markdown 里的那一段围栏 ──
// 这条同时替掉了旧实现里「钉 `.hl-tag` 类名与某个颜色值」的两个断言：那些是在证明自制着色器
// 没吞掉 Vue 模板，而 shiki 换掉着色器后类名不复存在。直接量「可见文本 == 围栏原文」比它强，
// 且与主题、类名、token 结构都无关。引擎里另有一条同口径的自证：`src/highlight.ts` 对最终 HTML
// 剥掉标记、解掉实体后必须逐字等于输入，所以这条断言不是唯一的一道闸。
for (const name of readdirSync(docsDir).filter(file => file.endsWith('.md'))) {
  const component = name.replace(/\.md$/, '')
  const doc = docsByName.get(component)
  assert.ok(doc, `${name}：生成数据里没有这个 component`)
  const markdown = readFileSync(path.join(docsDir, name), 'utf8')
  for (const lang of ['react', 'vue']) {
    const fences = fencesOf(markdown, lang)
    assert.equal(
      fences.length,
      doc.samples.length,
      `${name}：${lang} 围栏数 ${fences.length} 与示例数 ${doc.samples.length} 不一致`
    )
    fences.forEach((fence, index) => {
      const html = doc.samples[index].html[lang]
      assert.match(
        html,
        /^<pre class="shiki shiki-themes github-light github-dark mdc-code"/,
        `${name}/${doc.samples[index].title}/${lang}：高亮外框形状变了，Tailwind 那层边框与这里的取色会对不上`
      )
      assert.equal(
        visibleText(html),
        fence,
        `${name}/${doc.samples[index].title}/${lang}：显示出来的代码与 markdown 围栏不是同一份字节`
      )
    })
  }
}

// ── 不变式二：带锚点的示例被落成组件文件，文件内容就是围栏 + 一个行尾换行 ──
// 落盘文件是 app 真正编译执行的那份源码，所以这里比的不是「渲染得像」，而是字节相同。
// 行尾换行是唯一的差别：mdast 的 code 值不含它，而文本文件与格式化器都要它有。
let demoCount = 0
for (const name of readdirSync(docsDir).filter(file => file.endsWith('.md'))) {
  const component = name.replace(/\.md$/, '')
  const markdown = readFileSync(path.join(docsDir, name), 'utf8')
  const anchors = anchoredSamples(markdown)
  demoCount += anchors.length
  for (const anchor of anchors) {
    const doc = docsByName.get(component)
    const sample = doc.samples.find(candidate => candidate.title === anchor.title)
    assert.ok(sample, `${name}：带锚点的示例「${anchor.title}」没进生成数据`)
    assert.equal(sample.demoKey, anchor.id, `${name}/${anchor.title}：生成数据里的 demoKey 不是锚点`)
    for (const output of outputs) {
      const fence = fencesOf(markdown, output.flavor)[doc.samples.indexOf(sample)]
      const file = path.join(output.dir, 'demos', `${component}--${anchor.id}.${output.ext}`)
      assert.ok(existsFile(file), `${file} 不存在：带 \`### ${anchor.title} {#${anchor.id}}\` 的示例必须落成组件文件`)
      assert.equal(
        readFileSync(file, 'utf8'),
        `${fence}\n`,
        `${file} 与 markdown 围栏不是同一份源码：显示的那份和被执行的那份漂移了`
      )
    }
  }
}
assert.ok(demoCount > 0, '一篇带锚点的示例都没有：「示例落成可编译文件」这条通道等于没被任何断言覆盖')

function existsFile(file) {
  try {
    readFileSync(file)
    return true
  } catch {
    return false
  }
}

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
  // 表头形状：把四列的表头与分隔行退回旧的「| 名称 | 说明 |」，数据行仍是四格。
  const oldHeader = [
    ...lines.slice(0, separatorIndex - 1),
    '| 名称 | 说明 |',
    '| ---- | ---- |',
    ...lines.slice(separatorIndex + 1)
  ].join('\n')
  // 空的类型单元格：新插一行，不去改动已有行——button 的 variant 类型里带 `\|`，
  // 按裸 `|` 切开会把它拆成两格。
  const emptyType = [
    ...lines.slice(0, separatorIndex + 1),
    '| `no-type` | 类型那一格是空的。 |  | `false` |',
    ...lines.slice(separatorIndex + 1)
  ].join('\n')
  // 多写一节：表头四列，这一行有五个单元格，第五节会被静默丢掉。
  const raggedRow = [
    ...lines.slice(0, separatorIndex + 1),
    '| `too-many` | 多写的一节。 | `boolean` | `false` | 第五节 |',
    ...lines.slice(separatorIndex + 1)
  ].join('\n')

  // 主线：正常副本必须能生成，证明这个 seam 可用，失败不是因为路径写错。
  mkdirSync(scratchDocs, { recursive: true })
  writeFileSync(path.join(scratchDocs, fixtureName), source)
  const okRun = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.equal(okRun.status, 0, `干净的 markdown 副本必须能通过：\n${okRun.stderr}`)

  // 反向：Props 表少了类型与默认值两列，必须被拦下（表格现在是这份数据的唯一来源，
  // 列形状一旦松动，产物里就会出现一个永远为空白的列）。
  assert.notEqual(oldHeader, source, '测试 fixture 没改到 Props 表头，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), oldHeader)
  const narrowed = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(narrowed.status, 0, 'Props 表头不是四列时生成器必须失败')
  assert.match(narrowed.stderr, /### Props 的表头必须是/)

  // 反向：类型单元格留空，必须被拦下而不是产出一个空白列。
  assert.notEqual(emptyType, source, '测试 fixture 没插进空类型行，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), emptyType)
  const blank = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(blank.status, 0, '类型单元格为空时生成器必须失败')
  assert.match(blank.stderr, /类型单元格是空的/)

  // 反向：某一行的列数与表头不符，多余那节必须报错而不是被丢掉。
  assert.notEqual(raggedRow, source, '测试 fixture 没插进多一节行，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), raggedRow)
  const ragged = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(ragged.status, 0, '行列数与表头不一致时生成器必须失败')
  assert.match(ragged.stderr, /有一行是 5 列，表头是 4 列/)

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
  assert.match(fence.stderr, /代码块语言必须是 react \/ vue/)

  // 反向：给一个「片段形态」的示例加锚点开热通道，必须被拦下。
  // 带锚点的围栏就是会被编译执行的源文件，button.md 的围栏是裸 JSX 片段，发出去等于发出一个
  // 语法都不合法的模块；这条守卫是「未迁移的 29 篇不会被顺手落成组件文件」的机械判据。
  const anchoredFragment = source.replace(/^### 变体/mu, '### 变体 {#variants}')
  assert.notEqual(anchoredFragment, source, '测试 fixture 没加上锚点，这条负例不承重')
  writeFileSync(path.join(scratchDocs, fixtureName), anchoredFragment)
  const fragment = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(fragment.status, 0, '片段形态的 react 围栏带锚点时生成器必须失败')
  assert.match(fragment.stderr, /export default function Demo/)

  // 反向：改了 `{#id}` 或删掉一条示例后，上一轮那份组件文件必须跟着走。孤儿不被任何 markdown
  // 引用，所以「围栏 == 落盘」那组断言盖不到它，但它照样被 app 的 import.meta.glob 编进构建。
  writeFileSync(path.join(scratchDocs, fixtureName), source)
  const orphans = ['button--ghost.tsx', 'button--other-flavor.vue'].map(name => path.join(scratchOut, 'demos', name))
  mkdirSync(path.dirname(orphans[0]), { recursive: true })
  for (const orphan of orphans) writeFileSync(orphan, 'export default function Demo() {\n  return null\n}\n')
  const stale = runGenerator(['--check', '--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.notEqual(stale.status, 0, '生成目录里留着 markdown 已不引用的组件文件时 --check 必须失败')
  for (const orphan of orphans) assert.match(stale.stderr, new RegExp(path.basename(orphan)))
  const pruned = runGenerator(['--docs-dir', scratchDocs, '--out-dir', scratchOut])
  assert.equal(pruned.status, 0, `清理上一轮遗留的组件文件时生成器必须成功：\n${pruned.stderr}`)
  // 清扫按「本轮没写出」判定，不看扩展名：`--out-dir` 这条 seam 只有 react flavor，所以这里那份
  // `.vue` 孤儿是被同一个判据带走的，不是被扩展名过滤漏掉的。
  for (const orphan of orphans) assert.ok(!existsFile(orphan), `生成器没删掉上一轮遗留的 ${path.basename(orphan)}`)
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

console.log(`generate-web-ui-examples tests passed（落成组件文件的示例 ${demoCount} 条）`)
