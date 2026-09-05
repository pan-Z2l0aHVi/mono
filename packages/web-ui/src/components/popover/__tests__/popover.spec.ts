import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiPopover } from '..'

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type)
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

const createPopover = (triggerHtml = '', panelHtml = '', attrs?: Record<string, string>): WebUiPopover => {
  const el = document.createElement('web-ui-popover')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = `
    <button slot="trigger">${triggerHtml}</button>
    <div>${panelHtml}</div>
  `
  document.body.appendChild(el)
  return el
}

const clickTrigger = (el: WebUiPopover) => {
  const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')
  trigger?.click()
}

beforeEach(() => {
  document.body.innerHTML = ''
  // 全量 fake 定时器（含 requestAnimationFrame）；组件内部 rAF 与 setTimeout
  // 均由 advanceTimersToNextFrame / advanceTimersByTime 精确推进
  vi.useFakeTimers()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('WebUiPopover 组件', () => {
  describe('属性：trigger', () => {
    it('默认值为 click', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      expect(el.trigger).toBe('click')

      cleanupElement(el)
    })

    it('设置为 hover', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      expect(el.trigger).toBe('hover')

      cleanupElement(el)
    })

    it('设置为 manual', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await waitForUpdate(el)

      expect(el.trigger).toBe('manual')

      cleanupElement(el)
    })
  })

  describe('属性：open', () => {
    it('默认为关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('设置 open=true 显示面板', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      const panel = queryA11y(el, '[role="dialog"]')
      expect(panel?.hasAttribute('hidden')).toBe(false)

      cleanupElement(el)
    })

    it('设置 open=false 关闭面板', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('open 属性反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：portal', () => {
    it('默认关闭且可反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      expect(el.portal).toBe(false)

      el.portal = true
      await waitForUpdate(el)

      expect(el.hasAttribute('portal')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('禁用时点击不打开', async () => {
      const el = createPopover('Btn', 'Content', { disabled: '' })
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('禁用时 show() 不打开', async () => {
      const el = createPopover('Btn', 'Content')
      el.disabled = true
      await waitForUpdate(el)

      el.show()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('disabled 属性反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：placement', () => {
    it('默认值为 bottom', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      expect(el.placement).toBe('bottom')

      cleanupElement(el)
    })

    it('设置为 top', async () => {
      const el = createPopover('Btn', 'Content', { placement: 'top' })
      await waitForUpdate(el)

      expect(el.placement).toBe('top')

      cleanupElement(el)
    })

    it('placement 属性反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      el.placement = 'left'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('left')

      cleanupElement(el)
    })

    it('非法值时回退到默认值', async () => {
      const el = createPopover('Btn', 'Content')
      ;(el as any).placement = 'invalid'
      await waitForUpdate(el)
      expect(el.placement).toBe('bottom')

      cleanupElement(el)
    })
  })

  describe('属性：offset', () => {
    it('默认值为 8', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      expect(el.offset).toBe(8)

      cleanupElement(el)
    })

    it('自定义 offset', async () => {
      const el = createPopover('Btn', 'Content')
      el.offset = 16
      await waitForUpdate(el)
      expect(el.offset).toBe(16)

      cleanupElement(el)
    })

    it('打开后修改 placement 和 offset 保持面板可见', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await waitForUpdate(el)
      el.placement = 'top'
      el.offset = 16
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).toBe(false)
      cleanupElement(el)
    })

    it('负值回退到 0', async () => {
      const el = createPopover('Btn', 'Content')
      el.offset = -10
      await waitForUpdate(el)
      expect(el.offset).toBe(0)

      cleanupElement(el)
    })

    it('过大值回退到上限', async () => {
      const el = createPopover('Btn', 'Content')
      el.offset = 999
      await waitForUpdate(el)
      expect(el.offset).toBe(100)

      cleanupElement(el)
    })
  })

  describe('触发方式：click', () => {
    it('点击 trigger 切换打开', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      clickTrigger(el)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('再次点击 trigger 关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      clickTrigger(el)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击外部关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('Escape 键关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击面板内部不关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      const panel = queryA11y(el, '[role="dialog"]')
      panel?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('触发方式：hover', () => {
    it('pointerenter 打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('pointerleave 关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('touch pointerenter 不打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(touchPointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('hover 模式下点击外部不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('disabled 时不响应 hover', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover', disabled: '' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('触发方式：manual', () => {
    it('点击 trigger 切换打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await waitForUpdate(el)

      clickTrigger(el)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('点击外部不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('Escape 不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('仅由公开 API 或 open prop 控制', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await waitForUpdate(el)

      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.close()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      el.toggle()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('事件：open-change', () => {
    it('程序打开不触发', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = true
      await waitForUpdate(el)

      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('程序关闭不触发', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = false
      await waitForUpdate(el)

      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('通过 show() 不触发', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.show()
      await waitForUpdate(el)

      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('通过 close() 不触发', async () => {
      const el = createPopover('Btn', 'Content')
      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.close()
      await waitForUpdate(el)

      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('相同值不重复触发', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = true
      await waitForUpdate(el)
      expect(handler).not.toHaveBeenCalled()

      handler.mockClear()
      el.open = true
      await waitForUpdate(el)
      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('hover 重入不让后续命令式关闭派发残留事件', async () => {
      vi.useFakeTimers()
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      el.show()
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)
      el.dispatchEvent(new PointerEvent('pointerenter'))
      await vi.advanceTimersByTimeAsync(100)
      el.close()
      await waitForUpdate(el)

      expect(handler).not.toHaveBeenCalled()
      vi.useRealTimers()
      cleanupElement(el)
    })
  })

  describe('公开 API', () => {
    it('show() 打开', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('close() 关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      el.close()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('toggle() 切换', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.toggle()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.toggle()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('isOpen 返回当前状态', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('面板有 role="dialog"', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const panel = queryA11y(el, '[role="dialog"]')
      expect(panel).toBeTruthy()

      cleanupElement(el)
    })

    it('trigger wrapper 有 aria-expanded', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const wrapper = el.shadowRoot?.querySelector('[aria-expanded]')
      expect(wrapper?.getAttribute('aria-expanded')).toBe('false')

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(wrapper?.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('aria-expanded / aria-controls 回写到 trigger 元素', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')!
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      expect(trigger.getAttribute('aria-controls')).toBe(el.shadowRoot?.querySelector('[role="dialog"]')?.id)

      clickTrigger(el)
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })
  })
})
