import '..'
import '@/components/button'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { cleanupElement, contractReflection, getPortalPanel, queryA11y, waitForUpdate } from '@/shared/test-utils'

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
    contractReflection('placement 反射到宿主 attribute', () => createTooltip(), [
      ['placement', 'right', 'placement', 'right']
    ])

    it('非法值时回退到默认值', async () => {
      const el = createTooltip()
      ;(el as any).placement = 'invalid'
      await waitForUpdate(el)
      expect(el.placement).toBe('top')

      cleanupElement(el)
    })
  })

  describe('属性：trigger', () => {
    // 默认集合就是「悬停 + 键盘聚焦」，即指针与焦点两组的取值来源；这里只钉集合语义本身。
    it('默认是 hover,focus', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      expect(el.trigger).toBe('hover,focus')

      cleanupElement(el)
    })

    it('非字符串取值回退到默认', () => {
      const el = createTooltip()
      el.trigger = ['focus', 'hover'] as unknown as string

      expect(el.trigger).toBe('hover,focus')

      cleanupElement(el)
    })

    // 取值经规范化，回写下来的 attribute 保留原样输入（Lit 不回写来自 attribute 通道的变更），
    // 因此这里只钉 property。
    it('未知 token 丢弃；全部未知时回退到默认', () => {
      const partial = createTooltip({ trigger: 'click tap' })
      const unknown = createTooltip({ trigger: 'tap' })

      expect(partial.trigger).toBe('click')
      expect(unknown.trigger).toBe('hover,focus')

      cleanupElement(partial)
      cleanupElement(unknown)
    })

    it('旧字面量 manual 视为未知 token，不生效', () => {
      const el = createTooltip({ trigger: 'hover manual' })

      expect(el.trigger).toBe('hover')

      cleanupElement(el)
    })
  })

  describe('属性：content', () => {
    it('通过 content 属性设置文本', async () => {
      const el = createTooltip({ content: '提示文字' })
      await waitForUpdate(el)

      // 先打开 tooltip 以显示 panel（保留当前行为：由 pointerenter 触发）
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

      const panel = getPortalPanel('tooltip')
      expect(panel?.textContent).toContain('新文本')

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

    it('打开期间禁用会立即关闭 tooltip', async () => {
      const el = createTooltip({ content: '提示' })
      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.disabled = true
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
      expect(queryA11y(el, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(true)

      cleanupElement(el)
    })

    it('禁用会取消等待中的显示延迟', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      el.disabled = true
      await waitForUpdate(el)

      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('disabled 时直接设置 open 也不会重新打开', async () => {
      const el = createTooltip({ disabled: '', content: '提示' })
      await waitForUpdate(el)

      el.open = true
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
      expect(queryA11y(el, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(true)

      cleanupElement(el)
    })

    it('重新启用后打开不受 disabled 期间 pointerleave 影响', async () => {
      const el = createTooltip({ 'hide-delay': '100', content: '提示' })
      el.open = true
      await waitForUpdate(el)

      el.disabled = true
      await waitForUpdate(el)
      el.dispatchEvent(new PointerEvent('pointerleave'))

      el.disabled = false
      await waitForUpdate(el)
      el.open = true
      await waitForUpdate(el)

      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：open', () => {
    it('open=true 显示本地 panel 并反射到 host attribute', async () => {
      const el = createTooltip({ content: '提示' })

      el.open = true
      await waitForUpdate(el)

      expect(el.hasAttribute('open')).toBe(true)
      expect(el.isOpen).toBe(true)
      expect(queryA11y(el, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(false)

      cleanupElement(el)
    })

    it('open=false 隐藏 panel', async () => {
      const el = createTooltip({ content: '提示' })
      el.open = true
      await waitForUpdate(el)

      el.open = false
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('内容门控', () => {
    it('没有内容时悬停不显示', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(el.showDelay)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('关闭态新增内容不自动显示', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      const content = document.createElement('span')
      content.slot = 'content'
      content.textContent = '提示'
      el.append(content)
      await Promise.resolve()
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('show() 可以空开；内容从有到无才收起', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      const content = document.createElement('span')
      content.slot = 'content'
      content.textContent = '提示'
      el.append(content)
      await Promise.resolve()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      content.remove()
      await Promise.resolve()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：portal', () => {
    it('默认关闭', async () => {
      const el = createTooltip()
      expect(el.portal).toBe(false)

      cleanupElement(el)
    })

    contractReflection('portal 反射到宿主 attribute', () => createTooltip(), [['portal', true, 'portal', '']])
  })

  describe('属性：show-delay / hide-delay', () => {
    // 默认 200 / 100 在下面的「指针进入/离开」两条里被行为覆盖（推进 200ms 才出现、
    // 推进 100ms 才消失）。这里只钉取值边界：负值回退 0，超上限回退 5000。
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
    // 打开态改 offset 属于状态转换（政策 §3）：panel 必须仍然可见，不能因为重定位
    // 被重新隐藏。判据取 panel 的公开 `hidden` 后果，不读定位器的内部状态。
    it('打开态修改 offset 后 panel 仍可见', async () => {
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

    it('非法 offset 回退到默认', () => {
      const el = createTooltip()
      ;(el as any).offset = NaN
      expect(el.offset).toBe(6)
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
      vi.advanceTimersByTime(el.showDelay - 1)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      vi.advanceTimersByTime(1)
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

  describe('触发方式：click', () => {
    it('点击 trigger 打开，再次点击关闭', async () => {
      const el = createTooltip({ trigger: 'click', content: '提示' })
      await waitForUpdate(el)
      const trigger = el.querySelector<HTMLElement>('button')!

      trigger.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      trigger.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击 trigger 之外的位置关闭', async () => {
      const el = createTooltip({ trigger: 'click', content: '提示' })
      await waitForUpdate(el)

      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击 panel 内容不关闭', async () => {
      const el = createTooltip({ trigger: 'click', content: '提示' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      queryA11y(el, '[role="tooltip"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('click 集合下悬停不参与开合，失焦仍关闭', async () => {
      const el = createTooltip({ trigger: 'click', content: '提示' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      el.open = true
      await waitForUpdate(el)
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('disabled 时点击不打开', async () => {
      const el = createTooltip({ trigger: 'click', content: '提示', disabled: '' })
      await waitForUpdate(el)

      el.querySelector<HTMLElement>('button')?.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('none 集合下点击与悬停都不打开，open 仍可用', async () => {
      const el = createTooltip({ trigger: 'none', content: '提示' })
      await waitForUpdate(el)

      el.querySelector<HTMLElement>('button')?.click()
      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  // 焦点可见性（键盘 focusin 显示、指针 focusin 不显示）需要真实引擎判断 `:focus-visible`，
  // 由同目录 `focus.browser.spec.ts` 覆盖；这里只保留 jsdom 能确定证明的关闭路径。
  describe('焦点离开', () => {
    it('focusout 立即隐藏', async () => {
      const el = createTooltip({ content: '提示' })
      await waitForUpdate(el)

      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('panel 有 role="tooltip"', async () => {
      const el = createTooltip()
      await waitForUpdate(el)

      const panel = queryA11y(el, '[role="tooltip"]')
      expect(panel).toBeTruthy()

      cleanupElement(el)
    })
  })
})
