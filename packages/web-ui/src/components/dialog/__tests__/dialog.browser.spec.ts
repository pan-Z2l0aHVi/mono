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

describe('WebUiDialog（浏览器）', () => {
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

  it('禁用遮罩点击时仍可通过 Escape 关闭', async () => {
    const component = createDialog()
    component.overlayClosable = false
    component.open = true
    await component.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const dialog = component.shadowRoot?.querySelector('dialog')
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
    await component.updateComplete

    expect(component.open).toBe(false)
  })
})
