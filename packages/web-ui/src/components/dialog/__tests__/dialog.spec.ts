import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiDialog } from '..'

const createDialog = (slots = ''): WebUiDialog => {
  const el = document.createElement('web-ui-dialog') as WebUiDialog
  if (slots) el.innerHTML = slots
  document.body.appendChild(el)
  return el
}

describe('WebUiDialog', () => {
  describe('prop: open', () => {
    it('open 属性反映到 host 元素', async () => {
      const el = createDialog()
      el.open = true
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(false)

      el.remove()
    })

    it('open=true 时 dialog 进入 entering 状态', async () => {
      const el = createDialog()
      el.open = true
      await el.updateComplete

      const dialog = el.shadowRoot?.querySelector('dialog')
      expect(dialog?.classList.contains('entering')).toBe(true)

      el.remove()
    })
  })

  describe('event: open-change', () => {
    it('open false→true 触发 open-change，detail.open 为 true', async () => {
      const el = createDialog()
      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.open = true
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(true)

      el.remove()
    })

    it('open true→false 触发 open-change，detail.open 为 false', async () => {
      const el = createDialog()
      el.open = true
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.open = false
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(false)

      el.remove()
    })

    it('open 值不变时不触发', async () => {
      const el = createDialog()
      el.open = true
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.open = true
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('command: showModal()', () => {
    it('设置 open=true 并触发 open-change', async () => {
      const el = createDialog()
      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.showModal()
      await el.updateComplete

      expect(el.open).toBe(true)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(true)

      el.remove()
    })

    it('已打开时再次调用不重复触发', async () => {
      const el = createDialog()
      el.open = true
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.showModal()
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('command: close()', () => {
    it('设置 open=false 并触发 open-change', async () => {
      const el = createDialog()
      el.open = true
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.close()
      await el.updateComplete

      expect(el.open).toBe(false)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(false)

      el.remove()
    })
  })
})
