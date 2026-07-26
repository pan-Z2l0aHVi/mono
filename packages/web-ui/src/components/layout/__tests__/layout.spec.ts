import { describe, expect, it } from 'vite-plus/test'

import '..'
import { queryA11y } from '@/shared/test-utils'

import type { WebUiLayout } from '..'

function createLayout(slots = ''): WebUiLayout {
  const el = document.createElement('web-ui-layout') as WebUiLayout
  if (slots) el.innerHTML = slots
  document.body.appendChild(el)
  return el
}

describe('WebUiLayout', () => {
  describe('slot 投影', () => {
    it('header slot 投影内容', async () => {
      const el = createLayout('<div slot="header">头部</div>')
      await el.updateComplete
      expect(el.querySelector('[slot="header"]')).toBeTruthy()
      el.remove()
    })

    it('default slot 投影内容', async () => {
      const el = createLayout('<div>主要内容</div>')
      await el.updateComplete
      expect(el.textContent).toBe('主要内容')
      el.remove()
    })

    it('sidebar slot 投影内容', async () => {
      const el = createLayout('<nav slot="sidebar">菜单</nav>')
      await el.updateComplete
      expect(el.querySelector('[slot="sidebar"]')).toBeTruthy()
      el.remove()
    })

    it('tabbar slot 投影内容', async () => {
      const el = createLayout('<div slot="tabbar">底部栏</div>')
      await el.updateComplete
      expect(el.querySelector('[slot="tabbar"]')).toBeTruthy()
      el.remove()
    })

    it('同时存在多个 slot', async () => {
      const el = createLayout(`
        <header slot="header">顶部</header>
        <main>内容</main>
        <aside slot="sidebar">侧栏</aside>
        <footer slot="tabbar">底部</footer>
      `)
      await el.updateComplete
      expect(el.querySelector('[slot="header"]')).toBeTruthy()
      expect(el.querySelector('[slot="sidebar"]')).toBeTruthy()
      expect(el.querySelector('[slot="tabbar"]')).toBeTruthy()
      expect(el.textContent).toContain('内容')
      el.remove()
    })
  })

  describe('语义结构', () => {
    it('shadow DOM 包含语义化标签', async () => {
      const el = createLayout()
      await el.updateComplete
      expect(queryA11y(el, 'header')).toBeTruthy()
      expect(queryA11y(el, 'main')).toBeTruthy()
      expect(queryA11y(el, 'aside')).toBeTruthy()
      expect(queryA11y(el, 'footer')).toBeTruthy()
      el.remove()
    })
  })
})
