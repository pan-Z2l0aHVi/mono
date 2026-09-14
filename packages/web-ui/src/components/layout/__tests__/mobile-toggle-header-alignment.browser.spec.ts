import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import type { WebUiLayout } from '..'

function createLayout(): WebUiLayout {
  const layout = document.createElement('web-ui-layout')
  layout.innerHTML = `
    <header slot="header">
      <div class="header-row" style="height: 52px">Header row</div>
      <div id="expanded-section" style="height: 0px; overflow: hidden">Expanded section</div>
    </header>
    <main>Content</main>
  `
  document.body.append(layout)
  return layout
}

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiLayout 移动端 Toggle 与 header 首行对齐', () => {
  it('header slot 展开为多行时，Toggle 保持在首行位置；收起后位置不变', async () => {
    await page.viewport(390, 844)
    const layout = createLayout()
    await layout.updateComplete

    const toggle = layout.shadowRoot?.querySelector('.mobile-toggle') as HTMLElement
    const header = layout.shadowRoot?.querySelector('header') as HTMLElement
    const expectedTop = header.getBoundingClientRect().top + 8
    expect(toggle.getBoundingClientRect().top).toBeCloseTo(expectedTop, 0)
    const collapsedTop = toggle.getBoundingClientRect().top

    const expandedSection = layout.querySelector('#expanded-section') as HTMLElement
    expandedSection.style.height = '120px'
    await layout.updateComplete
    expect(toggle.getBoundingClientRect().top).toBeCloseTo(collapsedTop, 0)

    expandedSection.style.height = '0px'
    await layout.updateComplete
    expect(toggle.getBoundingClientRect().top).toBeCloseTo(collapsedTop, 0)
  })
})
