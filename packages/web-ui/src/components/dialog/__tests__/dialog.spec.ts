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

describe('WebUiDialog 组件', () => {
  describe('属性：open', () => {
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

  describe('属性：no-scroll-lock', () => {
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

    it('no-scroll-lock 为 true 时不锁定背景滚动', async () => {
      const el = createDialog()
      el.setAttribute('no-scroll-lock', '')
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('打开期间切换 no-scroll-lock 立即同步滚动锁', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)
      el.setAttribute('no-scroll-lock', '')
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })
  })

  describe('事件：open-change', () => {
    it('程序设置 open 不触发 open-change', async () => {
      const el = createDialog()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('程序关闭不触发 open-change', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = false
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
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

  describe('命令：showModal()', () => {
    it('设置 open=true 但不触发 open-change', async () => {
      const el = createDialog()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.showModal()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
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

  describe('命令：close()', () => {
    it('设置 open=false 但不触发 open-change', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('无障碍', () => {
    it('打开时 shadow DOM 内存在原生 dialog 元素', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)

      const dialog = el.shadowRoot?.querySelector('dialog')
      expect(dialog).toBeTruthy()
      cleanupElement(el)
    })
  })

  describe('属性：noBackdropClose', () => {
    it('默认允许点击遮罩关闭对话框', async () => {
      const el = createDialog()
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('no-backdrop-close 存在时点击遮罩不关闭', async () => {
      const el = createDialog()
      el.setAttribute('no-backdrop-close', '')
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      expect(el.noBackdropClose).toBe(true)
      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      cleanupElement(el)
    })

    it('no-backdrop-close="false" 仍禁用遮罩关闭', async () => {
      const el = createDialog()
      el.setAttribute('no-backdrop-close', 'false')
      await waitForUpdate(el)
      expect(el.noBackdropClose).toBe(true)
      cleanupElement(el)
    })
  })
})
