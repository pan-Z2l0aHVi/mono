import { describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDropdownItem } from '..'

function createItem(attrs?: Record<string, string>, content = ''): WebUiDropdownItem {
  const el = document.createElement('web-ui-dropdown-item') as WebUiDropdownItem
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = content
  document.body.appendChild(el)
  return el
}

describe('WebUiDropdownItem', () => {
  it('渲染文本', async () => {
    const el = createItem({}, 'Edit')
    await el.updateComplete

    expect(el.textContent?.trim()).toBe('Edit')

    el.remove()
  })

  it('disabled 属性反射到 host', async () => {
    const el = createItem({ disabled: '' })
    await el.updateComplete

    expect(el.hasAttribute('disabled')).toBe(true)
    expect(el.shadowRoot?.querySelector('[tabindex="-1"]')).toBeTruthy()

    el.remove()
  })
})
