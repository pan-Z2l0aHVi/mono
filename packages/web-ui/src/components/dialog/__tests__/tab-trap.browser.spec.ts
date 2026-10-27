import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

async function mountOpenDialog(): Promise<{ dialog: WebUiDialog; first: HTMLButtonElement; last: HTMLButtonElement }> {
  const dialog = document.createElement('web-ui-dialog') as WebUiDialog
  const first = document.createElement('button')
  first.textContent = 'First'
  const last = document.createElement('button')
  last.textContent = 'Last'
  last.slot = 'footer'
  dialog.append(first, last)
  dialog.closable = true
  dialog.open = true
  document.body.append(dialog)

  await waitForUpdate(dialog)
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => requestAnimationFrame(resolve))

  return { dialog, first, last }
}

/** 内置关闭 button：宿主与它的 shadow 原生按钮。 */
function lastTabbable(dialog: WebUiDialog): { host: HTMLElement; inner: HTMLElement } {
  const host = dialog.shadowRoot?.querySelector<HTMLElement>('web-ui-button.wui-dialog-close')
  const inner = host?.shadowRoot?.querySelector<HTMLElement>('button')
  expect(host).toBeTruthy()
  expect(inner).toBeTruthy()
  return { host: host!, inner: inner! }
}

describe('WebUiDialog 焦点陷阱回卷（浏览器）', () => {
  it('末项 Tab 回到首项，不会落到 body', async () => {
    const { dialog } = await mountOpenDialog()

    lastTabbable(dialog).inner.focus()
    expect(document.activeElement).not.toBe(document.body)

    await userEvent.keyboard('{Tab}')

    expect(document.activeElement).not.toBe(document.body)
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect((document.activeElement as HTMLElement).textContent).toBe('First')
  })

  it('首项 Shift+Tab 回到末项', async () => {
    const { dialog, first } = await mountOpenDialog()

    first.focus()
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

    expect(document.activeElement).not.toBe(document.body)
    expect(dialog.shadowRoot?.activeElement).toBe(lastTabbable(dialog).host)
  })
})
