import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/button'
import '@/components/theme'
import type { WebUiTheme } from '@/components/theme'

/**
 * 焦点环跟随 accent token 的关系守卫。
 *
 * 断言的是**关系**：换一个自定义 `--wui-color-accent`，聚焦态 outline 颜色必须随之改变。
 * 因此这里不含任何颜色字面量，也不逐个 preset 验算——主题改调色板、换 accent 默认值都应成立。
 *
 * 读的是**组件自己的计算样式**，不在测试里抄一份 fallback 表达式。早先版本把
 * `var(--wui-color-focus-ring, color-mix(...))` 写在测试里，结果把 `button/style.css` 的
 * fallback 改成硬编码色时那条依然是绿的——它断言的是自己的副本，不是组件真正生效的值。
 */
afterEach(() => document.body.replaceChildren())

async function mountWithAccent(accent?: string): Promise<WebUiTheme> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'
  if (accent) theme.style.setProperty('--wui-color-accent', accent)
  document.body.append(theme)
  // token 定义在 shadow 的 :host 规则里，样式表在 Lit 首次更新时才附着。
  await theme.updateComplete
  return theme
}

/** 读真实组件聚焦态的 outline 计算色。 */
async function focusedOutlineColor(theme: WebUiTheme): Promise<string> {
  const button = document.createElement('web-ui-button')
  theme.append(button)
  await button.updateComplete

  const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement
  inner.focus()
  expect(inner.matches(':focus-visible'), '测试依赖聚焦态才绘制 outline').toBe(true)
  return getComputedStyle(inner).outlineColor
}

describe('焦点环跟随 accent token（浏览器）', () => {
  it('自定义 accent 改变时，聚焦按钮的 outline 颜色随之改变', async () => {
    const first = await focusedOutlineColor(await mountWithAccent('#bf5af2'))
    const second = await focusedOutlineColor(await mountWithAccent('#ff453a'))

    expect(first, '首个 accent 应解析出一个具体颜色').not.toBe('')
    expect(second).not.toBe(first)
  })

  it('无 theme 时 outline 仍取 accent 派生的兜底值，而非固定色', async () => {
    const host = document.createElement('div')
    host.style.setProperty('--wui-color-accent', '#bf5af2')
    document.body.append(host)
    const themed = await mountWithAccent('#bf5af2')

    const button = document.createElement('web-ui-button')
    host.append(button)
    await button.updateComplete
    const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement
    inner.focus()
    expect(inner.matches(':focus-visible')).toBe(true)

    const withoutTheme = getComputedStyle(inner).outlineColor
    const withTheme = await focusedOutlineColor(themed)

    // 有无 theme 作用域都从同一个 accent 派生：同一 accent 落在同一档明度下时两者应一致，
    // 差异只可能来自主题把环整体调暗，而不是来自「组件写死了一个色」。
    expect(withTheme).toBe(withoutTheme)

    host.remove()
  })
})
