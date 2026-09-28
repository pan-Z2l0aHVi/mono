import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

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
    it('桌面 Toggle 为 secondary 变体，与移动端的 glass 区分', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      await layout.updateComplete
      await nextFrame()

      // 桌面收起用 secondary：glass 与侧栏面板同材质，叠在面板上时按钮自身边界
      // 读不出来。移动端 Toggle 落在 drawer 上，保留 glass。
      const toggle = queryA11y(layout, '[aria-label="折叠侧边栏"]') as HTMLElement
      expect(toggle).toBeTruthy()
      expect(toggle.getAttribute('variant')).toBe('secondary')
    })

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

    /*
     * 两条背景，决定了这条测试能证明什么、不能证明什么。改它之前先读。
     *
     * 发现 B（本 bug 最要命的一条）：Safari 在**损坏状态下**，header 的计算值
     * `overflowY` 依然是 `visible`。WebKit 把 `overflow-x: clip` 连带裁掉纵向溢出，
     * 只发生在**绘制层**，计算样式里完全看不见。因此任何断言计算样式的测试都
     * 抓不到这个 bug——这正是它此前一直没被测出来的原因。若把下面这些断言当成
     * 「羽化已修复」的证据，那是误读：它们只能证明声明被放在了预期的位置。
     *
     * 发现 A：本套件 browser 项目只跑 Chromium（见 vite.config.ts 的
     * `instances: [{ browser: 'chromium' }]`）。按 CSS Overflow 3，另一轴是 clip 时
     * visible 不会被改写成 auto，所以这套 fixture 下症状不出现——这是规范推导，
     * 不是实测；#184 的判据仍然只有下面的真 Safari 绘制结果。
     *
     * **不要拿 Playwright WebKit 当 #184 的判据**，它不是 Safari。
     * 注意也不能反过来用「它的计算值是 visible」来证明它没裁——理由同发现 B：
     * 绘制层的现象在计算样式里本来就读不出来，拿计算样式去证明一个现象不存在，
     * 等于下一个无法证伪的排除结论。
     *
     * 关于 Playwright WebKit 只记观测、不下结论：本次用同一套 fixture 做过一次
     * 像素 A/B（修复后 vs 重新注入 `header { overflow-x: clip }`），该构建下
     * **回退变体的羽化深度与修复后相同，未复现断层**。这只说明「这个构建在这次
     * fixture 下没复现」，不等于它结构上无法复现——构建版本、fixture 形状或别的
     * 变量都可能改变结果。要用它当判据，得先有人在 Safari 上把同一 fixture 跑通
     * 并确认两引擎结论一致；在此之前它只是无回归信号。
     *
     * 所以真正能判 #184 的只有真 Safari 的绘制结果：1200×480、滚动 200、
     * 纯红 glow 叠纯白 main，采样 header 底缘以下的像素——修复后是约 27px 的
     * 粉白过渡，回退 `header { overflow-x: clip }` 后紧贴底缘即为纯白（羽化为 0）。
     * 下面这条测试守的是「裁剪归属」这个结构前提，羽化本身靠 Safari 取证。
     */
    it('glow 的横向裁剪归属内容列，header 纵向保持可见且 sticky 不受影响', async () => {
      await page.viewport(1200, 480)
      const layout = createLayout({ headerGlow: true })
      await layout.updateComplete
      await nextFrame()

      const header = queryA11y(layout, 'header') as HTMLElement
      const content = queryA11y(layout, '.layout-content') as HTMLElement
      expect(header).toBeTruthy()
      expect(content).toBeTruthy()

      // 以下都是结构断言，不是症状断言（原因见上方发现 B）。
      // header 自身不裁剪：glow 向下多伸出 0.5 个 header 高度，纵向一旦被裁，
      // 底缘羽化变成硬边断层（WebKit 对 overflow-x: clip 会连带裁掉纵向）。
      expect(getComputedStyle(header).overflowX).toBe('visible')
      expect(getComputedStyle(header).overflowY).toBe('visible')
      // 横向溢出改由内容列裁剪：glow 的 scale 不再撑出页面横向滚动条。
      expect(getComputedStyle(content).overflowX).toBe('clip')
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)

      window.scrollTo(0, 200)
      await nextFrame()
      expect(header.getBoundingClientRect().top).toBe(0)
      expect(queryA11y(layout, 'main')!.getBoundingClientRect().top).toBeLessThan(0)
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

    /*
     * `.sidebar-toggle` 自声明 `--wui-button-width`，自身声明优先于继承值，所以 app 侧
     * 直接写 `--wui-button-width` 改不动它。这组用例钉住新变量确实驱动了 Toggle 宽度，
     * 且不设置时仍是历史上的 44px。
     *
     * 两种状态都断言：把 collapsedWidth 调小正是这个变量的存在理由，只测展开态
     * （240px）会让 66px 变成一个与折叠布局无关的任意值。折叠态的 label 是「展开侧边栏」。
     * 折叠态还多断一条配对关系：Toggle 宽度 + 左右 8px margin 应正好等于 panel 宽度
     * （collapsedWidth 减去 aside 的 8px 左边距），这才是 app 挑这个数值的依据。
     */
    it('折叠 Toggle 宽度默认 44px，可由 --wui-layout-sidebar-toggle-width 覆盖（展开与折叠态）', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.collapsedWidth = '90px'
      await layout.updateComplete
      await nextFrame()

      // 经 aria-label 定位，不碰 `.sidebar-toggle` 这类实现细节；量 host 自身宽度即可，
      // host 是 inline-flex 且无 width 声明，会收缩包裹内部 button。
      const toggleWidth = (label: string) => {
        const toggle = queryA11y(layout, `[aria-label="${label}"]`) as HTMLElement | null
        return toggle?.getBoundingClientRect().width ?? null
      }
      const panelWidth = () => {
        const aside = queryA11y(layout, 'aside') as HTMLElement
        const panel = aside?.querySelector('.aside-panel') as HTMLElement | null
        return panel?.getBoundingClientRect().width ?? null
      }

      expect(toggleWidth('折叠侧边栏')).toBeCloseTo(44, 0)

      layout.style.setProperty('--wui-layout-sidebar-toggle-width', '66px')
      await nextFrame()
      expect(toggleWidth('折叠侧边栏')).toBeCloseTo(66, 0)

      layout.style.removeProperty('--wui-layout-sidebar-toggle-width')
      await nextFrame()
      expect(toggleWidth('折叠侧边栏')).toBeCloseTo(44, 0)

      layout.style.setProperty('--wui-layout-sidebar-toggle-width', '66px')
      layout.sidebarCollapsed = true
      await layout.updateComplete
      await waitForLayoutTransition(layout)
      // 折叠态配对：panel = collapsedWidth(90) − aside 8px 左边距 = 82；Toggle 占满
      // panel 减自身 8px×2 margin，即 82 − 16 = 66。前两条是实测值，第三条把它们
      // 写成配对关系，让「改 collapsedWidth 却忘了改 Toggle 宽度」这类改动在这里看得见。
      const collapsedToggle = toggleWidth('展开侧边栏')
      expect(collapsedToggle).toBeCloseTo(66, 0)
      expect(panelWidth()).toBeCloseTo(82, 0)
      expect(collapsedToggle! + 16).toBeCloseTo(panelWidth()!, 0)

      layout.style.removeProperty('--wui-layout-sidebar-toggle-width')
      await nextFrame()
      expect(toggleWidth('展开侧边栏')).toBeCloseTo(44, 0)

      // 36px 下限由 button 自身的 `--wui-control-size` 兜（min-width），不在本组件。
      // README 与 changeset 都写了这个下限，所以钉住它：低于下限的取值被夹住而不是照搬。
      layout.style.setProperty('--wui-layout-sidebar-toggle-width', '20px')
      await nextFrame()
      expect(toggleWidth('展开侧边栏')).toBeCloseTo(36, 0)

      // 钉住本 task 的根因前提：`.sidebar-toggle` 自声明 `--wui-button-width`，元素自身的
      // 声明胜过从祖先继承的同名值，所以从外面设 `--wui-button-width` 仍然改不动它。
      // 这条不是防御性废话——若日后有人「顺手简化」删掉那行自声明而只留 var()，外部覆盖
      // 会静默开始生效，changeset 与 AppLayout 注释里写明的理由就都不成立了。
      layout.style.removeProperty('--wui-layout-sidebar-toggle-width')
      layout.style.setProperty('--wui-button-width', '80px')
      await nextFrame()
      expect(toggleWidth('展开侧边栏')).toBeCloseTo(44, 0)
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

    it('键盘聚焦 handle 时给出与其他组件一致的浅蓝 focus ring', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      // 本 spec 不挂 web-ui-theme，token 未定义时会落到 style.css 的字面 fallback。
      // 写死浅蓝值断言的正是那个 fallback：把 var() 换成硬编码色也能照样通过。
      // 这里反过来自己注入 token 再断言 ring 跟着走，主题无关。
      layout.style.setProperty('--wui-color-focus-ring', 'rgb(1 2 3 / 0.5)')
      await layout.updateComplete
      await nextFrame()

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      // 合成 focus() 不带键盘模态，:focus-visible 不匹配；先用真键盘 Tab 建立模态。
      await userEvent.tab()
      handle.focus()
      expect(handle.matches(':focus-visible')).toBe(true)

      const style = getComputedStyle(handle)
      // 与 back-top 等组件同一组 token：3px、offset 2px，颜色走 --wui-color-focus-ring。
      expect(style.outlineWidth).toBe('3px')
      expect(style.outlineStyle).toBe('solid')
      expect(style.outlineOffset).toBe('2px')
      expect(style.outlineColor).toBe('rgba(1, 2, 3, 0.5)')
    })

    it('键盘聚焦 handle 时同时给出与 hover 同形的 accent 竖条', async () => {
      await page.viewport(1280, 720)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await nextFrame()

      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement
      const barOpacity = () => Number(getComputedStyle(handle, '::before').opacity)

      // 两端都断言：只测聚焦态的话，「竖条一直显示」这种回归照样能过。
      expect(barOpacity()).toBe(0)

      await userEvent.tab()
      handle.focus()
      expect(handle.matches(':focus-visible')).toBe(true)

      // ::before 的 opacity 带 --wui-duration-feedback 过渡，轮询到稳定值而不是赌固定延时。
      await pollUntil(() => barOpacity() === 1, 'Expected the accent bar to show on keyboard focus')
      expect(barOpacity()).toBe(1)
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
