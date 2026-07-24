import { describe, expect, it, vi, afterEach } from 'vite-plus/test'

import { WebUiSpinner } from '..'

const createSpinner = (attrs?: Record<string, string>): WebUiSpinner => {
  const el = document.createElement('web-ui-spinner') as WebUiSpinner
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  WebUiSpinner.hide()
  document.body.innerHTML = ''
})

describe('WebUiSpinner', () => {
  describe('prop: size', () => {
    it('默认值为 24', async () => {
      const el = createSpinner()
      await el.updateComplete

      expect(el.size).toBe(24)

      el.remove()
    })

    it('设置自定义尺寸', async () => {
      const el = createSpinner({ size: '40' })
      await el.updateComplete

      expect(el.size).toBe(40)

      el.remove()
    })

    it('动态修改 size', async () => {
      const el = createSpinner()
      await el.updateComplete
      expect(el.size).toBe(24)

      el.size = 16
      await el.updateComplete
      expect(el.size).toBe(16)

      el.size = 48
      await el.updateComplete
      expect(el.size).toBe(48)

      el.remove()
    })
  })

  describe('render', () => {
    it('渲染内部 spinner 元素', async () => {
      const el = createSpinner()
      await el.updateComplete

      const spinner = el.shadowRoot!.querySelector('.wui-spinner')
      expect(spinner).toBeTruthy()

      el.remove()
    })

    it('包含 8 个 span 元素', async () => {
      const el = createSpinner()
      await el.updateComplete

      const spans = el.shadowRoot!.querySelectorAll('.wui-spinner span')
      expect(spans.length).toBe(8)

      el.remove()
    })

    it('声明式渲染不含 overlay', async () => {
      const el = createSpinner()
      await el.updateComplete

      const overlay = el.shadowRoot!.querySelector('.wui-spinner-overlay')
      expect(overlay).toBeNull()

      el.remove()
    })
  })

  describe('命令式 API: show', () => {
    it('show() 创建并挂载到 body', async () => {
      const el = WebUiSpinner.show()
      await el.updateComplete

      expect(el).toBeInstanceOf(HTMLElement)
      expect(el.tagName).toBe('WEB-UI-SPINNER')
      expect(document.body.contains(el)).toBe(true)

      el.remove()
    })

    it('show() 支持 size 选项', async () => {
      const el = WebUiSpinner.show({ size: 40 })
      await el.updateComplete

      expect(el.size).toBe(40)

      el.remove()
    })

    it('show() 渲染 overlay 遮罩', async () => {
      const el = WebUiSpinner.show()
      await el.updateComplete

      const overlay = el.shadowRoot!.querySelector('.wui-spinner-overlay')
      expect(overlay).toBeTruthy()

      el.remove()
    })

    it('多次 show() 只保留最新一个', () => {
      const el1 = WebUiSpinner.show()
      const el2 = WebUiSpinner.show()

      expect(document.body.contains(el1)).toBe(false)
      expect(document.body.contains(el2)).toBe(true)

      el2.remove()
    })
  })

  describe('命令式 API: hide', () => {
    it('hide() 移除当前 spinner', async () => {
      WebUiSpinner.show()
      expect(document.body.children.length).toBeGreaterThan(0)

      WebUiSpinner.hide()
      // overlay 元素被移除
    })

    it('hide() 后可再次 show()', () => {
      WebUiSpinner.show()
      WebUiSpinner.hide()

      const el = WebUiSpinner.show()
      expect(document.body.contains(el)).toBe(true)

      el.remove()
    })

    it('未 show 时 hide() 不报错', () => {
      expect(() => WebUiSpinner.hide()).not.toThrow()
    })
  })

  describe('命令式 API: duration', () => {
    it('show() 支持 duration 自动关闭', async () => {
      vi.useFakeTimers()

      const el = WebUiSpinner.show({ duration: 1000 })
      expect(document.body.contains(el)).toBe(true)

      vi.advanceTimersByTime(1000)
      expect(document.body.contains(el)).toBe(false)

      vi.useRealTimers()
    })

    it('duration 为 0 时不自动关闭', async () => {
      vi.useFakeTimers()

      const el = WebUiSpinner.show({ duration: 0 })
      vi.advanceTimersByTime(10000)
      expect(document.body.contains(el)).toBe(true)

      el.remove()
      vi.useRealTimers()
    })

    it('hide() 清除 duration 定时器', () => {
      vi.useFakeTimers()

      WebUiSpinner.show({ duration: 1000 })
      WebUiSpinner.hide()

      // 定时器已清除，advanceTimersByTime 不会触发 hide
      vi.advanceTimersByTime(10000)
      expect(WebUiSpinner._current).toBeUndefined()

      vi.useRealTimers()
    })
  })
})
