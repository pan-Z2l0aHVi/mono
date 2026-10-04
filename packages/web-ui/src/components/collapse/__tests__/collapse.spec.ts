import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCollapse } from '..'

function createCollapse(
  html = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

const triggerButton = (el: WebUiCollapse): HTMLButtonElement => el.querySelector<HTMLButtonElement>('button.trigger')!

/** 内容区是否已退出可访问性树：默认关闭稳态是 hidden，keep-mounted / peek 稳态是 inert。 */
const contentState = (el: WebUiCollapse): 'hidden' | 'inert' | 'interactive' => {
  const container = el.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-content') as HTMLElement
  const inner = el.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-inner') as HTMLElement
  if (container.hasAttribute('hidden')) return 'hidden'
  return inner.hasAttribute('inert') ? 'inert' : 'interactive'
}

/** peek 的动画写入落在 rAF 回调里；jsdom 无过渡时长，一帧后即落稳态。 */
async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 点击 slot 进来的 trigger button（click 冒泡穿过 trigger wrapper 代理切换）。
async function clickTrigger(el: WebUiCollapse) {
  triggerButton(el).click()
  await waitForUpdate(el)
}

describe('WebUiCollapse 组件', () => {
  describe('初始状态', () => {
    it('默认关闭，内容区退出可访问性树', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(el.hasAttribute('open')).toBe(false)
      expect(contentState(el)).toBe('hidden')
      cleanupElement(el)
    })

    // 初始 open attribute 直接落展开稳态，不播动画（动画那一半见 browser spec）。
    it('初始带 open attribute 时内容可见', async () => {
      const el = createCollapse()
      el.setAttribute('open', '')
      document.body.appendChild(el)
      await waitForUpdate(el)

      expect(contentState(el)).toBe('interactive')
      cleanupElement(el)
    })
  })

  describe('trigger 交互与 ARIA 回写', () => {
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

    // 内容区的 click 不经过 trigger wrapper：点内容不该把面板关掉。
    it('内容区 click 不切换', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.querySelector<HTMLElement>('[slot="content"]')!.click()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    // 嵌套时内层 trigger 的 click 冒泡经过外层，若外层不做路径判定就会连带切换。
    it('嵌套 collapse：内层 trigger 不激活外层', async () => {
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

    // aria-controls 必须指向内容轨道，否则 AT 的关系引用指向不存在的元素。
    it('aria-expanded / aria-controls 回写到 trigger 元素并随状态变化', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      const button = triggerButton(el)
      const track = el.shadowRoot?.querySelector('.wui-collapse-track') as HTMLElement

      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(track.id).not.toBe('')
      expect(button.getAttribute('aria-controls')).toBe(track.id)

      await clickTrigger(el)
      expect(button.getAttribute('aria-expanded')).toBe('true')
      cleanupElement(el)
    })

    // slot 内容可能晚于首帧才到位（framework 的 v-if），回写必须覆盖晚到的 trigger。
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

    // trigger 的语义由 slot 进来的元素提供；组件不强行要求 button，但仍要能代理点击并回写 ARIA。
    it('非 button 的 trigger 同样被回写 ARIA 并驱动开合', async () => {
      const el = createCollapse(
        '<span class="trigger">自定义 <b>触发</b> 内容</span><div slot="content"><p>段落</p></div>'
      )
      await waitForUpdate(el)
      const trigger = el.querySelector<HTMLElement>('span.trigger')!

      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      cleanupElement(el)
    })
  })

  describe('disabled', () => {
    it('disabled 时点击 trigger 不切换 open，也不派发事件', async () => {
      const el = createCollapse()
      el.disabled = true
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      await clickTrigger(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('disabled 回写 trigger 的 aria-disabled，并随属性解除', async () => {
      const el = createCollapse()
      el.disabled = true
      await waitForUpdate(el)
      expect(triggerButton(el).getAttribute('aria-disabled')).toBe('true')

      el.disabled = false
      await waitForUpdate(el)
      expect(triggerButton(el).hasAttribute('aria-disabled')).toBe(false)
      cleanupElement(el)
    })
  })

  describe('关闭稳态的三种语义', () => {
    // 三态是同一份内容的两种「退出可访问性树」手段：默认 display:none（连带卸载布局），
    // keep-mounted / peek 保留挂载并用 inert 阻断交互（保滚动位置、可测量）。
    it.each([
      ['默认：内容容器 hidden', false, null, 'hidden'],
      ['keep-mounted：保留挂载但 inert', true, null, 'inert'],
      ['peek：保留挂载但 inert', false, '120px', 'inert'],
      ['peek 与 keep-mounted 并存：仍 inert', true, '120px', 'inert']
    ])('%s', async (_label, keepMounted, peek, expected) => {
      const el = createCollapse()
      el.keepMounted = keepMounted
      if (peek !== null) el.peek = peek
      await waitForUpdate(el)

      expect(contentState(el)).toBe(expected)
      cleanupElement(el)
    })

    it('展开解除 inert，收起回到原关闭稳态', async () => {
      const el = createCollapse()
      el.keepMounted = true
      await waitForUpdate(el)

      el.open = true
      await waitForUpdate(el)
      expect(contentState(el)).toBe('interactive')

      el.open = false
      await waitForUpdate(el)
      expect(contentState(el)).toBe('inert')
      cleanupElement(el)
    })

    // 运行态改 keep-mounted / peek 时关闭稳态必须在三态之间重新落地，否则会残留上一种模式的痕迹。
    it('关闭稳态下切换 keep-mounted 会重新落地', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      el.open = true
      await waitForUpdate(el)
      el.open = false
      await waitForUpdate(el)
      expect(contentState(el)).toBe('hidden')

      el.keepMounted = true
      await waitForUpdate(el)
      expect(contentState(el)).toBe('inert')

      el.keepMounted = false
      await waitForUpdate(el)
      expect(contentState(el)).toBe('hidden')
      cleanupElement(el)
    })

    it('peek 清空后回落默认关闭稳态', async () => {
      const el = createCollapse()
      el.peek = '120px'
      await waitForUpdate(el)
      expect(contentState(el)).toBe('inert')

      el.peek = null
      await waitForUpdate(el)
      expect(contentState(el)).toBe('hidden')
      cleanupElement(el)
    })

    it('peek 清空但 keep-mounted 仍在：落到 inert 而非 hidden', async () => {
      const el = createCollapse()
      el.peek = '120px'
      el.keepMounted = true
      await waitForUpdate(el)

      el.peek = null
      await waitForUpdate(el)

      expect(contentState(el)).toBe('inert')
      cleanupElement(el)
    })

    // 消费者的 light DOM 永远不移动：组件靠命令式 hidden/inert 管理，不改 slot 内容的位置。
    it('内容节点始终留在消费者侧', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      const content = el.querySelector<HTMLElement>('[slot="content"]')!

      el.open = true
      await waitForUpdate(el)
      el.open = false
      await waitForUpdate(el)

      expect(content.parentElement).toBe(el)
      cleanupElement(el)
    })
  })

  describe('open-change 只由用户手势派发', () => {
    // notification 语义：组件总是自行变更 open，事件只作通知。程序式入口静默，
    // 否则消费者回写属性会与通知形成回环。
    it.each([
      ['设置 open 属性', (el: WebUiCollapse) => void (el.open = true)],
      ['show()', (el: WebUiCollapse) => el.show()],
      ['toggle()', (el: WebUiCollapse) => el.toggle()]
    ])('%s 不派发 open-change', async (_label, act) => {
      const el = createCollapse()
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      act(el)
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it.each([
      ['close()', (el: WebUiCollapse) => el.close(), true],
      ['open=false', (el: WebUiCollapse) => void (el.open = false), true]
    ])('%s 不派发 open-change', async (_label, act, startOpen) => {
      const el = createCollapse()
      if (startOpen) el.open = true
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      act(el)
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('重复写入同一个 open 值不补发通知', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    // detail 的形状是公共契约：消费者按 `{ open }` 解构，多余字段会让它误判。
    it('事件 detail 只含 open 布尔值', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      await clickTrigger(el)

      expect(Object.keys(events[0]?.detail ?? {})).toEqual(['open'])
      cleanupElement(el)
    })

    it('peek 下的开合也不派发程序来源事件', async () => {
      const el = createCollapse()
      el.peek = '120px'
      await waitForUpdate(el)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)
      await nextFrame()
      el.open = false
      await waitForUpdate(el)
      await nextFrame()

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })
})
