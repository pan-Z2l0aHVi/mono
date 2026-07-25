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

  it('为 suffix 提供组件内的透明度容器', async () => {
    const el = createItem({}, 'Edit<span slot="suffix">⌘E</span>')
    await el.updateComplete

    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('.item-suffix slot')
    expect(slot?.assignedNodes()[0]?.textContent).toBe('⌘E')
    el.remove()
  })
})
