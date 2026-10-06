import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

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
      expect(el.getAttribute('aria-label')).toBe('加载中')
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
    it('show() 创建并挂载到 body，hide() 移除它', () => {
      const el = WebUiSpinner.show()
      expect(document.body.contains(el)).toBe(true)

      WebUiSpinner.hide()
      expect(document.body.contains(el)).toBe(false)
    })

    it('show() 接受 size 与 description', () => {
      const el = WebUiSpinner.show({ size: 40, description: '正在加载数据...' })

      expect(el.size).toBe(40)
      expect(el.description).toBe('正在加载数据...')
    })

    // 全屏浮层同时只能有一个：第二次 show 要接管，第一次必须离开文档。
    it('多次 show() 只保留最新一个', () => {
      const first = WebUiSpinner.show()
      const second = WebUiSpinner.show()

      expect(document.body.contains(first)).toBe(false)
      expect(document.body.contains(second)).toBe(true)
    })

    it('show({ duration }) 到时自动关闭', () => {
      vi.useFakeTimers()
      const el = WebUiSpinner.show({ duration: 500 })
      expect(document.body.contains(el)).toBe(true)

      vi.advanceTimersByTime(500)
      expect(document.body.contains(el)).toBe(false)
      vi.useRealTimers()
    })

    it('duration 为 0 时不自动关闭', () => {
      vi.useFakeTimers()
      const el = WebUiSpinner.show({ duration: 0 })

      vi.advanceTimersByTime(10_000)
      expect(document.body.contains(el)).toBe(true)
      vi.useRealTimers()
    })

    it('hide() 清掉 duration 定时器，隐藏后不再自行关闭', () => {
      vi.useFakeTimers()
      const el = WebUiSpinner.show({ duration: 1000 })
      WebUiSpinner.hide()

      vi.advanceTimersByTime(10_000)
      expect(document.body.contains(el)).toBe(false)
      vi.useRealTimers()
    })

    it('未 show 时 hide() 不报错', () => {
      expect(() => WebUiSpinner.hide()).not.toThrow()
    })
  })
})
