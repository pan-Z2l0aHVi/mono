import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/button'
import '@/components/theme'

/**
 * 与 apps/interweave 的 ACCENT_PRESETS 同一组值（apps 侧只读核对，未改动）。
 * 复制而非 import：那是 T2 的 apps 代码，不在本轮 Role 边界内。
 */
const ACCENT_PRESETS = ['#0a84ff', '#1d8348', '#c64600', '#ff453a', '#bf5af2', '#ff375f'] as const

afterEach(() => document.body.replaceChildren())

async function mountTheme(appearance: 'light' | 'dark', accent?: string): Promise<HTMLElement> {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', appearance)
  if (accent) theme.style.setProperty('--wui-color-accent', accent)
  document.body.append(theme)
  // 必须等首次更新：token 定义在 shadow 的 :host 规则里，样式表在 Lit 首次更新时才附着。
  // 不等就会在 token 还不存在时去读，读到继承来的黑色。
  await theme.updateComplete
  return theme
}

function rgbChannels(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/**
 * 把任意 CSS 颜色解析成 [r, g, b(0-255), a] 元组。
 *
 * 不能直接比字符串：同一个颜色在 Chromium 里可能回读成 `rgba(191, 90, 242, 0.4)`，
 * 也可能回读成 `color(srgb 0.749 0.353 0.949 / 0.4)`——`color-mix()` 解析出来的就是后者。
 * 两种写法描述同一个颜色，字符串比较会假失败，所以按数值比。
 */
function parseColor(value: string): [number, number, number, number] {
  const probe = document.createElement('div')
  probe.style.color = value
  document.body.append(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()

  const rgb = /^rgba?\(([^)]+)\)$/.exec(resolved)
  if (rgb) {
    const parts = rgb[1]
      .split(/[,/]/)
      .map(part => part.trim())
      .filter(Boolean)
    return [Number(parts[0]), Number(parts[1]), Number(parts[2]), parts[3] === undefined ? 1 : Number(parts[3])]
  }
  const srgb = /^color\(srgb ([^)]+)\)$/.exec(resolved)
  if (srgb) {
    const parts = srgb[1].split('/').map(part => part.trim())
    const channels = parts[0].split(/\s+/).map(Number)
    return [channels[0] * 255, channels[1] * 255, channels[2] * 255, parts[1] === undefined ? 1 : Number(parts[1])]
  }
  throw new Error(`Unrecognized computed color: ${resolved}`)
}

const CHANNEL_TOLERANCE = 0.5

/**
 * 相等返回 null，否则返回可读的差异描述。
 *
 * 刻意不叫 `expectSameColor`：仓库的 `vitest/expect-expect` 只认测试体里出现的
 * `expect`，把断言藏进辅助函数会让这条规则把用例判成「无断言」。断言留在用例里，
 * 失败信息也直接由这个描述给出。
 */
function colorDiff(actual: string, expected: string): string | null {
  const a = parseColor(actual)
  const e = parseColor(expected)
  for (const [index, channel] of ['r', 'g', 'b', 'a'].entries()) {
    const scale = channel === 'a' ? 1 : CHANNEL_TOLERANCE
    if (Math.abs(a[index] - e[index]) > scale) {
      return `${channel}: 实际 ${a[index]} ≠ 期望 ${e[index]}（${actual} vs ${expected}）`
    }
  }
  return null
}

/** 解析 token 为真实颜色：自定义属性的计算值是 token 串，必须落到 color 上才算解析。 */
function resolveFocusRing(host: HTMLElement): string {
  const probe = document.createElement('div')
  probe.style.color = 'var(--wui-color-focus-ring)'
  host.append(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved
}

describe('--wui-color-focus-ring 派生自 accent（浏览器）', () => {
  it.each(ACCENT_PRESETS)('浅色下 accent %s 的 ring 按 40% 跟随', async accent => {
    const theme = await mountTheme('light', accent)
    const [r, g, b] = rgbChannels(accent)
    expect(colorDiff(resolveFocusRing(theme), `rgba(${r}, ${g}, ${b}, 0.4)`)).toBeNull()
  })

  it.each(ACCENT_PRESETS)('深色下 accent %s 的 ring 按 62% 跟随', async accent => {
    const theme = await mountTheme('dark', accent)
    const [r, g, b] = rgbChannels(accent)
    expect(colorDiff(resolveFocusRing(theme), `rgba(${r}, ${g}, ${b}, 0.62)`)).toBeNull()
  })

  it('默认 accent 下与修复前的字面量等价（浅色 40%）', async () => {
    const theme = await mountTheme('light')
    expect(colorDiff(resolveFocusRing(theme), 'rgb(0 136 255 / 0.4)')).toBeNull()
  })

  it('默认 accent 下与修复前的字面量等价（深色 62%）', async () => {
    const theme = await mountTheme('dark')
    expect(colorDiff(resolveFocusRing(theme), 'rgb(10 132 255 / 0.62)')).toBeNull()
  })

  it('无 theme 时观感不变：真实组件的 ring 仍是 rgb(0 136 255 / 0.4)', async () => {
    /*
     * 刻意用真实组件、且**不在测试里抄一份 fallback 表达式**。
     * 早先版本把 `var(--wui-color-focus-ring, color-mix(...#08f...))` 写在测试里，
     * 结果把组件 CSS 的 fallback 改成 #0a84ff 时这条依然是绿的——它断言的是自己的副本，
     * 不是组件真正生效的值。这里读组件自己的计算样式，改 fallback 就会红。
     */
    const button = document.createElement('web-ui-button')
    document.body.append(button)
    await button.updateComplete

    const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement
    inner.focus()
    expect(inner.matches(':focus-visible')).toBe(true)
    expect(colorDiff(getComputedStyle(inner).outlineColor, 'rgb(0 136 255 / 0.4)')).toBeNull()
  })

  it('端到端：聚焦按钮的 outline 颜色跟随 accent', async () => {
    const theme = await mountTheme('light', '#bf5af2')
    const button = document.createElement('web-ui-button')
    theme.append(button)
    await button.updateComplete

    const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement
    inner.focus()
    expect(inner.matches(':focus-visible')).toBe(true)

    const [r, g, b] = rgbChannels('#bf5af2')
    expect(colorDiff(getComputedStyle(inner).outlineColor, `rgba(${r}, ${g}, ${b}, 0.4)`)).toBeNull()
  })
})
