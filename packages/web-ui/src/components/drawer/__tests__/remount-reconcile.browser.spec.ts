import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

afterEach(() => document.body.replaceChildren())

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.heading = 'remount'
  document.body.append(el)
  return el
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = performance.now()
  while (!condition()) {
    if (performance.now() - start > timeoutMs) throw new Error(`waitFor timeout after ${timeoutMs}ms`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

/*
 * 重挂载对账（浏览器）。
 *
 * 平台行为（Chromium 实测）：drawer 的原生 `<dialog>` 随宿主移出文档时脱离
 * top layer 但 `open` 属性残留；重连后 `updated()` 因 `open` 未变化不补跑 sync，
 * `sync(true)` 又被残留的 `open` 属性挡住，dialog 永远回不到 top layer，滚动锁
 * 也已随 disconnect 释放。修复后由 `connectedCallback` 的 reconcile 收敛。
 *
 * 观察面用公开语义：宿主 `open`、inner dialog `open`/`:modal`、滚动锁的文档级
 * 副作用。nested 层序的重新注册无公开观察面（与 `nested.browser.spec.ts` 的既有
 * 口径一致：层序本身不可断言），由 Escape 只关最顶层的 UA 路由间接覆盖模态链。
 */
describe('WebUiDrawer 重挂载对账（浏览器）', () => {
  it('打开态被移出文档再接回：回到 top layer 且滚动锁恢复', async () => {
    const el = createDrawer()
    el.open = true
    await el.updateComplete
    await waitFor(() => getDialog(el).matches(':modal'))
    expect(document.documentElement.style.overflow).toBe('hidden')

    el.remove()
    expect(document.documentElement.style.overflow).toBe('')

    document.body.append(el)
    await el.updateComplete
    // 修复前：open 属性残留但已脱离 top layer（`:modal` 恒 false）
    await waitFor(() => getDialog(el).matches(':modal'))

    expect(el.isConnected).toBe(true)
    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 重挂载后关闭管线完整：cancel（Escape 路径）仍可关闭
    const dialog = getDialog(el)
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await el.updateComplete
    expect(el.open).toBe(false)
  })

  it('no-scroll-lock 的打开态重挂载不引入滚动锁', async () => {
    const el = createDrawer()
    el.noScrollLock = true
    el.open = true
    await el.updateComplete
    await waitFor(() => getDialog(el).matches(':modal'))

    el.remove()
    document.body.append(el)
    await el.updateComplete
    await waitFor(() => getDialog(el).matches(':modal'))

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('断连期间被置为关闭：重挂载后收敛到关闭态', async () => {
    const el = createDrawer()
    el.open = true
    await el.updateComplete
    await waitFor(() => getDialog(el).matches(':modal'))

    el.remove()
    el.open = false
    await el.updateComplete

    document.body.append(el)
    await el.updateComplete

    expect(el.open).toBe(false)
    expect(getDialog(el).open).toBe(false)
    expect(getDialog(el).matches(':modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('关闭态重挂载是无操作', async () => {
    const el = createDrawer()
    await el.updateComplete

    el.remove()
    document.body.append(el)
    await el.updateComplete

    expect(el.open).toBe(false)
    expect(getDialog(el).open).toBe(false)
    expect(getDialog(el).matches(':modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })
})
