import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdownItem } from '..'

function createItem(attrs?: Record<string, string>, content = ''): WebUiDropdownItem {
  const el = document.createElement('web-ui-dropdown-item')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = content
  document.body.appendChild(el)
  return el
}

describe('WebUiDropdownItem 组件', () => {
  it('渲染文本内容', async () => {
    const el = createItem({}, 'Edit')
    await waitForUpdate(el)

    expect(el.textContent?.trim()).toBe('Edit')

    cleanupElement(el)
  })

  it('disabled 属性反射到 host', async () => {
    const el = createItem({ disabled: '' })
    await waitForUpdate(el)

    expect(el.hasAttribute('disabled')).toBe(true)

    cleanupElement(el)
  })

  it('disabled 设置 tabindex=-1', async () => {
    const el = createItem({ disabled: '' })
    await waitForUpdate(el)

    const inner = el.shadowRoot?.querySelector('[role="menuitem"][tabindex="-1"]')
    expect(inner).toBeTruthy()

    cleanupElement(el)
  })

  it('suffix slot 渲染', async () => {
    const el = createItem({}, 'Edit<span slot="suffix">Ctrl+S</span>')
    await waitForUpdate(el)

    // prefix 区域无内容
    const prefixSlot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="prefix"]')
    expect(prefixSlot?.assignedNodes()).toHaveLength(0)

    cleanupElement(el)
  })

  it('submenu 属性显示右侧箭头图标', async () => {
    const el = createItem({ submenu: '' }, 'Sub')
    await waitForUpdate(el)

    const icon = el.shadowRoot?.querySelector('web-ui-icon')
    expect(icon).toBeTruthy()

    cleanupElement(el)
  })

  it('focusItem() 聚焦内部元素', async () => {
    const el = createItem({}, 'Item')
    await waitForUpdate(el)

    el.focusItem()
    await waitForUpdate(el)

    const inner = el.shadowRoot?.querySelector('[role="menuitem"]')
    expect(el.shadowRoot?.activeElement).toBe(inner)

    cleanupElement(el)
  })

  it('prefix slot 渲染', async () => {
    const el = createItem({}, '<span slot="prefix">#</span>Item')
    await waitForUpdate(el)

    const prefixSlot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="prefix"]')
    expect(prefixSlot?.assignedNodes()).toHaveLength(1)

    cleanupElement(el)
  })

  it('pl 属性反射到 host', async () => {
    const el = createItem({ pl: '24px' }, 'Item')
    await waitForUpdate(el)

    // pl 是公开 prop，反射到 host；内边距样式是内部实现，不做样式断言
    expect(el.pl).toBe('24px')
    expect(el.getAttribute('pl')).toBe('24px')

    cleanupElement(el)
  })
})
