import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { mountElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiBackTop } from '..'

const createBackTop = (): WebUiBackTop => mountElement<WebUiBackTop>('web-ui-back-top')

/** 覆盖 window.scrollY，驱动 window 分支的阈值可见性计算。 */
function withWindowScrollY(top: number): void {
  Object.defineProperty(window, 'scrollY', { value: top, configurable: true })
}

const triggerButton = (el: WebUiBackTop): HTMLElement => {
  const button = queryA11y(el, '[role="button"]')
  if (!button) throw new Error('back-top 未渲染 role=button')
  return button as HTMLElement
}

beforeEach(() => {
  document.body.replaceChildren()
})

afterEach(() => {
  document.body.replaceChildren()
  delete (window as unknown as Record<string, unknown>).scrollY
})

describe('WebUiBackTop 组件', () => {
  describe('threshold 归一化', () => {
    it.each([
      ['负值收敛到 0', -1, 0],
      ['超上限收敛到 10000', 99999, 10000],
      ['非数值回退到默认 200', 'invalid' as unknown as number, 200]
    ])('%s', async (_label, input, expected) => {
      const el = createBackTop()
      ;(el as unknown as Record<string, unknown>).threshold = input
      await waitForUpdate(el)

      expect(el.threshold).toBe(expected)
      el.remove()
    })
  })

  describe('scrollBehavior 归一化', () => {
    it('非法值回退为 smooth', async () => {
      const el = createBackTop()
      el.setAttribute('scroll-behavior', 'instant')
      await waitForUpdate(el)

      expect(el.scrollBehavior).toBe('smooth')
      el.remove()
    })
  })

  describe('visible 的滚动阈值计算', () => {
    it('window 模式下滚动越过阈值时切换可见', async () => {
      const el = createBackTop()
      await waitForUpdate(el)
      expect(el.visible).toBe(false)

      withWindowScrollY(300)
      window.dispatchEvent(new Event('scroll'))
      await waitForUpdate(el)
      expect(el.visible).toBe(true)

      withWindowScrollY(100)
      window.dispatchEvent(new Event('scroll'))
      await waitForUpdate(el)
      expect(el.visible).toBe(false)
      el.remove()
    })

    // 框架的 onMounted 会在首次更新完成前就写 scrollTarget，此时监听必须重绑到新容器，
    // 否则整条容器模式永远收不到滚动事件。
    it('首次更新完成前赋值 scrollTarget 时，滚动监听绑定到新容器', async () => {
      const el = createBackTop()
      const target = document.createElement('div')
      el.scrollTarget = target
      target.scrollTop = 300
      target.dispatchEvent(new Event('scroll'))
      await waitForUpdate(el)

      expect(el.visible).toBe(true)
      el.remove()
    })

    it('后续更新 scrollTarget 时重新绑定滚动监听', async () => {
      const el = createBackTop()
      await waitForUpdate(el)
      const target = document.createElement('div')
      el.scrollTarget = target
      await waitForUpdate(el)

      target.scrollTop = 300
      target.dispatchEvent(new Event('scroll'))
      await waitForUpdate(el)

      expect(el.visible).toBe(true)
      el.remove()
    })
  })

  describe('toTop()', () => {
    it('window 模式下滚动到顶部', () => {
      const el = createBackTop()
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      el.toTop()
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })

      spy.mockRestore()
      el.remove()
    })

    it('scrollBehavior=auto 时滚动同样到顶部但不追求平滑', () => {
      const el = createBackTop()
      el.scrollBehavior = 'auto'
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      el.toTop()
      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })

      spy.mockRestore()
      el.remove()
    })

    it('自定义 scrollTarget 时滚动该元素而不是页面', () => {
      const el = createBackTop()
      const target = document.createElement('div')
      el.scrollTarget = target
      const targetSpy = vi.spyOn(target, 'scrollTo').mockImplementation(() => {})
      const windowSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      el.toTop()
      expect(targetSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      expect(windowSpy).not.toHaveBeenCalled()

      targetSpy.mockRestore()
      windowSpy.mockRestore()
      el.remove()
    })
  })

  describe('无障碍与激活', () => {
    // 手写 role=button 的元素必须自己补齐 tabindex，否则键盘用户永远到不了它。
    it('暴露可聚焦的 button 角色', async () => {
      const el = createBackTop()
      await waitForUpdate(el)

      expect(triggerButton(el).getAttribute('tabindex')).toBe('0')
      el.remove()
    })

    it.each([
      ['Enter', 'Enter'],
      ['Space', ' ']
    ])('键盘 %s 触发 toTop', async (_label, key) => {
      const el = createBackTop()
      await waitForUpdate(el)
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      triggerButton(el).dispatchEvent(new KeyboardEvent('keydown', { key }))

      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      spy.mockRestore()
      el.remove()
    })

    it('指针点击触发 toTop', async () => {
      const el = createBackTop()
      await waitForUpdate(el)
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      triggerButton(el).click()

      expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      spy.mockRestore()
      el.remove()
    })
  })
})
