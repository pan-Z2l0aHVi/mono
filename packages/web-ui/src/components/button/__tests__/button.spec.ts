import { describe, expect, it, beforeEach } from 'vite-plus/test'

import { type WebUiButton } from '..'
import '..'

describe('WebUiButton', () => {
  let el: WebUiButton & HTMLElement

  beforeEach(() => {
    el = document.createElement('web-ui-button') as WebUiButton & HTMLElement
    document.body.appendChild(el)
    return () => {
      el.remove()
    }
  })

  it('应当注册自定义元素', () => {
    expect(customElements.get('web-ui-button')).toBeDefined()
  })

  it('默认渲染 primary 变体', async () => {
    await el.updateComplete
    expect(el.getAttribute('variant')).toBe('primary')
    const btn = el.shadowRoot?.querySelector('button')
    expect(btn).toBeTruthy()
    expect(btn?.textContent?.trim()).toBe('')
  })

  describe('variant 属性', () => {
    it('应当支持 primary 变体', async () => {
      el.setAttribute('variant', 'primary')
      await el.updateComplete
      expect(el.getAttribute('variant')).toBe('primary')
    })

    it('应当支持 secondary 变体', async () => {
      el.setAttribute('variant', 'secondary')
      await el.updateComplete
      expect(el.getAttribute('variant')).toBe('secondary')
    })

    it('应当支持 ghost 变体', async () => {
      el.setAttribute('variant', 'ghost')
      await el.updateComplete
      expect(el.getAttribute('variant')).toBe('ghost')
    })

    it('应当支持 danger 变体', async () => {
      el.setAttribute('variant', 'danger')
      await el.updateComplete
      expect(el.getAttribute('variant')).toBe('danger')
    })
  })

  describe('disabled 属性', () => {
    it('默认不 disabled', () => {
      expect(el.hasAttribute('disabled')).toBe(false)
    })

    it('应当支持 disabled', async () => {
      el.setAttribute('disabled', '')
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)
      const btn = el.shadowRoot?.querySelector('button')
      expect(btn?.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('loading 属性', () => {
    it('默认不 loading', () => {
      expect(el.hasAttribute('loading')).toBe(false)
    })

    it('应当支持 loading', async () => {
      el.setAttribute('loading', '')
      await el.updateComplete
      expect(el.hasAttribute('loading')).toBe(true)
      const btn = el.shadowRoot?.querySelector('button')
      expect(btn?.hasAttribute('disabled')).toBe(true)
      const spinner = el.shadowRoot?.querySelector('web-ui-icon')
      expect(spinner).toBeTruthy()
      expect(spinner?.hasAttribute('spin')).toBe(true)
    })

    it('关闭 loading 后按钮恢复可交互', async () => {
      el.setAttribute('loading', '')
      await el.updateComplete
      el.removeAttribute('loading')
      await el.updateComplete
      const btn = el.shadowRoot?.querySelector('button')
      expect(btn?.hasAttribute('disabled')).toBe(false)
      const spinner = el.shadowRoot?.querySelector('web-ui-icon')
      expect(spinner).toBeNull()
    })
  })

  describe('full 属性', () => {
    it('应当反射 full 属性', async () => {
      el.setAttribute('full', '')
      await el.updateComplete
      expect(el.hasAttribute('full')).toBe(true)
      const btn = el.shadowRoot?.querySelector('button')
      expect(btn).toBeTruthy()
    })
  })

  describe('icon 属性', () => {
    it('icon 模式下不应渲染 prefix/suffix slot 容器', async () => {
      el.setAttribute('icon', '')
      el.textContent = 'X'
      await el.updateComplete

      const label = el.shadowRoot?.querySelector('.label')
      expect(label).toBeNull()

      const btn = el.shadowRoot?.querySelector('button')
      expect(btn).toBeTruthy()
    })
  })

  describe('事件', () => {
    it('点击应当触发 click 事件', async () => {
      await el.updateComplete
      let clicked = false
      el.addEventListener('click', () => {
        clicked = true
      })
      const btn = el.shadowRoot?.querySelector('button')
      btn?.click()
      expect(clicked).toBe(true)
    })

    it('disabled 时点击不应触发', async () => {
      el.setAttribute('disabled', '')
      await el.updateComplete
      let clicked = false
      el.addEventListener('click', () => {
        clicked = true
      })
      const btn = el.shadowRoot?.querySelector('button')
      btn?.click()
      expect(clicked).toBe(false)
    })

    it('loading 时点击不应触发', async () => {
      el.setAttribute('loading', '')
      await el.updateComplete
      let clicked = false
      el.addEventListener('click', () => {
        clicked = true
      })
      const btn = el.shadowRoot?.querySelector('button')
      btn?.click()
      expect(clicked).toBe(false)
    })
  })

  describe('slots', () => {
    it('默认 slot 内容应通过 slot 投影', async () => {
      el.textContent = 'Click me'
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement
      expect(slot).toBeTruthy()
      const nodes = slot.assignedNodes()
      expect(nodes.length).toBe(1)
      expect(nodes[0].textContent).toBe('Click me')
    })

    it('prefix slot 和 suffix slot 应同时存在', async () => {
      const prefix = document.createElement('span')
      prefix.setAttribute('slot', 'prefix')
      prefix.textContent = 'P'
      el.appendChild(prefix)

      const suffix = document.createElement('span')
      suffix.setAttribute('slot', 'suffix')
      suffix.textContent = 'S'
      el.appendChild(suffix)

      el.textContent = 'Body'
      await el.updateComplete

      const btn = el.shadowRoot?.querySelector('button')
      const slots = btn?.querySelectorAll('slot')
      const namedSlots = Array.from(slots || []).filter(s => s.name)
      expect(namedSlots.length).toBe(2)
    })
  })
})
