import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/segmented-trigger'

import type { WebUiSegmented } from '..'

const createSegmented = (triggerHtml = '', attrs?: Record<string, string>): WebUiSegmented => {
  const el = document.createElement('web-ui-segmented') as WebUiSegmented
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = triggerHtml
  document.body.appendChild(el)
  return el
}

const TRIGGER_HTML = `
  <web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="c">C</web-ui-segmented-trigger>
`

const clickTrigger = (group: WebUiSegmented, index: number) => {
  const triggers = group.querySelectorAll('web-ui-segmented-trigger')
  const trigger = triggers[index].shadowRoot!.querySelector('.wui-segmented-trigger') as HTMLElement
  trigger.click()
}

describe('WebUiSegmented', () => {
  describe('prop: value', () => {
    it('初始值为空字符串', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await el.updateComplete

      expect(el.value).toBe('')

      el.remove()
    })

    it('可通过属性设置 value', async () => {
      const el = createSegmented(TRIGGER_HTML)
      el.value = 'b'
      await el.updateComplete

      expect(el.value).toBe('b')

      el.remove()
    })

    it('初次渲染后设置 value 时同步子选项的 checked 状态', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await el.updateComplete

      el.value = 'b'
      await el.updateComplete

      const triggers = el.querySelectorAll('web-ui-segmented-trigger')
      await Promise.all([...triggers].map(t => t.updateComplete))

      expect(triggers[0].checked).toBe(false)
      expect(triggers[1].checked).toBe(true)
      expect(triggers[2].checked).toBe(false)

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createSegmented(TRIGGER_HTML)
      el.disabled = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(false)

      el.remove()
    })

    it('disabled 时点击子选项不更新 value 也不触发 group 事件', async () => {
      const el = createSegmented(TRIGGER_HTML)
      el.disabled = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', handler)

      clickTrigger(el, 1)
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()
      expect(el.value).toBe('')

      el.remove()
    })
  })

  describe('event: value-changed', () => {
    it('点击子选项触发 value-changed，detail.value 匹配', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', handler)

      clickTrigger(el, 1)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent<{ value: string }>).detail
      expect(detail.value).toBe('b')

      el.remove()
    })
  })

  describe('event: change', () => {
    it('点击子选项触发 change 事件（含子项冒泡+group 派发）', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      clickTrigger(el, 2)
      await el.updateComplete

      // 子 trigger 的 change + segmented 的 change = 2 次
      expect(handler).toHaveBeenCalled()

      el.remove()
    })
  })

  describe('group behavior', () => {
    it('选中一个子选项时同步 value', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await el.updateComplete

      clickTrigger(el, 0)
      await el.updateComplete

      expect(el.value).toBe('a')

      const triggers = el.querySelectorAll('web-ui-segmented-trigger')
      expect(triggers[0].checked).toBe(true)
      expect(triggers[1].checked).toBe(false)
      expect(triggers[2].checked).toBe(false)

      clickTrigger(el, 1)
      await el.updateComplete

      expect(el.value).toBe('b')
      expect(triggers[0].checked).toBe(false)
      expect(triggers[1].checked).toBe(true)
      expect(triggers[2].checked).toBe(false)

      el.remove()
    })
  })

  describe('no event when value unchanged', () => {
    it('点击已选中的选项不重复触发事件', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await el.updateComplete

      clickTrigger(el, 1)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', handler)

      clickTrigger(el, 1)
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()
      expect(el.value).toBe('b')

      el.remove()
    })
  })
})
