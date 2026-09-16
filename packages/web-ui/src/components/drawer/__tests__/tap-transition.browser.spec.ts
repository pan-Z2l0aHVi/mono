import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

/**
 * 在若干帧内采样 dialog 上出现过的过渡属性（§10 S2：动效一律用 WAAPI 观察，
 * 不读 `getComputedStyle().transform` 的矩阵分量）。
 */
async function sampleTransitions(el: WebUiDrawer, frames = 20): Promise<string[]> {
  const dialog = getDialog(el)
  const seen = new Set<string>()
  for (let i = 0; i < frames; i += 1) {
    for (const animation of dialog.getAnimations({ subtree: true })) {
      const property = (animation as CSSTransition).transitionProperty
      seen.add(property ?? (animation as CSSAnimation).animationName ?? 'animation')
    }
    await nextFrame()
  }
  return [...seen]
}

function waitFor(condition: () => boolean, message: string, timeoutMs = 5000): Promise<void> {
  const start = performance.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (condition()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error(message))
      setTimeout(tick, 25)
    }
    tick()
  })
}

// 打开过渡收敛：先等它真的启动（presence 在 rAF 后才翻转，f0 可能还没有动画），再等它结束。
async function waitForOpenSettled(el: WebUiDrawer) {
  const dialog = getDialog(el)
  await waitFor(() => dialog.open, 'drawer did not open')
  await waitFor(() => dialog.getAnimations({ subtree: true }).length > 0, 'drawer open transition did not start')
  await waitFor(() => dialog.getAnimations({ subtree: true }).length === 0, 'drawer open transition did not settle')
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

afterEach(() => document.body.replaceChildren())

/*
 * 连续 tap 拖拽区后，后续开关仍必须走 transform 过渡（回归锁）。
 *
 * 原实现把「根因」当断言：读 `dialog.style.transform` 是否为空串、`is-dragging` 是否残留。
 * 两者都是内部实现态（§12 C3：内部 class 名单不得断言；内联样式清理同理）。
 * 真正的契约是**行为**：连点收尾后，关闭与重新打开仍各自触发过渡。
 *
 * 区分力已实测（b6c）：把 dialog 的 transform 过渡整体关掉后本例会红
 * （`expected [ 'opacity' ] to include 'transform'`）——即它确实在盯 transform 过渡本身，
 * 不是空转。**但**原 bug 的触发条件（tap 收尾残留内联 `translateX(0px)`）无法从测试侧
 * 重新注入：组件会在关闭时清掉内联 transform。所以本例覆盖的是「后续开关必须有 transform
 * 过渡」这一行为，而非「内联样式被清除」这一机制。
 */
describe('WebUiDrawer 连续 tap 后过渡动画（浏览器）', () => {
  it('快速 6 次 tap 拖拽区后，后续开关仍触发 transform 过渡（回归锁）', { timeout: 30_000 }, async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el)

    const dialog = getDialog(el)
    const dragZone = getDragZone(el)

    // 快速 6 次 tap：pointerdown + ~60ms 后 pointerup（用户真机复现路径）。
    for (let i = 0; i < 6; i += 1) {
      dragZone.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: i + 1, isPrimary: true, clientX: 10, clientY: 300 })
      )
      await new Promise(resolve => setTimeout(resolve, 60))
      dragZone.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: i + 1, isPrimary: true, clientX: 10, clientY: 300 })
      )
      await el.updateComplete
    }

    // 关闭：必须真的跑一条 transform 过渡（不是直接落位）。
    el.open = false
    await el.updateComplete
    const closing = await sampleTransitions(el)
    expect(closing).toContain('transform')
    await waitFor(() => !dialog.open, 'drawer did not close', 10_000)

    // 重新打开：同样必须有 transform 过渡。
    el.open = true
    await el.updateComplete
    const reopening = await sampleTransitions(el)
    expect(reopening).toContain('transform')
    await waitFor(() => dialog.open, 'drawer did not reopen', 15_000)
  })
})
