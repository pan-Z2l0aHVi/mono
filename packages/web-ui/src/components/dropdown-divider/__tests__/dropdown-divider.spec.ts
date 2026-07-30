import { describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, waitForUpdate, queryA11y } from '@/shared/test-utils'

import type { WebUiDropdownDivider } from '..'

function createDivider(): WebUiDropdownDivider {
  const el = document.createElement('web-ui-dropdown-divider') as WebUiDropdownDivider
  document.body.appendChild(el)
  return el
}

describe('WebUiDropdownDivider', () => {
  it('渲染为 separator 角色', async () => {
    const el = createDivider()
    await waitForUpdate(el)

    const separator = queryA11y(el, '[role="separator"]')
    expect(separator).toBeTruthy()

    cleanupElement(el)
  })

  it('可多次创建独立实例', async () => {
    const el1 = createDivider()
    const el2 = createDivider()
    await waitForUpdate(el1)
    await waitForUpdate(el2)

    const sep1 = queryA11y(el1, '[role="separator"]')
    const sep2 = queryA11y(el2, '[role="separator"]')
    expect(sep1).toBeTruthy()
    expect(sep2).toBeTruthy()

    cleanupElement(el1)
    cleanupElement(el2)
  })
})
