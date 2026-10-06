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
  it('每个实例各自渲染一个 separator 角色元素', async () => {
    const first = createDivider()
    const second = createDivider()
    await waitForUpdate(first)
    await waitForUpdate(second)

    // role="separator" 是分割线对辅助技术唯一的表达；断言它每个实例各有一枚。
    expect(queryA11y(first, '[role="separator"]')).toBeTruthy()
    expect(queryA11y(second, '[role="separator"]')).toBeTruthy()

    cleanupElement(first)
    cleanupElement(second)
  })
})
