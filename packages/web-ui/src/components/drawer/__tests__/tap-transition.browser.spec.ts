import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

async function waitForOpenTransition(el: WebUiDrawer) {
  await waitFor(() => getDialog(el).classList.contains('is-visible'), 'drawer did not become visible')
  // 等打开过渡真正收敛到 0（280ms transition）。若在过渡中途 tap，_springRebound 会
  // 从中间位移走动画分支、is-dragging 留到弹簧结束，测试时序就失真了。
  await waitFor(() => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(getDialog(el)).transform)
    return Math.abs(matrix.m41) < 0.5 && Math.abs(matrix.m42) < 0.5
  }, 'drawer open transform did not settle')
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
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

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer 连续 tap 后过渡动画（浏览器）', () => {
  it('快速 6 次 tap 拖拽区后，后续开关仍触发 transform 过渡（回归锁）', { timeout: 30_000 }, async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

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

    // tap 收尾不应在 dialog 上留下内联 transform（0px 的 translateX 也会盖住闭合态 CSS，
    // 让后续开关失去过渡）——这是「后续开关丢失过渡动画」的根因锁。
    expect(dialog.style.transform).toBe('')
    expect(dialog.classList.contains('is-dragging')).toBe(false)

    // 关闭 → 重新打开，断言 close/open 的 transform 过渡都真实触发。
    let transformStarts = 0
    dialog.addEventListener('transitionstart', e => {
      if ((e as TransitionEvent).propertyName === 'transform') transformStarts += 1
    })

    el.open = false
    await el.updateComplete
    await waitFor(() => transformStarts >= 1 && !dialog.open, 'close transform transition did not run', 10_000)

    el.open = true
    await el.updateComplete
    // 并行浏览器用例下 rAF 可能被节流，is-visible 的出现被推迟；这里是产品行为断言
    // （重开必须触发 transform 过渡），等待给足余量。
    await waitFor(
      () => transformStarts >= 2,
      `reopen transform transition did not run (dialog.open=${dialog.open}, is-visible=${dialog.classList.contains(
        'is-visible'
      )}, is-closing=${dialog.classList.contains('is-closing')}, inline=${dialog.style.transform})`,
      15_000
    )

    expect(dialog.classList.contains('is-visible')).toBe(true)
  })
})
