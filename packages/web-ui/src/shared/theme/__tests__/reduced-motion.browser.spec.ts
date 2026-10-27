import { afterEach, describe, expect, it } from 'vite-plus/test'

import { findFocusRingTransition, fixtures, focusAndSettle, mountField } from './focus-ring-fixtures'

/**
 * focus ring 过渡契约 —— **系统偏好**通道。
 *
 * 本文件跑在 `browser-reduced-motion` project（Playwright `reducedMotion: 'reduce'`；
 * vite 按文件名路由，凡以 `reduced-motion.browser.spec.ts` 结尾的 spec 都进这个 project）。
 * 断言的对象是「过渡有没有启动」以及「时长取自哪枚 token」，不是时长本身的数值与
 * `box-shadow` 属性：钉死 200ms 那种用例已移除，那是动效设计值。本文件因此是
 * `focus-ring-fixtures` 的唯一使用者 —— 系统偏好换成 `prefers-reduced-motion`：theme
 * `motion=system` 应跟随它归零，`motion=full` 则应覆盖它。
 *
 * **每个用例自带控制组**（契约化重构判据）：只断言"没有过渡"是空转可过的 ——
 * 组件压根不启动过渡时也会绿。同一条用例里用**同一个观察函数**再验一次显式 `motion=full`
 * 确实启动了过渡，该空集才有区分力。控制组还把时长读回来：覆盖一枚与默认档不同的
 * `--wui-duration-focus`，采到的必须是那个数，否则"归零"可能只是组件里抄了个常量。
 */
afterEach(() => document.body.replaceChildren())

/** 与 theme 默认档（200ms）不同、也不属于任何档口的覆盖值：只有时长真取 token 才采得到它。 */
const FOCUS_OVERRIDE_MS = 360

describe('系统 prefers-reduced-motion 下的 focus ring transition（浏览器）', () => {
  for (const fixture of fixtures) {
    for (const borderless of [false, true]) {
      const variant = borderless ? 'borderless' : 'normal'

      it(`${fixture.tag} ${variant}：system 跟随系统偏好归零，显式 full 仍启动且时长取 token`, async () => {
        const system = await mountField(fixture, { borderless, motion: 'system' })
        await focusAndSettle(system.host, system.inner)
        expect(findFocusRingTransition(system.inner)).toBeUndefined()
        system.host.remove()

        // 对照组：显式 motion=full → theme 的媒体块只匹配 :host([motion='system'])，故仍启动
        const full = await mountField(fixture, { borderless, motion: 'full' })
        full.inner.style.setProperty('--wui-duration-focus', `${FOCUS_OVERRIDE_MS}ms`)
        await focusAndSettle(full.host, full.inner)
        const transition = findFocusRingTransition(full.inner)
        expect(transition, '对照组未启动过渡，本用例无区分力').toBeDefined()
        expect(
          transition!.effect!.getComputedTiming().duration,
          `时长没有跟着 --wui-duration-focus 走（覆盖成 ${FOCUS_OVERRIDE_MS}ms 未生效）`
        ).toBe(FOCUS_OVERRIDE_MS)
        full.host.remove()
      })
    }
  }
})
