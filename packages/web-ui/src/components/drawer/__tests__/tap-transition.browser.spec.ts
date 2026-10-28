import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiDrawer } from '..'

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

/** 在触发状态变更前订阅，避免错过渲染很慢时已经结束的过渡。 */
function observeTransformTransition(dialog: HTMLDialogElement) {
  let started = false
  let ended = false
  dialog.addEventListener('transitionrun', event => {
    if (event.target === dialog && event.propertyName === 'transform') started = true
  })
  dialog.addEventListener('transitionend', event => {
    if (event.target === dialog && event.propertyName === 'transform') ended = true
  })
  return { started: () => started, ended: () => ended }
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

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

afterEach(() => document.body.replaceChildren())

/*
 * 连续 tap 拖拽区后，后续 toggle 仍必须走 transform 过渡（回归锁）。
 *
 * 原实现把「根因」当断言：读 `dialog.style.transform` 是否为空串、`is-dragging` 是否残留。
 * 两者都是内部实现态（§12 C3：内部 class 名单不得断言；内联样式清理同理）。
 * 真正的契约是**行为**：连点收尾后，关闭与重新打开仍各自触发过渡。
 *
 * 区分力已实测（b6c）：把 dialog 的 transform 过渡整体关掉后本例会红
 * （`expected [ 'opacity' ] to include 'transform'`）——即它确实在盯 transform 过渡本身，
 * 不是空转。**但**原 bug 的触发条件（tap 收尾残留内联 `translateX(0px)`）无法从测试侧
 * 重新注入：组件会在关闭时清掉内联 transform。所以本例覆盖的是「后续 toggle 必须有 transform
 * 过渡」这一行为，而非「内联样式被清除」这一机制。
 */
describe('WebUiDrawer 连续 tap 后过渡动画（浏览器）', () => {
  it('快速 6 次 tap 拖拽区后，后续 toggle 仍触发 transform 过渡（回归锁）', { timeout: 30_000 }, async () => {
    const el = createDrawer()
    el.draggable = true
    await el.updateComplete
    const dialog = getDialog(el)
    const opening = observeTransformTransition(dialog)
    el.open = true
    await el.updateComplete
    await waitFor(opening.ended, 'drawer open transform transition did not finish')

    const dragZone = getDragZone(el)

    // 六次无位移的 pointerdown / pointerup 触发 tap 收尾。
    for (let i = 0; i < 6; i += 1) {
      dragZone.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: i + 1, isPrimary: true, clientX: 10, clientY: 300 })
      )
      dragZone.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: i + 1, isPrimary: true, clientX: 10, clientY: 300 })
      )
      await el.updateComplete
    }

    // 关闭：必须真的跑一条 transform 过渡（不是直接落位）。
    const closing = observeTransformTransition(dialog)
    el.open = false
    await el.updateComplete
    await waitFor(closing.started, 'drawer close transform transition did not start')
    expect(closing.started()).toBe(true)
    await waitFor(() => !dialog.open, 'drawer did not close', 10_000)

    const reopening = observeTransformTransition(dialog)
    el.open = true
    await el.updateComplete
    await waitFor(reopening.started, 'drawer reopen transform transition did not start')
    expect(reopening.started()).toBe(true)
    await waitFor(() => dialog.open, 'drawer did not reopen', 15_000)
  })
})
