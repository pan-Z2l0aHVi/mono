// @vitest-environment jsdom

import '@greypan/web-ui'
import type { WebUiDialog } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import SettingsDialog from './SettingsDialog.vue'

function mountDialog(onUpdateOpen: (value: boolean) => void) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () => h(SettingsDialog, { open: true, 'onUpdate:open': onUpdateOpen })
  })
  app.mount(host)
  return {
    host,
    close: () => {
      app.unmount()
      host.remove()
    }
  }
}

function dialogElement(host: HTMLElement) {
  const element = host.querySelector('web-ui-dialog')
  if (!element) throw new Error('web-ui-dialog was not rendered')
  return element as WebUiDialog
}

function buttonByLabel(host: HTMLElement, label: string) {
  const button = host.querySelector<HTMLElement>(`web-ui-button[aria-label="${label}"]`)
  if (!button) throw new Error(`button ${label} was not rendered`)
  return button
}

function buttonByText(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll<HTMLElement>('web-ui-button')].find(
    element => element.textContent?.trim() === text
  )
  if (!button) throw new Error(`button ${text} was not rendered`)
  return button
}

describe('SettingsDialog', () => {
  it('内容只保留空状态占位与一个关闭按钮', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()

      expect(mounted.host.querySelector('[slot="title"]')?.textContent).toContain('设置')
      expect(mounted.host.querySelector('web-ui-empty')?.getAttribute('description')).toBe('尚未实现')
      expect(buttonByText(mounted.host, '关闭')).toBeTruthy()
    } finally {
      mounted.close()
    }
  })

  it('标题栏的关闭按钮回抛关闭请求', async () => {
    const onUpdateOpen = vi.fn<(value: boolean) => void>()
    const mounted = mountDialog(onUpdateOpen)

    try {
      await nextTick()

      buttonByLabel(mounted.host, '关闭设置').click()

      expect(onUpdateOpen).toHaveBeenCalledWith(false)
    } finally {
      mounted.close()
    }
  })

  it('底部关闭按钮回抛关闭请求', async () => {
    const onUpdateOpen = vi.fn<(value: boolean) => void>()
    const mounted = mountDialog(onUpdateOpen)

    try {
      await nextTick()

      buttonByText(mounted.host, '关闭').click()

      expect(onUpdateOpen).toHaveBeenCalledWith(false)
    } finally {
      mounted.close()
    }
  })

  it('controlled 下 Escape 与遮罩点击的关闭请求透传成 update:open，不自行改 open', async () => {
    const onUpdateOpen = vi.fn<(value: boolean) => void>()
    const mounted = mountDialog(onUpdateOpen)

    try {
      await nextTick()
      const dialog = dialogElement(mounted.host)

      dialog.dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
      await nextTick()

      expect(onUpdateOpen).toHaveBeenCalledWith(false)
      expect(dialog.open).toBe(true)
    } finally {
      mounted.close()
    }
  })
})
