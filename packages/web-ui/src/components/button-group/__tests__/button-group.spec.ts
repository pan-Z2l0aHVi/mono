import { describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiButtonGroup } from '..'

const createButtonGroup = (buttons = ''): WebUiButtonGroup => {
  const el = document.createElement('web-ui-button-group') as WebUiButtonGroup
  if (buttons) el.innerHTML = buttons
  document.body.appendChild(el)
  return el
}

describe('WebUiButtonGroup', () => {
  describe('渲染', () => {
    it('渲染玻璃容器', async () => {
      const el = createButtonGroup()
      await el.updateComplete

      const glass = el.shadowRoot?.querySelector('.wui-glass')
      expect(glass).toBeTruthy()

      el.remove()
    })

    it('玻璃容器不显示 ::after 高光', async () => {
      const el = createButtonGroup()
      await el.updateComplete

      const glass = el.shadowRoot?.querySelector('.wui-glass')
      expect(glass?.classList.contains('wui-glass-no-after')).toBe(true)

      el.remove()
    })

    it('slot 中的按钮被渲染', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await el.updateComplete

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons.length).toBe(2)
      expect(buttons[0].textContent).toBe('A')
      expect(buttons[1].textContent).toBe('B')

      el.remove()
    })
  })

  describe('prop: orientation', () => {
    it('默认 orientation 为 horizontal', async () => {
      const el = createButtonGroup()
      await el.updateComplete
      expect(el.orientation).toBe('horizontal')
      el.remove()
    })

    it('orientation 属性反映到 host', async () => {
      const el = createButtonGroup()
      el.orientation = 'vertical'
      await el.updateComplete
      expect(el.getAttribute('orientation')).toBe('vertical')
      el.remove()
    })
  })

  describe('子按钮 variant 强制', () => {
    it('组内按钮自动获得 group 属性', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await el.updateComplete

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].hasAttribute('group')).toBe(true)
      expect(buttons[1].hasAttribute('group')).toBe(true)

      el.remove()
    })

    it('组内按钮强制为 glass 变体', async () => {
      const el = createButtonGroup(
        '<web-ui-button variant="primary">A</web-ui-button><web-ui-button variant="danger">B</web-ui-button>'
      )
      await el.updateComplete

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].variant).toBe('glass')
      expect(buttons[1].variant).toBe('glass')

      el.remove()
    })

    it('组内 glass 按钮不渲染 wui-glass class', async () => {
      const el = createButtonGroup('<web-ui-button variant="glass">A</web-ui-button>')
      await el.updateComplete

      const btn = el.querySelector('web-ui-button')
      const innerButton = btn?.shadowRoot?.querySelector('button')
      expect(innerButton?.classList.contains('wui-glass')).toBe(false)

      el.remove()
    })

    it('最后一个按钮获得 last 属性', async () => {
      const el = createButtonGroup(
        '<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button><web-ui-button>C</web-ui-button>'
      )
      await el.updateComplete

      const buttons = el.querySelectorAll('web-ui-button')
      expect(buttons[0].hasAttribute('last')).toBe(false)
      expect(buttons[1].hasAttribute('last')).toBe(false)
      expect(buttons[2].hasAttribute('last')).toBe(true)

      el.remove()
    })
  })

  describe('样式', () => {
    it('组内按钮通过 CSS 变量设置尺寸', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button>')
      await el.updateComplete

      const btn = el.querySelector('web-ui-button')!
      const size = getComputedStyle(btn).getPropertyValue('--wui-button-size')
      expect(size).toBe('32px')

      el.remove()
    })

    it('非最后一个按钮有分割线变量，最后一个没有', async () => {
      const el = createButtonGroup('<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>')
      await el.updateComplete

      const buttons = el.querySelectorAll('web-ui-button')
      const firstWidth = getComputedStyle(buttons[0]).getPropertyValue('--wui-button-divider-width')
      const lastWidth = getComputedStyle(buttons[1]).getPropertyValue('--wui-button-divider-width')

      expect(firstWidth).toBe('1px')
      expect(lastWidth).toBe('0px')

      el.remove()
    })
  })
})
