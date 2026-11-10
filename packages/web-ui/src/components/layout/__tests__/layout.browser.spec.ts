import '..'
import '../../theme'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil, queryA11y, waitForAnimationsToFinish, waitForFrame } from '@/shared/test-utils'
import { scrollWindowTo, setViewport } from '@/shared/test-utils/viewport'

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
  await scrollWindowTo(0)
  document.body.replaceChildren()
  await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
})

describe('WebUiLayout 组件（浏览器）', () => {
  it('桌面侧边栏卡片的上、左、下间距可分别覆盖', async () => {
    const layout = createLayout()
    layout.style.setProperty('--wui-layout-sidebar-padding-top', '40px')
    layout.style.setProperty('--wui-layout-sidebar-padding-left', '16px')
    layout.style.setProperty('--wui-layout-sidebar-padding-bottom', '24px')
    await layout.updateComplete
    const aside = layout.shadowRoot!.querySelector('aside')!.getBoundingClientRect()
    const panel = layout.shadowRoot!.querySelector('.aside-panel')!.getBoundingClientRect()
    expect(panel.top - aside.top).toBeCloseTo(40)
    expect(panel.left - aside.left).toBeCloseTo(16)
    expect(aside.bottom - panel.bottom).toBeCloseTo(24)
  })
  it('--wui-layout-viewport-height 把内嵌 layout 与侧边栏限制在容器高度内', async () => {
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
    const container = document.createElement('div')
    container.style.cssText = 'height: 420px; overflow: auto; --wui-layout-viewport-height: 420px'
    const layout = document.createElement('web-ui-layout')
    layout.innerHTML = `
      <div slot="header">Header</div>
      <div slot="sidebar" style="height: 100%">Sidebar</div>
      <main style="height: 2000px">Content</main>
    `
    container.append(layout)
    document.body.append(container)
    await layout.updateComplete

    const aside = layout.shadowRoot?.querySelector<HTMLElement>('aside')
    expect(aside).toBeTruthy()
    expect(aside!.getBoundingClientRect().height).toBeCloseTo(420)
  })

  describe('桌面端 sidebar collapse', () => {
    it('未声明 sidebar-collapsible 时不渲染桌面 Toggle', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete
      expect(queryA11y(layout, '.sidebar-toggle')).toBeFalsy()

      layout.sidebarCollapsible = true
      await layout.updateComplete
      expect(queryA11y(layout, '.sidebar-toggle')).toBeTruthy()
    })

    it('Toggle 请求受控 collapse，回写后 aria-label 反映新状态', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.sidebarCollapsible = true
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-collapsed-change', event => {
        requested.push((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed)
        layout.sidebarCollapsed = (event as CustomEvent<{ collapsed: boolean }>).detail.collapsed
      })
      await layout.updateComplete

      byLabel(layout, 'Collapse sidebar').click()
      await layout.updateComplete

      expect(requested).toEqual([true])
      expect(layout.sidebarCollapsed).toBe(true)
      /*
       * 名字翻没翻，判两条：新名挂着，旧名不再挂在任何 toggle 上。不能写成
       * `byLabel(layout, 'Expand sidebar').getAttribute('aria-label')`——byLabel 的选择器就是
       * `[aria-label="Expand sidebar"]`，读回来的取值由选择器钉死，组件怎么渲染都红不了。
       */
      expect(
        queryA11y(layout, '[aria-label="Expand sidebar"]'),
        '折叠后没有渲染 Expand sidebar 的 toggle'
      ).not.toBeNull()
      expect(queryA11y(layout, '[aria-label="Collapse sidebar"]'), '折叠后 toggle 仍叫 Collapse sidebar').toBeNull()
    })

    // 受控语义：属性面变更不是用户请求，不该回派事件，否则消费者的回写会形成回环。
    it('外部受控属性更新会渲染，但不派发请求事件', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.sidebarCollapsible = true
      await layout.updateComplete

      let eventCount = 0
      layout.addEventListener('sidebar-collapsed-change', () => eventCount++)

      layout.sidebarCollapsed = true
      await layout.updateComplete

      // 与上一条同判据：属性面变更照样把 toggle 的名字翻过来，而 eventCount 判的是另一件事。
      expect(
        queryA11y(layout, '[aria-label="Expand sidebar"]'),
        '外部置 collapsed 后没有渲染 Expand sidebar'
      ).not.toBeNull()
      expect(
        queryA11y(layout, '[aria-label="Collapse sidebar"]'),
        '外部置 collapsed 后仍留着 Collapse sidebar'
      ).toBeNull()
      expect(eventCount).toBe(0)
    })

    // Vue 的 `:sidebar-collapsed="false"` 会写入字符串 attribute "false"。Lit 布尔属性按
    // 存在语义解析，因此 kebab-case 绑定表达不了 false，只能走 camelCase property 绑定。
    it('kebab-case attribute 遵循存在语义，camelCase property 绑定才能表达 false', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.sidebarCollapsible = true
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

  describe('ariaLabels 覆盖', () => {
    it('未覆盖时回退内置英文；覆盖后桌面 toggle 与 resize handle 用覆盖值', async () => {
      const layout = createLayout()
      layout.sidebarCollapsible = true
      layout.sidebarResizable = true
      await layout.updateComplete

      const toggle = layout.shadowRoot?.querySelector<HTMLElement>('.sidebar-toggle')
      expect(toggle?.getAttribute('aria-label')).toBe('Collapse sidebar')

      layout.ariaLabels = { collapseSidebar: '收起侧栏', resizeSidebar: '调宽' }
      await layout.updateComplete

      expect(toggle?.getAttribute('aria-label')).toBe('收起侧栏')
      const handle = layout.shadowRoot?.querySelector<HTMLElement>('[role="separator"]')
      expect(handle?.getAttribute('aria-label')).toBe('调宽')
    })
  })

  describe('无 sidebar 模式', () => {
    // 与 collapse 不同：collapse 只收窄桌面 aside，`no-sidebar` 把侧边栏结构整棵移出树。
    it('桌面端只渲染内容列：无 aside、无 Toggle，sidebar slot 内容仍留在 light DOM', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.noSidebar = true
      await layout.updateComplete

      expect(layout.hasAttribute('no-sidebar')).toBe(true)
      expect(queryA11y(layout, 'aside')).toBeFalsy()
      expect(queryA11y(layout, '.sidebar-toggle')).toBeFalsy()
      expect(queryA11y(layout, 'slot[name="sidebar"]')).toBeFalsy()
      expect(queryA11y(layout, 'main')).toBeTruthy()
      expect(queryA11y(layout, 'slot[name="header"]')).toBeTruthy()
      expect(queryA11y(layout, 'slot[name="banner"]')).toBeTruthy()
      expect(queryA11y(layout, 'slot[name="tabbar"]')).toBeTruthy()
      // 只是不渲染：消费方的 light DOM 节点不被移除，撤下属性即可回到原布局。
      expect(layout.querySelector('[slot="sidebar"]')).toBeTruthy()
    })

    it('移动端不渲染 header Toggle 与 Drawer', async () => {
      await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      layout.mobile = true
      layout.noSidebar = true
      await layout.updateComplete

      expect(layout.mobile).toBe(true)
      expect(queryA11y(layout, '[aria-label="Open navigation menu"]')).toBeFalsy()
      expect(queryA11y(layout, 'web-ui-drawer')).toBeFalsy()
      expect(queryA11y(layout, 'aside')).toBeFalsy()
      expect(queryA11y(layout, 'main')).toBeTruthy()
    })

    it('撤下属性恢复原布局，并清理未提交的调宽临时宽度', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.sidebarResizable = true
      await layout.updateComplete
      await waitForFrame()

      const handle = layout.shadowRoot?.querySelector<HTMLElement>('[role="separator"]')
      expect(handle).toBeTruthy()
      handle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await layout.updateComplete

      const aside = layout.shadowRoot?.querySelector<HTMLElement>('aside')
      if (!aside) throw new Error('Expected the desktop aside to be rendered')
      const tempWidth = aside.style.width
      expect(tempWidth).not.toBe(layout.sidebarWidth)

      layout.noSidebar = true
      await layout.updateComplete
      expect(queryA11y(layout, 'aside')).toBeFalsy()

      layout.noSidebar = false
      await layout.updateComplete
      const restored = layout.shadowRoot?.querySelector<HTMLElement>('aside')
      expect(restored?.style.width).toBe(layout.sidebarWidth)
      expect(restored?.querySelector('[role="separator"]')).toBeTruthy()
    })
  })

  describe('移动端 drawer', () => {
    // 由调用方选择桌面侧栏或移动端 drawer。
    it('移动端改用受控 drawer，不再渲染桌面 aside', async () => {
      await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      layout.mobile = true
      await layout.updateComplete

      expect(queryA11y(layout, 'aside')).toBeFalsy()
      const drawer = queryA11y(layout, 'web-ui-drawer')
      expect(drawer).toBeTruthy()
      expect(drawer?.getAttribute('aria-dialog-label')).toBe('Main navigation')
      expect(drawer?.hasAttribute('draggable')).toBe(true)
    })

    it('Toggle 请求打开 drawer，回写后与 sidebarOpen 一致', async () => {
      await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      layout.mobile = true
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )

      byLabel(layout, 'Open navigation menu').click()
      await layout.updateComplete

      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      await pollUntil(() => drawer.hasAttribute('open'), 'Expected drawer to open')

      expect(requested).toEqual([true])
      expect(layout.sidebarOpen).toBe(true)
    })

    it('drawer 的关闭请求冒泡为 sidebar-open-change，组件自身不吞', async () => {
      await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      layout.mobile = true
      syncControlledSidebarState(layout)
      await layout.updateComplete

      const requested: boolean[] = []
      layout.addEventListener('sidebar-open-change', event =>
        requested.push((event as CustomEvent<{ open: boolean }>).detail.open)
      )

      byLabel(layout, 'Open navigation menu').click()
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

    // 移动端侧栏打开时整页朝右让开 16vw（placement="left" 的进场方向）；关闭后归位。
    it('打开移动端 drawer 时整页让开，关闭后回到原位', { timeout: 20_000 }, async () => {
      await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      const layout = createLayout()
      layout.mobile = true
      syncControlledSidebarState(layout)
      const marker = document.createElement('div')
      marker.style.cssText = 'width:10px;height:10px;margin-left:120px'
      document.body.append(marker)
      await layout.updateComplete
      const rest = marker.getBoundingClientRect().left

      byLabel(layout, 'Open navigation menu').click()
      const drawer = queryA11y(layout, 'web-ui-drawer') as HTMLElement
      await pollUntil(() => drawer.hasAttribute('open'), 'Expected drawer to open')
      await waitForAnimationsToFinish([document.documentElement, drawer], 8_000)

      const expectedShift = 16 * (window.innerWidth / 100)
      expect(marker.getBoundingClientRect().left - rest).toBeCloseTo(expectedShift, 1)

      const dialog = drawer.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      await pollUntil(() => !drawer.hasAttribute('open'), 'Expected drawer to close')
      await waitForAnimationsToFinish([document.documentElement, drawer], 8_000)
      expect(marker.getBoundingClientRect().left - rest).toBeCloseTo(0, 1)
    })
  })

  describe('桌面端 sidebar 拖拽与键盘调宽', () => {
    async function resizableLayout(): Promise<WebUiLayout> {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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

    it('平板宽度下触摸拖拽侧栏手柄可请求调宽', async () => {
      await setViewport(1024, 768)
      const layout = createLayout()
      layout.sidebarResizable = true
      await layout.updateComplete
      await waitForFrame()

      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )
      const handle = handleOf(layout)
      handle.dispatchEvent(pointer('pointerdown', { clientX: 240, pointerType: 'touch' }))
      handle.dispatchEvent(pointer('pointermove', { clientX: 300, pointerType: 'touch' }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointerup', { clientX: 300, pointerType: 'touch' }))
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      // 判据是「手势没把手柄的初始宽度带走」，所以参照取手势前的读数，而不是把默认档
      // 的像素值抄进用例——默认宽度属于设计值，改档时这条用例会跟着改参照一起绿。
      const widthBeforeGesture = layout.sidebarWidth

      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointermove', { clientX: -100 }))
      await layout.updateComplete
      handle.dispatchEvent(pointer('pointercancel', {}))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(0)
      expect(layout.sidebarWidth, 'pointercancel 后侧栏宽度应回到手势前的读数').toBe(widthBeforeGesture)
    })

    // 手写的 role=separator 必须自己补 tabindex，否则键盘用户永远到不了调宽 resize handle。
    it('handle 是可聚焦的 splitter', async () => {
      const layout = await resizableLayout()
      const handle = handleOf(layout)

      // role 不在这里判：handleOf 的选择器就是 `[role="separator"]`，取不到就抛错，
      // 再读一次 getAttribute('role') 读的是选择器自己钉住的那个值。
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
     * Enter 提交后临时宽度必须清空（`_resizeWidth = null`），焦点仍停在 resize handle 上时
     * 再按回车是「无未提交调整」，不该再派发第二次请求——这正是 :233 注释写明的
     * 意图。判别力来自**第二次** Enter：只按一次 Enter 的用例无法区分「提交后清空」
     * 与「提交后原样留着」，删掉清空这行本用例立刻转红。
     */
    it('Enter 提交后清空临时宽度，再按一次 Enter 不重复派发', async () => {
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

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)

      // 焦点未动，resize handle 上没有新的未提交调整：回车不该产生第二次请求。
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)
    })

    /*
     * 清空临时宽度的第二个后果，也是「受控契约」的一半：提交后下一步方向键必须
     * 从 **prop 管辖的渲染宽度** 起算，而不是从刚提交过的值继续往上叠。
     *
     * 判别力在于两条路径的落点差一个完整步进（256 vs 288）：Consumer 有权拒绝或
     * 钳制请求，若组件把未回写的旧值留在 `_resizeWidth` 里，后续步进就从一个用户
     * 实际没得到的宽度起算并逐次累积。清空这行，本用例立刻转红。
     */
    it('Enter 提交后方向键从 prop 宽度起算，不接着未回写的提交值累积', async () => {
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
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      // 提交后 aside 宽度过渡回 prop 值；下一步的起点读的是 computed width，
      // 必须等过渡落定，否则会读到动画中间值。
      const aside = queryA11y(layout, 'aside') as HTMLElement
      await pollUntil(
        () => Math.abs(parseFloat(window.getComputedStyle(aside).width) - parseFloat(layout.sidebarWidth)) < 1,
        'Expected sidebar width to settle back to the prop value'
      )

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await layout.updateComplete
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await layout.updateComplete

      expect(widthRequests).toHaveLength(2)
      // Consumer 未回写，prop 仍是起点宽度：下一步 = 起点 + 一个步进。
      expect(parseFloat(widthRequests[1])).toBeCloseTo(parseFloat(layout.sidebarWidth) + 16, 0)
      // 钉住「不是接着提交值累积」：那会是一个步进之差（272 + 16 而非 240 + 16）。
      expect(parseFloat(widthRequests[1])).not.toBeCloseTo(parseFloat(widthRequests[0]) + 16, 0)
    })

    /*
     * Shift 加速步进（WAI-ARIA splitter 的常规约定）：同一起点、同一个 key，
     * 不带 Shift 走 N 步与带 Shift 走 1 步必须落到同一宽度。
     *
     * 判别力钉的是两个分支的**比值关系**而不是某个具体像素：起点宽度、min/max
     * resolver 或步长常量改动后断言依然成立，而把 `shiftKey ? 64 : 16` 的加速
     * 分支删成恒定 16 时两组落点立刻分叉（256 vs 304）转红。
     */
    it('Shift 加速：1 次 Shift 步进与 4 次普通步进落到同一宽度', async () => {
      // 每个序列用独立 layout：Enter 提交后 aside 宽度会过渡回 prop 值，
      // 复用同一个实例会让下一个序列的起点落在过渡中间值上（见 :213-215 的
      // `getComputedStyle` 读法）。
      const committedAfterArrowRight = async (presses: number, shiftKey: boolean) => {
        const layout = await resizableLayout()
        const widthRequests: string[] = []
        layout.addEventListener('sidebar-width-change', event =>
          widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
        )
        const handle = handleOf(layout)

        for (let press = 0; press < presses; press += 1) {
          handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey }))
          await layout.updateComplete
        }
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
        await layout.updateComplete

        expect(widthRequests).toHaveLength(1)
        return parseFloat(widthRequests[0])
      }

      const onePlainStep = await committedAfterArrowRight(1, false)
      const fourPlainSteps = await committedAfterArrowRight(4, false)
      const oneShiftStep = await committedAfterArrowRight(1, true)

      // 4 次普通步进 ≡ 1 次 Shift 步进。
      expect(oneShiftStep).toBeCloseTo(fourPlainSteps, 0)
      // 护栏：单次普通步进必须明显更小，否则上面那条可能因「两个分支都没动」而空转。
      expect(oneShiftStep).not.toBeCloseTo(onePlainStep, 0)
    })

    /*
     * 键盘入口与拖拽入口共用同一对 resolver，但走的是另一段代码：Home/End 是 WAI-ARIA
     * splitter 的标准语义（政策 §3 的「可访问性契约」），键盘用户只能走这条路。
     * 下面两条与拖拽那三条同判据：`toBeCloseTo` 钉边界值 + `not.toBeCloseTo(越界目标值)`，
     * 不钉具体像素——resolver 改掉即红，整段钳制删掉也红（未钳制值与边界差几百像素）。
     */
    it('键盘 Home/End 提交到 min / max 边界，而不是越界目标值', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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

    // collapsed state 没有可调的侧栏，resize handle 必须随 collapse 一起消失。
    it('collapsed state 隐藏 handle，展开后重现', async () => {
      const layout = await resizableLayout()
      expect(queryA11y(layout, '[role="separator"]')).toBeTruthy()

      layout.sidebarCollapsed = true
      await layout.updateComplete
      expect(queryA11y(layout, '[role="separator"]')).toBeFalsy()

      layout.sidebarCollapsed = false
      await layout.updateComplete
      expect(queryA11y(layout, '[role="separator"]')).toBeTruthy()
    })

    it('拖拽中隐藏 sidebar 会取消手势，恢复后可以重新拖拽', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      const handle = handleOf(layout)
      handle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      handle.dispatchEvent(pointer('pointermove', { clientX: 60 }))
      await layout.updateComplete
      const aside = queryA11y(layout, 'aside') as HTMLElement
      expect(aside.style.width).not.toBe(layout.sidebarWidth)

      layout.noSidebar = true
      await layout.updateComplete
      expect(queryA11y(layout, 'aside')).toBeFalsy()
      expect(widthRequests).toEqual([])

      layout.noSidebar = false
      await layout.updateComplete
      const restoredHandle = handleOf(layout)
      restoredHandle.dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      restoredHandle.dispatchEvent(pointer('pointermove', { clientX: 60 }))
      await layout.updateComplete
      restoredHandle.dispatchEvent(pointer('pointerup', { clientX: 60 }))
      await layout.updateComplete
      expect(widthRequests).toHaveLength(1)
      expect(parseFloat(widthRequests[0])).toBeCloseTo(parseFloat(layout.sidebarWidth) + 60, 0)
    })

    // 切换移动端会卸载桌面 layout（resize handle 随之消失）。悬挂的手势若不终结，切回桌面后
    // 所有新拖拽都会在入口被 `_isResizing()` 拦下。
    it('拖拽中切换移动端后，切回桌面仍可再次拖拽', async () => {
      const layout = await resizableLayout()
      const widthRequests: string[] = []
      layout.addEventListener('sidebar-width-change', event =>
        widthRequests.push((event as CustomEvent<{ width: string }>).detail.width)
      )

      handleOf(layout).dispatchEvent(pointer('pointerdown', { clientX: 0 }))
      await layout.updateComplete

      layout.mobile = true
      await layout.updateComplete
      await pollUntil(() => !queryA11y(layout, '[role="separator"]'), 'Expected handle to unmount on mobile')

      layout.mobile = false
      await layout.updateComplete
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

  describe('受控移动端状态', () => {
    it('由调用方控制布局并反射 attribute，视口变化不会改变该状态', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      await layout.updateComplete
      expect(layout.mobile).toBe(false)
      layout.mobile = true
      await layout.updateComplete
      expect(layout.hasAttribute('mobile')).toBe(true)
      expect(queryA11y(layout, 'web-ui-drawer')).toBeTruthy()
      expect(queryA11y(layout, 'aside')).toBeFalsy()
      await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
      layout.mobile = false
      await layout.updateComplete
      expect(layout.hasAttribute('mobile')).toBe(false)
      expect(queryA11y(layout, 'aside')).toBeTruthy()
    })
  })

  describe('banner 可见高度', () => {
    // banner 高度驱动 header 的晕染渐变起点。banner 滚出视口后必须收敛到 0，
    // 否则渐变会停在一个已经不可见的偏移上。
    it('banner 在场时报告可见高度，滚出视口后归零', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
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

      await scrollWindowTo(400)
      await pollUntil(() => visibleHeight() === '0px', 'Expected the visible banner height to settle at zero')
      expect(visibleHeight()).toBe('0px')
    })
  })

  describe('键盘可达性', () => {
    // 桌面 toggle 必须真的能被键盘拿到焦点，并且焦点样式对键盘用户可见，
    // 否则键盘用户既到不了它、到了也看不出焦点在哪。合成 focus() 不带键盘模态，
    // 先用真键盘 Tab 建立模态——与 focus-ring 用例同一手法。
    it('键盘 Tab 可聚焦桌面 toggle 并显示 focus ring', async () => {
      await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
      const layout = createLayout()
      layout.sidebarCollapsible = true
      await layout.updateComplete
      await waitForFrame()

      await userEvent.tab()
      const toggle = byLabel(layout, 'Collapse sidebar')
      toggle.focus()

      const inner = toggle.shadowRoot?.querySelector('button') as HTMLButtonElement | null
      expect(inner).toBeTruthy()
      expect(toggle.shadowRoot?.activeElement ?? inner).toBe(inner)
      expect(inner?.matches(':focus-visible')).toBe(true)
    })
  })
})
