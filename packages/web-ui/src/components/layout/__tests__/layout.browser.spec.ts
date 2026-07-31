import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import type { WebUiLayout } from '..'

function createLayout(): WebUiLayout {
  const layout = document.createElement('web-ui-layout')
  layout.innerHTML = '<header slot="header">Header</header><aside slot="sidebar">Sidebar</aside><main>Content</main>'
  document.body.append(layout)
  return layout
}

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiLayout 组件（浏览器）', () => {
  it('390px 视口侧栏移出屏幕且不产生横向溢出', async () => {
    await page.viewport(390, 844)
    const layout = createLayout()
    await layout.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const sidebar = layout.shadowRoot?.querySelector('aside')
    expect(sidebar!.classList.contains('open')).toBe(false)
    // 通过 transform: translateX(-100%) 移出屏幕，不应导致页面横向滚动
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  })
})
