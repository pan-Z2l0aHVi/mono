import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiButton } from '..'

const createButton = (text = ''): WebUiButton => {
  const el = document.createElement('web-ui-button') as WebUiButton
  if (text) el.textContent = text
  document.body.appendChild(el)
  return el
}

describe('WebUiButton', () => {
  describe('prop: variant', () => {
    it('默认 variant 为 glass', async () => {
      const el = createButton()
      await el.updateComplete
      expect(el.variant).toBe('glass')
      el.remove()
    })

    it('variant 属性反射到 host', async () => {
      const el = createButton()
      el.variant = 'primary'
      await el.updateComplete
      expect(el.getAttribute('variant')).toBe('primary')
      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 时原生 button 也被 disabled', async () => {
      const el = createButton()
      el.disabled = true
      await el.updateComplete

      const btn = el.shadowRoot?.querySelector('button')
      expect(btn?.hasAttribute('disabled')).toBe(true)

      el.remove()
    })
  })

  describe('prop: loading', () => {
    it('loading 时显示 spinner 且原生 button 被 disabled', async () => {
      const el = createButton()
      el.loading = true
      await el.updateComplete

      const btn = el.shadowRoot?.querySelector('button')
      expect(btn?.hasAttribute('disabled')).toBe(true)

      const spinner = el.shadowRoot?.querySelector('web-ui-icon')
      expect(spinner).toBeTruthy()
      expect(spinner?.hasAttribute('spin')).toBe(true)

      el.remove()
    })

    it('关闭 loading 后恢复', async () => {
      const el = createButton()
      el.loading = true
      await el.updateComplete
      el.loading = false
      await el.updateComplete

      const btn = el.shadowRoot?.querySelector('button')
      expect(btn?.hasAttribute('disabled')).toBe(false)
      expect(el.shadowRoot?.querySelector('web-ui-icon')).toBeNull()

      el.remove()
    })
  })

  describe('prop: icon', () => {
    it('icon 模式下不渲染 label 容器', async () => {
      const el = createButton()
      el.icon = true
      el.textContent = 'X'
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('.label')).toBeNull()

      el.remove()
    })
  })

  describe('event: click', () => {
    it('点击触发 click 事件', async () => {
      const el = createButton('OK')
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('click', handler)
      el.shadowRoot?.querySelector('button')?.click()

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('disabled 时点击不触发', async () => {
      const el = createButton('OK')
      el.disabled = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('click', handler)
      el.shadowRoot?.querySelector('button')?.click()

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })

    it('loading 时点击不触发', async () => {
      const el = createButton('OK')
      el.loading = true
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('click', handler)
      el.shadowRoot?.querySelector('button')?.click()

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })
})
