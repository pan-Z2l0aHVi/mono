import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

// 这份语料 join 只判「跨包的四方是否同名同量同字节」：markdown 语料、两个 app 落盘的产物、
// 页面路由与 `ExampleDoc` 的使用。生成器自己那侧的判据（篡改 / 孤儿 / 表格形状）在
// `@greypan/md-to-comp` 的单测里，对着 `generate()` 直接跑，不再经 CLI。
// 「产物是不是新鲜的」由两个 app 自己的 `turbo test` 判：插件在 VITEST 下只判不改，
// 跑的就是 `checkArtifacts`（见 `docs/agents/build.md`）。
const root = path.resolve(import.meta.dirname, '..')
const docsDir = path.join(root, 'packages', 'web-ui', 'docs')
const outputs = [
  { dir: path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'), flavor: 'react', ext: 'tsx' },
  { dir: path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated'), flavor: 'vue', ext: 'vue' }
]

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

console.log(`example-docs tests passed（落成组件文件的示例 ${demoCount} 条）`)
