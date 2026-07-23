import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiSwitch } from '..'

const createSwitch = (): WebUiSwitch => {
  const el = document.createElement('web-ui-switch') as WebUiSwitch
  document.body.appendChild(el)
  return el
}

describe('WebUiSwitch', () => {
  describe('prop: open', () => {
    it('open 属性反映到 host 元素，初始值为 false', async () => {
      const el = createSwitch()
      await el.updateComplete
      expect(el.open).toBe(false)
      expect(el.hasAttribute('open')).toBe(false)

      el.open = true
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(true)
      expect(el.open).toBe(true)

      el.open = false
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(false)

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createSwitch()
      el.disabled = true
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(false)

      el.remove()
    })

    it('disabled 为 true 时阻止切换', async () => {
      const el = createSwitch()
      el.disabled = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      const track = el.shadowRoot!.querySelector('[role="switch"]') as HTMLElement
      track.click()
      await el.updateComplete

      expect(el.open).toBe(false)
      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('event: open-change', () => {
    it('open 变化时触发 open-change，detail.open 匹配新状态', async () => {
      const el = createSwitch()
      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = true
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent<{ open: boolean }>).detail.open).toBe(true)

      el.remove()
    })

    it('disabled 为 true 时不触发 open-change', async () => {
      const el = createSwitch()
      el.disabled = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      const track = el.shadowRoot!.querySelector('[role="switch"]') as HTMLElement
      track.click()
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('command: show()', () => {
    it('设置 open=true 并触发 open-change', async () => {
      const el = createSwitch()
      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.show()
      await el.updateComplete

      expect(el.open).toBe(true)
      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent<{ open: boolean }>).detail.open).toBe(true)

      el.remove()
    })

    it('已打开时再次调用不重复触发', async () => {
      const el = createSwitch()
      el.open = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.show()
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('command: close()', () => {
    it('设置 open=false 并触发 open-change', async () => {
      const el = createSwitch()
      el.open = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.close()
      await el.updateComplete

      expect(el.open).toBe(false)
      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent<{ open: boolean }>).detail.open).toBe(false)

      el.remove()
    })
  })
})
