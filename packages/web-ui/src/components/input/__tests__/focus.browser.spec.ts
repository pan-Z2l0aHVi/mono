import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '@/components/button'
import '@/components/input'
import '@/components/theme'
import type { WebUiInput } from '@/components/input'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

/**
 * 焦点契约：宿主是否取得焦点、以及宿主 `focused` 属性是否随焦点反射。
 * 这些是可观察的公开面（`toggleAttribute('focused', …)`）。
 *
 * focus ring 的视觉呈现（outline / box-shadow / halo 展开值 / ::before 描边盒 /
 * padding 度量）属 CSS 实现细节，按 ADR-0005 §5 不在契约 spec 断言，
 * 由 docs/agents/browser-verification.md 的真实浏览器验证与真机验收覆盖。
 */
function mountTheme(): HTMLElement {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  document.body.append(theme)
  return theme
}

const nativeOf = (el: HTMLElement, tag: string): HTMLElement | null => queryA11y(el, tag) as HTMLElement | null

describe('Web UI focus 契约（浏览器）', () => {
  it('键盘 Tab 使焦点落在可聚焦的 button 宿主上', async () => {
    const theme = mountTheme()
    const button = document.createElement('web-ui-button') as Updatable
    button.textContent = 'Save'
    theme.append(button)
    await waitForUpdate(button)

    await userEvent.keyboard('{Tab}')

    expect(document.activeElement).toBe(button)
    cleanupElement(button)
  })

  it('输入框取得焦点时宿主反射 focused，失焦后移除', async () => {
    const theme = mountTheme()
    const input = document.createElement('web-ui-input') as WebUiInput
    theme.append(input)
    await waitForUpdate(input)
    expect(input.hasAttribute('focused')).toBe(false)

    nativeOf(input, 'input')?.focus()
    await waitForUpdate(input)
    expect(input.hasAttribute('focused')).toBe(true)

    nativeOf(input, 'input')?.blur()
    await waitForUpdate(input)
    expect(input.hasAttribute('focused')).toBe(false)
    cleanupElement(input)
  })

  it('键盘 Tab 聚焦输入框并反射 focused', async () => {
    const theme = mountTheme()
    const input = document.createElement('web-ui-input') as WebUiInput
    theme.append(input)
    await waitForUpdate(input)

    await userEvent.keyboard('{Tab}')
    await waitForUpdate(input)

    expect(input.hasAttribute('focused')).toBe(true)
    cleanupElement(input)
  })

  it('borderless 变体在程序化聚焦（非 :focus-visible 路径）下同样反射 focused', async () => {
    const theme = mountTheme()
    const input = document.createElement('web-ui-input') as WebUiInput
    input.setAttribute('borderless', '')
    theme.append(input)
    await waitForUpdate(input)

    nativeOf(input, 'input')?.focus()
    await waitForUpdate(input)

    expect(input.hasAttribute('focused')).toBe(true)
    cleanupElement(input)
  })

  it('borderless 变体在键盘聚焦下同样反射 focused', async () => {
    const theme = mountTheme()
    const input = document.createElement('web-ui-input') as WebUiInput
    input.setAttribute('borderless', '')
    theme.append(input)
    await waitForUpdate(input)

    await userEvent.keyboard('{Tab}')
    await waitForUpdate(input)

    expect(input.hasAttribute('focused')).toBe(true)
    cleanupElement(input)
  })

  // 公共 focus()/blur()：宿主自身无 tab 位（不可聚焦），必须重定向到内部原生控件
  it('公共 focus()/blur() 落到内部原生 input 并反射 focused', async () => {
    const theme = mountTheme()
    const input = document.createElement('web-ui-input') as WebUiInput
    theme.append(input)
    await waitForUpdate(input)

    input.focus()
    await waitForUpdate(input)

    expect(document.activeElement).toBe(input)
    expect(input.shadowRoot?.activeElement).toBe(nativeOf(input, 'input'))
    expect(input.hasAttribute('focused')).toBe(true)

    input.blur()
    await waitForUpdate(input)

    expect(input.shadowRoot?.activeElement).toBeNull()
    expect(input.hasAttribute('focused')).toBe(false)
    cleanupElement(input)
  })
})
