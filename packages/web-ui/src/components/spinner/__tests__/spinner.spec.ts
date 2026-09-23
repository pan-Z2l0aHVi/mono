import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { cleanupElement, mountElement, waitForUpdate } from '@/shared/test-utils'

import { WebUiSpinner } from '..'
import '..'

describe('WebUiSpinner 组件', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  describe('默认属性与反射', () => {
    it('默认值与反射符合契约', async () => {
      const el = mountElement<WebUiSpinner>('web-ui-spinner')
      await waitForUpdate(el)
      expect(el.size).toBe(24)
      expect(el.getAttribute('role')).toBe('status')
      expect(el.getAttribute('aria-label')).toBe('加载中')
      el.size = 40
      await waitForUpdate(el)
      expect(el.getAttribute('size')).toBe('40')
      el.setAttribute('size', '32')
      await waitForUpdate(el)
      expect(el.size).toBe(32)
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

    it('description 属性渲染为可见文本', async () => {
      const el = mountElement<WebUiSpinner>('web-ui-spinner')
      await waitForUpdate(el)
      el.description = '正在加载数据...'
      await waitForUpdate(el)
      expect(el.shadowRoot?.textContent).toContain('正在加载数据...')
      cleanupElement(el)
    })

    it('description slot 与原生组合', async () => {
      const el = mountElement<WebUiSpinner>('web-ui-spinner')
      const slotContent = document.createElement('span')
      slotContent.slot = 'description'
      slotContent.textContent = '请稍候'
      el.appendChild(slotContent)
      await waitForUpdate(el)
      expect(el.querySelector('[slot="description"]')).toBeTruthy()
      expect(el.getAttribute('role')).toBe('status')
      cleanupElement(el)
    })
  })

  describe('命令式 API: show', () => {
    afterEach(() => {
      vi.useRealTimers()
      WebUiSpinner.hide()
    })

    it('show() 创建并挂载到 body', async () => {
      const el = WebUiSpinner.show()

      await el.updateComplete

      expect(document.body.contains(el)).toBe(true)
      el.remove()
    })

    it('show() 支持 size 和 description 选项', async () => {
      const el = WebUiSpinner.show({ size: 40, description: '正在加载数据...' })

      await el.updateComplete

      expect(el.size).toBe(40)
      expect(el.description).toBe('正在加载数据...')
      el.remove()
    })

    it('多次 show() 只保留最新一个', () => {
      const el1 = WebUiSpinner.show()
      const el2 = WebUiSpinner.show()

      expect(document.body.contains(el1)).toBe(false)
      expect(document.body.contains(el2)).toBe(true)
      el2.remove()
    })

    it('show() 支持 duration 自动关闭', async () => {
      vi.useFakeTimers()

      const el = WebUiSpinner.show({ duration: 500 })
      expect(document.body.contains(el)).toBe(true)

      vi.advanceTimersByTime(500)
      expect(document.body.contains(el)).toBe(false)
    })

    it('duration 为 0 时不自动关闭', () => {
      vi.useFakeTimers()

      const el = WebUiSpinner.show({ duration: 0 })
      vi.advanceTimersByTime(10000)
      expect(document.body.contains(el)).toBe(true)

      el.remove()
    })
  })

  describe('命令式 API: hide', () => {
    it('hide() 移除当前 spinner', () => {
      const el = WebUiSpinner.show()

      expect(document.body.contains(el)).toBe(true)
      WebUiSpinner.hide()
      expect(document.body.contains(el)).toBe(false)
    })

    it('未 show 时 hide() 不报错', () => {
      expect(() => WebUiSpinner.hide()).not.toThrow()
    })

    it('hide() 清除 duration 定时器', () => {
      vi.useFakeTimers()

      const el = WebUiSpinner.show({ duration: 1000 })
      WebUiSpinner.hide()

      vi.advanceTimersByTime(10000)
      expect(document.body.contains(el)).toBe(false)
    })
  })
})
