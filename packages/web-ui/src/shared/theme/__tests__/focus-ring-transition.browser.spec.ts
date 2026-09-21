import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  FOCUS_RING_MS,
  findFocusRingTransition,
  fixtures,
  focusAndSettle,
  flushStyles,
  mountField
} from './focus-ring-fixtures'

/**
 * focus ring 过渡契约 —— 显式 `motion` 属性通道。
 *
 * 全部断言走 Web Animations API：原来读
 * `getComputedStyle(inner, '::after').transitionProperty / transitionDuration` 的断言
 * 是 §5 明令禁止的 CSS 取值，且只证明"声明存在"、证明不了"过渡真的启动"。
 * 系统偏好通道（`prefers-reduced-motion: reduce`）在 `reduced-motion.browser.spec.ts`，
 * 两者共用 `focus-ring-fixtures.ts` 的同一观察函数。
 */
afterEach(() => document.body.replaceChildren())

describe('focus ring transition 统一契约（浏览器）', () => {
  for (const fixture of fixtures) {
    for (const borderless of [false, true]) {
      const variant = borderless ? 'borderless' : 'normal'

      it(`${fixture.tag} ${variant}：focus ring 走 --wui-duration-focus 的 box-shadow 过渡`, async () => {
        const { host, inner } = await mountField(fixture, { borderless })
        await focusAndSettle(host, inner)

        const transition = findFocusRingTransition(inner)
        expect(transition, `${fixture.tag} ${variant} 聚焦后未启动 box-shadow 过渡`).toBeDefined()
        expect(transition!.transitionProperty).toBe('box-shadow')
        expect(transition!.effect!.getComputedTiming().duration).toBe(FOCUS_RING_MS)
      })

      it(`${fixture.tag} ${variant}：theme motion=reduced 时不启动 focus ring 过渡`, async () => {
        const { host, inner } = await mountField(fixture, { borderless, motion: 'reduced' })
        await focusAndSettle(host, inner)

        // 同文件上一条用例已证明该观察函数对同一 fixture 能采到过渡，故此处的空集非空转。
        expect(findFocusRingTransition(inner)).toBeUndefined()
      })
    }
  }

  it('无 theme 时 fallback 与 theme light 一致：focus ring 仍走 200ms', async () => {
    for (const fixture of fixtures) {
      const host = fixture.create()
      document.body.append(host)
      await host.updateComplete
      const inner = host.shadowRoot!.querySelector<HTMLElement>(fixture.innerSelector)!
      flushStyles(inner)
      await focusAndSettle(host, inner)

      const transition = findFocusRingTransition(inner)
      expect(transition, `${fixture.tag} 无 theme 时未启动 box-shadow 过渡`).toBeDefined()
      expect(transition!.effect!.getComputedTiming().duration).toBe(FOCUS_RING_MS)
      host.remove()
    }
  })
})
