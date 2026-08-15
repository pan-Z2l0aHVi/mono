import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '..'
import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(): WebUiDialog {
  const dialog = document.createElement('web-ui-dialog')
  dialog.textContent = 'Dialog content'
  document.body.append(dialog)
  return dialog
}

describe('WebUiDialog 组件（浏览器）', () => {
  it('退出过渡完成前保持原生 dialog 位于 top layer', async () => {
    const component = createDialog()
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    expect(dialog?.open).toBe(true)

    component.close()
    await component.updateComplete
    expect(dialog?.open).toBe(true)

    dialog?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await new Promise(resolve => setTimeout(resolve))
    expect(dialog?.open).toBe(false)
  })

  it('no-escape-close 存在时 Escape/cancel 不关闭对话框', async () => {
    const component = createDialog()
    component.noEscapeClose = true
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    dialog?.focus()
    await userEvent.keyboard('{Escape}')
    await component.updateComplete
    expect(component.open).toBe(true)

    const event = new Event('cancel', { cancelable: true })
    expect(dialog?.dispatchEvent(event)).toBe(false)
    await component.updateComplete
    expect(component.open).toBe(true)
  })

  it('no-backdrop-close 只阻止遮罩 click，不阻止 Escape 触发的 cancel', async () => {
    const component = createDialog()
    component.noBackdropClose = true
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    expect(dialog?.open).toBe(true)

    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await component.updateComplete
    expect(component.open).toBe(true)

    dialog?.focus()
    await userEvent.keyboard('{Escape}')
    await component.updateComplete
    expect(component.open).toBe(false)
  })
})
