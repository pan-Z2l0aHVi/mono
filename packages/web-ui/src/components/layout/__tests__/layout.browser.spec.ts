import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import type { WebUiLayout } from '..'

function createLayout(): WebUiLayout {
  const layout = document.createElement('web-ui-layout') as WebUiLayout
  layout.innerHTML = '<header slot="header">Header</header><aside slot="sidebar">Sidebar</aside><main>Content</main>'
  document.body.append(layout)
  return layout
}

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiLayout（浏览器）', () => {
  it('390px 视口隐藏侧栏且不产生横向溢出', async () => {
    await page.viewport(390, 844)
    const layout = createLayout()
    await layout.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const sidebar = layout.shadowRoot?.querySelector('aside')
    expect(getComputedStyle(sidebar!).display).toBe('none')
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  })
})
