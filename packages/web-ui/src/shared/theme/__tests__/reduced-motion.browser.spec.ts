import { afterEach, describe, expect, it } from 'vite-plus/test'

import { findFocusRingTransition, fixtures, focusAndSettle, mountField } from './focus-ring-fixtures'

/**
 * focus ring 过渡契约 —— **系统偏好**通道。
 *
 * 本文件跑在 `browser-reduced-motion` project（Playwright `reducedMotion: 'reduce'`；
 * vite 按文件名路由，凡以 `reduced-motion.browser.spec.ts` 结尾的 spec 都进这个 project）。
 * 断言对象与 `focus-ring-transition.browser.spec.ts` 完全相同，只是把"为什么归零"换成系统偏好：
 * theme `motion=system` 应跟随 `prefers-reduced-motion`，`motion=full` 则应覆盖它。
 *
 * **每个用例自带控制组**（`DELETION-RUBRIC.md` §10 S3）：只断言"没有过渡"是空转可过的 ——
 * 组件压根不启动过渡时也会绿。同一条用例里用**同一个观察函数**再验一次显式 `motion=full`
 * 确实启动了过渡，该空集才有区分力。
 */
afterEach(() => document.body.replaceChildren())

describe('系统 prefers-reduced-motion 下的 focus ring transition（浏览器）', () => {
  for (const fixture of fixtures) {
    for (const borderless of [false, true]) {
      const variant = borderless ? 'borderless' : 'normal'

      it(`${fixture.tag} ${variant}：system 跟随系统偏好归零，显式 full 仍启动`, async () => {
        // 被测组：motion=system → 跟随系统 reduce → 不启动
        const system = await mountField(fixture, { borderless, motion: 'system' })
        await focusAndSettle(system.host, system.inner)
        expect(findFocusRingTransition(system.inner)).toBeUndefined()
        system.host.remove()

        // 对照组：显式 motion=full → theme 的媒体块只匹配 :host([motion='system'])，故仍启动
        const full = await mountField(fixture, { borderless, motion: 'full' })
        await focusAndSettle(full.host, full.inner)
        expect(findFocusRingTransition(full.inner), '对照组未启动过渡，本用例无区分力').toBeDefined()
        full.host.remove()
      })
    }
  }
})
