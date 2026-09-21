import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(): WebUiDialog {
  const dialog = document.createElement('web-ui-dialog')
  dialog.textContent = 'Dialog content'
  document.body.append(dialog)
  return dialog
}

function getInnerDialog(component: WebUiDialog): HTMLDialogElement {
  return component.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

/*
 * 重挂载对账（浏览器）。
 *
 * 平台行为（Chromium 实测）：`<dialog>` 随宿主移出文档时脱离 top layer 但 `open`
 * 属性残留；重连后既有的 `updated()` 管线因 `open` 未变化不会补跑 sync，而
 * `sync(true)` 又会被残留的 `open` 属性挡住（`showModal` 跳过/抛错），dialog 永远
 * 回不到 top layer。修复后由 `connectedCallback` 的 reconcile 收敛。
 *
 * 观察面全部用公开语义：宿主 `open` 反射、inner dialog 的 `open`、平台 `:modal`
 * 伪类、滚动锁的文档级副作用（`documentElement.style.overflow`）。
 */
describe('WebUiDialog 重挂载对账（浏览器）', () => {
  it('打开态被移出文档再接回：回到 top layer 且滚动锁恢复', async () => {
    const component = createDialog()
    component.open = true
    await component.updateComplete
    const dialog = getInnerDialog(component)
    expect(dialog.matches(':modal')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')

    component.remove()
    expect(document.documentElement.style.overflow).toBe('')

    document.body.append(component)
    await component.updateComplete

    expect(component.isConnected).toBe(true)
    expect(component.open).toBe(true)
    expect(dialog.open).toBe(true)
    // 修复前：open 属性残留但已脱离 top layer，遮罩/模态全部失效
    expect(dialog.matches(':modal')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 重挂载后模态语义完整：cancel（Escape 的原生路径）仍可关闭
    dialog.focus()
    expect(dialog.dispatchEvent(new Event('cancel', { cancelable: true }))).toBe(false)
    await component.updateComplete
    expect(component.open).toBe(false)
  })

  it('no-scroll-lock 的打开态重挂载不引入滚动锁', async () => {
    const component = createDialog()
    component.noScrollLock = true
    component.open = true
    await component.updateComplete
    const dialog = getInnerDialog(component)
    expect(dialog.matches(':modal')).toBe(true)

    component.remove()
    document.body.append(component)
    await component.updateComplete

    expect(component.open).toBe(true)
    expect(dialog.matches(':modal')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('断连期间被置为关闭：重挂载后收敛到关闭态，不残留 open 属性', async () => {
    const component = createDialog()
    component.open = true
    await component.updateComplete
    const dialog = getInnerDialog(component)
    expect(dialog.open).toBe(true)

    component.remove()
    // 断连中的属性写入：updated() 因 !isConnected 跳过 sync 分支
    component.open = false
    await component.updateComplete

    document.body.append(component)
    await component.updateComplete

    expect(component.open).toBe(false)
    expect(dialog.open).toBe(false)
    expect(dialog.matches(':modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('关闭态重挂载是无操作：不产生 top layer 与滚动锁', async () => {
    const component = createDialog()
    await component.updateComplete

    component.remove()
    document.body.append(component)
    await component.updateComplete

    const dialog = getInnerDialog(component)
    expect(component.open).toBe(false)
    expect(dialog.open).toBe(false)
    expect(dialog.matches(':modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })
})
