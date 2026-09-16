import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdownHeader } from '..'

function createHeader(content = ''): WebUiDropdownHeader {
  const el = document.createElement('web-ui-dropdown-header')
  el.innerHTML = content
  document.body.appendChild(el)
  return el
}

/** 默认 slot 实际投影到的节点数——slot 投影是公开契约（ADR-0005 §5）。 */
function projectedCount(el: WebUiDropdownHeader): number {
  const slot = queryA11y(el, 'slot:not([name])') as HTMLSlotElement | null
  return slot?.assignedNodes().length ?? 0
}

describe('WebUiDropdownHeader 组件', () => {
  it('默认 slot 内容投影到内部容器', async () => {
    const el = createHeader('<span>分组A</span>')
    await waitForUpdate(el)

    expect(projectedCount(el)).toBe(1)
    expect(el.textContent?.trim()).toBe('分组A')

    cleanupElement(el)
  })

  it('无内容时仍完成渲染且不投影任何节点', async () => {
    const el = createHeader()
    await waitForUpdate(el)

    expect(projectedCount(el)).toBe(0)
    expect(queryA11y(el, 'slot')).not.toBeNull()

    cleanupElement(el)
  })
})
