import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

function createDialog(slots = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  if (slots) el.innerHTML = slots
  document.body.appendChild(el)
  return el
}

describe('WebUiDialog', () => {
  describe('prop: open', () => {
    it('open 属性反射到 host 元素', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('prop: lock-scroll', () => {
    it('默认打开时锁定背景滚动，关闭后恢复', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('fixed')

      el.close()
      await waitForUpdate(el)
      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('关闭 lock-scroll 时不锁定背景滚动', async () => {
      const el = createDialog()
      el.lockScroll = false
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('打开期间切换 lock-scroll 立即同步滚动锁', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)
      el.lockScroll = false
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })
  })

  describe('event: open-change', () => {
    it('open false→true 触发 open-change，detail.open 为 true', async () => {
      const el = createDialog()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(true)
      cleanupElement(el)
    })

    it('open true→false 触发 open-change，detail.open 为 false', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = false
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(false)
      cleanupElement(el)
    })

    it('open 值不变时不触发', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('command: showModal()', () => {
    it('设置 open=true 并触发 open-change', async () => {
      const el = createDialog()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.showModal()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(true)
      cleanupElement(el)
    })

    it('已打开时再次调用不重复触发', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.showModal()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('command: close()', () => {
    it('设置 open=false 并触发 open-change', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(false)
      cleanupElement(el)
    })
  })

  describe('a11y', () => {
    it('打开时 shadow DOM 内存在原生 dialog 元素', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const dialog = el.shadowRoot?.querySelector('dialog')
      expect(dialog).toBeTruthy()
      cleanupElement(el)
    })
  })

  describe('prop: overlayClosable', () => {
    it('默认 true，点击遮罩关闭对话框', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('false 时点击遮罩不关闭', async () => {
      const el = createDialog()
      el.setAttribute('overlay-closable', 'false')
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      expect(el.overlayClosable).toBe(false)
      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      cleanupElement(el)
    })
  })
})
