import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiInputNumber } from '..'

const createNumber = (attrs?: Record<string, string>): WebUiInputNumber => {
  const el = document.createElement('web-ui-input-number') as WebUiInputNumber
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiInputNumber', () => {
  describe('基础渲染', () => {
    it('渲染两个加减按钮', async () => {
      const el = createNumber()
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      expect(btns?.length).toBe(2)

      el.remove()
    })

    it('渲染 number input', async () => {
      const el = createNumber()
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('number')

      el.remove()
    })

    it('默认 value 为 0', async () => {
      const el = createNumber()
      await el.updateComplete

      expect(el.value).toBe(0)

      el.remove()
    })

    it('value 属性反射到 host', async () => {
      const el = createNumber()
      el.value = 5
      await el.updateComplete

      expect(el.getAttribute('value')).toBe('5')

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 时按钮不可点击', async () => {
      const el = createNumber()
      el.disabled = true
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      expect(btns).toBeTruthy()
      expect((btns![0] as HTMLButtonElement).disabled).toBe(true)
      expect((btns![1] as HTMLButtonElement).disabled).toBe(true)

      el.remove()
    })

    it('disabled 时 input 被 disabled', async () => {
      const el = createNumber()
      el.disabled = true
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.disabled).toBe(true)

      el.remove()
    })
  })

  describe('加减操作', () => {
    it('点击 + 按钮增加 1', async () => {
      const el = createNumber()
      el.value = 5
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![1] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe(6)

      el.remove()
    })

    it('点击 − 按钮减少 1', async () => {
      const el = createNumber()
      el.value = 5
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![0] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe(4)

      el.remove()
    })

    it('点击 + 触发 input 事件', async () => {
      const el = createNumber()
      el.value = 0
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('input', handler)

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![1] as HTMLElement).click()

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('disabled 时点击按钮不触发事件', async () => {
      const el = createNumber()
      el.disabled = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('input', handler)

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![1] as HTMLElement).click()

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('prop: min / max', () => {
    it('到达 min 时减号按钮被禁用', async () => {
      const el = createNumber()
      el.value = 0
      el.min = 0
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      expect((btns![0] as HTMLButtonElement).disabled).toBe(true)
      expect((btns![1] as HTMLButtonElement).disabled).toBe(false)

      el.remove()
    })

    it('到达 max 时加号按钮被禁用', async () => {
      const el = createNumber()
      el.value = 10
      el.max = 10
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      expect((btns![0] as HTMLButtonElement).disabled).toBe(false)
      expect((btns![1] as HTMLButtonElement).disabled).toBe(true)

      el.remove()
    })

    it('到达 min 后不能再减少', async () => {
      const el = createNumber()
      el.value = 0
      el.min = 0
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![0] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe(0)

      el.remove()
    })

    it('到达 max 后不能再增加', async () => {
      const el = createNumber()
      el.value = 10
      el.max = 10
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![1] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe(10)

      el.remove()
    })

    it('设置超出范围的 value 自动 clamp', async () => {
      const el = createNumber()
      el.min = 0
      el.max = 100
      el.value = 200
      await el.updateComplete

      expect(el.value).toBe(100)

      el.remove()
    })
  })

  describe('prop: precision', () => {
    it('默认 precision 为 0（整数）', async () => {
      const el = createNumber()
      expect(el.precision).toBe(0)

      el.remove()
    })

    it('precision=1 保留一位小数', async () => {
      const el = createNumber()
      el.precision = 1
      el.value = 1.26
      await el.updateComplete

      expect(el.value).toBe(1.3)

      el.remove()
    })

    it('precision=2 保留两位小数', async () => {
      const el = createNumber()
      el.precision = 2
      el.value = 1.234
      await el.updateComplete

      expect(el.value).toBe(1.23)

      el.remove()
    })

    it('precision=1 步进 0.1', async () => {
      const el = createNumber()
      el.precision = 1
      el.value = 1.0
      await el.updateComplete

      const btns = el.shadowRoot?.querySelectorAll('.num-btn')
      ;(btns![1] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe(1.1)

      el.remove()
    })
  })

  describe('玻璃样式', () => {
    it('容器具有 wui-glass 类', async () => {
      const el = createNumber()
      await el.updateComplete

      const wrapper = el.shadowRoot?.querySelector('.wui-glass')
      expect(wrapper).toBeTruthy()

      el.remove()
    })
  })
})
