import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vite-plus/test'

import { WEB_UI_SCROLLBARS_THEME, webUiScrollbarsOptions } from '..'

// 从磁盘读源码，拿不到就走 `./style.css?inline`：vitest 默认把 CSS 模块处理成空模块，
// `?inline` / `?raw` 都返回空串（组件用 `?inline` 拿到空样式也照常通过，所以没人会发现）。
// 路径以包根为基准，与 vitest 的 root 一致。
const style = readFileSync('src/scrollbars/style.css', 'utf8')

// 组件内部滚动容器的主题。跟上面那份不同：它被各组件 `?inline` 进自己的 shadow，
// 不经过文档层，所以只能断言它的源码形状，运行期几何在 browser 档里量。
const internalStyle = readFileSync('src/scrollbars/internal.css', 'utf8')
// 断言只看声明：注释里为了讲清楚会提到这些属性名，不能被当成声明命中。
const internalDecls = internalStyle.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * 取主题规则块里的一个自定义属性值。主题类与库初值都写在 .os-scrollbar 上、特异性相同，
 * 靠源顺序取胜，所以这里只认主题块自己声明了什么。行首锚定让深色分支里那几个同名选择器
 * 不会顶替浅色主块——它们不以类名开头。
 */
function themeVar(name: string): string {
  const block = new RegExp(`^\\.${WEB_UI_SCROLLBARS_THEME}\\s*\\{([^}]*)\\}`, 'm').exec(style)?.[1] ?? ''
  return new RegExp(`--${name}\\s*:\\s*([^;]+)`).exec(block)?.[1]?.trim() ?? ''
}

/**
 * 取一条顶层规则块里的自定义属性值。外观分支的选择器不以主题类开头（是 `web-ui-theme[...]`
 * 这类宿主选择器），所以上面那套「行首锚定类名」的取法对它们不适用。深色档的选择器还跨两行
 * （多带一条 `html:has()`），所以这里匹配到第一个 `{` 为止的选择器列表，再取其花括号内容。
 */
function branchVar(selector: string, name: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = new RegExp(`^${escaped}[^{]*\\{([^}]*)\\}`, 'm').exec(style)?.[1] ?? ''
  return new RegExp(`--${name}\\s*:\\s*([^;]+)`).exec(block)?.[1]?.trim() ?? ''
}

/** 从 `rgb(0 0 0 / 0.39)` / `#00000063` 这类值里取不透明度；解析不出来返回 NaN。 */
function alphaOf(value: string): number {
  const slash = new RegExp('/\\s*([\\d.]+)\\s*\\)').exec(value)
  if (slash) return Number.parseFloat(slash[1])
  const hex = new RegExp('^#([0-9a-f]{8})$', 'i').exec(value.trim())
  if (hex) return Number.parseInt(hex[1].slice(6, 8), 16) / 255
  return Number.NaN
}

/** 取 `var(--x, <fallback>)` 里的 fallback 字面量；不是 var() 形态就原样返回。 */
function fallbackLiteral(value: string): string {
  const trimmed = value.trim()
  return new RegExp('^var\\([^,]+,\\s*(.+)\\)$').exec(trimmed)?.[1]?.trim() ?? trimmed
}

/** 取 `rgb(0 0 0 / 0.39)` 去掉不透明度后的三个基础通道；解析不出来返回 null。 */
function channelsOf(value: string): [number, number, number] | null {
  const match = new RegExp('^rgb\\(\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*/').exec(value.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * thumb 落在某个表面底色上时渲染出的三通道 8-bit 值。浅色 app 的页面底色是 #fff，深色是
 * #242628（theme 的 --wui-color-page，见 src/components/theme/style.css）。
 */
function greyOn(value: string, surface: [number, number, number]): [number, number, number] {
  const base = channelsOf(value)
  if (!base) return [Number.NaN, Number.NaN, Number.NaN]
  const a = alphaOf(value)
  // 合成方向是「底色在底层、thumb 叠在上面」：result = surface * (1 - a) + base * a。
  // 黑 thumb + 白底 + a = 0.39 → 255 * 0.61 = 155.55；写反两项会得到 99，看起来像个合法灰阶。
  return base.map((channel, index) => Math.round(surface[index] * (1 - a) + channel * a)) as [number, number, number]
}

/** 黑 thumb 落在纯白表面上时渲染出的 8-bit 灰阶。浅色 app 的页面底色就是 #fff。 */
function greyOnWhite(value: string): number {
  return greyOn(value, [255, 255, 255])[0]
}

const WHITE_SURFACE: [number, number, number] = [255, 255, 255]
const DARK_SURFACE: [number, number, number] = [0x24, 0x26, 0x28]

const LIGHT_BRANCH = "web-ui-theme[resolved-appearance='light']"
const DARK_BRANCH = "web-ui-theme[resolved-appearance='dark']"

describe('scrollbars 公共面', () => {
  it('主题类名在 style.css 里有对应规则块', () => {
    // 类名由 options.scrollbars.theme 挂到 scrollbar 元素上，CSS 里改了名字就会静默退回库初值：
    // scrollbar 还在，只是变成无色无宽度的默认皮肤。这条把两边钉在一起。
    expect(themeVar('os-handle-border-radius')).not.toBe('')
  })

  it('主题自带的度量覆盖库初值里的零值', () => {
    // 库在 .os-scrollbar 上给的初值是 --os-size: 0 与 --os-handle-bg: none；漏掉任一项不会报错，
    // 只会让 scrollbar 整条不可见。
    expect(Number.parseFloat(themeVar('os-size'))).toBeGreaterThan(0)
    // 三个态都要写全：库对 hover / active 的初值同样是 none，只钉 bg 一项的话另两个态会静默退回无色。
    for (const name of ['os-handle-bg', 'os-handle-bg-hover', 'os-handle-bg-active']) {
      expect(themeVar(name), `${name} 没有覆盖库初值`).not.toBe('')
      expect(themeVar(name), `${name} 覆盖后仍是 none`).not.toBe('none')
    }
    // 覆盖式 scrollbar 没有 track 底色，这条是 macOS 观感的判据，回退到库初值就会画出 track。
    expect(themeVar('os-track-bg')).toBe('none')
  })

  it('默认行为对齐产品要求', () => {
    const { scrollbars } = webUiScrollbarsOptions
    expect(scrollbars?.theme).toBe(WEB_UI_SCROLLBARS_THEME)
    expect(scrollbars?.autoHide).toBe('scroll')
    // 这个延迟同时是「track 点击跳转」的可用窗口：scrollbar 隐去后它就不可命中。指针从滚动位置
    // 移到 track 再点下去要 1s 上下，所以窗口必须明显长于它——库默认的 1300ms 就贴边了，当前取 2000ms。
    // 上界同样要钉：几十秒等于把自动隐藏关掉，「自动隐藏」那条要求在另一头被破坏。
    expect(scrollbars?.autoHideDelay).toBeGreaterThanOrEqual(2000)
    expect(scrollbars?.autoHideDelay).toBeLessThanOrEqual(4000)
  })

  it('track 点击以点击处为目标，且即时落位', () => {
    const clickScroll = webUiScrollbarsOptions.scrollbars?.clickScroll
    // 库只在 `isFunction` 分支里读这个 option，直接给对象会被静默忽略；`true` 则是「按一个视口
    // 步进」，与点击位置无关。距离为 0 才是「目标即点击处」——三种写法都长得像能用，这条钉住。
    expect(typeof clickScroll).toBe('function')
    const resolved = typeof clickScroll === 'function' ? clickScroll(false) : null
    // 时长 0 让库跳过默认的 200ms 缓动：`animateNumber` 用 `Math.max(0, ms)` 得到时长 0，
    // 首帧就落到终点。少写这一项不会报错，只会退回「平滑滚过去」，所以这里和距离一起钉住。
    expect(resolved).toMatchObject({ clickScrollDistance: 0, clickScrollDuration: 0 })
  })
})

describe('scrollbar thumb 的深浅', () => {
  it('浅色档是黑 thumb，深色档是白 thumb', () => {
    // 下面那条亮度断言的模型是「黑 thumb 落在白底上」，可没有任何东西钉住色相。变异实证过：
    // 把浅色分支和回退两处都写成 rgb(255 255 255 / 0.39)，白底上渲染出的 thumb 是纯白——整条
    // scrollbar 在白页面上消失——而下面每一条断言仍然全绿。极性是「thumb 能被看见」的前提，单独钉。
    expect(channelsOf(branchVar(LIGHT_BRANCH, 'wui-scrollbar-handle'))).toEqual([0, 0, 0])
    expect(channelsOf(branchVar(DARK_BRANCH, 'wui-scrollbar-handle'))).toEqual([255, 255, 255])
  })

  it('主题块的三个值都走 var() 间接', () => {
    // shadow 里匹配不到 web-ui-theme[...] 这类后代选择器，也匹配不到 html:has()，自定义属性
    // 跨 shadow 边界继承是唯一能穿过去的东西。写成字面量等于把 shadow 内的滚动容器钉死在外层
    // 可见值上——组件内部 scrollbar 会整体失去响应外观切换的能力（变异实证：去掉 var() 后全绿）。
    for (const name of ['os-handle-bg', 'os-handle-bg-hover', 'os-handle-bg-active']) {
      expect(themeVar(name), `${name} 没有走 var() 间接`).toMatch(/^var\(--wui-scrollbar-handle/)
    }
  })

  it('浅色档静止 thumb 不深于 macOS 原生覆盖式 scrollbar', () => {
    // issue #216：浅色模式下 thumb 颜色太深、没有 hover 时尤其明显。原生覆盖式 scrollbar 在白底（255）
    // 上渲染成 rgb(155,155,155)（AppKit 探针钉死 aqua + flashScrollers() 逼到全亮后逐列采样），
    // 反推成白底上的黑色不透明度是 (255 - 155) / 255 ≈ 0.392。取值 0.39 是**刻意偏亮 1 阶**：
    // 255 × (1 - 0.39) = 155.55 → 156，比原生亮 1；上一版 0.5 渲染成 128，比原生深 27。
    // 阈值取 155（原生值本身）而不是 156：这条只负责「不得深于原生」这个方向，偏亮那一阶由
    // 上面的色相断言和这条本身的上界一起看，不在这里二次收窄。
    expect(greyOnWhite(branchVar(LIGHT_BRANCH, 'wui-scrollbar-handle'))).toBeGreaterThanOrEqual(155)
  })

  it('主题块里的回退值与浅色分支一致', () => {
    // 回退值不是死代码。挂在 <body> 下的 .os-scrollbar——interweave 与两个 demo 的整页 scrollbar
    // 正是它——在主题元素之外，浅色档里 web-ui-theme[...] 匹配不到它、html:has() 又只管深色，
    // 于是它解析到的就是 .os-theme-macos 里 var() 的回退字面量。两边一旦漂移，改浅色分支只会
    // 改到主题子树里的滚动容器，三个 app 的整页 scrollbar 一动不动。
    // 按**字节**钉，不是按语义钉：`#00000063` 与 `rgb(0 0 0 / 0.39)` 在这里会被判为不一致，
    // 那是刻意的——两条路线最终都要过 lightningcss，字节相同就让「编译后仍是同一个值」这件
    // 事在每次改动时都重验一遍，而不是只靠作者记得。
    const pairs: Array<[string, string]> = [
      ['os-handle-bg', 'wui-scrollbar-handle'],
      ['os-handle-bg-hover', 'wui-scrollbar-handle-hover'],
      ['os-handle-bg-active', 'wui-scrollbar-handle-active']
    ]
    for (const [osName, wuiName] of pairs) {
      expect(fallbackLiteral(themeVar(osName))).toBe(branchVar(LIGHT_BRANCH, wuiName))
    }
  })

  it('三个交互态在真实底色上的深浅差都可分辨', () => {
    // 「按下去比悬停深、悬停比静止深」最终是给人眼看的，所以判据要落在渲染出的灰阶差上，
    // 不是 α 差：α 有界 0–1，0.39 / 0.40 / 0.41 这种写法在 α 上每档都「更深」，落到白底上
    // 却是 156 / 153 / 150——三档挤在 6 个 8-bit 阶里，hover 与 active 等于没有反馈。
    // 阈值 8 是下限不是目标：当前浅色档三档相距 31 / 31，深色档相距 26 / 26。浅色档是黑 thumb
    // 落在 #fff 上，深色档是白 thumb 落在 #242628（theme 的 --wui-color-page）上。
    const surfaces: Array<[string, [number, number, number]]> = [
      [LIGHT_BRANCH, WHITE_SURFACE],
      [DARK_BRANCH, DARK_SURFACE]
    ]
    for (const [selector, surface] of surfaces) {
      const values = ['handle', 'handle-hover', 'handle-active'].map(
        suffix => greyOn(branchVar(selector, `wui-scrollbar-${suffix}`), surface)[0]
      )
      for (const value of values) expect(Number.isNaN(value)).toBe(false)
      const [rest, hover, active] = values
      // 深浅的方向取决于 thumb 颜色：黑 thumb α 越大越深（灰阶越小），白 thumb 越大越浅。用一个极性
      // 把两个外观折成同一条判据，顺带把顺序也钉住——顺序反了会得到负值，同样过不了下限。
      const polarity = selector === LIGHT_BRANCH ? 1 : -1
      const gapRestToHover = polarity * (rest - hover)
      const gapHoverToActive = polarity * (hover - active)
      expect(gapRestToHover, `${selector} 静止→悬停既没变深也不可分辨`).toBeGreaterThanOrEqual(8)
      expect(gapHoverToActive, `${selector} 悬停→按下既没变深也不可分辨`).toBeGreaterThanOrEqual(8)
    }
  })

  it('深色档没有被这次改动带着走', () => {
    // issue #216 只报浅色档，所以深色档的三个值一个都没动。要说准方向：深色档的 0.5 比原生
    // 深而不是偏亮——原生在暗底（30）上量到 154，按 α 折算是 (154 - 30) / (255 - 30) ≈ 0.55；
    // 0.5 落在 app 真实的深色页面底色 `#242628` 上渲染成 ≈ rgb(146,147,148)。把它也调亮是
    // 另一件 issue 没提的诉求，本次不做。
    // 三档一起钉，多出来的覆盖是「同序漂移」：档距断言只拦跨序（hover 掉到静止以下之类），
    // 0.62 → 0.60、0.74 → 0.70 这种保持顺序的改动档距看不见，只有这三条能抓。
    expect(alphaOf(branchVar(DARK_BRANCH, 'wui-scrollbar-handle'))).toBe(0.5)
    expect(alphaOf(branchVar(DARK_BRANCH, 'wui-scrollbar-handle-hover'))).toBe(0.62)
    expect(alphaOf(branchVar(DARK_BRANCH, 'wui-scrollbar-handle-active'))).toBe(0.74)
  })
})

describe('组件内部 scrollbar 主题', () => {
  /** 取一份自定义属性的值。 */
  function varValue(source: string, name: string): string {
    return new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(source)?.[1]?.trim() ?? ''
  }

  it('走 var() 读主题 token，而不是写死颜色', () => {
    // `--wui-scrollbar-*` 由 web-ui-theme 的外观分支写、.os-theme-macos 的回退值兜底；
    // 组件 shadow 里只有继承的自定义属性穿得过去，写成字面量会让组件内部 scrollbar
    // 不再跟随外观切换（与上面主题块同一条机制）。
    expect(varValue(internalDecls, 'scrollbar-color')).toMatch(/^var\(--wui-scrollbar-handle/)
  })

  it('不声明 ::-webkit-scrollbar：它会让引擎改用占宽度的经典 scrollbar', () => {
    // 实测（macOS Chromium）：给容器一条 `::-webkit-scrollbar { width: 7px }` 后，
    // 同尺寸容器的 `offsetWidth - clientWidth` 从 0 变成 7——而 issue #225 的第 (1) 条
    // 要求 scrollbar 不占布局宽度。这条钉住「不要为了圆角/尺寸 reintroduce webkit 伪元素」。
    // 没有另写运行期几何用例：那条判据只在覆盖式 scrollbar 的平台上成立，同一份 CSS 在
    // 经典 scrollbar 平台上也会量出 > 0，平台差异会盖过 CSS 差异。
    expect(internalDecls).not.toContain('::-webkit-scrollbar')
  })

  it('用 scrollbar-width: thin 收窄经典 scrollbar', () => {
    // 覆盖式平台不看它（仍零宽）；经典平台的 scrollbar 据此收窄，尽量靠近 macOS 的细 thumb。
    expect(varValue(internalDecls, 'scrollbar-width')).toBe('thin')
  })
})
