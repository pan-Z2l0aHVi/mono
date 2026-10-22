import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import type { WebUiBadge } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiBadge 指针命中（浏览器）', () => {
  it('点击角标与插槽控件的重叠区域时触发控件 click', async () => {
    const badge = document.createElement('web-ui-badge') as WebUiBadge
    badge.count = 5

    const button = document.createElement('web-ui-button')
    button.textContent = 'Messages'
    badge.append(button)
    document.body.append(badge)

    await badge.updateComplete

    const status = badge.shadowRoot?.querySelector<HTMLElement>('[role="status"]')
    expect(status, 'badge 应有可访问的 status 指示').toBeTruthy()

    const buttonRect = button.getBoundingClientRect()
    const statusRect = status!.getBoundingClientRect()
    const overlap = {
      left: Math.max(buttonRect.left, statusRect.left),
      right: Math.min(buttonRect.right, statusRect.right),
      top: Math.max(buttonRect.top, statusRect.top),
      bottom: Math.min(buttonRect.bottom, statusRect.bottom)
    }
    expect(overlap.right).toBeGreaterThan(overlap.left)
    expect(overlap.bottom).toBeGreaterThan(overlap.top)

    let clickCount = 0
    button.addEventListener('click', () => clickCount++)

    await page.elementLocator(button).click({
      position: {
        x: (overlap.left + overlap.right) / 2 - buttonRect.left,
        y: (overlap.top + overlap.bottom) / 2 - buttonRect.top
      }
    })

    expect(clickCount).toBe(1)
  })
})
