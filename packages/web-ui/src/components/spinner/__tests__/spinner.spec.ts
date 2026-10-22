import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { getFallbackOverlayRoot } from '@/shared/overlay/overlay-root'
import { cleanupElement, mountElement, waitForUpdate } from '@/shared/test-utils'

import { WebUiSpinner } from '..'

afterEach(() => {
  document.body.replaceChildren()
  WebUiSpinner.hide()
})

describe('WebUiSpinner 组件', () => {
  describe('无障碍契约', () => {
    // 组件只在消费者没给语义时兜底；覆盖会把调用方自己的 role / aria-label 吞掉。
    it('默认给出加载中的 status 语义', async () => {
      const el = mountElement<WebUiSpinner>('web-ui-spinner')
      await waitForUpdate(el)

      expect(el.getAttribute('role')).toBe('status')
      expect(el.getAttribute('aria-label')).toBe('Loading')
      cleanupElement(el)
    })

    it('消费者自带 role / aria-label 时不被组件覆盖', async () => {
      const el = mountElement<WebUiSpinner>('web-ui-spinner', {
        attrs: { role: 'alert', 'aria-label': '自定义加载提示' }
      })
      await waitForUpdate(el)

      expect(el.getAttribute('role')).toBe('alert')
      expect(el.getAttribute('aria-label')).toBe('自定义加载提示')
      cleanupElement(el)
    })
  })

  describe('命令式 API: show / hide', () => {
    it('show() 无主题时挂载到 fallback overlay root 并锁滚动，hide() 移除它', () => {
      const originalOverflow = document.documentElement.style.overflow
      const originalOverscrollBehavior = document.documentElement.style.overscrollBehavior
      const el = WebUiSpinner.show()
      expect(getFallbackOverlayRoot().contains(el)).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(document.documentElement.style.overscrollBehavior).toBe('none')

      WebUiSpinner.hide()
      expect(el.isConnected).toBe(false)
      expect(document.documentElement.style.overflow).toBe(originalOverflow)
      expect(document.documentElement.style.overscrollBehavior).toBe(originalOverscrollBehavior)
    })

    it('show() 接受 size、description 与 color', () => {
      const el = WebUiSpinner.show({ size: 40, description: '正在加载数据...', color: 'rebeccapurple' })

      expect(el.size).toBe(40)
      expect(el.description).toBe('正在加载数据...')
      expect(el.color).toBe('rebeccapurple')
    })

    // 全屏 overlay 同时只能有一个：第二次 show 要接管，第一次必须离开文档。
    it('多次 show() 只保留最新一个', () => {
      const originalOverflow = document.documentElement.style.overflow
      const first = WebUiSpinner.show()
      const second = WebUiSpinner.show()

      expect(first.isConnected).toBe(false)
      expect(second.isConnected).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')

      WebUiSpinner.hide()
      expect(document.documentElement.style.overflow).toBe(originalOverflow)
    })

    it('show({ duration }) 到时自动关闭', () => {
      vi.useFakeTimers()
      const originalOverflow = document.documentElement.style.overflow
      const el = WebUiSpinner.show({ duration: 500 })
      expect(el.isConnected).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')

      vi.advanceTimersByTime(500)
      expect(el.isConnected).toBe(false)
      expect(document.documentElement.style.overflow).toBe(originalOverflow)
      vi.useRealTimers()
    })

    it('命令式实例被手动移除时释放页面滚动锁', () => {
      const originalOverflow = document.documentElement.style.overflow
      const el = WebUiSpinner.show()

      el.remove()

      expect(document.documentElement.style.overflow).toBe(originalOverflow)
    })

    it('同一命令式实例重新挂载时不移除自身并保留滚动锁租约', () => {
      const originalOverflow = document.documentElement.style.overflow
      const el = WebUiSpinner.show()
      el.remove()

      getFallbackOverlayRoot().append(el)

      expect(getFallbackOverlayRoot().contains(el)).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')

      WebUiSpinner.hide()
      expect(document.documentElement.style.overflow).toBe(originalOverflow)
    })

    it('duration 为 0 时不自动关闭', () => {
      vi.useFakeTimers()
      const el = WebUiSpinner.show({ duration: 0 })

      vi.advanceTimersByTime(10_000)
      expect(el.isConnected).toBe(true)
      vi.useRealTimers()
    })

    it('hide() 清掉 duration 定时器，隐藏后不再自行关闭', () => {
      vi.useFakeTimers()
      const el = WebUiSpinner.show({ duration: 1000 })
      WebUiSpinner.hide()

      vi.advanceTimersByTime(10_000)
      expect(el.isConnected).toBe(false)
      vi.useRealTimers()
    })

    it('未 show 时 hide() 不报错', () => {
      expect(() => WebUiSpinner.hide()).not.toThrow()
    })
  })
})
