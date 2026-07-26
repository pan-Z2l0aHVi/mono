import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  document.body.appendChild(el)
  return el
}

describe('WebUiDrawer', () => {
  describe('prop: open', () => {
    it('open 属性反射到 host 元素', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('prop: placement', () => {
    it('默认 placement 为 right', async () => {
      const el = createDrawer()
      await waitForUpdate(el)
      expect(el.placement).toBe('right')
      expect(el.hasAttribute('placement')).toBe(true)
      expect(el.getAttribute('placement')).toBe('right')
      cleanupElement(el)
    })

    it('placement 反映到 host 属性', async () => {
      const el = createDrawer()
      el.placement = 'left'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('left')

      el.placement = 'top'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('top')

      el.placement = 'bottom'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('bottom')

      cleanupElement(el)
    })

    it('非法 placement 回退到默认值 right', async () => {
      const el = createDrawer()
      el.placement = 'invalid' as 'right'
      await waitForUpdate(el)
      expect(el.placement).toBe('right')
      expect(el.getAttribute('placement')).toBe('right')
      cleanupElement(el)
    })
  })

  describe('prop: lock-scroll', () => {
    it('默认打开时锁定页面滚动', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('fixed')
      cleanupElement(el)
    })

    it('关闭 lock-scroll 时不锁定页面滚动', async () => {
      const el = createDrawer()
      el.lockScroll = false
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('打开期间切换 lock-scroll 立即恢复页面滚动', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      el.lockScroll = false
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })
  })

  describe('prop: heading', () => {
    it('heading 可通过属性设置', async () => {
      const el = createDrawer()
      el.heading = '我的标题'
      await waitForUpdate(el)
      expect(el.heading).toBe('我的标题')
      cleanupElement(el)
    })
  })

  describe('prop: closable', () => {
    it('默认 closable 为 false', async () => {
      const el = createDrawer()
      await waitForUpdate(el)
      expect(el.closable).toBe(false)
      expect(el.hasAttribute('closable')).toBe(false)
      cleanupElement(el)
    })

    it('closable 为 true 时反映到 host 属性', async () => {
      const el = createDrawer()
      el.closable = true
      await waitForUpdate(el)
      expect(el.hasAttribute('closable')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('event: open-change', () => {
    it('open false→true 触发 open-change，detail.open 为 true', async () => {
      const el = createDrawer()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(true)
      cleanupElement(el)
    })

    it('open true→false 触发 open-change，detail.open 为 false', async () => {
      const el = createDrawer()
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
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('command: show()', () => {
    it('设置 open=true 并触发 open-change', async () => {
      const el = createDrawer()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.show()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(true)
      cleanupElement(el)
    })

    it('已打开时再次调用不重复触发', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.show()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('command: close()', () => {
    it('带动画关闭，动画后设置 open=false 并触发 open-change', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      // close 立即将 open 设为 false
      expect(el.open).toBe(false)
      // 动画结束后触发 open-change
      await vi.advanceTimersByTimeAsync(300)
      expect(el.open).toBe(false)
      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })
  })

  describe('prop: overlayClosable', () => {
    it('默认 true，点击遮罩关闭抽屉', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('false 时点击遮罩不关闭', async () => {
      const el = createDrawer()
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
