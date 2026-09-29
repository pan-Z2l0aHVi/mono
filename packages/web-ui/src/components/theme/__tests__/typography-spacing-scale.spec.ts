import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

// 排版族与间距族的防漂移守卫。
//
// 这两族是「一次定义、处处引用」的尺度。它们的敌人不是写错一个值，而是后来者
// 在组件里直接写裸字面量——尺度一旦只在 theme 里存在、组件各写各的，它就退化
// 成一份没人用的文档。因此本文件从两个方向锁住：
//
//   1) 组件 CSS 不得出现裸排版字面量（font-size / font-weight / 排版 line-height）。
//   2) theme 定义的每一枚族内 token 都必须至少有一个消费点，且取值符合该族的算术。
//
// 第 2 条与 theme-token-parity.spec.ts 的方向相反：parity 锁「fallback 与定义
// 一致」，本文件锁「定义本身有意义」。两者合起来才既无漂移又无死 token。

// Vite 会把 new URL(relative, import.meta.url) 重写为 dev-server 资产 URL，
// jsdom 下 fileURLToPath 会因非 file scheme 抛错。先取出 file:// 形式的模块 URL。
const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))
const srcRoot = `${packageRoot}src`
const themeCss = fs.readFileSync(`${srcRoot}/components/theme/style.css`, 'utf8')

/** theme 的 :host 基础块——两族的定义都在这里，不进 light/dark（与外观无关）。 */
function baseBlock(css: string): string {
  const start = css.indexOf(':host')
  const open = css.indexOf('{', start)
  let depth = 1
  let i = open + 1
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return css.slice(open + 1, i - 1)
}

function definedTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens.set(`--${match[1]}`, match[2].replace(/\s+/g, ' ').trim())
  }
  return tokens
}

const base = definedTokens(baseBlock(themeCss))

function collectCssFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectCssFiles(full))
    else if (entry.name.endsWith('.css')) out.push(full)
  }
  return out
}

// 范围与 theme-token-parity 一致：theme 是族的定义处，自身不参与「组件是否裸写」
// 的判定；assets/*.css 是组件样式的一部分，同样纳入。
const componentCssFiles = collectCssFiles(`${srcRoot}/components`)
  .filter(file => !file.endsWith(`${path.sep}theme${path.sep}style.css`))
  .concat(collectCssFiles(`${srcRoot}/assets`))

interface Declaration {
  property: 'font-size' | 'font-weight' | 'line-height'
  value: string
  // 判定一律走小写副本：`value` 保留作者原样以便报错定位，而 CSS 的属性名、函数名
  // 与关键字都不区分大小写，所以 `VAR(--wui-font-size, 14px)` 与 `LINE-HEIGHT: INHERIT`
  // 语义上分别等同于小写形态。归一化属性名而不归一化取值，会让同一种语义出现两种结局。
  valueKey: string
  file: string
  line: number
}

/** 去掉注释，避免注释里的示例代码被当成真实声明。 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
}

function parseDeclarations(css: string, file: string): Declaration[] {
  const source = stripComments(css)
  const out: Declaration[] = []
  // 声明在格式化后一律独占一行，行首缩进后即为属性名。
  // 行首锚定同时天然排除自定义属性定义（`--wui-font-size:` 以 `--` 开头）。
  // `i` 标志让大写 `FONT-SIZE:` 也能被捕获；捕获后属性名统一小写，否则大写声明
  // 会被存成 `"FONT-SIZE"` 而永远匹配不上 `find('font-size')`，等于绕过守卫。取值
  // 同样要归一化，否则 `LINE-HEIGHT: INHERIT` 会被判成裸值而 `line-height: inherit`
  // 不会——同一种语义两种结局，取决于作者的键盘大小写。
  const re = /^[ \t]*(font-size|font-weight|line-height)[ \t]*:[ \t]*([^;]+);/gim
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    const value = match[2].replace(/\s+/g, ' ').trim()
    out.push({
      property: match[1].toLowerCase() as Declaration['property'],
      value,
      valueKey: value.toLowerCase(),
      file: path.relative(srcRoot, file),
      line: source.slice(0, match.index).split('\n').length
    })
  }
  return out
}

const allDeclarations = componentCssFiles.flatMap(file => parseDeclarations(fs.readFileSync(file, 'utf8'), file))

function find(property: Declaration['property']): Declaration[] {
  return allDeclarations.filter(d => d.property === property)
}

const at = (d: Declaration) => `${d.file}:${d.line} ${d.property}: ${d.value}`

// line-height 的合法裸值白名单，每个都有非排版语义：
//   1        控件内单行标签的垂直居中手段（box 尺寸已知，行高无需参与计算）
//   0        让 inline-flex 包裹盒高收缩到内容的技巧
//   inherit  editable-text 继承宿主的排版上下文，不引入自己的值
const LINE_HEIGHT_LITERALS = new Set(['1', '0', 'inherit'])

// font-size 的合法裸值白名单：
//   0  badge / checkbox 把盒高与字号一起归零以消除 inline 基线缝隙
//
// 判定口径是「有没有裸 px 字面量」，不是「有没有用本族」。三类声明合法地
// 不引用排版族，但都必须含 var()，因此统一被这条规则覆盖：
//   max(16px, …)                        iOS 粗指针 focus zoom 的平台下限钳制
//   calc(var(--wui-avatar-size, …) * .4) 按组件尺寸派生，不是排版选择
//   var(--wui-empty-title-font-size, …) empty 尺寸档驱动，另一根轴，见 ADR-0006 §6.4
//   var(--wui-tooltip-font-size, …)     tooltip 自有公开 token，自身即角色定义
const FONT_SIZE_LITERALS = new Set(['0'])

// `font` 简写能在一行里同时带进 font-size / font-weight / line-height 三个字面量
// （`font: 500 14px/1.5 system-ui`），而下面三条规则只认长写属性名。`vp fmt` 只重排
// 空白、不展开简写，stylelint 也不拦这种写法——所以必须单独封一条，否则三条守卫会被
// 最自然的绕过形态同时废掉。合法的只有 `inherit`：表单控件与 button 借它对齐宿主排版，
// 不引入自己的值。
const FONT_SHORTHAND_ALLOWED = new Set(['inherit'])

describe('排版族防漂移', () => {
  it('组件 CSS 不出现裸 font-size', () => {
    const bare = find('font-size').filter(d => !d.valueKey.includes('var(') && !FONT_SIZE_LITERALS.has(d.valueKey))
    expect(bare, `\n${bare.map(at).join('\n')}`).toEqual([])
  })

  it('排版族被真实消费（防止族存在但组件各写各的）', () => {
    const direct = find('font-size').filter(d => d.valueKey.includes('var(--wui-font-size'))
    // 非空即可；阈值作用是让「族被整体弃用」不能靠删光调用点静默通过。
    expect(direct.length, '直接引用排版族的 font-size 声明数').toBeGreaterThanOrEqual(25)
  })

  it('组件 CSS 不出现裸 font-weight', () => {
    const bare = find('font-weight').filter(d => !d.valueKey.includes('var(--wui-font-weight'))
    expect(bare, `\n${bare.map(at).join('\n')}`).toEqual([])
  })

  it('组件 CSS 不使用 font 简写（唯一合法值为 inherit）', () => {
    const offenders: string[] = []
    for (const file of componentCssFiles) {
      const css = stripComments(fs.readFileSync(file, 'utf8'))
      // 行首锚定 + 紧跟冒号，因此不会误伤 font-size / font-family（`font` 之后是 `-`）。
      // 因此「不误伤」靠的是 `font` 之后必须紧跟 `[ \t]*:`，不是靠属性名字面量。
      //
      // 本规则是**全面禁止**简写，不只是禁带字面量的：`font: var(--a) var(--b)/1.4 …`
      // 同样让下面三条长写守卫看不见它，照样红。行首锚定的依据与长写规则相同——`vp fmt`
      // 会把内联规则展开成每条声明独占一行，`check-code` 与 pre-commit 的 `format-clean`
      // 都强制该形态。`i` 标志则让大写 `FONT:` 无需依赖格式化器归一化就落网。
      for (const match of css.matchAll(/^[ \t]*font[ \t]*:[ \t]*([^;]+);/gim)) {
        const value = match[1].replace(/\s+/g, ' ').trim()
        // 取值比对同样忽略大小写：`FONT: INHERIT` 语义上就是 `font: inherit`，
        // 不该因为大小写被报成违规（`vp fmt` 本就会归一化，这里只是不依赖它）。
        if (!FONT_SHORTHAND_ALLOWED.has(value.toLowerCase())) {
          const line = css.slice(0, match.index).split('\n').length
          offenders.push(`${path.relative(srcRoot, file)}:${line} font: ${value}`)
        }
      }
    }
    expect(offenders, `\n${offenders.join('\n')}`).toEqual([])
  })

  it('line-height 只允许三种非排版裸值，其余必须走族内 token', () => {
    const bare = find('line-height').filter(
      d => !d.valueKey.includes('var(--wui-line-height') && !LINE_HEIGHT_LITERALS.has(d.valueKey)
    )
    expect(bare, `\n${bare.map(at).join('\n')}`).toEqual([])
  })

  it('族内 token 全部被消费（防止新增即死 token）', () => {
    const consumers = componentCssFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n')
    const familyTokens = [...base.keys()].filter(
      name =>
        name.startsWith('--wui-font-size') ||
        name.startsWith('--wui-font-weight') ||
        name.startsWith('--wui-line-height') ||
        name.startsWith('--wui-space-')
    )
    // 防自身退化：族被清空时本用例必须失败而不是空过。
    // 阈值只防「族被整体清空」，留一档余量：任何一次合法的族瘦身都不该红。
    expect(familyTokens.length).toBeGreaterThanOrEqual(14)
    // 必须匹配到 token 名的**边界**：`var(--wui-font-size-caption, …)` 里含有
    // `var(--wui-font-size` 这个子串，前缀匹配会把 base token 误判成已消费。
    const unused = familyTokens.filter(
      name => !consumers.includes(`var(${name},`) && !consumers.includes(`var(${name})`)
    )
    expect(unused, `\n未消费：${unused.join(', ')}`).toEqual([])
  })

  it('排版族取值符合各族语义', () => {
    expect(base.get('--wui-font-size-caption')).toBe('12px')
    expect(base.get('--wui-font-size-readout')).toBe('13px')
    expect(base.get('--wui-font-size')).toBe('14px')
    expect(base.get('--wui-font-size-title')).toBe('18px')
    expect(base.get('--wui-font-weight-medium')).toBe('500')
    expect(base.get('--wui-font-weight-semibold')).toBe('600')
    expect(base.get('--wui-line-height-tight')).toBe('1.2')
    expect(base.get('--wui-line-height-snug')).toBe('1.4')
    expect(base.get('--wui-line-height-normal')).toBe('1.5')
    expect(base.get('--wui-line-height-relaxed')).toBe('1.6')
  })
})

describe('间距族防漂移', () => {
  it('间距阶是 4px 基准的连续整数级', () => {
    const steps = [...base.keys()]
      .filter(name => name.startsWith('--wui-space-'))
      .map(name => ({ name, value: base.get(name) }))
      .sort((a, b) => Number(a.name.slice('--wui-space-'.length)) - Number(b.name.slice('--wui-space-'.length)))

    // 步号必须从 1 起连续，否则「space-3 是多少」无法从名字推出来。
    expect(steps.map(s => s.name)).toEqual(steps.map((_, index) => `--wui-space-${index + 1}`))
    for (const [index, step] of steps.entries()) {
      expect(step.value, `${step.name} 应为 ${(index + 1) * 4}px`).toBe(`${(index + 1) * 4}px`)
    }
  })

  it('间距阶当前的最大级是生效静态节奏值的 24px', () => {
    // 组件层以生效的静态字面量写入的 padding/gap/margin 最大节奏值是 24px。预留
    // 32/40 会引入两枚死 token，而 theme-tokens.spec.ts 要求每枚 token 都进双语文档
    // ——死 token 要付出双份文档成本却换不到任何组件受益。需要更宽的留白时嵌入方直接
    // 写 px 即可。
    //
    // 口径限定为「生效的静态」是有原因的：`<web-ui-empty>` 的 padding 默认
    // `32px 24px`，字面上比本阶上限还宽，但它由 `--wui-empty-size` 在 JS 侧按尺寸档
    // 派生（40/56/72 → 23px 17px / 32px 24px / 41px 31px），生效值来自尺寸那根轴而非
    // 节奏，不构成反例。六个派生值里四个是奇数、4px 阶根本表示不了；56 档落在基准上
    // 是尺寸选值的巧合（56 是唯一被 7 整除的，商恰为 8，而 8 是 4 的倍数，取整在这一
    // 档并未发生），一根在三个尺寸中两个静默失效的杠杆不值得引入。
    //
    // 这里只断言**当前**的最大值，不写 `has('--wui-space-7') === false` 之类的
    // 「这个名字不许存在」：死 token 已由上面的消费度用例完整覆盖，而这类断言会
    // 挡住一次完全合规的扩展（按 4px 阶加上 space-7 并真的消费它），且报错信息会
    // 把人引向错误的排查方向。将来真的加到 space-7 时，这一行会自然变红——那才是
    // 一条正确的红：它提醒同时更新 ADR 与双语文档。
    expect(base.get('--wui-space-6')).toBe('24px')
  })

  it('组件 CSS 的间距字面量只作为族内 fallback 出现', () => {
    // 组件无 theme 时仍须正常渲染，因此每个挂阶的声明都保留字面量 fallback。
    // 这里锁住 fallback 与族值一致（与 theme-token-parity 的方向互补：那份锁
    // 「token 与定义一致」，这份锁「spacing 步的字面量没被手改」）。
    //
    // 已知局限：`([^)]+)` 取不到函数型 fallback（`calc(4px + 1px)` 会被截断成
    // `calc(4px + 1px`），因为本族的 fallback 一律是字面量。若将来允许函数型
    // fallback，这里要换成括号配平提取，否则会误报不一致。
    const mismatches: string[] = []
    for (const file of componentCssFiles) {
      const css = fs.readFileSync(file, 'utf8')
      for (const match of css.matchAll(/var\(\s*(--wui-space-(\d))\s*,\s*([^)]+)\)/g)) {
        const expected = base.get(match[1])
        if (expected === undefined) continue
        if (match[3].replace(/\s+/g, ' ').trim() !== expected) {
          const line = css.slice(0, match.index).split('\n').length
          mismatches.push(
            `${path.relative(srcRoot, file)}:${line} ${match[1]} fallback=${match[3].trim()} ≠ ${expected}`
          )
        }
      }
    }
    expect(mismatches, `\n${mismatches.join('\n')}`).toEqual([])
  })
})
