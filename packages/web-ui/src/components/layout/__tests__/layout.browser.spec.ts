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
      const expandedWidth = parseFloat(window.getComputedStyle(aside).width)

      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition()

      expect(requested).toEqual([true])
      expect(layout.sidebarCollapsed).toBe(true)
      expect(aside.classList.contains('collapsed')).toBe(true)
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeLessThan(expandedWidth)
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

    it('kebab-case 布尔 attribute 遵循存在语义；camelCase 属性绑定才可表达 false（Vue 互操作）', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ banner: false })
      await layout.updateComplete

      // Vue 的 `:sidebar-collapsed="false"` 会写入字符串 attribute "false"。
      // Lit 布尔属性按原生 HTML 存在语义解析：attribute 存在即为 true，因此该绑定无法表达 false。
      layout.setAttribute('sidebar-collapsed', 'false')
      await layout.updateComplete
      expect(layout.sidebarCollapsed).toBe(true)

      // Vue 的 `:sidebarCollapsed="false"`（camelCase 属性名）命中既有 property，
      // Vue 直接写 DOM property，Lit 收到 false 并移除对应 attribute。
      layout.sidebarCollapsed = false
      await layout.updateComplete
      expect(layout.sidebarCollapsed).toBe(false)
      expect(layout.hasAttribute('sidebar-collapsed')).toBe(false)
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

      const banner = layout.querySelector('[slot="banner"]') as HTMLElement
      const panel = layout.shadowRoot?.querySelector('aside .aside-panel') as HTMLElement
      expect(parseFloat(layout.style.getPropertyValue('--wui-layout-visible-banner-height'))).toBeCloseTo(
        banner.getBoundingClientRect().height,
        0
      )
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

    it('Banner 部分滚出时连续同步其当前可见高度', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      window.scrollTo(0, 18)
      await nextFrame()
      await nextFrame()

      const banner = layout.shadowRoot?.querySelector('.layout-banner') as HTMLElement
      const rect = banner.getBoundingClientRect()
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0))

      expect(visibleHeight).toBeGreaterThan(0)
      expect(visibleHeight).toBeLessThan(rect.height)
      expect(layout.style.getPropertyValue('--wui-layout-visible-banner-height')).toBe(`${visibleHeight}px`)
    })

    it('移除 Banner 后清空 Sidebar 的可见高度', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      layout.querySelector('[slot="banner"]')?.remove()
      await nextFrame()
      await nextFrame()

      expect(Number.parseFloat(layout.style.getPropertyValue('--wui-layout-visible-banner-height'))).toBe(0)
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
      expect(parseFloat(layout.style.getPropertyValue('--wui-layout-visible-banner-height'))).toBeCloseTo(
        banner.getBoundingClientRect().height,
        0
      )
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
      expect(header.getBoundingClientRect().height).toBeGreaterThanOrEqual(headerContent.getBoundingClientRect().height)

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
      expect(window.getComputedStyle(pageContainer).minHeight).toBe(`${window.innerHeight}px`)
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

    it('内部 Drawer 启用 draggable 手势关闭', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const drawer = layout.shadowRoot?.querySelector('web-ui-drawer') as HTMLElement
      expect(drawer.hasAttribute('draggable')).toBe(true)
    })
  })

  describe('桌面端 Sidebar 拖拽调宽（浏览器）', () => {
    it('未启用 sidebar-resizable 时不渲染 handle', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      expect(layout.sidebarResizable).toBe(false)
      expect(layout.shadowRoot?.querySelector('.sidebar-resize-handle')).toBeFalsy()
    })

    it('拖拽 handle 实时更新 aside 宽度；松手派发 sidebar-width-change 请求', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      expect(handle).toBeTruthy()
      const startWidth = parseFloat(window.getComputedStyle(aside).width)

      const handleRect = handle.getBoundingClientRect()
      // pointerdown/move 的 clientX 一致：向右拖 60px 增宽
      handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left
        })
      )
      await layout.updateComplete
      expect(aside.classList.contains('is-resizing')).toBe(true)
      expect(window.getComputedStyle(aside).transitionDuration).toBe('0s')

      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left + 60
        })
      )
      await nextFrame()

      const draggedWidth = parseFloat(window.getComputedStyle(aside).width)
      expect(draggedWidth).toBeCloseTo(startWidth + 60, 0)

      handle.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left + 60
        })
      )
      await layout.updateComplete

      expect(aside.classList.contains('is-resizing')).toBe(false)
      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(startWidth + 60, 0)
    })

    it('拖拽宽度被 min/max 钳制', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      const minWidth = 200
      const maxWidth = 300
      layout.setAttribute('sidebar-min-width', `${minWidth}px`)
      layout.setAttribute('sidebar-max-width', `${maxWidth}px`)
      await layout.updateComplete
      await nextFrame()

      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const handleRect = handle.getBoundingClientRect()

      // 大幅增宽超过 max（向右拖）
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left + 400
        })
      )
      await nextFrame()

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeLessThanOrEqual(maxWidth)

      // 大幅收窄低于 min（向左拖）
      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left - 400
        })
      )
      await nextFrame()
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeGreaterThanOrEqual(minWidth)

      handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
    })

    it('sidebar-min-width 未设置时回退为 collapsed-width', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const handleRect = handle.getBoundingClientRect()
      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const startWidth = parseFloat(window.getComputedStyle(aside).width)

      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      // 大幅收窄，应被钳制在 collapsed-width（向左拖）
      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left - 600
        })
      )
      await nextFrame()

      const resizedWidth = parseFloat(window.getComputedStyle(aside).width)
      expect(resizedWidth).toBeGreaterThan(0)
      expect(resizedWidth).toBeLessThan(startWidth)

      handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
    })

    it('零位移松手不派发 sidebar-width-change', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const startWidth = parseFloat(window.getComputedStyle(aside).width)
      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const handleRect = handle.getBoundingClientRect()

      // down 后原位 up：点击而非拖拽，不应产生调宽请求
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: handleRect.left })
      )
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: handleRect.left })
      )
      await layout.updateComplete
      await waitForLayoutTransition()

      expect(widthRequests).toHaveLength(0)
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeCloseTo(startWidth, 0)
    })

    it('键盘调宽：方向键步进受 min/max 钳制，松开焦点后由 Consumer 回写生效', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.setAttribute('sidebar-min-width', '200px')
      layout.setAttribute('sidebar-max-width', '300px')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const startWidth = parseFloat(window.getComputedStyle(aside).width)
      expect(handle.getAttribute('role')).toBe('separator')
      expect(handle.getAttribute('tabindex')).toBe('0')

      // 向右键入两步增宽（等 width transition 完成，否则 computed 值滞后）
      handle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
      await layout.updateComplete
      await waitForLayoutTransition()
      const expectedWidth = startWidth + 32
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeCloseTo(expectedWidth, 0)

      // 键盘调整不直接派发；Commit（Enter）后走受控请求
      expect(widthRequests).toHaveLength(0)
      handle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
      await layout.updateComplete
      expect(widthRequests).toEqual([`${expectedWidth}px`])
    })

    it('折叠态隐藏 handle；展开后重现', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      expect(layout.shadowRoot?.querySelector('.sidebar-resize-handle')).toBeTruthy()

      layout.sidebarCollapsed = true
      await layout.updateComplete
      await waitForLayoutTransition()
      expect(layout.shadowRoot?.querySelector('.sidebar-resize-handle')).toBeFalsy()

      layout.sidebarCollapsed = false
      await layout.updateComplete
      expect(layout.shadowRoot?.querySelector('.sidebar-resize-handle')).toBeTruthy()
    })

    it('handle 竖线使用 accent 颜色且 hover 时可见', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      expect(window.getComputedStyle(handle).cursor).toBe('col-resize')

      const line = window.getComputedStyle(handle, '::before')
      expect(line.background).toContain('rgb(0, 136, 255)')
      expect(parseFloat(line.opacity)).toBe(0)
    })

    it('pointercancel 恢复 prop 管辖宽度且不派发事件', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const startWidth = parseFloat(window.getComputedStyle(aside).width)
      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const handleRect = handle.getBoundingClientRect()

      handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left
        })
      )
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left - 100
        })
      )
      await nextFrame()
      handle.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      await waitForLayoutTransition()

      expect(widthRequests).toHaveLength(0)
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeCloseTo(startWidth, 0)
    })

    it('capture 提前丢失后：window 捕获层接管拖拽直到松手收尾', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      const startWidth = parseFloat(window.getComputedStyle(aside).width)
      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const handleRect = handle.getBoundingClientRect()

      handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left
        })
      )
      await layout.updateComplete
      expect(aside.classList.contains('is-resizing')).toBe(true)

      // 复现 Chromium 提前 lostpointercapture 的场景：后续事件不再经过 handle，
      // 按 hit-test 散落（此处直接派发到 body），window 捕获层必须继续消费。
      document.body.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          composed: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left + 80
        })
      )
      await nextFrame()
      // 跟手不中断：向右拖 80px 增宽由 window 层消费
      expect(parseFloat(window.getComputedStyle(aside).width)).toBeCloseTo(startWidth + 80, -1)

      document.body.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          composed: true,
          pointerId: 1,
          isPrimary: true,
          clientX: handleRect.left + 80
        })
      )
      await layout.updateComplete

      expect(aside.classList.contains('is-resizing')).toBe(false)
      expect(widthRequests).toHaveLength(1)
    })

    it('拖拽中视口跨越移动端断点：手势被终结且切回桌面后可再次拖拽', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const handle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      const handleRect = handle.getBoundingClientRect()
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: handleRect.left })
      )
      await layout.updateComplete

      // 缩到移动端宽度：桌面 layout 卸载，resize 防抖后 _checkMobile 必须终结悬挂手势
      await page.viewport(390, 844)
      await waitForLayoutTransition()
      await new Promise(resolve => setTimeout(resolve, 250))

      // 切回桌面后新手势不被旧的悬挂状态拦截
      await page.viewport(1280, 720)
      await waitForLayoutTransition()
      await new Promise(resolve => setTimeout(resolve, 250))
      const freshHandle = layout.shadowRoot?.querySelector('.sidebar-resize-handle') as HTMLElement
      expect(freshHandle).toBeTruthy()
      // 悬挂手势的终结不应派发任何宽度请求
      expect(widthRequests).toHaveLength(0)

      const rect = freshHandle.getBoundingClientRect()
      freshHandle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: rect.left })
      )
      await layout.updateComplete
      const aside = layout.shadowRoot?.querySelector('aside') as HTMLElement
      expect(aside.classList.contains('is-resizing')).toBe(true)
      // 带真实位移的拖拽 + 松手：正常派发调宽请求
      freshHandle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: rect.left + 60 })
      )
      await nextFrame()
      freshHandle.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: rect.left + 60 })
      )
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)
    })
  })
})
