import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { queryA11y, spyEvents } from '@/shared/test-utils'

import type { WebUiBackTop } from '..'

function createBackTop(): WebUiBackTop {
  const el = document.createElement('web-ui-back-top') as WebUiBackTop
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiBackTop', () => {
  describe('prop: threshold', () => {
    it('默认值为 200', async () => {
      const el = createBackTop()
      await el.updateComplete
      expect(el.threshold).toBe(200)
      expect(el.getAttribute('threshold')).toBe('200')
      el.remove()
    })

    it('threshold 反射到 host', async () => {
      const el = createBackTop()
      el.threshold = 500
      await el.updateComplete
      expect(el.getAttribute('threshold')).toBe('500')
      el.remove()
    })

    it('负数 threshold 归零', async () => {
      const el = createBackTop()
      el.threshold = -1
      await el.updateComplete
      expect(el.threshold).toBe(0)
      el.remove()
    })

    it('超标 threshold 上限 10000', async () => {
      const el = createBackTop()
      el.threshold = 99999
      await el.updateComplete
      expect(el.threshold).toBe(10000)
      el.remove()
    })

    it('非数值 threshold 回退到默认值 200', async () => {
      const el = createBackTop()
      ;(el as unknown as Record<string, unknown>).threshold = 'invalid'
      await el.updateComplete
      expect(el.threshold).toBe(200)
      el.remove()
    })
  })

  describe('prop: smooth', () => {
    it('默认值为 true', () => {
      const el = createBackTop()
      expect(el.smooth).toBe(true)
      el.remove()
    })

    it('smooth 反射到 host', async () => {
      const el = createBackTop()
      el.setAttribute('smooth', 'false')
      await el.updateComplete
      expect(el.smooth).toBe(false)
      expect(el.getAttribute('smooth')).toBe('false')
      el.remove()
    })
  })

  describe('prop: visible', () => {
    it('默认值为 false', () => {
      const el = createBackTop()
      expect(el.visible).toBe(false)
      expect(el.hasAttribute('visible')).toBe(false)
      el.remove()
    })

    it('visible 变化时不触发 visible-change 事件', async () => {
      const el = createBackTop()
      const [events] = spyEvents(el, 'visible-change')
      el.visible = true
      await el.updateComplete
      expect(events).toHaveLength(0)
      el.remove()
    })
  })

  describe('method: toTop()', () => {
    it('调用 window.scrollTo 滚动到顶部', () => {
      const el = createBackTop()
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      el.toTop()
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      spy.mockRestore()
      el.remove()
    })

    it('smooth=false 时 behavior 为 auto', () => {
      const el = createBackTop()
      el.smooth = false
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      el.toTop()
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
      spy.mockRestore()
      el.remove()
    })

    it('自定义 scrollTarget 时滚动该元素', () => {
      const el = createBackTop()
      const target = document.createElement('div')
      el.scrollTarget = target
      const spy = vi.spyOn(target, 'scrollTo').mockImplementation(() => {})
      el.toTop()
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      spy.mockRestore()
      el.remove()
    })
  })

  describe('无障碍', () => {
    it('role 为 button', async () => {
      const el = createBackTop()
      await el.updateComplete
      const button = queryA11y(el, '[role="button"]')
      expect(button).toBeTruthy()
      expect(button?.getAttribute('tabindex')).toBe('0')
      el.remove()
    })

    it('键盘 Enter 触发 toTop', async () => {
      const el = createBackTop()
      await el.updateComplete
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      const button = queryA11y(el, '[role="button"]')
      expect(button).toBeTruthy()
      button!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
      el.remove()
    })
  })
})
