import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { WebUiSpinner } from '..'

afterEach(() => {
  WebUiSpinner.hide()
  for (const dialog of document.querySelectorAll('dialog')) {
    if (dialog.open) dialog.close()
  }
  document.body.replaceChildren()
  window.scrollTo(0, 0)
})

describe('WebUiSpinner 命令式 overlay（浏览器）', () => {
  it('拦截底层控件的指针命中并锁定页面滚动', async () => {
    const spacer = document.createElement('div')
    spacer.style.height = '2000px'
    const button = document.createElement('button')
    button.textContent = 'Underlying action'
    button.style.cssText = 'position:fixed;left:24px;top:24px;z-index:1'
    let underlyingClicks = 0
    button.addEventListener('click', () => underlyingClicks++)
    document.body.append(spacer, button)

    const spinner = WebUiSpinner.show()
    await spinner.updateComplete
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    const rect = button.getBoundingClientRect()
    const x = rect.x + rect.width / 2
    const y = rect.y + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    expect(hit).toBe(spinner)
    hit?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, clientX: x, clientY: y }))
    expect(underlyingClicks).toBe(0)

    const overlay = spinner.shadowRoot?.querySelector('.wui-spinner-overlay')
    expect(overlay).not.toBeNull()
    await userEvent.wheel(overlay as HTMLElement, { delta: { y: 300 } })
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
    expect(window.scrollY).toBe(0)
  })

  it('在已有原生模态层上方显示，Escape 不会关闭底层 dialog', async () => {
    const underlyingDialog = document.createElement('dialog')
    const button = document.createElement('button')
    button.textContent = 'Underlying dialog action'
    underlyingDialog.append(button)
    document.body.append(underlyingDialog)
    underlyingDialog.showModal()

    const spinner = WebUiSpinner.show()
    await spinner.updateComplete
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    const spinnerDialog = spinner.shadowRoot?.querySelector('dialog')
    expect(spinnerDialog?.matches(':modal')).toBe(true)
    expect(spinnerDialog?.getAttribute('aria-label')).toBe('Loading')
    expect(spinnerDialog?.getAttribute('aria-modal')).toBe('true')
    expect(spinnerDialog?.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading')
    const rect = button.getBoundingClientRect()
    expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(spinner)

    await userEvent.keyboard('{Escape}')

    expect(spinnerDialog?.open).toBe(true)
    expect(underlyingDialog.open).toBe(true)
  })
})
