import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdownDivider } from '..'

function createDivider(): WebUiDropdownDivider {
  const el = document.createElement('web-ui-dropdown-divider')
  document.body.appendChild(el)
  return el
}

describe('WebUiDropdownDivider 组件', () => {
  it('每个实例各自渲染独立的 separator 角色元素', async () => {
    const first = createDivider()
    const second = createDivider()
    await waitForUpdate(first)
    await waitForUpdate(second)

    const firstSeparator = queryA11y(first, '[role="separator"]')
    const secondSeparator = queryA11y(second, '[role="separator"]')
    expect(firstSeparator?.getAttribute('role')).toBe('separator')
    expect(secondSeparator?.getAttribute('role')).toBe('separator')
    expect(firstSeparator).not.toBe(secondSeparator)

    cleanupElement(first)
    cleanupElement(second)
  })
})
