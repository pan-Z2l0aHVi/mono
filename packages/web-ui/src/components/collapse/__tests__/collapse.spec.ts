import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, expectReflected, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCollapse } from '..'

function createCollapse(
  html = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function queryTriggerButton(el: WebUiCollapse): HTMLButtonElement {
  return el.querySelector<HTMLButtonElement>('button.trigger')!
}

function queryContentNode(el: WebUiCollapse): HTMLElement {
  return el.querySelector<HTMLElement>('[slot="content"]')!
}

// 点击 slot 进来的 trigger button（click 冒泡穿过 trigger wrapper 代理切换）。
async function clickTrigger(el: WebUiCollapse) {
  queryTriggerButton(el).click()
  await waitForUpdate(el)
}

describe('WebUiCollapse 组件', () => {
  describe('属性：open', () => {
    it('默认关闭', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expectReflected(el, 'open', false)

      cleanupElement(el)
    })

    it('open 属性反射到 host 元素', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)
      expectReflected(el, 'open', true)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expectReflected(el, 'open', false)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })

    it('初始 open attribute 直接展开不播动画', async () => {
      const el = createCollapse()
      el.setAttribute('open', '')
      document.body.appendChild(el)
      await waitForUpdate(el)

      const container = el.shadowRoot?.querySelector('.wui-collapse-content') as HTMLElement
      expect(container.hasAttribute('hidden')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('默认不禁用', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      expect(el.disabled).toBe(false)
      expectReflected(el, 'disabled', false)

      cleanupElement(el)
    })

    it('disabled 时点击 trigger 不改变 open', async () => {
      const el = createCollapse()
      el.disabled = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      await clickTrigger(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('disabled 回写 trigger 元素 aria-disabled', async () => {
      const el = createCollapse()
      el.disabled = true
      await waitForUpdate(el)

      expect(queryTriggerButton(el).getAttribute('aria-disabled')).toBe('true')

      el.disabled = false
      await waitForUpdate(el)
      expect(queryTriggerButton(el).hasAttribute('aria-disabled')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：horizontal / keep-mounted', () => {
    it('horizontal 默认垂直（false）且反射', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      expect(el.horizontal).toBe(false)
      expectReflected(el, 'horizontal', false)

      el.horizontal = true
      await waitForUpdate(el)
      expectReflected(el, 'horizontal', true)
      expect(el.getAttribute('horizontal')).toBe('')

      cleanupElement(el)
    })

    it('keep-mounted 默认 false 且反射', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      expect(el.keepMounted).toBe(false)
      expectReflected(el, 'keep-mounted', false)

      el.keepMounted = true
      await waitForUpdate(el)
      expectReflected(el, 'keep-mounted', true)

      cleanupElement(el)
    })
  })

  describe('交互：trigger 点击', () => {
    it('点击 trigger 切换 open 并派发 open-change', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      await clickTrigger(el)
      expect(el.open).toBe(true)
      expect(events).toHaveLength(1)
      expect(events[0]?.detail.open).toBe(true)

      await clickTrigger(el)
      expect(el.open).toBe(false)
      expect(events).toHaveLength(2)
      expect(events[1]?.detail.open).toBe(false)

      cleanupElement(el)
    })

    it('内容区 click 不切换（仅 trigger wrapper 代理）', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      queryContentNode(el).click()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('嵌套 collapse：内层 trigger 不激活外层根', async () => {
      const el = createCollapse(
        '<button class="trigger">Outer</button><div slot="content"><web-ui-collapse id="inner"><button class="trigger">Inner</button><div slot="content">InnerContent</div></web-ui-collapse></div>'
      )
      await waitForUpdate(el)
      const inner = el.querySelector<WebUiCollapse>('#inner')!
      await waitForUpdate(inner)

      const [outerEvents] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      const [innerEvents] = spyEvents<CustomEvent<{ open: boolean }>>(inner, 'open-change')

      inner.querySelector<HTMLButtonElement>('button.trigger')!.click()
      await waitForUpdate(inner)

      expect(inner.open).toBe(true)
      expect(el.open).toBe(false)
      expect(innerEvents).toHaveLength(1)
      // 内层 open-change 冒泡经过外层（bubbles+composed 契约），外层自身不产生事件
      expect(outerEvents.filter(event => event.target === el)).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('ARIA 回写', () => {
    it('aria-expanded / aria-controls 回写到 trigger 元素', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      const button = queryTriggerButton(el)
      expect(button.getAttribute('aria-expanded')).toBe('false')
      // aria-controls 指向 shadow 内 track id
      const track = el.shadowRoot?.querySelector('.wui-collapse-track') as HTMLElement
      expect(track.id).not.toBe('')
      expect(button.getAttribute('aria-controls')).toBe(track.id)

      await clickTrigger(el)
      expect(button.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('trigger slot 后插入元素仍完成 ARIA 回写', async () => {
      const el = createCollapse('<div slot="content">Content</div>')
      await waitForUpdate(el)

      const button = document.createElement('button')
      button.className = 'trigger'
      button.textContent = 'Late trigger'
      el.prepend(button)
      await waitForUpdate(el)

      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(button.getAttribute('aria-controls')).not.toBe('')

      cleanupElement(el)
    })
  })

  describe('事件：open-change', () => {
    it('程序设置 open 不触发 open-change', async () => {
      const el = createCollapse()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('程序关闭不触发 open-change', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = false
      await waitForUpdate(el)

      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('open 值不变时不触发', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('事件 detail 仅包含 open 布尔值', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      await clickTrigger(el)

      expect(Object.keys(events[0]?.detail ?? {})).toEqual(['open'])
      expect(typeof events[0]?.detail.open).toBe('boolean')

      cleanupElement(el)
    })
  })

  describe('命令：show() / close() / toggle()', () => {
    it('show() 打开但不触发 open-change', async () => {
      const el = createCollapse()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.show()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('close() 关闭但不触发 open-change', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })

    it('toggle() 在开合间切换且不触发 open-change', async () => {
      const el = createCollapse()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.toggle()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      el.toggle()
      await waitForUpdate(el)
      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('关闭稳态三态', () => {
    it('默认关闭稳态：content 容器 hidden', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)

      const container = el.shadowRoot?.querySelector('.wui-collapse-content') as HTMLElement
      expect(container.hasAttribute('hidden')).toBe(false)

      el.open = false
      await waitForUpdate(el)

      // jsdom 无计算过渡时长：直接落到稳态 hidden
      expect(container.hasAttribute('hidden')).toBe(true)

      cleanupElement(el)
    })

    it('keep-mounted 关闭稳态：容器不 hidden，inner 设 inert', async () => {
      const el = createCollapse()
      el.keepMounted = true
      await waitForUpdate(el)
      el.open = true
      await waitForUpdate(el)

      const container = el.shadowRoot?.querySelector('.wui-collapse-content') as HTMLElement
      const inner = el.shadowRoot?.querySelector('.wui-collapse-inner') as HTMLElement
      expect(container.hasAttribute('hidden')).toBe(false)

      el.open = false
      await waitForUpdate(el)

      expect(container.hasAttribute('hidden')).toBe(false)
      // inert 设在动画结构内部（公开契约：宿主可见但内容阻断交互）
      expect(inner.getAttribute('inert')).toBe('')

      cleanupElement(el)
    })

    it('关闭稳态下运行时切换 keep-mounted 重新落地 hidden/inert', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      el.open = true
      await waitForUpdate(el)

      const container = el.shadowRoot?.querySelector('.wui-collapse-content') as HTMLElement
      const inner = el.shadowRoot?.querySelector('.wui-collapse-inner') as HTMLElement

      // 默认关闭稳态 hidden → 切 keep-mounted 应转为内部 inert
      el.open = false
      await waitForUpdate(el)
      expect(container.hasAttribute('hidden')).toBe(true)

      el.keepMounted = true
      await waitForUpdate(el)
      expect(container.hasAttribute('hidden')).toBe(false)
      expect(inner.getAttribute('inert')).toBe('')

      // 反向：keep-mounted 关闭稳态 → 切回默认应转为容器 hidden
      el.keepMounted = false
      await waitForUpdate(el)
      expect(container.hasAttribute('hidden')).toBe(true)
      expect(inner.hasAttribute('inert')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('内容投影', () => {
    it('trigger 与 content 支持任意 slot 内容', async () => {
      const el = createCollapse(
        '<span class="trigger">自定义 <b>触发</b> 内容</span><div slot="content"><p>段落</p><ul><li>列表</li></ul></div>'
      )
      await waitForUpdate(el)

      expect(el.querySelector('.trigger')?.textContent).toContain('自定义')
      const content = queryContentNode(el)
      expect(content.querySelector('p')).toBeTruthy()
      expect(content.querySelector('li')).toBeTruthy()

      cleanupElement(el)
    })

    it('light DOM 永不移动：content 节点始终留在消费者侧', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      el.open = true
      await waitForUpdate(el)
      el.open = false
      await waitForUpdate(el)

      const content = queryContentNode(el)
      expect(content.parentElement).toBe(el)
      expect(el.contains(content)).toBe(true)

      cleanupElement(el)
    })
  })
})
