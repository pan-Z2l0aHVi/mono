import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

const createDrawer = (): WebUiDrawer => {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  document.body.appendChild(el)
  return el
}

describe('WebUiDrawer', () => {
  describe('prop: open', () => {
    it('open 属性反映到 host 元素', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(false)

      el.remove()
    })
  })

  describe('prop: placement', () => {
    it('默认 placement 为 right', async () => {
      const el = createDrawer()
      await el.updateComplete
      expect(el.placement).toBe('right')
      expect(el.getAttribute('placement')).toBe('right')
      el.remove()
    })

    it('placement 反映到 host 属性', async () => {
      const el = createDrawer()
      el.placement = 'left'
      await el.updateComplete
      expect(el.getAttribute('placement')).toBe('left')

      el.placement = 'top'
      await el.updateComplete
      expect(el.getAttribute('placement')).toBe('top')

      el.placement = 'bottom'
      await el.updateComplete
      expect(el.getAttribute('placement')).toBe('bottom')

      el.remove()
    })
  })

  describe('prop: heading', () => {
    it('heading 可通过属性设置', async () => {
      const el = createDrawer()
      el.heading = '我的标题'
      await el.updateComplete
      expect(el.heading).toBe('我的标题')
      el.remove()
    })
  })

  describe('prop: closable', () => {
    it('默认 closable 为 false', async () => {
      const el = createDrawer()
      await el.updateComplete
      expect(el.closable).toBe(false)
      expect(el.hasAttribute('closable')).toBe(false)
      el.remove()
    })

    it('closable 为 false 时反映到 host 属性', async () => {
      const el = createDrawer()
      el.closable = false
      await el.updateComplete
      expect(el.hasAttribute('closable')).toBe(false)
      el.remove()
    })
  })

  describe('event: open-change', () => {
    it('open false→true 触发 open-change，detail.open 为 true', async () => {
      const el = createDrawer()
      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.open = true
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(true)

      el.remove()
    })

    it('open true→false 触发 open-change，detail.open 为 false', async () => {
      const el = createDrawer()
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
      const el = createDrawer()
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

  describe('command: show()', () => {
    it('设置 open=true 并触发 open-change', async () => {
      const el = createDrawer()
      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.show()
      await el.updateComplete

      expect(el.open).toBe(true)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(true)

      el.remove()
    })

    it('已打开时再次调用不重复触发', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.show()
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('command: close()', () => {
    it('带动画关闭，动画后设置 open=false 并触发 open-change', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.open = true
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.close()
      // 动画已开始，open 立即关闭
      expect(el.open).toBe(false)
      // 动画结束后完成关闭
      await vi.advanceTimersByTimeAsync(300)
      expect(el.open).toBe(false)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail.open).toBe(false)

      vi.useRealTimers()
      el.remove()
    })
  })
})
