import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import { pollUntil, queryA11y } from '@/shared/test-utils'

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

async function waitForLayoutTransition(layout: WebUiLayout) {
  await layout.updateComplete
  await nextFrame()

  // 浏览器动画完成是布局状态稳定的确切终点，避免用固定 350ms 猜测过渡时长。
  const animations = [...(layout.shadowRoot?.getAnimations() ?? []), ...layout.getAnimations({ subtree: true })]
  await Promise.allSettled(animations.map(animation => animation.finished))
  await layout.updateComplete
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
    it('Toggle 请求受控折叠；Consumer 回写后 aria-label 切换为「展开侧边栏」', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      const requested: boolean[] = []
      layout.addEventListener('sidebar-collapsed-change', event => {
        requested.push((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed)
        layout.sidebarCollapsed = (event as CustomEvent<{ collapsed: boolean }>).detail.collapsed
      })

      // 桌面 Toggle 通过 aria-label 定位，该 label 本身即受控折叠契约的一部分
      const toggle = queryA11y(layout, '[aria-label="折叠侧边栏"]') as HTMLElement
      expect(toggle).toBeTruthy()
      expect(toggle.getAttribute('aria-label')).toBe('折叠侧边栏')

      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      expect(requested).toEqual([true])
      expect(layout.sidebarCollapsed).toBe(true)
      const expandedToggle = queryA11y(layout, '[aria-label="展开侧边栏"]') as HTMLElement
      expect(expandedToggle).toBeTruthy()
      expect(expandedToggle.getAttribute('aria-label')).toBe('展开侧边栏')
    })

    it('外部受控属性更新会渲染，且不派发用户变更事件', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ banner: false })
      await layout.updateComplete

      let eventCount = 0
      layout.addEventListener('sidebar-collapsed-change', () => eventCount++)

      const toggleBefore = queryA11y(layout, '[aria-label="折叠侧边栏"]') as HTMLElement
      expect(toggleBefore).toBeTruthy()

      layout.sidebarCollapsed = true
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      expect(queryA11y(layout, '[aria-label="展开侧边栏"]')).toBeTruthy()
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

    it('header-glow 属性从 attribute 反射为布尔（保留属性/反射契约）', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout({ headerGlow: true })
      await layout.updateComplete
      await nextFrame()

      expect(layout.hasAttribute('header-glow')).toBe(true)
      expect(layout.headerGlow).toBe(true)

      layout.removeAttribute('header-glow')
      await layout.updateComplete
      expect(layout.headerGlow).toBe(false)
      expect(layout.hasAttribute('header-glow')).toBe(false)
    })
  })

  describe('移动端行为', () => {
    it('不渲染桌面 aside，改用受控的默认 web-ui-drawer', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      await layout.updateComplete

      expect(queryA11y(layout, 'aside')).toBeFalsy()
      const drawer = queryA11y(layout, 'web-ui-drawer')
      expect(drawer).toBeTruthy()
      expect(drawer?.hasAttribute('headless')).toBe(false)
      expect(drawer?.getAttribute('dialog-label')).toBe('主导航')
      expect(drawer?.hasAttribute('draggable')).toBe(true)
    })

    it('移动端 Toggle 公开 aria-label 为「打开导航菜单」且为 glass 变体', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      await layout.updateComplete

      const toggle = queryA11y(layout, '[aria-label="打开导航菜单"]') as HTMLElement
      expect(toggle).toBeTruthy()
      expect(toggle.getAttribute('aria-label')).toBe('打开导航菜单')
      expect(toggle.getAttribute('variant')).toBe('glass')
    })

    it('Toggle 请求打开 Drawer；Consumer 回写后 drawer 的 open 与 sidebarOpen 一致', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )

      const toggle = queryA11y(layout, '[aria-label="打开导航菜单"]') as HTMLElement
      expect(toggle).toBeTruthy()
      expect(toggle.getAttribute('aria-label')).toBe('打开导航菜单')

      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      await pollUntil(() => drawer.hasAttribute('open'), 'Expected drawer to open')

      expect(requested).toEqual([true])
      expect(layout.sidebarOpen).toBe(true)
      expect(drawer.getAttribute('open')).toBe('')
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
      await waitForLayoutTransition(layout)

      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      const dialog = drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      expect(drawer.hasAttribute('open')).toBe(true)
      expect(sidebarOpenRequests).toEqual([])

      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      // 遮罩关闭是「pointerdown 落在遮罩 + 近静止 click」的指针链路；detail 为 0 的
      // dialog.click() 不来自指针，会被 drawer 忽略（对齐 image-preview 的守卫）。
      dialog.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 20, clientY: 20 })
      )
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 20, clientY: 20 }))
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      expect(layout.sidebarOpen).toBe(true)
      expect(drawer.hasAttribute('open')).toBe(true)
      expect(sidebarOpenRequests).toEqual([false, false])
      expect(leakedOpenChangeCount).toBe(0)

      layout.sidebarOpen = false
      await layout.updateComplete
      await waitForLayoutTransition(layout)
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
      const toggle = queryA11y(layout, '[aria-label="打开导航菜单"]') as HTMLElement
      toggle.click()
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      await pollUntil(() => drawer.hasAttribute('open'), 'Expected drawer to open')
      const dialog = drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      expect(requested).toEqual([true, false])
      expect(layout.sidebarOpen).toBe(false)
      expect(drawer.hasAttribute('open')).toBe(false)
    })

    it('内部 Drawer 启用 draggable 手势关闭', async () => {
      await page.viewport(390, 844)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
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
      // 用 handle 的 role=separator 公开抓手判定，而非内部 class
      expect(queryA11y(layout, '[role="separator"]')).toBeFalsy()
    })

    it('拖拽 handle 松手派发一次 sidebar-width-change 请求，值约等于起始宽度 + 位移', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      expect(handle).toBeTruthy()
      expect(handle.getAttribute('role')).toBe('separator')

      // 起始宽度以公开属性 sidebarWidth 为准（默认 240px），位移仅取决于 clientX 之差
      const startWidth = parseFloat(layout.sidebarWidth)
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 })
      )
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 60 })
      )
      await nextFrame()
      handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 60 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(startWidth + 60, 0)
    })

    it('拖拽宽度被 min/max 钳制：请求值落在 [min, max]', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      const minWidth = 200
      const maxWidth = 300
      layout.setAttribute('sidebar-min-width', `${minWidth}px`)
      layout.setAttribute('sidebar-max-width', `${maxWidth}px`)
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement

      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 400 })
      )
      await nextFrame()
      handle.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 400 })
      )
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(maxWidth, 0)

      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: -400 })
      )
      await nextFrame()
      handle.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: -400 })
      )
      await layout.updateComplete
      expect(widthRequests).toHaveLength(2)
      expect(parseFloat(widthRequests[1])).toBeCloseTo(minWidth, 0)
    })

    it('sidebar-min-width 未设置时回退为 collapsed-width（请求值钳制到 collapsedWidth）', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      const collapsedWidth = parseFloat(layout.collapsedWidth)

      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: -600 })
      )
      await nextFrame()
      handle.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: -600 })
      )
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(collapsedWidth, 0)
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

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      // down 后原位 up：点击而非拖拽，不应产生调宽请求
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 })
      )
      await layout.updateComplete
      handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 }))
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      expect(widthRequests).toHaveLength(0)
    })

    it('键盘调宽：handle 为 role=separator/tabindex=0；方向键步进不派发，Enter 提交一次请求', async () => {
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

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      expect(handle.getAttribute('role')).toBe('separator')
      expect(handle.getAttribute('tabindex')).toBe('0')

      const startWidth = parseFloat(layout.sidebarWidth)
      // 向右键入两步增宽（每步 16px），步进期间直接改临时宽度但不派发
      handle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
      await layout.updateComplete
      await waitForLayoutTransition(layout)
      const expectedWidth = startWidth + 32

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

      expect(queryA11y(layout, '[role="separator"]')).toBeTruthy()

      layout.sidebarCollapsed = true
      await layout.updateComplete
      await waitForLayoutTransition(layout)
      expect(queryA11y(layout, '[role="separator"]')).toBeFalsy()

      layout.sidebarCollapsed = false
      await layout.updateComplete
      expect(queryA11y(layout, '[role="separator"]')).toBeTruthy()
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

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      const startWidth = layout.sidebarWidth
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 })
      )
      await layout.updateComplete
      handle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: -100 })
      )
      await nextFrame()
      handle.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, isPrimary: true }))
      await layout.updateComplete
      await waitForLayoutTransition(layout)

      expect(widthRequests).toHaveLength(0)
      expect(layout.sidebarWidth).toBe(startWidth)
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

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      const startWidth = parseFloat(layout.sidebarWidth)

      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 })
      )
      await layout.updateComplete

      // 复现 Chromium 提前 lostpointercapture 的场景：后续事件不再经过 handle，
      // 按 hit-test 散落（此处直接派发到 body），window 捕获层必须继续消费。
      document.body.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1, isPrimary: true, clientX: 80 })
      )
      await nextFrame()
      // 跟手不中断：向右拖 80px 增宽由 window 层消费，期间仍不派发
      expect(widthRequests).toHaveLength(0)

      document.body.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1, isPrimary: true, clientX: 80 })
      )
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(startWidth + 80, 0)
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

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 })
      )
      await layout.updateComplete

      await page.viewport(390, 844)
      await waitForLayoutTransition(layout)
      await pollUntil(
        () => !queryA11y(layout, '[role="separator"]'),
        'Expected desktop resize handle to unmount after switching to mobile'
      )

      await page.viewport(1280, 720)
      await waitForLayoutTransition(layout)
      await pollUntil(
        () => Boolean(queryA11y(layout, '[role="separator"]')),
        'Expected desktop resize handle to mount after switching back to desktop'
      )
      const freshHandle = queryA11y(layout, '[role="separator"]') as HTMLElement
      expect(freshHandle).toBeTruthy()
      // 悬挂手势的终结不应派发任何宽度请求
      expect(widthRequests).toHaveLength(0)

      // 带真实位移的拖拽 + 松手：正常派发调宽请求
      freshHandle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 0 })
      )
      await layout.updateComplete
      freshHandle.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 60 })
      )
      await nextFrame()
      freshHandle.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 60 })
      )
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)
    })
  })
})
