import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

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
  it('hide() 在移除 host 前关闭 modal 并将焦点还给原控件', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open loading overlay'
    document.body.append(trigger)
    trigger.focus()

    const spinner = WebUiSpinner.show()
    await spinner.updateComplete
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    const overlayRoot = spinner.getRootNode() as ShadowRoot
    expect(document.activeElement).toBe(overlayRoot.host)

    WebUiSpinner.hide()

    expect(spinner.isConnected).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('host 的 aria-label 更新后同步 modal accessible name', async () => {
    const spinner = WebUiSpinner.show()
    await spinner.updateComplete
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    const dialog = spinner.shadowRoot?.querySelector('dialog')
    const status = dialog?.querySelector('[role="status"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Loading')
    expect(status?.getAttribute('aria-label')).toBe('Loading')

    spinner.setAttribute('aria-label', 'Synchronizing data')
    await spinner.updateComplete

    expect(dialog?.getAttribute('aria-label')).toBe('Synchronizing data')
    expect(status?.getAttribute('aria-label')).toBe('Synchronizing data')
  })

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
    const overlayRoot = spinner.getRootNode() as ShadowRoot
    expect(document.elementFromPoint(x, y)).toBe(overlayRoot.host)
    expect(overlayRoot.elementFromPoint(x, y)).toBe(spinner)
    await page.elementLocator(button).click({ force: true })
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
    const overlayRoot = spinner.getRootNode() as ShadowRoot
    expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(overlayRoot.host)
    expect(overlayRoot.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(spinner)

    await userEvent.keyboard('{Escape}')

    expect(spinnerDialog?.open).toBe(true)
    expect(underlyingDialog.open).toBe(true)
  })
})
