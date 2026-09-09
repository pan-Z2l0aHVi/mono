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

  it('字面量 fallback 覆盖面保持规模（防退化到无守卫状态）', () => {
    // 守卫只对"字面量"生效；若未来 fallback 大量改为链式 var() 引用，
    // 字面量守卫的覆盖面会静默缩水。当前规模约 400 处，低于阈值即视为守卫失效。
    const literalCount = allFallbackSites.filter(site => !site.fallback.includes('var(')).length
    expect(literalCount).toBeGreaterThan(300)
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
