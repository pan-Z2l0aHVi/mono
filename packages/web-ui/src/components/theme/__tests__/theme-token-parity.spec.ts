import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

// Token 层的单一来源守卫：
// 1) 组件 CSS 里的 var(--wui-*, 字面量) 必须与 theme/style.css 的默认定义一致
//    （:host 基础块 + light 块为默认源；dark/motion 块是覆盖，不是 fallback 基准）。
// 2) theme/style.css 内部的成对块（dark 显式块 vs prefers-color-scheme 媒体块、
//    motion reduced 显式块 vs prefers-reduced-motion 媒体块）必须逐 token 一致——
//    这些块语义上必须同步，历史上只靠人工维护。
// fallback 字面量本身必须保留（:host 级默认会压过继承的主题值）；被锁住的是"手工同步"。

const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))
const themeCss = fs.readFileSync(`${packageRoot}src/components/theme/style.css`, 'utf8')

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/;\s*$/, '')
}

/** 从 selector 首次出现的位置开始，按括号配平截取块体。 */
function blockBody(css: string, selectorPattern: string): string {
  const index = css.search(new RegExp(selectorPattern))
  expect(index, `theme/style.css 未找到块 ${selectorPattern}`).toBeGreaterThanOrEqual(0)
  const open = css.indexOf('{', index)
  let depth = 1
  let i = open + 1
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return css.slice(open + 1, i - 1)
}

// 逐声明解析（声明值可跨多行，如多段 shadow），以分号收尾
function tokenPairs(block: string): Map<string, string> {
  const pairs = new Map<string, string>()
  const declaration = /--([a-z0-9-]+):\s*([\s\S]*?);/g
  let match: RegExpExecArray | null
  while ((match = declaration.exec(block))) {
    pairs.set(`--${match[1]}`, normalize(match[2]))
  }
  return pairs
}

// 默认源：基础 :host 块，叠加 light/system 块（color/shadow 类的默认值所在）。
const defaultTokens = new Map<string, string>([
  ...tokenPairs(blockBody(themeCss, ':host \\{')),
  ...tokenPairs(blockBody(themeCss, ":host\\(\\[appearance='light'\\]\\),\\n:host\\(\\[appearance='system'\\]\\) \\{"))
])

/** 提取 css 中所有 var(--wui-*, fallback)，fallback 按括号配平截取。 */
interface FallbackSite {
  token: string
  fallback: string
  file: string
  line: number
  index: number
}
function extractFallbacks(css: string, file: string): FallbackSite[] {
  const sites: FallbackSite[] = []
  const re = /var\(\s*(--wui-[a-z0-9-]+)\s*,/g
  let match: RegExpExecArray | null
  while ((match = re.exec(css))) {
    let depth = 1
    let i = match.index + match[0].length
    while (i < css.length && depth > 0) {
      if (css[i] === '(') depth++
      else if (css[i] === ')') depth--
      i++
    }
    const fallback = css.slice(match.index + match[0].length, i - 1).trim()
    const line = css.slice(0, match.index).split('\n').length
    sites.push({ token: match[1], fallback, file, line, index: match.index })
  }
  return sites
}

// 剥 CSS 注释：把 /* … */ 整段换成等长空白（换行保留）。平铺扫描看不见注释边界，
// 注释里出现的 var(--wui-*, …) 会被当成真站点——今天无害只是因为那两个 token 在 theme
// 里都没有定义，断言 continue 跳过；补上定义或注释里写成合法字面量，它就变成假红
// （拿注释里的推导式当真值比）或假绿（注释里的字面量恰好匹配，掩盖真实站点的漂移）。
//
// 两个反例形状各留一道合成用例；每道的红分别由一次变异证明（剥除整体不生效、去掉字符串
// 感知、注释收尾差一位）：
//   content: "/*" / '\' /*'   字符串字面量里的 /* 不是注释起点（否则后面的真声明被整段吞掉）
//   url(/* … */)              未加引号的 url() token 里虽然实际不解析注释，但剥掉会截断 token
function stripCssComments(css: string): string {
  const out = css.split('')
  let i = 0
  let quote: string | null = null
  while (i < css.length) {
    const ch = css[i]
    if (quote !== null) {
      if (ch === '\\') i += 2
      else {
        if (ch === quote) quote = null
        i++
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      i++
      continue
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      const stop = end === -1 ? css.length : end + 2
      for (let k = i; k < stop; k++) if (out[k] !== '\n') out[k] = ' '
      i = stop
      continue
    }
    i++
  }
  return out.join('')
}

/** 剥掉注释后再扫。index 与剥之前同一坐标系，断言里的 file:line 报错位置不变。 */
function extractFallbacksIgnoringComments(css: string, file: string): FallbackSite[] {
  return extractFallbacks(stripCssComments(css), file)
}

/**
 * 剥掉链上每层的**纯字面量** fallback，保留 token 序列与嵌套结构：
 * `color-mix(in srgb, var(--wui-color-accent, #08f) 40%, transparent)`
 *   → `color-mix(in srgb, var(--wui-color-accent) 40%, transparent)`
 * `var(--wui-X, var(--wui-Y, 8px))` → `var(--wui-X, var(--wui-Y))`
 *
 * 让「组件写的链」与「theme 定义的链」落在同一条归一化口径下：构成 token 序列、嵌套位置与
 * color-mix 各段权重都相同即算一致。剥掉的字面量不由这里钉：`extractFallbacks` 是平铺扫描，
 * 嵌套层的 var() 同样会被收进 `allFallbackSites`，字面量那条断言照样逐个比对它们
 * （实测 31 条被比中的链，链尾字面量 28/28 都被那条覆盖）。两条合起来才是完整契约。
 *
 * 只剥「不含 var(」的 fallback：内层一旦带 var() 就递归下去，token 名、嵌套层级与权重都留下。
 * 旧实现把整个 fallback 连内层一起吃掉，于是 `var(--wui-X, var(--wui-Y, 8px))` 与
 * `var(--wui-X, 8px)` 坍缩成同一个 `var(--wui-X)`，内层 token 名被整个丢掉——那不是宽松，
 * 是把链式契约里最关键的一维（内层引用了谁）变成了不可见。递归单趟左到右，`re.lastIndex`
 * 单调右移保证终止，轮数由嵌套深度决定：固定层数上限会让超限的深链停在半坍缩状态，
 * 两条只在深层不同的链形状反而相同，那是无声的假绿。
 * 当前 CSS 最深只嵌一层（60 处链式 fallback 的 maxDepth 全为 1），真实数据证明不了这条，
 * 靠下面 chainShape 归一化口径 那组合成用例钉住。
 */
function chainShape(value: string): string {
  const source = normalize(value)
  const re = /var\(\s*(--wui-[a-z0-9-]+)\s*,/g
  let out = ''
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    out += source.slice(cursor, match.index)
    let depth = 1
    let i = match.index + match[0].length
    while (i < source.length && depth > 0) {
      if (source[i] === '(') depth++
      else if (source[i] === ')') depth--
      i++
    }
    const fallback = source.slice(match.index + match[0].length, i - 1)
    out += fallback.includes('var(') ? `var(${match[1]}, ${chainShape(fallback)})` : `var(${match[1]})`
    cursor = i
    re.lastIndex = i
  }
  return out + source.slice(cursor)
}

/** 收集组件样式里全部链式 fallback（顶层 var() 的 fallback 内含 var() 的那些）。 */
function collectChainedSites(css: string, file: string): FallbackSite[] {
  return extractFallbacksIgnoringComments(css, file).filter(site => site.fallback.includes('var('))
}

function collectCssFiles(dir: string, exclude: (file: string) => boolean): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectCssFiles(full, exclude))
    else if (entry.name.endsWith('.css') && !exclude(full)) out.push(full)
  }
  return out
}

// 范围：组件样式（theme 是其 fallback 的唯一权威）。
// assets/*.css（glass / overlay-motion / menu-portal）自带 internal 别名与独立默认层，不纳入。
const componentCssFiles = collectCssFiles(`${packageRoot}src/components`, file => file.includes('theme/style.css'))
const allFallbackSites = componentCssFiles.flatMap(file =>
  extractFallbacksIgnoringComments(fs.readFileSync(file, 'utf8'), path.relative(`${packageRoot}src`, file))
)
const allChainedSites = componentCssFiles.flatMap(file =>
  collectChainedSites(fs.readFileSync(file, 'utf8'), path.relative(`${packageRoot}src`, file))
)

/*
 * 表面 token 的归属：哪个组件的哪条表面声明该消费哪一枚浮动表面 token。
 *
 * 上面的字面量守卫只管「fallback 字面量 == theme 定义值」，两边一起改就自洽通过：把
 * tooltip 的 surface-menu 换成 surface-overlay、fallback 字面量同步换成 overlay 的合法值，
 * parity 全程静默，而无 theme 时该面板落到 overlay 灰（暗色下是可见的错误颜色）。
 * 那是 token **归属**被改错了，同步断言按定义看不见它。
 *
 * 归属为什么必须手写成清单而不靠注释：注释可以撒谎。dialog 的 CSS 注释写「overlay 面板」
 * 而代码消费 surface-menu，任何读注释的守卫都会说「声明过了」而放过。清单对着代码比对，
 * 不一致时必然红——它不是完美的第二来源（会过时），但它不会假装自己成立。
 *
 * 与 surface-elevation.browser.spec.ts 互补而非重叠：那份在浏览器里挂载组件、读 computed
 * background 与 token 定义比，是运行时探针；本条是静态清单，零浏览器、零字面量断言。
 * 两份各有对方做不到的事——运行时探针只钉住它显式提到的组件（本条覆盖 8 个里的 6 个它没提），
 * 静态清单则不需要每个组件各写一套挂载样板（dialog/drawer/toast/tooltip 的打开路径各不相同）。
 */
const surfaceOwnership = new Map<string, string>([
  // 菜单族：下拉、浮层气泡与提示条，同一档半透明玻璃底，浮在内容之上。
  ['autocomplete', '--wui-color-surface-menu'],
  ['popover', '--wui-color-surface-menu'],
  ['select', '--wui-color-surface-menu'],
  ['tooltip', '--wui-color-surface-menu'],
  // 浮层族：dialog/drawer/toast 背后是被它遮住的主体内容，透过去会与浮层文字叠出干扰读的
  // 对比，因此单独抬到更高的 alpha 换取可读性（见 theme/style.css dark 块注释）。
  ['dialog', '--wui-color-surface-overlay'],
  ['drawer', '--wui-color-surface-overlay'],
  ['toast', '--wui-color-surface-overlay'],
  // 侧边栏：深色下比 page 浅一档的专用 token，刻意不复用 overlay（见 layout/style.css 注释）。
  ['layout', '--wui-color-surface-sidebar']
])

/**
 * 提取某组件里「作为面板底色」的浮动表面 token，限 `surface-menu` / `surface-overlay` /
 * `surface-sidebar` 三枚——浮动面板族。`surface-glass` / `-track` / `-control` 等不在本清单
 * 范围：它们是控件表面而非浮层面板，归属规则不同（见 theme token 表的 Description 列）。
 *
 * 只认 `background-color` 上的 `var()`：这三枚 token 在组件 CSS 里的全部用法都是面板底色，
 * 而 `background` 简写与 `--wui-*` 别名赋值里若出现，语义不一定是底色（别名可承载任意值），
 * 按字面位置收会把它们误判成消费者。dialog/drawer 的 `--wui-dialog-bg` / `--wui-drawer-bg`
 * 是可被 app 覆盖的出口，浮动表面 token 只作为它们的**回退默认值**出现——回退链上的最内层
 * 同样是「这条声明最终消费哪枚 token」，故取最内层那个 var()。
 */
function surfaceTokensOf(css: string): string[] {
  const tokens: string[] = []
  const re = /background-color:[^;]*?var\(\s*(--wui-color-surface-(?:menu|overlay|sidebar))\s*,/g
  let match: RegExpExecArray | null
  while ((match = re.exec(css))) tokens.push(match[1])
  return tokens
}

/** 组件目录名（与 `components/<name>/` 对应）。主题自身是定义源而非消费者，故排除。 */
const surfaceComponentDirs = fs
  .readdirSync(`${packageRoot}src/components`, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name !== 'theme')
  .map(entry => entry.name)

/** 组件目录 → 其 CSS 实际消费的浮动表面 token 集合。 */
const actualSurfaceOwnership = new Map<string, Set<string>>(
  surfaceComponentDirs.map(name => [
    name,
    new Set(
      surfaceTokensOf(
        collectCssFiles(`${packageRoot}src/components/${name}`, () => false)
          .map(file => fs.readFileSync(file, 'utf8'))
          .join('\n')
      )
    )
  ])
)

describe('token fallback 与定义单一来源', () => {
  it('所有字面量 fallback 与 theme 默认定义一致', () => {
    const mismatches: string[] = []
    for (const site of allFallbackSites) {
      // 链式引用（fallback 内含 var()）的解析随主题上下文变化，不纳入字面量比对
      if (site.fallback.includes('var(')) continue
      const expected = defaultTokens.get(site.token)
      if (expected === undefined) continue
      // theme 无定义的（--wui-avatar-size 等组件本地配置 token、--wui-internal-* 运行时别名）
      // 不属于"theme 是权威来源"的守卫范围，交给各组件自己的文档与测试
      if (normalize(site.fallback) !== expected) {
        mismatches.push(
          `${site.file}:${site.line} ${site.token} fallback=${normalize(site.fallback)} ≠ 定义=${expected}`
        )
      }
    }
    expect(mismatches, `\n${mismatches.join('\n')}`).toEqual([])
  })

  it('链式 fallback 与 theme 定义构成同一条链', () => {
    // 上一条整条跳过含 var() 的 fallback，于是组件里那条链与 theme 对该 token 的定义可以各写各的：
    // 把 autocomplete 的 focus-ring 链里 color-mix 的权重从 40% 改成 35%，theme 那边不动，
    // 两条链自己都合法、旧守卫全程静默，但无 theme 时焦点环落到的颜色与 theme 不一致。
    // 比形状不比字面量：链尾 token 名与 color-mix 权重属于契约，改了就是回归；
    // 链里引用的 token 定义值各自被上面的字面量断言钉住，不在这里重复。
    const mismatches: string[] = []
    for (const site of allChainedSites) {
      const expected = defaultTokens.get(site.token)
      // theme 无定义的（--wui-drawer-bg 等组件本地配置 token）不属于本守卫范围
      if (expected === undefined || !expected.includes('var(')) continue
      const shape = chainShape(site.fallback)
      if (shape !== chainShape(expected)) {
        mismatches.push(`${site.file}:${site.line} ${site.token} 链=${shape} ≠ 定义链=${chainShape(expected)}`)
      }
    }
    expect(mismatches, `\n${mismatches.join('\n')}`).toEqual([])
  })

  it('字面量 fallback 覆盖面保持规模（防退化到无守卫状态）', () => {
    // 守卫只对"字面量"生效；若未来 fallback 大量改为链式 var() 引用，
    // 字面量守卫的覆盖面会静默缩水。当前规模约 400 处，低于阈值即视为守卫失效。
    const literalCount = allFallbackSites.filter(site => !site.fallback.includes('var(')).length
    expect(literalCount).toBeGreaterThan(300)
  })

  it('链式 fallback 覆盖面保持规模（防退化到无守卫状态）', () => {
    // 与上面那条字面量守卫同口径：数的是「被解析成链式的 fallback 处数」，不是断言实际比中的子集。
    // 阈值的取法沿用既有那条的余量比例——当前 60 处，字面量那条是约 400 处配 >300（约 75% 余量），
    // 这里取 >40（约 67% 余量）。它要拦的退化是把链式 fallback 整体改写成字面量（那样这条链式断言
    // 会无声失效），而不是某几处 token 被删；后者由断言本身的红负责，不必在这里体现。
    const chainedCount = allFallbackSites.filter(site => site.fallback.includes('var(')).length
    expect(chainedCount).toBeGreaterThan(40)
  })

  it('浮动表面 token 的归属与清单一致（token 被换掉时红）', () => {
    // 双向比对，两个方向都要抓：
    //  - 清单有、CSS 消费的不是它 → token 被换成了另一枚（本次要拦的正是这条）
    //  - CSS 消费了浮动表面 token、清单里没有 → 新增组件忘了登记
    // 只登记集合不比顺序：同一组件可能合法消费多枚，登记的是它**允许**消费的全集。
    const unregistered: string[] = []
    const mismatches: string[] = []

    for (const [name, actual] of actualSurfaceOwnership) {
      if (actual.size === 0) continue
      const expected = surfaceOwnership.get(name)
      if (expected === undefined) {
        unregistered.push(`${name} 消费了 ${[...actual].sort().join('、')}，但归属清单里没有登记`)
        continue
      }
      for (const token of [...actual].sort()) {
        if (token !== expected) mismatches.push(`${name} 消费 ${token} ≠ 清单登记的 ${expected}`)
      }
    }

    for (const [name, expected] of surfaceOwnership) {
      const actual = actualSurfaceOwnership.get(name)
      if (!actual?.has(expected)) {
        mismatches.push(
          `${name} 清单登记了 ${expected}，但组件 CSS 里没有消费它（实际：${actual?.size ? [...actual].sort().join('、') : '无'}）`
        )
      }
    }

    expect(unregistered, `\n${unregistered.join('\n')}`).toEqual([])
    expect(mismatches, `\n${mismatches.join('\n')}`).toEqual([])
  })

  it('归属清单覆盖面保持规模（防退化到无守卫状态）', () => {
    // 与上面两条覆盖面守卫同口径：数的是「清单登记的组件数」。低于阈值说明清单被删空或
    // 组件目录被搬走，守卫静默失效而不是报错——这是清单型守卫的固有死法，须显式拦。
    expect(surfaceOwnership.size).toBeGreaterThan(5)
  })
})

describe('注释不是 fallback 站点', () => {
  it('注释里的 var() 不计入站点，真实站点照收', () => {
    // 真假各一，用同一段 CSS（形取自仓库里那两处真实注释）：剥注释后只该剩真实那条
    const css = [
      '/* 推导写成 `var(--wui-collapse-peek-edge, <推导式>)`：显式设了长度就听调用方的 */',
      '.demo {',
      '  /* 旧写法 var(--wui-dialog-max-height, 560px)，见 base b6b7eb34 */',
      '  color: var(--wui-color-accent, #08f);',
      '}'
    ].join('\n')
    const sites = extractFallbacksIgnoringComments(css, 'demo.css')
    expect(sites.map(site => site.token)).toEqual(['--wui-color-accent'])
    expect(sites[0]?.fallback).toBe('#08f')
    // 剥之前注释里那两条确实会被收进来——这条同时钉住「该缺陷曾真实存在」
    expect(extractFallbacks(css, 'demo.css').map(site => site.token)).toEqual([
      '--wui-collapse-peek-edge',
      '--wui-dialog-max-height',
      '--wui-color-accent'
    ])
  })

  it('注释里的链式 fallback 也不计入链式覆盖面', () => {
    const css =
      '/* var(--wui-color-accent, var(--wui-color-surface-menu, #fff)) */\n.a { color: var(--wui-color-text, #111); }'
    const chained = collectChainedSites(css, 'demo.css')
    expect(chained).toEqual([])
    expect(extractFallbacksIgnoringComments(css, 'demo.css').map(site => site.fallback)).toEqual(['#111'])
  })

  it('剥注释后行号仍指向真实声明', () => {
    // 报错信息里的 file:line 是定位手段；剥成等长空白时换行必须保留，行号才不漂
    const css = '/* 第一行\n第二行\n第三行 */\n.a { color: var(--wui-color-accent, #08f); }'
    expect(extractFallbacksIgnoringComments(css, 'demo.css')[0]?.line).toBe(4)
  })

  it('字符串字面量里的 /* 不是注释起点', () => {
    // 少一层字符串感知就会把后面的真实声明整段吞掉——那是把假红换成了假绿
    const css = '.a::after { content: "/*"; color: var(--wui-color-accent, #08f); }'
    expect(extractFallbacksIgnoringComments(css, 'demo.css').map(site => site.fallback)).toEqual(['#08f'])
  })

  it('单引号字符串与转义引号同样不是注释起点', () => {
    const css = `.a::after { content: '\\' /*'; color: var(--wui-color-accent, #08f); }`
    expect(extractFallbacksIgnoringComments(css, 'demo.css').map(site => site.fallback)).toEqual(['#08f'])
  })

  it('单行注释里的 var() 不计入站点', () => {
    const css = '.a {\n  /* 见 var(--wui-color-text, #111) */\n  color: var(--wui-color-accent, #08f);\n}'
    expect(extractFallbacksIgnoringComments(css, 'demo.css').map(site => site.token)).toEqual(['--wui-color-accent'])
  })

  it('未闭合的注释吞到文件末尾，不把后面的 var() 收进来', () => {
    // 真实 CSS 不会被这样写，但解析器若在这里把 /* 当普通字符，注释里的 var() 就会漏成站点
    const css = '.a {\n  /* 忘了闭合 var(--wui-color-text, #111)\n'
    expect(extractFallbacksIgnoringComments(css, 'demo.css')).toEqual([])
  })

  it('剥注释只影响 var() 站点，不动其余声明', () => {
    const css = '/* 头 */\n.a {\n  /* 中 */\n  color: var(--wui-color-accent, #08f);\n  margin: 0;\n  /* 尾 */\n}'
    const stripped = stripCssComments(css)
    expect(stripped).toContain('margin: 0;')
    expect(stripped).toContain('color: var(--wui-color-accent, #08f);')
    expect(stripped).not.toContain('/*')
    expect(stripped.length).toBe(css.length)
    expect(stripped.split('\n').length).toBe(css.split('\n').length)
  })

  it('url() token 里的注释被剥掉但声明结构完好（本守卫不为 url 内的注释保 token 文本）', () => {
    // 真实 CSS 里 token 内部不会写注释（未加引号的 url() token 遇 /* 实际终止该 token）。
    // 这里只钉住剥除不会往 url( … ) 里灌空白而让括号配平失配——那会吞掉 url 后面整条声明，
    // 即「多剥」变成「少扫」。token 文本本身被丢弃是已知取舍：url 的取值不属于本守卫断言面。
    const css = '.a { mask-image: url(/* x */a.svg); color: var(--wui-color-accent, #08f); }'
    expect(extractFallbacksIgnoringComments(css, 'demo.css').map(site => site.fallback)).toEqual(['#08f'])
    expect(stripCssComments(css)).toContain('url(       a.svg); color: var(--wui-color-accent, #08f);')
  })

  it('剥注释后组件 CSS 的站点总数少 2（剥掉的两处正是注释内的 var()）', () => {
    // 覆盖面口径：原样扫出 678 处，剥掉 collapse:176 与 dialog:72 两处注释站点后剩 676
    expect(allFallbackSites).toHaveLength(676)
  })

  it('原样扫描与剥注释扫描的差集恰好是这两处，其余站点逐字不动', () => {
    // 一条同时钉住两件事：剥注释确实生效（差集非空），且只动注释内的站点（差集就是这两处）
    const inComments = componentCssFiles.flatMap(file => {
      const rel = path.relative(`${packageRoot}src`, file)
      const raw = extractFallbacks(fs.readFileSync(file, 'utf8'), rel)
      const kept = new Set(extractFallbacksIgnoringComments(fs.readFileSync(file, 'utf8'), rel).map(s => s.index))
      return raw.filter(site => !kept.has(site.index))
    })
    expect(inComments.map(site => `${site.file}:${site.line} ${site.token}`)).toEqual([
      'components/collapse/style.css:176 --wui-collapse-peek-edge',
      'components/dialog/style.css:72 --wui-dialog-max-height'
    ])
  })
})

// 链式断言归一化口径的合成用例。当前 CSS 里最深只嵌一层（60 处链式 fallback 全部 maxDepth=1），
// 「链里再嵌一层 var()」这个形态在仓库里零出现——所以真实数据永远证明不了归一化本身对不对，
// 只能在这里用合成串把它钉住，否则它退化了也没有任何一条测试会红。
describe('chainShape 归一化口径', () => {
  it('链尾字面量不同不改变形状（字面量由字面量那条断言单独钉）', () => {
    const base = 'color-mix(in srgb, var(--wui-color-accent, #08f) 40%, transparent)'
    const otherLiteral = 'color-mix(in srgb, var(--wui-color-accent, #0af) 40%, transparent)'
    expect(chainShape(otherLiteral)).toBe(chainShape(base))
  })

  it('内层 token 名不同则形状不同', () => {
    const base = 'color-mix(in srgb, var(--wui-color-accent, #08f) 40%, transparent)'
    const otherToken = 'color-mix(in srgb, var(--wui-color-surface-menu, #08f) 40%, transparent)'
    expect(chainShape(otherToken)).not.toBe(chainShape(base))
  })

  it('color-mix 权重不同则形状不同', () => {
    const base = 'color-mix(in srgb, var(--wui-color-text) 6%, transparent)'
    const otherWeight = 'color-mix(in srgb, var(--wui-color-text) 15%, transparent)'
    expect(chainShape(otherWeight)).not.toBe(chainShape(base))
  })

  it('嵌套深度不同则形状不同', () => {
    // 旧实现把整个 fallback 连内层一起吃掉，`var(--wui-X, var(--wui-Y, 8px))` 与
    // `var(--wui-X, 8px)` 坍缩成同一个 `var(--wui-X)`——内层 token 名被整个丢掉。
    const shallow = 'var(--wui-space-2, 8px)'
    const deep = 'var(--wui-space-2, var(--wui-space-1, 4px))'
    expect(chainShape(deep)).not.toBe(chainShape(shallow))
  })

  it('嵌套链的内层 token 名不同则形状不同', () => {
    const base = 'var(--wui-space-2, var(--wui-space-1, 4px))'
    const swapped = 'var(--wui-space-2, var(--wui-space-4, 16px))'
    expect(chainShape(swapped)).not.toBe(chainShape(base))
  })

  it('无逗号的 var() 原样保留（它不是链层）', () => {
    expect(chainShape('var(--wui-space-2, var(--wui-space-1))')).toBe('var(--wui-space-2, var(--wui-space-1))')
  })

  it('同层多条链的顺序不同则形状不同', () => {
    const a = 'color-mix(in srgb, var(--wui-color-text, #111) 40%, var(--wui-color-accent, #08f))'
    const b = 'color-mix(in srgb, var(--wui-color-accent, #08f) 40%, var(--wui-color-text, #111))'
    expect(chainShape(a)).not.toBe(chainShape(b))
  })

  it('超过旧实现 50 层上限的深链仍坍缩到底（只有真正链式变体才相等）', () => {
    // 回归钉子：旧实现每轮重新 exec 整串、且上限固定 50 层。超过上限时两条只在深层不同的链
    // 会停在半坍缩状态而形状相同——无声的假绿。这里 60 层，压在旧上限之外。
    const build = (tail: string, depth: number) => {
      let chain = `var(${tail}, 1px)`
      for (let i = 0; i < depth; i++) chain = `var(--wui-color-text, ${chain})`
      return `var(--wui-color-accent, ${chain})`
    }
    expect(chainShape(build('--wui-color-surface-menu', 60))).not.toBe(chainShape(build('--wui-color-text', 60)))
    expect(chainShape(build('--wui-color-text', 60))).not.toBe(chainShape(build('--wui-color-text', 61)))
    // 同一条链的两份拷贝必须仍然相等，避免上面两条是靠「全都塌成同一个串」蒙对的
    expect(chainShape(build('--wui-color-text', 60))).toBe(chainShape(build('--wui-color-text', 60)))
  })
})

// README 全局 token 表：描述是手写散文（不守卫），但 Light/Dark 数值必须与 theme 定义一致。
function parseReadmeTokenRows(md: string): Array<{ token: string; light: string; dark?: string; line: number }> {
  const rows: Array<{ token: string; light: string; dark?: string; line: number }> = []
  const lines = md.split('\n')
  lines.forEach((line, index) => {
    if (!line.includes('--wui-')) return
    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, i, arr) => arr.length > 2)
    const content = line
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim())
    if (content.length === 3 && /^`--wui-[a-z0-9-]+`$/.test(content[0])) {
      rows.push({ token: content[0].slice(1, -1), light: content[1], line: index + 1 })
    } else if (content.length === 4 && /^`--wui-[a-z0-9-]+`$/.test(content[0])) {
      rows.push({ token: content[0].slice(1, -1), light: content[1], dark: content[2], line: index + 1 })
    }
  })
  return rows
}

const themeBlocks = {
  base: tokenPairs(blockBody(themeCss, ':host \\{')),
  light: tokenPairs(
    blockBody(themeCss, ":host\\(\\[appearance='light'\\]\\),\\n:host\\(\\[appearance='system'\\]\\) \\{")
  ),
  dark: tokenPairs(blockBody(themeCss, ":host\\(\\[appearance='dark'\\]\\) \\{"))
}

for (const readme of ['README.md', 'README.CN.md']) {
  describe(`${readme} 全局 token 表数值`, () => {
    const rows = parseReadmeTokenRows(fs.readFileSync(`${packageRoot}${readme}`, 'utf8'))

    it('数值与 theme 定义一致', () => {
      const mismatches: string[] = []
      let checked = 0
      for (const row of rows) {
        // 缩写单元格（color-mix(...)）与链式引用不参与比对
        const isLiteral = (value: string) => value.startsWith('`') && !value.includes('...') && !value.includes('var(')
        const base = themeBlocks.base.get(row.token)
        const light = themeBlocks.light.get(row.token)
        const dark = themeBlocks.dark.get(row.token)
        if (base !== undefined && isLiteral(row.light) && !row.dark) {
          checked++
          if (normalize(row.light.slice(1, -1)) !== base)
            mismatches.push(`${readme}:${row.line} ${row.token} 值=${row.light} ≠ 基础定义=${base}`)
          continue
        }
        if (light === undefined && dark === undefined) continue
        if (row.dark === undefined) continue
        const lightOk = light === undefined || !isLiteral(row.light) || normalize(row.light.slice(1, -1)) === light
        const darkOk = dark === undefined || !isLiteral(row.dark) || normalize(row.dark.slice(1, -1)) === dark
        if (!lightOk) mismatches.push(`${readme}:${row.line} ${row.token} light=${row.light} ≠ 定义=${light}`)
        if (!darkOk) mismatches.push(`${readme}:${row.line} ${row.token} dark=${row.dark} ≠ 定义=${dark}`)
        if (lightOk && darkOk) checked++
      }
      // 覆盖面守卫：低于阈值说明解析与表格脱节，守卫失效
      expect(checked, 'README 数值守卫覆盖的 token 数').toBeGreaterThan(30)
      expect(mismatches, `\n${mismatches.join('\n')}`).toEqual([])
    })
  })
}

describe('theme 成对块 parity', () => {
  it('dark 显式块与 prefers-color-scheme 媒体块逐 token 一致', () => {
    const dark = tokenPairs(blockBody(themeCss, ":host\\(\\[appearance='dark'\\]\\) \\{"))
    const mediaDark = tokenPairs(
      blockBody(themeCss, "@media \\(prefers-color-scheme: dark\\) \\{\\n  :host\\(\\[appearance='system'\\]\\) \\{")
    )
    const onlyDark = [...dark.keys()].filter(key => !mediaDark.has(key))
    const onlyMedia = [...mediaDark.keys()].filter(key => !dark.has(key))
    expect(onlyDark, '仅存在于显式 dark 块').toEqual([])
    expect(onlyMedia, '仅存在于媒体块').toEqual([])
    const diffs = [...dark.entries()]
      .filter(([key, value]) => mediaDark.get(key) !== value)
      .map(([key, value]) => `${key}: dark=${value} media=${mediaDark.get(key)}`)
    expect(diffs, `\n${diffs.join('\n')}`).toEqual([])
  })

  it('motion reduced 显式块与 prefers-reduced-motion 媒体块逐 token 一致', () => {
    const reduced = tokenPairs(blockBody(themeCss, ":host\\(\\[motion='reduced'\\]\\) \\{"))
    const mediaReduced = tokenPairs(
      blockBody(themeCss, "@media \\(prefers-reduced-motion: reduce\\) \\{\\n  :host\\(\\[motion='system'\\]\\) \\{")
    )
    const onlyReduced = [...reduced.keys()].filter(key => !mediaReduced.has(key))
    const onlyMedia = [...mediaReduced.keys()].filter(key => !reduced.has(key))
    expect(onlyReduced, '仅存在于显式 reduced 块').toEqual([])
    expect(onlyMedia, '仅存在于媒体块').toEqual([])
    const diffs = [...reduced.entries()]
      .filter(([key, value]) => mediaReduced.get(key) !== value)
      .map(([key, value]) => `${key}: reduced=${value} media=${mediaReduced.get(key)}`)
    expect(diffs, `\n${diffs.join('\n')}`).toEqual([])
  })
})
