import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { queryA11y, spyEvents } from '@/shared/test-utils'

import type { WebUiBackTop } from '..'

function createBackTop(): WebUiBackTop {
  const el = document.createElement('web-ui-back-top')
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiBackTop 组件', () => {
  describe('默认属性与反射（合并）', () => {
    it('threshold 默认值与反射符合契约', async () => {
      const el = createBackTop()
      await el.updateComplete
      expect(el.threshold).toBe(200)
      expect(el.getAttribute('threshold')).toBe('200')
      el.threshold = 500
      await el.updateComplete
      expect(el.getAttribute('threshold')).toBe('500')
      el.remove()
    })

    it.each([
      [-1, 0],
      [99999, 10000],
      ['invalid' as unknown as number, 200]
    ])('threshold 边界 %p 回退为 %p', async (input, expected) => {
      const el = createBackTop()
      ;(el as unknown as Record<string, unknown>).threshold = input
      await el.updateComplete
      expect(el.threshold).toBe(expected)
      el.remove()
    })
  })

  describe('属性：scrollBehavior', () => {
    it('默认值为 smooth 且不反射初始值', async () => {
      const el = createBackTop()
      await el.updateComplete
      expect(el.scrollBehavior).toBe('smooth')
      expect(el.hasAttribute('scroll-behavior')).toBe(false)
      el.remove()
    })

    it('scroll-behavior 反射到 host', async () => {
      const el = createBackTop()
      el.setAttribute('scroll-behavior', 'auto')
      await el.updateComplete
      expect(el.scrollBehavior).toBe('auto')
      expect(el.getAttribute('scroll-behavior')).toBe('auto')
      el.remove()
    })

    it('非法值回退为 smooth', async () => {
      const el = createBackTop()
      el.setAttribute('scroll-behavior', 'instant')
      await el.updateComplete
      expect(el.scrollBehavior).toBe('smooth')
      el.remove()
    })
  })

  describe('属性：visible', () => {
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

  describe('属性：scrollTarget', () => {
    it('首次更新完成前赋值时，滚动监听绑定到新容器', async () => {
      const el = createBackTop()
      const target = document.createElement('div')
      el.scrollTarget = target
      target.scrollTop = 300
      target.dispatchEvent(new Event('scroll'))
      await el.updateComplete
      expect(el.visible).toBe(true)
      el.remove()
    })

    it('后续更新 scrollTarget 时重新绑定滚动监听', async () => {
      const el = createBackTop()
      await el.updateComplete
      const target = document.createElement('div')
      el.scrollTarget = target
      await el.updateComplete
      target.scrollTop = 300
      target.dispatchEvent(new Event('scroll'))
      expect(el.visible).toBe(true)
      el.remove()
    })
  })

  describe('容器模式', () => {
    it('scrollTarget 为元素时反射 container-mode 属性', async () => {
      const el = createBackTop()
      const target = document.createElement('div')
      el.scrollTarget = target
      await el.updateComplete
      expect(el.hasAttribute('container-mode')).toBe(true)
      el.remove()
    })

    it('scrollTarget 为 window 时无 container-mode 属性', async () => {
      const el = createBackTop()
      await el.updateComplete
      expect(el.hasAttribute('container-mode')).toBe(false)
      el.remove()
    })

    it('scrollTarget 从容器改回 window 时移除 container-mode', async () => {
      const el = createBackTop()
      const target = document.createElement('div')
      el.scrollTarget = target
      await el.updateComplete
      expect(el.hasAttribute('container-mode')).toBe(true)
      el.scrollTarget = window
      await el.updateComplete
      expect(el.hasAttribute('container-mode')).toBe(false)
      el.remove()
    })
  })

  describe('方法：toTop()', () => {
    it('调用 window.scrollTo 滚动到顶部', () => {
      const el = createBackTop()
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      el.toTop()
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      spy.mockRestore()
      el.remove()
    })

    it('scrollBehavior=auto 时 behavior 为 auto', () => {
      const el = createBackTop()
      el.scrollBehavior = 'auto'
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
