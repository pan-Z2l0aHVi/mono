import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiTooltip } from '..'

function createTooltip(attrs?: Record<string, string>, slotContent = ''): WebUiTooltip {
  const el = document.createElement('web-ui-tooltip') as WebUiTooltip
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  const inner = `<button>Hover me</button>${slotContent ? `<span slot="content">${slotContent}</span>` : ''}`
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

describe('WebUiTooltip', () => {
  describe('基础渲染', () => {
    it('渲染触发器插槽', async () => {
      const el = createTooltip()
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.tooltip-trigger')
      expect(trigger).toBeTruthy()

      el.remove()
    })

    it('面板默认隐藏', async () => {
      const el = createTooltip()
      await el.updateComplete

      const panel = el.shadowRoot?.querySelector('.tooltip-panel')
      expect(panel?.classList.contains('hidden')).toBe(true)

      el.remove()
    })

    it('通过 content 属性渲染文本', async () => {
      const el = createTooltip({ content: '提示文字' })
      await el.updateComplete

      const text = el.shadowRoot?.querySelector('.tooltip-text')
      expect(text?.textContent).toBe('提示文字')

      el.remove()
    })

    it('通过 content 插槽渲染富内容', async () => {
      const el = createTooltip({}, '<strong>富文本</strong>')
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector('slot[name="content"]')
      expect(slot).toBeTruthy()

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 时 host 具有 disabled 属性', async () => {
      const el = createTooltip()
      el.disabled = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)

      el.remove()
    })
  })

  describe('prop: placement', () => {
    it('placement 属性反射到 host', async () => {
      const el = createTooltip({ placement: 'right' })
      await el.updateComplete

      expect(el.getAttribute('placement')).toBe('right')

      el.remove()
    })
  })

  describe('prop: open', () => {
    it('open 属性反射到 host', async () => {
      const el = createTooltip()
      el.open = true
      await el.updateComplete

      expect(el.hasAttribute('open')).toBe(true)

      el.remove()
    })
  })

  describe('prop: show-delay / hide-delay', () => {
    it('showDelay 默认 200', () => {
      const el = createTooltip()
      expect(el.showDelay).toBe(200)
      el.remove()
    })

    it('hideDelay 默认 100', () => {
      const el = createTooltip()
      expect(el.hideDelay).toBe(100)
      el.remove()
    })
  })

  describe('事件', () => {
    it('打开时触发 open-change 事件', async () => {
      const el = createTooltip({ content: '提示' })
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      await new Promise(r => setTimeout(r, 250))
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { open: true }
        })
      )

      el.remove()
    })

    it('关闭时触发 open-change 事件', async () => {
      const el = createTooltip({ content: '提示' })
      await el.updateComplete

      // 先打开
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      await new Promise(r => setTimeout(r, 250))
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('open-change', handler)

      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      await new Promise(r => setTimeout(r, 150))
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { open: false }
        })
      )

      el.remove()
    })
  })
})
