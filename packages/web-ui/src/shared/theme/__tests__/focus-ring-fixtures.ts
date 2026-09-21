import '@/components/autocomplete'
import '@/components/input'
import '@/components/textarea'
import '@/components/theme'
import type { WebUiAutocomplete } from '@/components/autocomplete'
import type { WebUiInput } from '@/components/input'
import type { WebUiTextarea } from '@/components/textarea'

/**
 * focus ring 过渡契约的公共夹具与观察函数。
 *
 * 被两个 spec 共用：`focus-ring-transition.browser.spec.ts`（`browser` project，
 * 走显式 `motion` 属性）与 `reduced-motion.browser.spec.ts`
 * （`browser-reduced-motion` project，Playwright `reducedMotion: 'reduce'`，走系统偏好）。
 * 两者断言同一契约的两个通道，观察函数必须完全一致，故不各自复制。
 */

export type FixtureElement = WebUiInput | WebUiTextarea | WebUiAutocomplete

export type Fixture = {
  tag: string
  innerSelector: string
  create: () => FixtureElement
}

export const fixtures: Fixture[] = [
  {
    tag: 'web-ui-input',
    innerSelector: '.wui-input-inner',
    create: (): WebUiInput => document.createElement('web-ui-input') as WebUiInput
  },
  {
    tag: 'web-ui-textarea',
    innerSelector: '.wui-textarea-inner',
    create: (): WebUiTextarea => document.createElement('web-ui-textarea') as WebUiTextarea
  },
  {
    tag: 'web-ui-autocomplete',
    innerSelector: '.input-wrapper',
    create: () => {
      const el = document.createElement('web-ui-autocomplete') as WebUiAutocomplete
      el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
      return el
    }
  }
]

/** `--wui-duration-focus` 的默认值（`components/theme/style.css` 基础 `:host` 块）。 */
export const FOCUS_RING_MS = 200

/**
 * 强制一次样式重算（`getBoundingClientRect()` 先算样式再取几何）。
 *
 * **必须在聚焦之前调用**：`::after` 从未参与样式计算时，聚焦引起的样式变更
 * **没有 before-change style**，CSS 过渡不会启动。b6 实测（`web-ui-input`，同一用例形态）：
 *
 * | 聚焦前的准备 | 聚焦后 `getAnimations()` |
 * | --- | --- |
 * | 什么都不做 | `[]` |
 * | `await waitForFrame()` ×1 | `[]`（冷页面）／有（热页面） |
 * | `await waitForFrame()` ×2 | 有 |
 * | `getComputedStyle(inner, '::after').transitionProperty` | 有 |
 * | 本函数 | 有 |
 *
 * 第二行说明"只等一帧"不可靠：rAF 回调在同一帧的样式重算**之前**执行，冷页面首帧尤其如此。
 * 第四行说明 `getComputedStyle()` 本身**不**触发重算，必须读一个属性才触发 ——
 * 原用例里那次 `getComputedStyle(inner, '::after')` 一直以此为代价顺带承担着 flush 职责。
 * 这里只用本函数的副作用做同步 flush、**不作断言**。
 */
export function flushStyles(el: HTMLElement): void {
  el.getBoundingClientRect()
}

export async function mountField(
  fixture: Fixture,
  { borderless, motion }: { borderless: boolean; motion?: string }
): Promise<{ host: FixtureElement; inner: HTMLElement }> {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  if (motion !== undefined) theme.setAttribute('motion', motion)
  document.body.append(theme)

  const host = fixture.create()
  if (borderless) host.setAttribute('borderless', '')
  theme.append(host)
  await host.updateComplete

  const inner = host.shadowRoot!.querySelector<HTMLElement>(fixture.innerSelector)!
  flushStyles(inner)
  return { host, inner }
}

/** 聚焦原生输入框，并推进一帧让过渡进入运行态。 */
export async function focusAndSettle(host: FixtureElement, inner: HTMLElement): Promise<void> {
  const nativeField =
    inner.shadowRoot?.querySelector<HTMLElement>('input, textarea') ??
    host.shadowRoot?.querySelector<HTMLElement>('input, textarea')
  nativeField?.dispatchEvent(new FocusEvent('focus'))
  await host.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * 聚焦后 `::after` 上启动的 focus ring 过渡（`box-shadow`）。
 * 用 Web Animations API 观察"过渡真的被启动"，而不是读 `transition` 声明或 computed style
 * （契约化重构判据；也是仓内既有范式）。
 */
export function findFocusRingTransition(inner: HTMLElement): CSSTransition | undefined {
  return inner
    .getAnimations({ subtree: true })
    .map(animation => animation as CSSTransition)
    .find(animation => {
      const effect = animation.effect as KeyframeEffect | null
      return (
        effect?.pseudoElement === '::after' && effect.target === inner && animation.transitionProperty === 'box-shadow'
      )
    })
}
