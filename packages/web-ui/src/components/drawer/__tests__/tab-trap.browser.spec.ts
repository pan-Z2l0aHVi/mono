import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { waitForUpdate } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

afterEach(() => document.body.replaceChildren())

async function mountOpenDrawer(): Promise<{ drawer: WebUiDrawer; first: HTMLButtonElement }> {
  const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
  const first = document.createElement('button')
  first.textContent = 'First'
  const last = document.createElement('button')
  last.textContent = 'Last'
  last.slot = 'footer'
  drawer.append(first, last)
  drawer.closable = true
  drawer.open = true
  document.body.append(drawer)

  await waitForUpdate(drawer)
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => requestAnimationFrame(resolve))

  return { drawer, first }
}

/** 内置关闭 button：宿主与它的 shadow 原生按钮。 */
function lastTabbable(drawer: WebUiDrawer): { host: HTMLElement; inner: HTMLElement } {
  const host = drawer.shadowRoot?.querySelector<HTMLElement>('web-ui-button.wui-drawer-close')
  const inner = host?.shadowRoot?.querySelector<HTMLElement>('button')
  expect(host).toBeTruthy()
  expect(inner).toBeTruthy()
  return { host: host!, inner: inner! }
}

describe('WebUiDrawer 焦点陷阱回卷（浏览器）', () => {
  it('末项 Tab 回到首项，不会落到 body', async () => {
    const { drawer } = await mountOpenDrawer()

    lastTabbable(drawer).inner.focus()
    await userEvent.keyboard('{Tab}')

    expect(document.activeElement).not.toBe(document.body)
    expect(drawer.contains(document.activeElement)).toBe(true)
    expect((document.activeElement as HTMLElement).textContent).toBe('First')
  })

  it('首项 Shift+Tab 回到末项', async () => {
    const { drawer, first } = await mountOpenDrawer()

    first.focus()
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

    expect(document.activeElement).not.toBe(document.body)
    expect(drawer.shadowRoot?.activeElement).toBe(lastTabbable(drawer).host)
  })
})
