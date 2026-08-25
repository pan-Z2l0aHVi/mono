import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { WebUiSpinner } from '..'
import '..'

describe('WebUiSpinner 组件', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('默认属性与反射（合并）', () => {
    it('默认值与反射符合契约', async () => {
      const el = document.createElement('web-ui-spinner')
      document.body.appendChild(el)
      await el.updateComplete
      expect(el.size).toBe(24)
      expect(el.getAttribute('role')).toBe('status')
      expect(el.getAttribute('aria-label')).toBe('加载中')
      el.size = 40
      await el.updateComplete
      expect(el.getAttribute('size')).toBe('40')
      el.setAttribute('size', '32')
      await el.updateComplete
      expect(el.size).toBe(32)
    })

    it('description slot 与原生组合', async () => {
      const el = document.createElement('web-ui-spinner')
      const slotContent = document.createElement('span')
      slotContent.slot = 'description'
      slotContent.textContent = '请稍候'
      document.body.appendChild(el)
      el.appendChild(slotContent)
      await el.updateComplete
      expect(el.querySelector('[slot="description"]')).toBeTruthy()
      expect(el.getAttribute('role')).toBe('status')
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
      // 定时器已清除，advanceTimersByTime 不会触发 hide 回调
      expect(document.body.contains(el)).toBe(false)
    })
  })
})
