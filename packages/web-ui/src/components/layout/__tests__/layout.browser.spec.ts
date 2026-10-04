import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import '..'
import '../../theme'
import { pollUntil, queryA11y, waitForFrame } from '@/shared/test-utils'

import type { WebUiLayout } from '..'

const MOBILE_VIEWPORT = { width: 390, height: 844 }
const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

function createLayout(): WebUiLayout {
  const layout = document.createElement('web-ui-layout')
  layout.innerHTML = `
    <header slot="header">Header</header>
    <div slot="sidebar" style="height: 100%">Sidebar</div>
    <main style="height: 2000px">Content</main>
  `
  document.body.append(layout)
  return layout
}

/** 受控契约：组件只派发请求，由消费者回写属性。 */
function syncControlledSidebarState(layout: WebUiLayout) {
  layout.addEventListener('sidebar-collapsed-change', event => {
    layout.sidebarCollapsed = (event as CustomEvent<{ collapsed: boolean }>).detail.collapsed
  })
  layout.addEventListener('sidebar-open-change', event => {
    layout.sidebarOpen = (event as CustomEvent<{ open: boolean }>).detail.open
  })
}

const byLabel = (layout: WebUiLayout, label: string): HTMLElement => {
  const found = queryA11y(layout, `[aria-label="${label}"]`) as HTMLElement | null
  if (!found) throw new Error(`layout 未渲染 aria-label="${label}" 的 toggle`)
  return found
}

afterEach(async () => {
  window.scrollTo(0, 0)
  document.body.replaceChildren()
  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
})

describe('WebUiLayout 组件（浏览器）', () => {
  describe('桌面端 sidebar 折叠', () => {
    it('Toggle 请求受控折叠，回写后 aria-label 反映新状态', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-collapsed-change', event => {
        requested.push((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed)
        layout.sidebarCollapsed = (event as CustomEvent<{ collapsed: boolean }>).detail.collapsed
      })
      await layout.updateComplete

      byLabel(layout, '折叠侧边栏').click()
      await layout.updateComplete

      expect(requested).toEqual([true])
      expect(layout.sidebarCollapsed).toBe(true)
      // byLabel 缺失即抛错，所以这里断的是 label 的**取值**而不是存在性。
      expect(byLabel(layout, '展开侧边栏').getAttribute('aria-label')).toBe('展开侧边栏')
    })

    // 受控语义：属性面变更不是用户请求，不该回派事件，否则消费者的回写会形成回环。
    it('外部受控属性更新会渲染，但不派发请求事件', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete

      let eventCount = 0
      layout.addEventListener('sidebar-collapsed-change', () => eventCount++)

      layout.sidebarCollapsed = true
      await layout.updateComplete

      expect(byLabel(layout, '展开侧边栏').getAttribute('aria-label')).toBe('展开侧边栏')
      expect(eventCount).toBe(0)
    })

    // Vue 的 `:sidebar-collapsed="false"` 会写入字符串 attribute "false"。Lit 布尔属性按
    // 存在语义解析，因此 kebab-case 绑定表达不了 false，只能走 camelCase property 绑定。
    it('kebab-case attribute 遵循存在语义，camelCase property 绑定才能表达 false', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete

      layout.setAttribute('sidebar-collapsed', 'false')
      await layout.updateComplete
      expect(layout.sidebarCollapsed).toBe(true)

      layout.sidebarCollapsed = false
      await layout.updateComplete
      expect(layout.sidebarCollapsed).toBe(false)
      expect(layout.hasAttribute('sidebar-collapsed')).toBe(false)
    })
  })

  describe('移动端 drawer', () => {
    // 640px 两侧切换两套 DOM：桌面渲染 aside + 常驻侧栏，移动端渲染受控 drawer。
    it('移动端改用受控 drawer，不再渲染桌面 aside', async () => {
      await page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete

      expect(queryA11y(layout, 'aside')).toBeFalsy()
      const drawer = queryA11y(layout, 'web-ui-drawer')
      expect(drawer).toBeTruthy()
      expect(drawer?.getAttribute('dialog-label')).toBe('主导航')
      expect(drawer?.hasAttribute('draggable')).toBe(true)
    })

    it('Toggle 请求打开 drawer，回写后与 sidebarOpen 一致', async () => {
      await page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )

      byLabel(layout, '打开导航菜单').click()
      await layout.updateComplete

      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      await pollUntil(() => drawer.hasAttribute('open'), 'Expected drawer to open')

      expect(requested).toEqual([true])
      expect(layout.sidebarOpen).toBe(true)
    })

    it('drawer 的关闭请求冒泡为 sidebar-open-change，组件自身不吞', async () => {
      await page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )

      byLabel(layout, '打开导航菜单').click()
      await layout.updateComplete
      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      await pollUntil(() => drawer.hasAttribute('open'), 'Expected drawer to open')

      const dialog = drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      await layout.updateComplete

      expect(requested).toEqual([true, false])
      expect(layout.sidebarOpen).toBe(false)
      await pollUntil(() => !drawer.hasAttribute('open'), 'Expected drawer to close')
    })
  })

  describe('桌面端 sidebar 拖拽与键盘调宽', () => {
    async function resizableLayout(): Promise<WebUiLayout> {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      await layout.updateComplete
      await waitForFrame()
      return layout
    }

    const handleOf = (layout: WebUiLayout): HTMLElement => {
      const handle = queryA11y(layout, '[role="separator"]') as HTMLElement | null
      if (!handle) throw new Error('layout 未渲染 resize handle')
      return handle
    }

    const pointer = (type: string, init: PointerEventInit) =>
      new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, ...init })

    it('未启用 sidebar-resizable 时不渲染 handle', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete

      expect(queryA11y(layout, '[role="separator"]')).toBeFalsy()
    })

    it('拖拽 handle 松手派发一次调宽请求', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: 60 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: 60 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(parseFloat(layout.sidebarWidth) + 60, 0)
    })

    // 受控契约：拖拽只请求，不自行改 sidebar-width，宽度仍归消费者管。
    it('拖拽只派发请求，不自行改写 sidebarWidth', async () => {
      const layout = await resizableLayout()
      layout.addEventListener('sidebar-width-change', () => {})
      const handle = handleOf(layout)
      const before = layout.sidebarWidth

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: 60 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: 60 }))
      await layout.updateComplete

      expect(layout.sidebarWidth).toBe(before)
    })

    it('零位移松手不派发调宽请求（点击而非拖拽）', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: 0 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(0)
    })

    /*
     * 拖拽调宽的边界契约（README 记载）：请求值必须落在 `[min, max]` 内，且**不等于**
     * 越界目标值。判别力全在「不等于」那半句——只断 `toBeLessOrEqual(max)` 的话，
     * 把钳制整段删掉改成原样透传也能过。
     */
    it('拖拽越界时请求值被钳制到 min / max，而不是越界目标值', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.setAttribute('sidebar-min-width', '200px')
      layout.setAttribute('sidebar-max-width', '300px')
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      // 远大于 max 的拖拽：起点宽度 240 + 400 已远超上限 300。
      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: 400 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: 400 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(300, 0)
      // 不等于未钳制的目标值（240 + 400）
      expect(parseFloat(widthRequests[0])).not.toBeCloseTo(640, 0)

      // 远小于 min 的拖拽：240 - 400 已低于下限 200。
      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: -400 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: -400 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(2)
      expect(parseFloat(widthRequests[1])).toBeCloseTo(200, 0)
      // 不等于未钳制的目标值（240 - 400）
      expect(parseFloat(widthRequests[1])).not.toBeCloseTo(-160, 0)
    })

    /*
     * `sidebar-min-width` 未设置时下限回退到 `collapsed-width`（README 明文记载）。
     * 判别力来自「等于 collapsedWidth」——把回退分支改成常数，这条立刻转红。
     * 不钉具体数值：collapsedWidth 是公开属性，测试自己从它取值。
     */
    it('未设 min-width 时下限回退为 collapsed-width', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.collapsedWidth = '90px'
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: -600 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: -600 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(parseFloat(layout.collapsedWidth), 0)
    })

    /*
     * `sidebar-max-width` 的内置硬上限：无论配多大，Sidebar 最多占视口一半。
     * 配一个远超半屏的值，判别力来自「不等于配置值」——去掉硬上限就转红。
     */
    it('max-width 超过半屏时被内置上限接管', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.setAttribute('sidebar-max-width', '5000px')
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: 4000 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: 4000 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      const halfViewport = DESKTOP_VIEWPORT.width / 2
      expect(parseFloat(widthRequests[0])).toBeLessThanOrEqual(halfViewport)
      expect(parseFloat(widthRequests[0])).not.toBeCloseTo(5000, 0)
    })

    it('pointercancel 中断手势且不派发调宽请求', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: -100 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointercancel', {}))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(0)
      expect(layout.sidebarWidth).toBe('240px')
    })

    // 手写的 role=separator 必须自己补 tabindex，否则键盘用户永远到不了调宽把手。
    it('handle 是可聚焦的 splitter', async () => {
      const layout = await resizableLayout()
      const handle = handleOf(layout)

      expect(handle.getAttribute('role')).toBe('separator')
      expect(handle.getAttribute('tabindex')).toBe('0')
      expect(handle.getAttribute('aria-orientation')).toBe('vertical')
    })

    it('键盘步进只改临时宽度，Enter 才提交一次请求', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await layout.updateComplete
      expect(widthRequests).toHaveLength(0)

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeGreaterThan(parseFloat(layout.sidebarWidth))
    })

    /*
     * 键盘入口与拖拽入口共用同一对 resolver，但走的是另一段代码：Home/End 是 WAI-ARIA
     * splitter 的标准语义（政策 §3 的「可访问性契约」），键盘用户只能走这条路。
     * 下面两条与拖拽那三条同判据：`toBeCloseTo` 钉边界值 + `not.toBeCloseTo(越界目标值)`，
     * 不钉具体像素——resolver 改掉即红，整段钳制删掉也红（未钳制值与边界差几百像素）。
     */
    it('键盘 Home/End 提交到 min / max 边界，而不是越界目标值', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.setAttribute('sidebar-min-width', '200px')
      layout.setAttribute('sidebar-max-width', '300px')
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)
      const key = (k: string) => handle.dispatchEvent(new KeyboardEvent('keydown', { key: k }))

      key('End')
      await layout.updateComplete
      key('Enter')
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(300, 0)
      // 起点宽度 240，若 End 未钳到 max 而是无界步进，落点会远离上限
      expect(parseFloat(widthRequests[0])).not.toBeCloseTo(parseFloat(layout.sidebarWidth), 0)

      key('Home')
      await layout.updateComplete
      key('Enter')
      await layout.updateComplete

      expect(widthRequests).toHaveLength(2)
      expect(parseFloat(widthRequests[1])).toBeCloseTo(200, 0)
      expect(parseFloat(widthRequests[1])).not.toBeCloseTo(parseFloat(layout.sidebarWidth), 0)
    })

    it('键盘方向键步进被 min / max 钳住，不越过边界', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.setAttribute('sidebar-min-width', '200px')
      layout.setAttribute('sidebar-max-width', '300px')
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      // 从 240 连续右移会越过上限 300；提交值必须仍停在边界。
      for (let step = 0; step < 10; step += 1) {
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
        await layout.updateComplete
      }
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(300, 0)
      // 无钳制时 240 + 10×16 = 400
      expect(parseFloat(widthRequests[0])).not.toBeCloseTo(400, 0)

      // 从 240 连续左移会越过下限 200。
      for (let step = 0; step < 10; step += 1) {
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
        await layout.updateComplete
      }
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(2)
      expect(parseFloat(widthRequests[1])).toBeCloseTo(200, 0)
      // 无钳制时 240 - 10×16 = 80
      expect(parseFloat(widthRequests[1])).not.toBeCloseTo(80, 0)
    })

    /*
     * 键盘入口同样要覆盖 `sidebar-min-width` 未设置时的回退分支：Home 必须落到
     * `collapsed-width` 而不是别处。判别力与拖拽那条一致——resolver 改掉即红。
     */
    it('键盘 Home 在未设 min-width 时回退到 collapsed-width', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.collapsedWidth = '90px'
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(parseFloat(layout.collapsedWidth), 0)
      // 不等于展开宽度：回退分支若失效，Home 会落到 sidebarWidth
      expect(parseFloat(widthRequests[0])).not.toBeCloseTo(parseFloat(layout.sidebarWidth), 0)
    })

    // 键盘入口同样受内置半屏硬上限约束，绕过它键盘用户能把侧栏撑满整个视口。
    it('键盘 End 在 max-width 超过半屏时被内置上限接管', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.setAttribute('sidebar-resizable', '')
      layout.setAttribute('sidebar-max-width', '5000px')
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width / 2)
      expect(parseFloat(widthRequests[0])).not.toBeCloseTo(5000, 0)
    })

    it('Escape 撤回键盘调整，不提交请求', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(0)
    })

    // 折叠态没有可调的侧栏，把手必须随折叠一起消失。
    it('折叠态隐藏 handle，展开后重现', async () => {
      const layout = await resizableLayout()
      expect(queryA11y(layout, '[role="separator"]')).toBeTruthy()

      layout.sidebarCollapsed = true
      await layout.updateComplete
      expect(queryA11y(layout, '[role="separator"]')).toBeFalsy()

      layout.sidebarCollapsed = false
      await layout.updateComplete
      expect(queryA11y(layout, '[role="separator"]')).toBeTruthy()
    })

    // 跨越断点会卸载桌面 layout（把手随之消失）。悬挂的手势若不终结，切回桌面后
    // 所有新拖拽都会在入口被 `_isResizing()` 拦下。
    it('拖拽中视口跨越移动端断点后，切回桌面仍可再次拖拽', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      handleOf(layout).dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete

      await page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      await pollUntil(() => !queryA11y(layout, '[role="separator"]'), 'Expected handle to unmount on mobile')

      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      await pollUntil(() => Boolean(queryA11y(layout, '[role="separator"]')), 'Expected handle to remount on desktop')
      expect(widthRequests).toHaveLength(0)

      const freshHandle = handleOf(layout)
      freshHandle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      freshHandle.dispatchEvent(pointer('pointermove', { clientX: 60 }))
      await layout.updateComplete
      freshHandle.dispatchEvent(pointer('pointerup', { clientX: 60 }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(1)
    })
  })

  describe('banner 可见高度', () => {
    // banner 高度驱动 header 的晕染渐变起点。banner 滚出视口后必须收敛到 0，
    // 否则渐变会停在一个已经不可见的偏移上。
    it('banner 在场时报告可见高度，滚出视口后归零', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = document.createElement('web-ui-layout')
      layout.innerHTML = `
        <div slot="banner" style="height: 120px">Banner</div>
        <header slot="header">Header</header>
        <main style="height: 2000px">Content</main>
      `
      document.body.append(layout)
      await layout.updateComplete
      await waitForFrame()

      const visibleHeight = () => layout.style.getPropertyValue('--wui-layout-visible-banner-height')
      await pollUntil(() => visibleHeight() !== '', 'Expected the banner tracker to report an area')
      // 顶部视口内的 banner 按自身高度计入，不做逐像素比对。
      expect(Number.parseFloat(visibleHeight())).toBeGreaterThan(0)

      window.scrollTo(0, 400)
      await pollUntil(() => visibleHeight() === '0px', 'Expected the visible banner height to settle at zero')
      expect(visibleHeight()).toBe('0px')
    })
  })

  describe('键盘可达性', () => {
    // 桌面 toggle 必须真的能被键盘拿到焦点，并且焦点样式对键盘用户可见，
    // 否则键盘用户既到不了它、到了也看不出焦点在哪。合成 focus() 不带键盘模态，
    // 先用真键盘 Tab 建立模态——与 focus-ring 用例同一手法。
    it('键盘 Tab 可聚焦桌面 toggle 并显示 focus ring', async () => {
      await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete
      await waitForFrame()

      await userEvent.tab()
      const toggle = byLabel(layout, '折叠侧边栏')
      toggle.focus()

      const inner = toggle.shadowRoot?.querySelector('button') as HTMLButtonElement | null
      expect(inner).toBeTruthy()
      expect(toggle.shadowRoot?.activeElement ?? inner).toBe(inner)
      expect(inner?.matches(':focus-visible')).toBe(true)
    })
  })
})
