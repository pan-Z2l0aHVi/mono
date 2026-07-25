import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

import '..'
import type { WebUiPopover } from '..'

const createPopover = (triggerHtml = '', panelHtml = '', attrs?: Record<string, string>): WebUiPopover => {
  const el = document.createElement('web-ui-popover') as WebUiPopover
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
  const slot = el.shadowRoot!.querySelector('slot[name="trigger"]') as HTMLSlotElement
  const trigger = slot.assignedElements()[0] as HTMLElement
  trigger.click()
}

const getPanel = (el: WebUiPopover) => el.shadowRoot!.querySelector('.popover-panel') as HTMLElement
const getTriggerWrapper = (el: WebUiPopover) => el.shadowRoot!.querySelector('.popover-trigger') as HTMLElement
const getAnchor = (el: WebUiPopover) => el.shadowRoot!.querySelector('.popover-anchor') as HTMLElement

/** 等待 Lit 完成属性变更后的二次渲染（updated 中修改 state 会触发额外 render） */
const waitFor二次渲染 = (el: WebUiPopover) => el.updateComplete.then(() => el.updateComplete)

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiPopover', () => {
  describe('定位', () => {
    it('面板渲染在触发器局部定位容器中', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      expect(getAnchor(el).contains(getPanel(el))).toBe(true)

      el.remove()
    })
  })

  describe('prop: trigger', () => {
    it('默认值为 click', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      expect(el.trigger).toBe('click')

      el.remove()
    })

    it('设置为 hover', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      expect(el.trigger).toBe('hover')

      el.remove()
    })

    it('设置为 manual', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await el.updateComplete

      expect(el.trigger).toBe('manual')

      el.remove()
    })
  })

  describe('prop: open', () => {
    it('默认为关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      expect(el.open).toBe(false)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('设置 open=true 显示面板', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await waitFor二次渲染(el)

      expect(el.isOpen).toBe(true)
      const panel = getPanel(el)
      expect(panel.hidden).toBe(false)

      el.remove()
    })

    it('设置 open=false 关闭面板', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.open = false
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('open 属性反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(false)

      el.remove()
    })
  })

  describe('prop: portal', () => {
    it('默认关闭且可反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      expect(el.portal).toBe(false)

      el.portal = true
      await el.updateComplete

      expect(el.hasAttribute('portal')).toBe(true)
      el.remove()
    })

    it('开启时将面板挂载到指定容器', async () => {
      const el = createPopover('Btn', 'Content')
      const container = document.createElement('div')
      document.body.append(container)
      el.portal = true
      el.overlayContainer = container
      await el.updateComplete

      el.show()
      await waitFor二次渲染(el)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      const panel = container.firstElementChild?.shadowRoot?.querySelector('.popover-panel')
      expect(panel?.classList.contains('portal')).toBe(true)

      el.remove()
      container.remove()
    })
  })

  describe('滚动行为', () => {
    it('打开时不锁定页面滚动', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await waitFor二次渲染(el)

      expect(document.body.style.position).toBe('')

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('禁用时点击不打开', async () => {
      const el = createPopover('Btn', 'Content', { disabled: '' })
      await el.updateComplete

      clickTrigger(el)
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('禁用时 show() 不打开', async () => {
      const el = createPopover('Btn', 'Content')
      el.disabled = true
      await el.updateComplete

      el.show()
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('disabled 属性反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      el.disabled = true
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)

      el.remove()
    })
  })

  describe('prop: placement', () => {
    it('默认值为 bottom', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      expect(el.placement).toBe('bottom')

      el.remove()
    })

    it('设置为 top', async () => {
      const el = createPopover('Btn', 'Content', { placement: 'top' })
      await el.updateComplete

      expect(el.placement).toBe('top')

      el.remove()
    })

    it('placement 属性反射到 host', async () => {
      const el = createPopover('Btn', 'Content')
      el.placement = 'left'
      await el.updateComplete
      expect(el.getAttribute('placement')).toBe('left')

      el.remove()
    })
  })

  describe('prop: offset', () => {
    it('默认值为 8', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      expect(el.offset).toBe(8)

      el.remove()
    })

    it('自定义 offset', async () => {
      const el = createPopover('Btn', 'Content')
      el.offset = 16
      await el.updateComplete
      expect(el.offset).toBe(16)

      el.remove()
    })
  })

  describe('trigger: click', () => {
    it('打开另一个 popover 时关闭当前 popover', async () => {
      const first = createPopover('First', 'First content')
      const second = createPopover('Second', 'Second content')
      await Promise.all([first.updateComplete, second.updateComplete])

      clickTrigger(first)
      await first.updateComplete
      expect(first.isOpen).toBe(true)

      clickTrigger(second)
      await Promise.all([first.updateComplete, second.updateComplete])
      expect(first.isOpen).toBe(false)
      expect(second.isOpen).toBe(true)

      first.remove()
      second.remove()
    })

    it('点击 trigger 切换打开', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('再次点击 trigger 关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('点击外部关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('焦点移出组件后关闭', async () => {
      const el = createPopover('Btn', 'Content')
      const external = document.createElement('button')
      document.body.append(external)
      await el.updateComplete

      const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')
      trigger?.focus()
      clickTrigger(el)
      await waitFor二次渲染(el)

      external.focus()
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await waitFor二次渲染(el)

      expect(el.isOpen).toBe(false)

      el.remove()
      external.remove()
    })

    it('焦点移入面板内容时保持打开', async () => {
      const el = createPopover('Btn', '<input autofocus>')
      await el.updateComplete

      const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')
      trigger?.focus()
      clickTrigger(el)
      await waitFor二次渲染(el)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('Escape 键关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('点击面板内部不关闭', async () => {
      const el = createPopover('Btn', 'Panel content')
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      const panel = getPanel(el)
      panel.click()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })
  })

  describe('trigger: hover', () => {
    it('点击外部不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('hover 打开后点击 trigger 不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      // hover 模式下点击不切换
      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('hover 打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('mouseleave 关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new MouseEvent('mouseleave'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('hover 面板不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      const panel = getPanel(el)
      panel.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('hover 面板后离开关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      const panel = getPanel(el)
      panel.dispatchEvent(new MouseEvent('mouseenter'))
      panel.dispatchEvent(new MouseEvent('mouseleave'))
      await new Promise(r => setTimeout(r, 150))
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('disabled 时不响应 hover', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover', disabled: '' })
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise(r => setTimeout(r, 150))
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('trigger: manual', () => {
    it('点击 trigger 切换打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('点击 trigger 切换关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await el.updateComplete

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('点击外部不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await el.updateComplete

      el.open = true
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('面板内按钮点击可通过设置 open=false 关闭', async () => {
      const el = createPopover('Btn', '', { trigger: 'manual' })
      // 在 light DOM 中添加带按钮的内容
      const btn = document.createElement('button')
      btn.id = 'close-btn'
      btn.textContent = '关闭'
      el.appendChild(btn)
      await el.updateComplete

      el.open = true
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      // 点击面板内的按钮（light DOM）
      btn.click()

      // 模拟受控：外部响应按钮点击设置 open=false
      el.open = false
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('Escape 不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await el.updateComplete

      el.open = true
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('仅由公开 API 或 open prop 控制', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await el.updateComplete

      el.show()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.close()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.toggle()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })
  })

  describe('event: open-change', () => {
    it('打开时触发', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = true
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      el.remove()
    })

    it('关闭时触发', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await waitFor二次渲染(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = false
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)

      el.remove()
    })

    it('通过 show() 触发', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.show()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      el.remove()
    })

    it('通过 close() 触发', async () => {
      const el = createPopover('Btn', 'Content')
      el.show()
      await waitFor二次渲染(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.close()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)

      el.remove()
    })

    it('相同值不重复触发', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.open = true
      await el.updateComplete
      expect(handler).toHaveBeenCalledTimes(1)

      handler.mockClear()
      el.open = true
      await el.updateComplete
      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('Public API', () => {
    it('show() 打开', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      el.show()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('close() 关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      el.show()
      await waitFor二次渲染(el)
      el.close()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('toggle() 切换', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      el.toggle()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.toggle()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('isOpen 返回当前状态', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      expect(el.isOpen).toBe(false)
      el.show()
      await waitFor二次渲染(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })
  })

  describe('render', () => {
    it('渲染 trigger slot', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const slot = el.shadowRoot!.querySelector('slot[name="trigger"]')
      expect(slot).toBeTruthy()

      el.remove()
    })

    it('渲染 default slot', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const slot = el.shadowRoot!.querySelector('slot:not([name])')
      expect(slot).toBeTruthy()

      el.remove()
    })

    it('面板有 role=dialog', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const panel = getPanel(el)
      expect(panel.getAttribute('role')).toBe('dialog')

      el.remove()
    })

    it('面板有 tabindex=-1', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const panel = getPanel(el)
      expect(panel.getAttribute('tabindex')).toBe('-1')

      el.remove()
    })

    it('面板有唯一 id', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const panel = getPanel(el)
      const id = panel.getAttribute('id')
      expect(id).toBeTruthy()
      expect(id).toMatch(/^wui-popover-panel-\d+$/)

      el.remove()
    })

    it('trigger wrapper 有 aria-expanded', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const wrapper = getTriggerWrapper(el)
      expect(wrapper.getAttribute('aria-expanded')).toBe('false')

      el.open = true
      await waitFor二次渲染(el)
      expect(wrapper.getAttribute('aria-expanded')).toBe('true')

      el.remove()
    })

    it('trigger wrapper 有 aria-controls 指向面板 id', async () => {
      const el = createPopover('Btn', 'Content')
      await el.updateComplete

      const wrapper = getTriggerWrapper(el)
      const panel = getPanel(el)
      expect(wrapper.getAttribute('aria-controls')).toBe(panel.getAttribute('id'))

      el.remove()
    })
  })
})
