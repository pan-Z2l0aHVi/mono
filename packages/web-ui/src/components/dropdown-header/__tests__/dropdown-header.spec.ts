import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdownHeader } from '..'

function createHeader(content = ''): WebUiDropdownHeader {
  const el = document.createElement('web-ui-dropdown-header')
  el.innerHTML = content
  document.body.appendChild(el)
  return el
}

describe('WebUiDropdownHeader 组件', () => {
  it('slot 文本内容可通过 textContent 访问', async () => {
    const el = createHeader('分组标题')
    await waitForUpdate(el)

    expect(el.textContent?.trim()).toBe('分组标题')

    cleanupElement(el)
  })

  it('slot HTML 内容渲染到宿主', async () => {
    const el = createHeader('<span>分组A</span>')
    await waitForUpdate(el)

    expect(el.innerHTML).toContain('分组A')

    cleanupElement(el)
  })

  it('空内容不中断渲染', async () => {
    const el = createHeader()
    await waitForUpdate(el)

    expect(el).toBeInstanceOf(HTMLElement)

    cleanupElement(el)
  })
})
