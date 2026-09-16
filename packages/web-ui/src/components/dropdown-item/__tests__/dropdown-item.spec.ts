import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, contractReflection, queryA11y, waitForUpdate } from '@/shared/test-utils'

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

/** 命名 slot（或默认 slot）实际投影到的节点数——slot 投影是公开契约（ADR-0005 §5）。 */
function projectedCount(el: WebUiDropdownItem, slotName?: string): number {
  const selector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])'
  const slot = queryA11y(el, selector) as HTMLSlotElement | null
  return slot?.assignedNodes().length ?? 0
}

describe('WebUiDropdownItem 组件', () => {
  contractReflection('WebUiDropdownItem 属性反射', () => createItem(), [
    ['disabled', true, 'disabled', ''],
    ['pl', '24px', 'pl', '24px'],
    ['value', 'copy', 'value', 'copy'],
    ['submenu', true, 'submenu', '']
  ] as const)

  describe('slot 投影', () => {
    it('默认 slot 内容投影到标签区', async () => {
      const el = createItem({}, 'Edit')
      await waitForUpdate(el)

      expect(projectedCount(el)).toBe(1)
      expect(el.textContent?.trim()).toBe('Edit')

      cleanupElement(el)
    })

    it('prefix 与 suffix 按 name 各自投影', async () => {
      const el = createItem({}, '<span slot="prefix">#</span>Item<span slot="suffix">Ctrl+S</span>')
      await waitForUpdate(el)

      expect(projectedCount(el, 'prefix')).toBe(1)
      expect(projectedCount(el, 'suffix')).toBe(1)

      cleanupElement(el)
    })

    it('submenu 为 true 时以展开指示替代 suffix 投影', async () => {
      const el = createItem({ submenu: '' }, 'Sub<span slot="suffix">Ctrl+S</span>')
      await waitForUpdate(el)

      expect(projectedCount(el, 'suffix'), 'submenu 项不投影 suffix，改为展开指示').toBe(0)

      cleanupElement(el)
    })
  })

  describe('焦点与可访问性', () => {
    it('渲染 role="menuitem"，未禁用时可聚焦', async () => {
      const el = createItem({}, 'Item')
      await waitForUpdate(el)

      const control = queryA11y(el, '[role="menuitem"]')
      expect(control?.getAttribute('tabindex')).toBe('0')

      cleanupElement(el)
    })

    it('disabled 时 menuitem 不可聚焦', async () => {
      const el = createItem({ disabled: '' })
      await waitForUpdate(el)

      const control = queryA11y(el, '[role="menuitem"]')
      expect(control?.getAttribute('tabindex')).toBe('-1')

      cleanupElement(el)
    })

    it('focusItem() 使内部 menuitem 取得焦点', async () => {
      const el = createItem({}, 'Item')
      await waitForUpdate(el)

      el.focusItem()
      await waitForUpdate(el)

      const control = queryA11y(el, '[role="menuitem"]')
      expect(el.shadowRoot?.activeElement).toBe(control)

      cleanupElement(el)
    })
  })
})
