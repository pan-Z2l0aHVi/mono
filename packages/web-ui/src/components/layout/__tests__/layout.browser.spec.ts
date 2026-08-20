import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import type { WebUiLayout } from '..'

function createLayout({
  banner = true,
  bannerContent = 'Banner',
  headerGlow = false
}: { banner?: boolean; bannerContent?: string; headerGlow?: boolean } = {}): WebUiLayout {
  const layout = document.createElement('web-ui-layout')
  if (headerGlow) layout.setAttribute('header-glow', '')
  layout.innerHTML = `
    ${banner ? `<div slot="banner" style="height: 36px">${bannerContent}</div>` : ''}
    <header slot="header">Header</header>
    <div slot="sidebar" class="sidebar-consumer" style="display: flex; flex-direction: column; height: 100%; min-height: 0">
      <div class="sidebar-title" style="flex-shrink: 0">Sidebar title</div>
      <nav class="sidebar-nav" style="flex: 1; min-height: 0; overflow-y: auto"><div style="height: 2000px">Sidebar navigation</div></nav>
    </div>
    <main style="height: 2000px">Content</main>
    <div slot="tabbar">Tabbar</div>
  `
  document.body.append(layout)
  return layout
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

async function waitForLayoutTransition() {
  await new Promise(resolve => setTimeout(resolve, 350))
}

function syncControlledSidebarState(layout: WebUiLayout) {
  layout.addEventListener('sidebar-collapsed-change', event => {
    layout.sidebarCollapsed = (event as CustomEvent<{ collapsed: boolean }>).detail.collapsed
  })
  layout.addEventListener('sidebar-open-change', event => {
    layout.sidebarOpen = (event as CustomEvent<{ open: boolean }>).detail.open
  })
}

afterEach(async () => {
  window.scrollTo(0, 0)
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiLayout 组件（浏览器）', () => {
  describe('桌面端行为', () => {
    it('Toggle 请求受控折叠状态；Consumer 回写后收窄到 72px 且仍可访问', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      const requested: boolean[] = []
      layout.addEventListener('sidebar-collapsed-change', event => {
        requested.push((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed)
        layout.sidebarCollapsed = (event as CustomEvent<{ collapsed: boolean }>).detail.collapsed
      })

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const toggleArea = layout.shadowRoot?.querySelector('.sidebar-toggle-area') as HTMLElement
      const toggle = layout.shadowRoot?.querySelector('.sidebar-toggle') as HTMLElement
      expect(aside.classList.contains('collapsed')).toBe(false)
      expect(toggleArea.contains(toggle)).toBe(true)
      expect(toggle.getAttribute('aria-label')).toBe('折叠侧边栏')

      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition()

      expect(requested).toEqual([true])
      expect(layout.sidebarCollapsed).toBe(true)
      expect(aside.classList.contains('collapsed')).toBe(true)
      expect(parseFloat(window.getComputedStyle(aside).width)).toBe(72)
      expect(toggle.getAttribute('aria-label')).toBe('展开侧边栏')
    })

    it('外部受控属性更新会渲染，且不派发用户变更事件', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ banner: false })
      await layout.updateComplete

      let eventCount = 0
      layout.addEventListener('sidebar-collapsed-change', () => eventCount++)
      layout.sidebarCollapsed = true
      await layout.updateComplete
      await waitForLayoutTransition()

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      expect(aside.classList.contains('collapsed')).toBe(true)
      expect(eventCount).toBe(0)
    })

    it('不创建 sidebar scrollport；Consumer 的标题固定且仅其 nav 滚动', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      const viewport = layout.shadowRoot?.querySelector('.sidebar-viewport') as HTMLElement
      const title = layout.querySelector('.sidebar-title') as HTMLElement
      const nav = layout.querySelector('.sidebar-nav') as HTMLElement
      const titleTop = title.getBoundingClientRect().top
      expect(window.getComputedStyle(viewport).overflowY).toBe('visible')
      expect(window.getComputedStyle(nav).overflowY).toBe('auto')

      nav.scrollTop = 180
      await nextFrame()

      expect(nav.scrollTop).toBe(180)
      expect(title.getBoundingClientRect().top).toBe(titleTop)
    })

    it('视觉型 Banner 元素没有文本内容时仍为 Sidebar 预留高度', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ bannerContent: '' })
      await layout.updateComplete
      await nextFrame()

      const panel = layout.shadowRoot?.querySelector('aside .aside-panel') as HTMLElement
      expect(layout.style.getPropertyValue('--wui-layout-visible-banner-height')).toBe('36px')
      expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight - 8 + 1)
    })

    it('Banner 可见时卡片底部和 Toggle 都保留在视口内', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      const banner = layout.shadowRoot?.querySelector('.layout-banner') as HTMLElement
      const panel = layout.shadowRoot?.querySelector('aside .aside-panel') as HTMLElement
      const toggle = layout.shadowRoot?.querySelector('.sidebar-toggle') as HTMLElement
      const bannerRect = banner.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const toggleRect = toggle.getBoundingClientRect()

      expect(bannerRect.height).toBeGreaterThan(0)
      expect(panelRect.bottom).toBeLessThanOrEqual(window.innerHeight - 8 + 1)
      expect(toggleRect.bottom).toBeLessThanOrEqual(panelRect.bottom + 1)
    })

    it('Banner 滚出后 Sidebar sticky 到视口顶部，卡片仍保留底部间距', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      window.scrollTo(0, 240)
      await nextFrame()

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const panel = layout.shadowRoot?.querySelector('aside .aside-panel') as HTMLElement
      const asideRect = aside.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()

      expect(window.getComputedStyle(aside).position).toBe('sticky')
      expect(asideRect.top).toBe(0)
      expect(asideRect.bottom).toBeLessThanOrEqual(window.innerHeight + 1)
      expect(panelRect.bottom).toBeLessThanOrEqual(window.innerHeight - 8 + 1)
    })

    it('重新连接后恢复 Banner 观察并更新 Sidebar 高度', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      const banner = layout.querySelector('[slot="banner"]') as HTMLElement
      layout.remove()
      await nextFrame()
      document.body.append(layout)
      await layout.updateComplete
      await nextFrame()

      banner.style.height = '72px'
      await nextFrame()
      await nextFrame()

      const panel = layout.shadowRoot?.querySelector('aside .aside-panel') as HTMLElement
      expect(layout.style.getPropertyValue('--wui-layout-visible-banner-height')).toBe('72px')
      expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight - 8 + 1)
    })

    it('header-glow 渲染装饰性背景且不阻挡交互', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ headerGlow: true })
      await layout.updateComplete
      await nextFrame()

      const header = layout.shadowRoot?.querySelector('header') as HTMLElement
      const glow = window.getComputedStyle(header, '::before')
      const headerContent = layout.querySelector('[slot="header"]') as HTMLElement

      // 晕染伪元素存在且不阻挡交互
      expect(layout.headerGlow).toBe(true)
      expect(glow.content).toBe('""')
      expect(glow.pointerEvents).toBe('none')

      // Header 内容仍可交互（slot 内容位于晕染之上）
      headerContent.style.height = '80px'
      await nextFrame()
      expect(header.getBoundingClientRect().height).toBeCloseTo(80, 0)

      // 晕染随 header 高度自适应
      const resizedGlow = window.getComputedStyle(header, '::before')
      expect(parseFloat(resizedGlow.height)).toBeGreaterThan(0)

      // Header sticky 到顶
      window.scrollTo(0, 240)
      await nextFrame()
      expect(header.getBoundingClientRect().top).toBe(0)
    })

    it('页面使用 Flex 页面级滚动布局', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ banner: false })
      await layout.updateComplete

      const pageContainer = layout.shadowRoot?.querySelector('.layout-page') as HTMLElement
      expect(window.getComputedStyle(pageContainer).display).toBe('flex')
      expect(window.getComputedStyle(pageContainer).minHeight).toBe('720px')
    })
  })

  describe('移动端行为', () => {
    it('不渲染桌面 aside，改用受控的 headless web-ui-drawer', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      await layout.updateComplete

      expect(layout.shadowRoot?.querySelector('aside')).toBeFalsy()
      const drawer = layout.shadowRoot?.querySelector('web-ui-drawer')
      expect(drawer).toBeTruthy()
      expect(drawer?.hasAttribute('headless')).toBe(true)
      expect(drawer?.getAttribute('dialog-label')).toBe('主导航')
    })

    it('Toggle 请求打开 Drawer；Consumer 回写后显示覆盖式圆角卡片', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )

      const header = layout.shadowRoot?.querySelector('header') as HTMLElement
      const toggle = header.querySelector('.mobile-toggle') as HTMLElement
      expect(toggle).toBeTruthy()

      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition()

      const drawer = layout.shadowRoot?.querySelector('web-ui-drawer') as HTMLElement
      const panel = layout.shadowRoot?.querySelector('.mobile-sidebar') as HTMLElement
      const panelRect = panel.getBoundingClientRect()
      expect(requested).toEqual([true])
      expect(layout.sidebarOpen).toBe(true)
      expect(drawer.getAttribute('open')).toBe('')
      expect(panelRect.left).toBeGreaterThan(0)
      expect(panelRect.top).toBeGreaterThan(0)
      expect(panelRect.right).toBeLessThanOrEqual(window.innerWidth)
      expect(panelRect.bottom).toBeLessThanOrEqual(window.innerHeight)
      expect(panel.querySelector('.sidebar-viewport')).toBeTruthy()
      expect(panel.querySelector('.sidebar-toggle-area')).toBeFalsy()
    })

    it('外部 sidebar-open 驱动 Drawer；拒绝 Escape/遮罩关闭请求时保持打开且不泄漏 open-change', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      await layout.updateComplete

      const sidebarOpenRequests: boolean[] = []
      let leakedOpenChangeCount = 0
      layout.addEventListener('sidebar-open-change', event => {
        sidebarOpenRequests.push((event as CustomEvent<{ open: boolean }>).detail.open)
      })
      layout.addEventListener('open-change', () => leakedOpenChangeCount++)

      layout.sidebarOpen = true
      await layout.updateComplete
      await waitForLayoutTransition()

      const drawer = layout.shadowRoot?.querySelector('web-ui-drawer') as HTMLElement
      const dialog = drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      expect(drawer.hasAttribute('open')).toBe(true)
      expect(sidebarOpenRequests).toEqual([])

      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      dialog.click()
      await layout.updateComplete
      await waitForLayoutTransition()

      expect(layout.sidebarOpen).toBe(true)
      expect(drawer.hasAttribute('open')).toBe(true)
      expect(sidebarOpenRequests).toEqual([false, false])
      expect(leakedOpenChangeCount).toBe(0)

      layout.sidebarOpen = false
      await layout.updateComplete
      await waitForLayoutTransition()
      expect(drawer.hasAttribute('open')).toBe(false)
    })

    it('Drawer Escape 关闭会请求受控的 sidebar-open=false', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )
      const toggle = layout.shadowRoot?.querySelector('.mobile-toggle') as HTMLElement
      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition()

      const drawer = layout.shadowRoot?.querySelector('web-ui-drawer') as HTMLElement
      const dialog = drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      await layout.updateComplete
      await waitForLayoutTransition()

      expect(requested).toEqual([true, false])
      expect(layout.sidebarOpen).toBe(false)
      expect(drawer.hasAttribute('open')).toBe(false)
    })
  })
})
