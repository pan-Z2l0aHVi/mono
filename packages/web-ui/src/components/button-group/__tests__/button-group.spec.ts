import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, waitForUpdate } from '@/shared/test-utils'
import '@/components/button'

import '..'
import type { WebUiButtonGroup } from '..'
import type { WebUiButton } from '../../button'

const createButtonGroup = (buttons = ''): WebUiButtonGroup => {
  const el = document.createElement('web-ui-button-group')
  if (buttons) el.innerHTML = buttons
  document.body.appendChild(el)
  return el
}

describe('WebUiButtonGroup 组件', () => {
  describe('属性: direction', () => {
    it('默认值为 horizontal，非法输入回退到默认值', async () => {
      const el = createButtonGroup()
      await waitForUpdate(el)
      expect(el.direction).toBe('horizontal')

      ;(el as any).direction = 'diagonal'
      await waitForUpdate(el)
      expect(el.direction).toBe('horizontal')

      cleanupElement(el)
    })

    it('设置后反射到 group host 属性', async () => {
      const el = createButtonGroup()
      el.direction = 'vertical'
      await waitForUpdate(el)
      expect(el.getAttribute('direction')).toBe('vertical')

      el.direction = 'horizontal'
      await waitForUpdate(el)
      expect(el.getAttribute('direction')).toBe('horizontal')

      cleanupElement(el)
    })
  })

  describe('子按钮上下文', () => {
    it('不改写子按钮的公开 variant 与 size 属性', async () => {
      const el = createButtonGroup(
        '<web-ui-button variant="primary" size="48">A</web-ui-button><web-ui-button variant="danger">B</web-ui-button>'
      )
      await waitForUpdate(el)

      const buttons = el.querySelectorAll<WebUiButton>('web-ui-button')
      await Promise.all([...buttons].map(button => button.updateComplete))
      expect(buttons[0].variant).toBe('primary')
      expect(buttons[0].size).toBe('48')
      expect(buttons[1].variant).toBe('danger')

      cleanupElement(el)
    })

    it('不向子 button 注入旧的实现属性', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await waitForUpdate(el)

      const buttons = el.querySelectorAll('web-ui-button')
      for (const button of buttons) {
        expect(button.hasAttribute('group')).toBe(false)
        expect(button.hasAttribute('last')).toBe(false)
        expect(button.hasAttribute('direction')).toBe(false)
        expect(button.getAttribute('style')).toBeNull()
      }

      cleanupElement(el)
    })

    it('v-if 插入的子按钮应刷新末位 divider 上下文', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await waitForUpdate(el)
      let buttons = el.querySelectorAll<WebUiButton>('web-ui-button')
      await Promise.all([...buttons].map(b => b.updateComplete))
      // 初始 2 个，最后一个无 divider
      expect(buttons[1].shadowRoot!.querySelector('.group-divider')).toBeNull()
      expect(buttons[0].shadowRoot!.querySelector('.group-divider')).not.toBeNull()

      const c = document.createElement('web-ui-button') as WebUiButton
      c.textContent = 'C'
      el.appendChild(c)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([c.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))
      buttons = el.querySelectorAll<WebUiButton>('web-ui-button')
      await Promise.all([...buttons].map(b => b.updateComplete))
      // 新末位 C 无 divider，原末位 B 变为有 divider
      expect(buttons[2].shadowRoot!.querySelector('.group-divider')).toBeNull()
      expect(buttons[1].shadowRoot!.querySelector('.group-divider')).not.toBeNull()
      expect(buttons[0].shadowRoot!.querySelector('.group-divider')).not.toBeNull()
      cleanupElement(el)
    })

    it('v-if 移除末位后新的末位应无 divider', async () => {
      const el = createButtonGroup(
        '<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button><web-ui-button>C</web-ui-button>'
      )
      await waitForUpdate(el)
      let buttons = el.querySelectorAll<WebUiButton>('web-ui-button')
      await Promise.all([...buttons].map(b => b.updateComplete))
      expect(buttons[2].shadowRoot!.querySelector('.group-divider')).toBeNull()

      buttons[2].remove()
      await new Promise(r => setTimeout(r, 0))
      await waitForUpdate(el)
      await new Promise(r => setTimeout(r, 0))
      buttons = el.querySelectorAll<WebUiButton>('web-ui-button')
      await Promise.all([...buttons].map(b => b.updateComplete))
      expect(buttons).toHaveLength(2)
      expect(buttons[1].shadowRoot!.querySelector('.group-divider')).toBeNull()
      expect(buttons[0].shadowRoot!.querySelector('.group-divider')).not.toBeNull()
      cleanupElement(el)
    })

    it('v-if 插入的子按钮应继承 direction=vertical 的上下文', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button>')
      await waitForUpdate(el)
      el.direction = 'vertical'
      await waitForUpdate(el)

      const b = document.createElement('web-ui-button') as WebUiButton
      b.textContent = 'B'
      el.appendChild(b)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([b.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      const dividers = [...el.querySelectorAll<WebUiButton>('web-ui-button')].map(btn =>
        btn.shadowRoot!.querySelector('.group-divider')
      )
      expect(dividers[0]?.classList.contains('vertical')).toBe(true)
      cleanupElement(el)
    })

    it('子按钮离组后仍保留自己的公开属性', async () => {
      const group = createButtonGroup('<web-ui-button variant="primary" size="48">A</web-ui-button>')
      await waitForUpdate(group)

      const button = group.querySelector<WebUiButton>('web-ui-button')!
      const container = document.createElement('div')
      document.body.append(container)
      container.append(button)
      await Promise.all([waitForUpdate(group), waitForUpdate(button)])

      expect(button.variant).toBe('primary')
      expect(button.size).toBe('48')
      expect(button.hasAttribute('group')).toBe(false)
      expect(button.hasAttribute('last')).toBe(false)
      expect(button.hasAttribute('direction')).toBe(false)

      cleanupElement(container)
      cleanupElement(group)
    })
  })
})
