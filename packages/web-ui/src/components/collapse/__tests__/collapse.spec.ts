import { describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/collapse-content'
import '@/components/collapse-trigger'
import type { WebUiCollapseContent } from '@/components/collapse-content'
import type { WebUiCollapseTrigger } from '@/components/collapse-trigger'
import { cleanupElement, expectReflected, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCollapse } from '..'

function createCollapse(
  html = '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content>Content</web-ui-collapse-content>'
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function queryTrigger(el: WebUiCollapse): WebUiCollapseTrigger {
  return el.querySelector<WebUiCollapseTrigger>('web-ui-collapse-trigger')!
}

function queryContent(el: WebUiCollapse): WebUiCollapseContent {
  return el.querySelector<WebUiCollapseContent>('web-ui-collapse-content')!
}

// 点击 trigger 内部真实 button（shadow 内），click 经 composed path 冒泡到根。
async function clickTrigger(el: WebUiCollapse) {
  const button = queryA11y(queryTrigger(el), 'button') as HTMLElement
  button.click()
  await waitForUpdate(el)
  // 根的 open 写入 → content 的 context 同步在 GroupController.hostUpdated 里进行
  await waitForUpdate(queryTrigger(el))
  await waitForUpdate(queryContent(el))
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
      await waitForUpdate(queryContent(el))

      expect(queryContent(el).getAttribute('hidden')).toBe(null)

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

    it('disabled 反射到 trigger 内部 button', async () => {
      const el = createCollapse()
      el.disabled = true
      await waitForUpdate(el)
      await waitForUpdate(queryTrigger(el))

      const button = queryA11y(queryTrigger(el), 'button') as HTMLButtonElement
      expect(button.disabled).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：horizontal', () => {
    it('默认垂直（false）', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      expect(el.horizontal).toBe(false)
      expectReflected(el, 'horizontal', false)

      cleanupElement(el)
    })

    it('horizontal 反射到 host 元素', async () => {
      const el = createCollapse()
      el.horizontal = true
      await waitForUpdate(el)

      expectReflected(el, 'horizontal', true)
      expect(el.getAttribute('horizontal')).toBe('')

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

    it('trigger 上 aria-expanded 随 open 同步', async () => {
      const el = createCollapse()
      await waitForUpdate(el)

      const button = queryA11y(queryTrigger(el), 'button')!
      expect(button.getAttribute('aria-expanded')).toBe('false')

      await clickTrigger(el)
      expect(button.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('trigger 的 aria-controls 指向 content id', async () => {
      const el = createCollapse()
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))

      const button = queryA11y(queryTrigger(el), 'button')!
      const content = queryContent(el)
      expect(content.id).not.toBe('')
      expect(button.getAttribute('aria-controls')).toBe(content.id)

      cleanupElement(el)
    })

    it('嵌套 collapse 的内层 trigger 只作用于内层', async () => {
      const el = createCollapse(
        '<web-ui-collapse-trigger>Outer</web-ui-collapse-trigger><web-ui-collapse-content><web-ui-collapse id="inner"><web-ui-collapse-trigger>Inner</web-ui-collapse-trigger><web-ui-collapse-content>InnerContent</web-ui-collapse-content></web-ui-collapse></web-ui-collapse-content>'
      )
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))

      const inner = document.getElementById('inner') as WebUiCollapse
      await waitForUpdate(inner)
      await waitForUpdate(inner.querySelector<WebUiCollapseContent>('web-ui-collapse-content')!)

      const [outerEvents] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      const [innerEvents] = spyEvents<CustomEvent<{ open: boolean }>>(inner, 'open-change')

      // 点击内层 trigger（经 shadow 内 button）
      const innerTrigger = inner.querySelector<WebUiCollapseTrigger>('web-ui-collapse-trigger')!
      const innerButton = queryA11y(innerTrigger, 'button') as HTMLElement
      innerButton.click()
      await waitForUpdate(inner)
      await waitForUpdate(queryTrigger(inner))
      await waitForUpdate(inner.querySelector('web-ui-collapse-content')!)

      expect(inner.open).toBe(true)
      expect(el.open).toBe(false)
      expect(innerEvents).toHaveLength(1)
      // 内层 open-change 冒泡经过外层（bubbles+composed 契约），外层自身不产生事件
      expect(outerEvents.filter(event => event.target === el)).toHaveLength(0)

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
    it('默认关闭稳态：content 设 hidden', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))

      expect(queryContent(el).hasAttribute('hidden')).toBe(false)

      el.open = false
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))

      // jsdom 无计算过渡时长：直接落到稳态 hidden
      expect(queryContent(el).hasAttribute('hidden')).toBe(true)

      cleanupElement(el)
    })

    it('keep-mounted 关闭稳态：content 不设 hidden，内部设 inert', async () => {
      const el = createCollapse()
      const content = queryContent(el)
      content.keepMounted = true
      el.open = true
      await waitForUpdate(el)
      await waitForUpdate(content)

      expect(content.hasAttribute('hidden')).toBe(false)

      el.open = false
      await waitForUpdate(el)
      await waitForUpdate(content)

      expect(content.hasAttribute('hidden')).toBe(false)
      expect(content.hasAttribute('inert')).toBe(false)

      // inert 设在动画结构内部（公开契约：宿主不可见但保留布局）
      const inner = content.shadowRoot?.querySelector('.wui-collapse-inner') as HTMLElement
      expect(inner?.getAttribute('inert')).toBe('')

      cleanupElement(el)
    })

    it('keep-mounted 属性反射到 host', async () => {
      const el = createCollapse()
      const content = queryContent(el)
      content.keepMounted = true
      await waitForUpdate(content)

      expect(content.hasAttribute('keep-mounted')).toBe(true)

      cleanupElement(el)
    })

    it('关闭稳态下运行时切换 keep-mounted 重新落地 hidden/inert', async () => {
      const el = createCollapse()
      const content = queryContent(el)
      el.open = true
      await waitForUpdate(el)
      await waitForUpdate(content)

      // 默认关闭稳态 hidden → 切 keep-mounted 应转为内部 inert
      el.open = false
      await waitForUpdate(el)
      await waitForUpdate(content)
      expect(content.hasAttribute('hidden')).toBe(true)

      content.keepMounted = true
      await waitForUpdate(content)
      expect(content.hasAttribute('hidden')).toBe(false)
      expect(content.shadowRoot?.querySelector('.wui-collapse-inner')?.getAttribute('inert')).toBe('')

      // 反向：keep-mounted 关闭稳态 → 切回默认应转为宿主 hidden
      content.keepMounted = false
      await waitForUpdate(content)
      expect(content.hasAttribute('hidden')).toBe(true)
      expect(content.shadowRoot?.querySelector('.wui-collapse-inner')?.hasAttribute('inert')).toBe(false)

      cleanupElement(el)
    })

    it('content 移出 collapse 后独立使用：关闭稳态残留被清除', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))
      el.open = false
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))
      expect(queryContent(el).hasAttribute('hidden')).toBe(true)

      // 移出 collapse：context 丢失，元素按可见裸投影渲染（无动画结构）
      const content = queryContent(el)
      content.remove()
      document.body.appendChild(content)
      await waitForUpdate(content)

      expect(content.hasAttribute('hidden')).toBe(false)
      expect(content.shadowRoot?.querySelector('.wui-collapse-track')).toBe(null)

      cleanupElement(el)
    })
  })

  describe('关闭过渡收尾（浏览器行为的 jsdom 等价）', () => {
    it('兜底定时器到期后落到稳态', async () => {
      const el = createCollapse()
      el.open = true
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))
      expect(queryContent(el).hasAttribute('hidden')).toBe(false)

      el.open = false
      await waitForUpdate(el)
      await waitForUpdate(queryContent(el))
      // jsdom computed transition duration 为 0 → 直接稳态，无兜底等待
      expect(queryContent(el).hasAttribute('hidden')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('trigger 内容投影', () => {
    it('trigger 与 content 支持任意 slot 内容', async () => {
      const el = createCollapse(
        '<web-ui-collapse-trigger><span>自定义 <b>触发</b> 内容</span></web-ui-collapse-trigger><web-ui-collapse-content><p>段落</p><ul><li>列表</li></ul></web-ui-collapse-content>'
      )
      await waitForUpdate(el)

      const trigger = queryTrigger(el)
      expect(trigger.textContent).toContain('自定义')
      const content = queryContent(el)
      expect(content.querySelector('p')).toBeTruthy()
      expect(content.querySelector('li')).toBeTruthy()

      cleanupElement(el)
    })
  })
})
