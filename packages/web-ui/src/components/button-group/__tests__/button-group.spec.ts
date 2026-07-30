import { describe, expect, it } from 'vite-plus/test'

import { waitForUpdate, cleanupElement } from '@/shared/test-utils'

import '..'
import type { WebUiButtonGroup } from '..'

const createButtonGroup = (buttons = ''): WebUiButtonGroup => {
  const el = document.createElement('web-ui-button-group') as WebUiButtonGroup
  if (buttons) el.innerHTML = buttons
  document.body.appendChild(el)
  return el
}

describe('WebUiButtonGroup', () => {
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

    it('设置后反射到 host 属性', async () => {
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

  describe('子按钮 group 标记', () => {
    it('组内按钮自动获得 group 属性', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await waitForUpdate(el)

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].hasAttribute('group')).toBe(true)
      expect(buttons[1].hasAttribute('group')).toBe(true)

      cleanupElement(el)
    })

    it('组内按钮强制为 glass 变体', async () => {
      const el = createButtonGroup(
        '<web-ui-button variant="primary">A</web-ui-button><web-ui-button variant="danger">B</web-ui-button>'
      )
      await waitForUpdate(el)

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].variant).toBe('glass')
      expect(buttons[1].variant).toBe('glass')

      cleanupElement(el)
    })

    it('最后一个按钮获得 last 属性', async () => {
      const el = createButtonGroup(
        '<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button><web-ui-button>C</web-ui-button>'
      )
      await waitForUpdate(el)

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].hasAttribute('last')).toBe(false)
      expect(buttons[1].hasAttribute('last')).toBe(false)
      expect(buttons[2].hasAttribute('last')).toBe(true)

      cleanupElement(el)
    })

    it('切换 direction 后子按钮 direction 属性同步更新', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await waitForUpdate(el)

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].getAttribute('direction')).toBe('horizontal')
      expect(buttons[1].getAttribute('direction')).toBe('horizontal')

      el.direction = 'vertical'
      await waitForUpdate(el)

      expect(buttons[0].getAttribute('direction')).toBe('vertical')
      expect(buttons[1].getAttribute('direction')).toBe('vertical')

      cleanupElement(el)
    })
  })
})
