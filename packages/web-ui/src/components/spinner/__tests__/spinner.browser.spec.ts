import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { afterRenderStep, pollUntil } from '@/shared/test-utils'

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
  it('show() 用非模态 dialog 展示且不抢焦点，hide() 移除 host', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open loading overlay'
    document.body.append(trigger)
    trigger.focus()

    const spinner = WebUiSpinner.show()
    await spinner.updateComplete

    const dialog = spinner.shadowRoot?.querySelector('dialog')
    await pollUntil(() => dialog?.open === true, 'spinner dialog 没有打开')
    expect(dialog?.matches(':modal')).toBe(false)
    expect(document.activeElement).toBe(trigger)

    WebUiSpinner.hide()

    expect(spinner.isConnected).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('host 的 aria-label 更新后同步 dialog accessible name', async () => {
    const spinner = WebUiSpinner.show()
    await spinner.updateComplete

    const dialog = spinner.shadowRoot?.querySelector('dialog')
    const status = dialog?.querySelector('[role="status"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Loading')
    expect(status?.getAttribute('aria-label')).toBe('Loading')

    spinner.setAttribute('aria-label', 'Synchronizing data')
    await spinner.updateComplete

    expect(dialog?.getAttribute('aria-label')).toBe('Synchronizing data')
    expect(status?.getAttribute('aria-label')).toBe('Synchronizing data')
  })

  it('不拦截底层控件的指针命中，也不锁定页面滚动', async () => {
    window.scrollTo(0, 0)
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

    const rect = button.getBoundingClientRect()
    const x = rect.x + rect.width / 2
    const y = rect.y + rect.height / 2
    expect(document.elementFromPoint(x, y)).toBe(button)
    await page.elementLocator(button).click()
    expect(underlyingClicks).toBe(1)

    await userEvent.wheel(document.body, { delta: { y: 300 } })
    // 滚轮的效果要到后续渲染步进才可见。
    await afterRenderStep()
    await afterRenderStep()
    expect(window.scrollY).toBeGreaterThan(0)
  })

  it('在已有原生模态层上方显示，但仍是不可交互的非模态状态', async () => {
    const underlyingDialog = document.createElement('dialog')
    const button = document.createElement('button')
    button.textContent = 'Underlying dialog action'
    underlyingDialog.append(button)
    document.body.append(underlyingDialog)
    underlyingDialog.showModal()

    const spinner = WebUiSpinner.show()
    await spinner.updateComplete

    const spinnerDialog = spinner.shadowRoot?.querySelector('dialog')
    await pollUntil(() => spinnerDialog?.open === true, 'spinner dialog 没有进入 top layer')
    expect(spinnerDialog?.matches(':modal')).toBe(false)
    expect(spinnerDialog?.getAttribute('aria-label')).toBe('Loading')
    expect(spinnerDialog?.hasAttribute('aria-modal')).toBe(false)
    expect(spinnerDialog?.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading')
    const rect = button.getBoundingClientRect()
    expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(button)

    await userEvent.keyboard('{Escape}')

    expect(spinnerDialog?.open).toBe(true)
    expect(underlyingDialog.open).toBe(true)
  })
})
