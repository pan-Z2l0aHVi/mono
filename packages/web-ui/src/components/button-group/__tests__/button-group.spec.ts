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
