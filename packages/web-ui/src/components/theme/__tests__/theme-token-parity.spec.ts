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
    sites.push({ token: match[1], fallback, file, line })
  }
  return sites
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
  return extractFallbacks(css, file).filter(site => site.fallback.includes('var('))
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
  extractFallbacks(fs.readFileSync(file, 'utf8'), path.relative(`${packageRoot}src`, file))
)
const allChainedSites = componentCssFiles.flatMap(file =>
  collectChainedSites(fs.readFileSync(file, 'utf8'), path.relative(`${packageRoot}src`, file))
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
