import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/autocomplete'
import '@/components/input'
import '@/components/input-number'
import '@/components/textarea'
import '@/components/theme'
import type { WebUiTheme } from '@/components/theme'
import type { TestableElement } from '@/shared/test-utils'
import { waitForUpdate } from '@/shared/test-utils'

/**
 * 文本控件占位文本的排版契约（浏览器）。
 *
 * 断言的是**关系**，不是字号值：占位文本的字号必须等于控件自身的字号，且两者一起随
 * `--wui-font-size` 变化。实测三引擎（Chromium / WebKit / Firefox 的 UA 样式表）都没给
 * `::placeholder` 设字体，这条链接目前由继承自动成立——本文件把它钉成契约：控件那侧把
 * font-size 从 token 上摘掉、或占位那侧改成写死的字号，这里都会红（两种形态各由一次变异验过）。
 *
 * 与 `theme-token-parity.spec.ts` 的分工：那条只管「fallback 字面量与 theme 定义是否一致」，
 * 把 fallback 写成一个合法字面量它全程静默；接住「占位文本到底跟不跟 token」的是本文件。
 * 与 `typography-spacing-scale.spec.ts` 的分工：那条静态判组件 CSS 有没有裸字面量，
 * 判不了「声明了继承但被 `::placeholder` 里的写死值压回去」这种形态。
 *
 * 控件按公开的 `placeholder` 属性定位，`autocomplete` 走它公开组合的 `web-ui-input`；
 * 不依赖任何内部 class。
 */
afterEach(() => document.body.replaceChildren())

/** 覆盖值刻意取两个都不同于默认 14px 的长度，用例之间才互相证明「跟着 token 变」而不是「恰好等于默认值」。 */
const TOKEN_A = '19px'
const TOKEN_B = '23px'

interface ControlCase {
  tag: string
  /** 承载占位文本的原生控件路径（每段一层 shadow root）。 */
  path: readonly string[]
}

const CONTROLS: readonly ControlCase[] = [
  { tag: 'web-ui-input', path: ['input'] },
  { tag: 'web-ui-textarea', path: ['textarea'] },
  { tag: 'web-ui-input-number', path: ['input'] },
  { tag: 'web-ui-autocomplete', path: ['web-ui-input', 'input'] }
]

async function createTheme(appearance: 'light' | 'dark' = 'light'): Promise<WebUiTheme> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = appearance
  document.body.append(theme)
  await waitForUpdate(theme)
  return theme
}

/** 逐层下钻 shadow root，返回承载占位文本的原生控件。 */
function nativeIn(host: HTMLElement, path: readonly string[]): Element {
  let scope: TestableElement | ShadowRoot = host as TestableElement
  for (const [index, selector] of path.entries()) {
    const root: ShadowRoot | null = scope instanceof ShadowRoot ? scope : scope.shadowRoot
    const found: Element | null = root?.querySelector(selector) ?? null
    if (!found) throw new Error(`${host.tagName} 第 ${index + 1} 层 shadow root 缺少 ${selector}`)
    scope = found as TestableElement
  }
  return scope
}

async function mountIn(theme: WebUiTheme, tag: string): Promise<TestableElement> {
  const control = document.createElement(tag) as TestableElement
  control.setAttribute('placeholder', '占位文本')
  theme.append(control)
  await waitForUpdate(control)
  return control
}

const fontSizeOf = (el: Element) => getComputedStyle(el).fontSize
const placeholderFontSizeOf = (el: Element) => getComputedStyle(el, '::placeholder').fontSize
const placeholderColorOf = (el: Element) => getComputedStyle(el, '::placeholder').color

/** 把语义 token 解析成计算色值：探针挂在 theme 作用域内，与控件走同一条继承链。 */
function resolveToken(theme: WebUiTheme, token: string): string {
  const probe = document.createElement('div')
  probe.style.color = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

describe('文本控件占位文本排版契约（浏览器）', () => {
  for (const { tag, path } of CONTROLS) {
    it(`${tag}：占位文本的字号跟随控件自身的字号`, async () => {
      const theme = await createTheme()
      const control = await mountIn(theme, tag)
      const native = nativeIn(control, path)

      const controlSize = fontSizeOf(native)
      expect(controlSize, '控件自身字号读数异常').toMatch(/^\d+(\.\d+)?px$/)
      expect(placeholderFontSizeOf(native)).toBe(controlSize)
    })

    it(`${tag}：改 --wui-font-size 时控件与占位文本一起变`, async () => {
      const theme = await createTheme()
      const control = await mountIn(theme, tag)
      const native = nativeIn(control, path)

      const sizes: string[] = []
      for (const token of [TOKEN_A, TOKEN_B]) {
        theme.style.setProperty('--wui-font-size', token)
        await waitForUpdate(control)

        // 两个读数各自独立取值：控件那一份证明 token 到达了控件，占位那一份才是被测契约。
        expect(fontSizeOf(native), `--wui-font-size=${token} 未到达控件自身字号`).toBe(token)
        expect(placeholderFontSizeOf(native), `--wui-font-size=${token} 未到达占位文本`).toBe(token)
        sizes.push(placeholderFontSizeOf(native))
      }
      // 防自身退化：两次读数相同（占位文本落在写死字号上）时上一条会同时成立，本用例必须失败。
      expect(sizes[0]).not.toBe(sizes[1])

      theme.style.removeProperty('--wui-font-size')
    })

    it(`${tag}：占位文本的颜色沿用 secondary text token`, async () => {
      for (const appearance of ['light', 'dark'] as const) {
        const theme = await createTheme(appearance)
        const control = await mountIn(theme, tag)
        const native = nativeIn(control, path)

        expect(placeholderColorOf(native), `${appearance} 下占位文本未消费 --wui-color-text-secondary`).toBe(
          resolveToken(theme, '--wui-color-text-secondary')
        )
        document.body.replaceChildren()
      }
    })
  }
})
