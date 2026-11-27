import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// 两个 demo 之间的生成物与页面结构对齐判据。这是跨 app 的集成契约，不属于任何包的测试面：
// demo 依赖 web-ui，web-ui 不依赖 demo，依赖图上没有能挂这条 join 的包任务，所以判据住在根级。
// 只用 Node 内置模块：CI 里它必须在 Build（md-to-meta 的写盘 healing）之前可运行，不能依赖
// 任何 workspace 产物。判据从 `@greypan/doc-demo-kit` 的 generated-parity 机械迁移而来，
// 断言文本与顺序保持一致，改动判据本身要有独立理由。

const root = path.resolve(import.meta.dirname, '../..')
const reactGenerated = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated')
const vueGenerated = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated')
const reactRoutes = path.join(root, 'apps', 'react-web-ui-demo', 'src', 'routes', 'components')
const vuePages = path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'pages', 'components')

// 判据结构的固定计数：两端各一条 load 判据，其余手写单例。meta 的用例数按目录实时推导，
// 语料增删不改这两个常量；重构判据结构、合并单例时同步更新。
const LOAD_CASES = 2
const SINGLETON_CASES = 7

const only = (a, b) => a.filter(value => !b.includes(value))
const filesIn = dir => fs.readdirSync(dir).sort()
const metaFilesIn = dir => filesIn(dir).filter(name => name.endsWith('.meta.js'))
const read = (dir, name) => fs.readFileSync(path.join(dir, name), 'utf8')

/**
 * meta 里唯一跟宿主有关的一处：`exec` 命中的围栏多一行字面 thunk。两侧 `exec` 语言不同
 * （React 走 `tsx`、Vue 走 `vue`），所以比对前只摘掉这一段，其余必须逐字节相同。
 */
const withoutLoad = module => module.replace(/, load: \(\) => import\('[^']+'\)/g, '')

const failures = []
let executed = 0
function test(name, run) {
  executed += 1
  try {
    run()
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

test('生成文件集合一致', () => {
  const reactFiles = filesIn(reactGenerated)
  const vueFiles = filesIn(vueGenerated)
  assert.ok(reactFiles.length > 0, '两侧生成目录都为空：对齐判据空转')
  assert.deepEqual(vueFiles, reactFiles, '两端生成目录必须产出同一批文件')
})

test('codeblock 目录逐字节一致', () => {
  const reactBlocks = path.join(reactGenerated, 'codeblock')
  const vueBlocks = path.join(vueGenerated, 'codeblock')
  const names = filesIn(reactBlocks)
  assert.ok(names.length > 0, 'codeblock 目录为空：对齐判据空转')
  assert.deepEqual(filesIn(vueBlocks), names, '两端 codeblock 文件集合必须一致')
  for (const name of names) {
    assert.equal(read(vueBlocks, name), read(reactBlocks, name), `codeblock/${name} 在两端必须逐字节一致`)
  }
})

test('theme.css 逐字节一致', () => {
  assert.equal(read(vueGenerated, 'theme.css'), read(reactGenerated, 'theme.css'), 'theme.css 在两端必须逐字节一致')
})

const metaNames = metaFilesIn(reactGenerated)
for (const name of metaNames) {
  test(`meta 模块 ${name} 除 load 外逐字节一致`, () => {
    assert.equal(
      withoutLoad(read(vueGenerated, name)),
      withoutLoad(read(reactGenerated, name)),
      `${name} 的文档结构必须与 React 端一致`
    )
  })
}

test('并排的类型声明逐字节一致，且每份 meta 都有', () => {
  for (const name of metaNames) {
    const declaration = name.replace(/\.js$/, '.d.ts')
    assert.ok(filesIn(reactGenerated).includes(declaration), `缺少 ${declaration}`)
    assert.equal(
      withoutLoad(read(vueGenerated, declaration)),
      withoutLoad(read(reactGenerated, declaration)),
      `${declaration} 在两端必须一致`
    )
  }
})

// `load` 是宿主 `exec` 语言的判据：React 只把 `.tsx` 围栏当可执行示例，Vue 只认 `.vue`。
// 所有围栏照常落盘，所以两端的 codeblock 目录相同，差的是哪几条围栏带 `load`。
for (const [app, dir, extension] of [
  ['react-web-ui-demo', reactGenerated, '.tsx'],
  ['vue-web-ui-demo', vueGenerated, '.vue']
]) {
  test(`${app} 的 load 只挂在 ${extension} 围栏上，且指向真实文件`, () => {
    const blocks = filesIn(path.join(dir, 'codeblock'))
    const loadLines = metaFilesIn(dir)
      .map(name => read(dir, name))
      .join('\n')
      .split('\n')
      .filter(line => line.includes('load: () => import('))
    assert.ok(loadLines.length > 0, `${app} 没有任何可执行围栏`)
    for (const line of loadLines) {
      const specifier = line.match(/load: \(\) => import\('([^']+)'\)/)?.[1]
      if (!specifier) throw new Error(`load 没有字面 specifier：${line.slice(0, 120)}`)
      const relativePath = specifier.replace('./codeblock/', '')
      assert.ok(relativePath.endsWith(extension), `${app} 的 load 指向了非 ${extension} 围栏：${relativePath}`)
      assert.ok(blocks.includes(relativePath), `${app} 的 load 指向了不存在的文件：${relativePath}`)
    }
  })
}

// 英文译文逐篇手写到 `<name>.md`，机器不判译文质量，但「哪篇有译文」是集合关系：中文有而英文没有
// 会让英文站整页空白，英文有而中文没有会让英文产物多出没有源语料的孤儿。
// CHANGELOG 是唯一例外：上游只提供英文版，它是英文站独有的输入。
test('中英文档集合对齐（CHANGELOG 只存在于英文）', () => {
  const names = metaFilesIn(reactGenerated)
  const zhNames = names.filter(name => name.endsWith('.CN.meta.js')).map(name => name.replace('.CN.meta.js', ''))
  const enNames = names.filter(name => !name.endsWith('.CN.meta.js')).map(name => name.replace('.meta.js', ''))
  assert.ok(zhNames.length > 0, '没有中文语料：对齐判据空转')
  assert.deepEqual(only(enNames, zhNames), ['CHANGELOG'], '英文独有的文档只能是 CHANGELOG')
  assert.deepEqual(only(zhNames, enNames), [], `英文缺译文：${only(zhNames, enNames).join(', ')}`)
})

// 规则一：两端组件页均收敛为单一动态路由（$component.tsx / [component].vue）与目录索引重定向（index.tsx / index.vue），
// 由 @greypan/doc-demo-kit 的 NAV_SECTIONS / findComponentRoute 作为唯一真相源驱动。
test('React 与 Vue 组件页均收敛为单一动态路由', () => {
  assert.deepEqual(
    filesIn(reactRoutes),
    ['$component.tsx', 'index.tsx'],
    'React 组件路由目录只能包含 $component.tsx 与 index.tsx'
  )
  assert.deepEqual(
    filesIn(vuePages),
    ['[component].vue', 'index.vue'],
    'Vue 组件页面目录只能包含 [component].vue 与 index.vue'
  )
  assert.match(
    read(reactRoutes, '$component.tsx'),
    /\bfindComponentRoute\b/,
    'React 动态路由必须调用 findComponentRoute'
  )
  assert.match(read(vuePages, '[component].vue'), /\bfindComponentRoute\b/, 'Vue 动态页面必须调用 findComponentRoute')
})

test('NAV_SECTIONS 声明的组件 slug 唯一且所有 docs 均有对应生成文档', () => {
  const navSource = fs.readFileSync(path.join(root, 'packages', 'doc-demo-kit', 'src', 'nav.ts'), 'utf8')
  const entryPattern = /\{\s*path:\s*'\/components\/([a-z0-9-]+)'[^}]*?(?:docs:\s*\[([^\]]+)\])?\s*\}/gu
  const seenSlugs = new Set()
  const availableDocs = new Set(
    metaFilesIn(reactGenerated)
      .filter(name => !name.endsWith('.CN.meta.js'))
      .map(name => name.replace('.meta.js', ''))
  )
  let count = 0
  for (const match of navSource.matchAll(entryPattern)) {
    count += 1
    const slug = match[1]
    assert.ok(!seenSlugs.has(slug), `NAV_SECTIONS 存在重复组件 slug：${slug}`)
    seenSlugs.add(slug)
    const docs = match[2] ? [...match[2].matchAll(/'([a-z0-9-]+)'/gu)].map(m => m[1]) : [slug]
    assert.ok(docs.length > 0, `NAV_SECTIONS 条目 ${slug} 的 docs 不能为空`)
    for (const doc of docs) {
      assert.ok(availableDocs.has(doc), `NAV_SECTIONS 条目 ${slug} 引用的文档 ${doc} 不存在于生成语料中`)
    }
  }
  assert.ok(count > 0, '未从 nav.ts 解析到任何组件条目：契约校验空转')
})

// 用例数按目录推导自检：判据结构与这两个常量漂移时，计数口径先红，而不是静默少判。
const expected = metaNames.length + LOAD_CASES + SINGLETON_CASES
if (executed !== expected) {
  failures.unshift(
    `判据结构漂移：执行了 ${executed} 例，目录推导期望 ${expected}（meta ${metaNames.length} + load ${LOAD_CASES} + 单例 ${SINGLETON_CASES}）；重构判据结构时同步更新脚本顶部的常量`
  )
}

if (failures.length > 0) {
  console.error(`parity: ${failures.length} of ${executed} cases failed:`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  process.exitCode = 1
} else {
  console.log(
    `parity: ${executed} cases pass (meta ${metaNames.length} + load ${LOAD_CASES} + singleton ${SINGLETON_CASES})`
  )
}
