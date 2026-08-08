import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTooltip } from '..'

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type)
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

function createTooltip(attrs?: Record<string, string>, slotContent = ''): WebUiTooltip {
  const el = document.createElement('web-ui-tooltip')
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

beforeEach(() => {
  document.body.innerHTML = ''
  // 全量 fake 定时器（含 requestAnimationFrame）；show/hide 延迟与挂载 rAF 由 advance 精确推进
  vi.useFakeTimers()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('WebUiTooltip 组件', () => {
  describe('属性：placement', () => {
    it('默认值为 top', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      expect(el.placement).toBe('top')

      cleanupElement(el)
    })

    it('placement 属性反射到 host', async () => {
      const el = createTooltip({ placement: 'right' })
      await waitForUpdate(el)

      expect(el.getAttribute('placement')).toBe('right')

      cleanupElement(el)
    })

    it('非法值时回退到默认值', async () => {
      const el = createTooltip()
      ;(el as any).placement = 'invalid'
      await waitForUpdate(el)
      expect(el.placement).toBe('top')

      cleanupElement(el)
    })
  })

  describe('属性：content', () => {
    it('通过 content 属性设置文本', async () => {
      const el = createTooltip({ content: '提示文字' })
      await waitForUpdate(el)

      // 先打开 tooltip 以显示面板（保留当前行为：由 pointerenter 触发）
      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)

      const panel = queryA11y(el, '[role="tooltip"]')
      expect(panel?.textContent).toContain('提示文字')

      cleanupElement(el)
    })

    it('Portal 打开期间同步 content 更新', async () => {
      const el = createTooltip({ content: '旧文本' })
      el.portal = true
      el.open = true
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      el.content = '新文本'
      await waitForUpdate(el)

      const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
      const portalHost = root?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
      expect(portalHost?.shadowRoot?.querySelector('[role="tooltip"]')?.textContent).toContain('新文本')

      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 时 host 具有 disabled 属性', async () => {
      const el = createTooltip()
      el.disabled = true
      await waitForUpdate(el)

      expect(el.hasAttribute('disabled')).toBe(true)

      cleanupElement(el)
    })

    it('disabled 时不响应 pointerenter', async () => {
      const el = createTooltip({ disabled: '' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：open', () => {
    it('open=true 显示本地面板并触发 open-change', async () => {
      const el = createTooltip({ content: '提示' })
      const handler = vi.fn<(event: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = true
      await waitForUpdate(el)

      expect(el.hasAttribute('open')).toBe(true)
      expect(el.isOpen).toBe(true)
      expect(queryA11y(el, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(false)
      expect(handler).toHaveBeenCalledOnce()
      expect((handler.mock.calls[0][0] as CustomEvent<{ open: boolean }>).detail).toEqual({ open: true })

      cleanupElement(el)
    })

    it('open=false 隐藏面板并触发 open-change', async () => {
      const el = createTooltip({ content: '提示' })
      el.open = true
      await waitForUpdate(el)

      const handler = vi.fn<(event: Event) => void>()
      el.addEventListener('open-change', handler)
      el.open = false
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
      expect(handler).toHaveBeenCalledOnce()
      expect((handler.mock.calls[0][0] as CustomEvent<{ open: boolean }>).detail).toEqual({ open: false })

      cleanupElement(el)
    })
  })

  describe('属性：portal', () => {
    it('默认关闭且可反射到 host', async () => {
      const el = createTooltip()
      expect(el.portal).toBe(false)

      el.portal = true
      await waitForUpdate(el)

      expect(el.hasAttribute('portal')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('属性：show-delay / hide-delay', () => {
    it('showDelay 默认 200', () => {
      const el = createTooltip()
      expect(el.showDelay).toBe(200)
      cleanupElement(el)
    })

    it('hideDelay 默认 100', () => {
      const el = createTooltip()
      expect(el.hideDelay).toBe(100)
      cleanupElement(el)
    })

    it('showDelay 负值回退到 0', () => {
      const el = createTooltip()
      el.showDelay = -1
      expect(el.showDelay).toBe(0)
      cleanupElement(el)
    })

    it('showDelay 超过上限回退到 5000', () => {
      const el = createTooltip()
      el.showDelay = 9999
      expect(el.showDelay).toBe(5000)
      cleanupElement(el)
    })
  })

  describe('属性：offset', () => {
    it('offset 默认 6', () => {
      const el = createTooltip()
      expect(el.offset).toBe(6)
      cleanupElement(el)
    })

    it('自定义 offset', () => {
      const el = createTooltip()
      el.offset = 12
      expect(el.offset).toBe(12)
      cleanupElement(el)
    })

    it('非法 offset 回退到默认', () => {
      const el = createTooltip()
      ;(el as any).offset = NaN
      expect(el.offset).toBe(6)
      cleanupElement(el)
    })

    it('打开后修改 offset 保持面板可见', async () => {
      const el = createTooltip({ content: '提示' })
      el.open = true
      await waitForUpdate(el)
      el.offset = 12
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(queryA11y(el, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(false)
      cleanupElement(el)
    })
  })

  describe('指针进入/离开', () => {
    it('已有可见 Tooltip 时，相邻 Tooltip 跳过显示延迟', async () => {
      const first = createTooltip({ 'show-delay': '10', content: '第一个' })
      const second = createTooltip({ 'show-delay': '500', content: '第二个' })
      await Promise.all([waitForUpdate(first), waitForUpdate(second)])

      first.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(10)
      await waitForUpdate(first)
      expect(first.isOpen).toBe(true)

      second.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(0)
      await waitForUpdate(second)
      expect(second.isOpen).toBe(true)

      cleanupElement(first)
      cleanupElement(second)
    })

    it('pointerenter 延迟后显示', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      const panel = queryA11y(el, '[role="tooltip"]')
      expect(panel?.hasAttribute('hidden')).toBe(false)

      cleanupElement(el)
    })

    it('pointerleave 延迟后隐藏', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('touch pointerenter 不显示', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(touchPointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('焦点进入/离开', () => {
    it('focusin 立即显示', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('focusout 立即隐藏', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('事件：open-change', () => {
    it('打开时触发', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      cleanupElement(el)
    })

    it('关闭时触发', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('面板有 role="tooltip"', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      const panel = queryA11y(el, '[role="tooltip"]')
      expect(panel).toBeTruthy()

      cleanupElement(el)
    })
  })
})
