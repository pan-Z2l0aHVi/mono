import { describe, expect, it, vi } from 'vite-plus/test'

import { waitForUpdate, spyEvents, expectReflected, cleanupElement, queryA11y } from '@/shared/test-utils'

import '..'
import '@/components/option'

import type { WebUiSelect } from '..'

describe('WebUiSelect', () => {
  function createSelect(optionsHtml = '', attrs?: Record<string, string>): WebUiSelect {
    const el = document.createElement('web-ui-select') as WebUiSelect
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v)
      }
    }
    el.innerHTML = optionsHtml
    document.body.append(el)
    return el
  }

  const OPTIONS_HTML = `
    <web-ui-option value="apple">Apple</web-ui-option>
    <web-ui-option value="banana">Banana</web-ui-option>
    <web-ui-option value="cherry">Cherry</web-ui-option>
  `

  describe('宿主属性', () => {
    it('value 默认为空字符串', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it('设置 value 后通过 combobox 文本反映选中标签', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'banana'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('选项在连接后插入时同步标签', async () => {
      const el = createSelect('', { value: 'banana' })
      await waitForUpdate(el)

      const option = document.createElement('web-ui-option')
      option.setAttribute('value', 'banana')
      option.textContent = 'Banana'
      el.append(option)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('无选中值时显示 placeholder', async () => {
      const el = createSelect(OPTIONS_HTML, { placeholder: '请选择' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.trim()).toBe('请选择')

      cleanupElement(el)
    })

    it('disabled 反射到宿主', async () => {
      const el = createSelect(OPTIONS_HTML)
      expect(el.hasAttribute('disabled')).toBe(false)
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      cleanupElement(el)
    })

    it('portal 反射到宿主', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.portal = true
      await waitForUpdate(el)

      expect(el.hasAttribute('portal')).toBe(true)

      cleanupElement(el)
    })

    it('name 反射到宿主', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.name = 'fruit'
      await waitForUpdate(el)

      expect(el.getAttribute('name')).toBe('fruit')

      cleanupElement(el)
    })

    it('open getter 反映浮层状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('isOpen 别名反映浮层状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('打开/关闭', () => {
    it('点击触发器打开浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('打开时 aria-expanded 为 true', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('点击选项后关闭浮层并更新 value', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      const options = el.querySelectorAll('web-ui-option')
      ;(options[1] as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('banana')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('点击外部关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('焦点移出组件后关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      const external = document.createElement('button')
      document.body.append(external)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.focus()
      trigger.click()
      await waitForUpdate(el)

      external.focus()
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      expect(el.open).toBe(false)

      cleanupElement(el)
      external.remove()
    })
  })

  describe('lockScroll', () => {
    it('打开时锁定页面滚动，关闭时恢复', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('fixed')

      document.body.click()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')

      cleanupElement(el)
    })

    it('lock-scroll=false 时打开不锁定页面滚动', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.lockScroll = false
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')

      cleanupElement(el)
    })

    it('打开期间关闭 lock-scroll 立即恢复页面滚动', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)
      el.lockScroll = false
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('选择时触发 input 和 change', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      const options = el.querySelectorAll('web-ui-option')
      ;(options[1] as HTMLElement).click()
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('开闭时触发 open-change', async () => {
      const el = createSelect(OPTIONS_HTML)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(true)

      document.body.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(2)
      expect(events[1].detail.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('键盘导航', () => {
    it('ArrowDown 激活选项', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const activeOption = el.querySelector('web-ui-option[active]')
      expect(activeOption).toBeTruthy()

      cleanupElement(el)
    })

    it('鼠标进入选项后清除键盘激活状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const option = el.querySelector<HTMLElement>('web-ui-option')
      option?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }))

      expect(option?.hasAttribute('active')).toBe(false)

      cleanupElement(el)
    })

    it('Escape 关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('Enter 选中高亮项并关闭', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await waitForUpdate(el)

      // 第一次 ArrowDown 打开浮层并定位到已选项
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      // 第二次 ArrowDown 移动到下一项
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('banana')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('Enter 触发 input 事件', async () => {
      const el = createSelect(OPTIONS_HTML)
      const [events] = spyEvents(el, 'input')
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(events).toHaveLength(1)

      cleanupElement(el)
    })
  })

  describe('disabled', () => {
    it('disabled 时不可打开', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.disabled = true
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('portal 模式', () => {
    it('portal 为 true 时仍可正常交互', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.portal = true
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)

      cleanupElement(el)
    })
  })
})
