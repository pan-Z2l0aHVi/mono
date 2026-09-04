import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '@/components/autocomplete'
import '@/components/context-menu'
import '@/components/dialog'
import '@/components/drawer'
import '@/components/popover'
import '@/components/select'
import '@/components/tooltip'
import type { WebUiAutocomplete } from '@/components/autocomplete'
import type { WebUiContextMenu } from '@/components/context-menu'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiPopover } from '@/components/popover'
import type { WebUiSelect } from '@/components/select'
import type { WebUiTooltip } from '@/components/tooltip'

// 默认直通 @floating-ui/dom；enabled 时扣住 context-submenu 面板的首次定位结果，
// 供竞态用例以受控顺序放行「迟到的旧定位写入」（真实 dom platform 完成序恒 FIFO）。
const submenuStaleGate = vi.hoisted(() => ({
  // 计数门控：enabled 时各 submenu 面板的第 1 次定位被扣住，第 2 次起直通，
  // 供竞态用例构造「旧定位迟到、新定位先落位」的受控完成序。
  enabled: false,
  offset: { x: 0, y: 0 },
  release: null as null | (() => void)
}))

vi.mock('@floating-ui/dom', async importOriginal => {
  const actual = await importOriginal<typeof import('@floating-ui/dom')>()
  const callCounts = new WeakMap<HTMLElement, number>()
  const computePosition: typeof actual.computePosition = (reference, floating, config) => {
    const promise = actual.computePosition(reference, floating, config)
    if (
      !submenuStaleGate.enabled ||
      !(floating instanceof HTMLElement) ||
      !floating.classList.contains('context-submenu')
    ) {
      return promise
    }
    const count = (callCounts.get(floating) ?? 0) + 1
    callCounts.set(floating, count)
    if (count > 1) return promise
    return promise.then(
      result =>
        new Promise<typeof result>(resolve => {
          submenuStaleGate.release = () =>
            resolve({ ...result, x: result.x + submenuStaleGate.offset.x, y: result.y + submenuStaleGate.offset.y })
        })
    )
  }
  return { ...actual, computePosition }
})

afterEach(() => {
  submenuStaleGate.enabled = false
  submenuStaleGate.release = null
  document.body.replaceChildren()
})

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

async function openDrawerDialog(): Promise<HTMLDialogElement> {
  const drawer = document.createElement('web-ui-drawer')
  document.body.append(drawer)
  await drawer.updateComplete

  drawer.open = true
  await drawer.updateComplete

  const dialog = drawer.shadowRoot?.querySelector('dialog')
  if (!dialog) throw new Error('Expected the drawer to contain a dialog')

  const deadline = performance.now() + 1000
  while (performance.now() < deadline) {
    if (dialog.open && dialog.classList.contains('is-visible')) break
    await nextFrame()
  }
  if (!dialog.open || !dialog.classList.contains('is-visible')) {
    throw new Error('Expected the drawer dialog to become visible')
  }

  // 等入场 transform 过渡到位再返回：过渡中途打开浮层会拿到持续漂移的
  // dialog 坐标，定位断言（相邻性、视口边界）无法确定性成立。
  const settleDeadline = performance.now() + 2000
  while (performance.now() < settleDeadline) {
    const transform = getComputedStyle(dialog).transform
    if (transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)') return dialog
    await nextFrame()
  }
  throw new Error('Expected the drawer dialog to settle at its open position')
}

// 轮询到确定性信号为止，避免固定 sleep 的竞态；面板定位是异步完成的
// （Floating UI promise + presence 翻转），需等待 left/top 写入且 presence 翻转。
async function waitFor<T>(poll: () => T | null | undefined, ready: (value: T) => boolean, message: string): Promise<T> {
  const deadline = performance.now() + 1000
  while (performance.now() < deadline) {
    const value = poll()
    if (value !== null && value !== undefined && ready(value)) return value
    await nextFrame()
  }
  throw new Error(message)
}

async function waitForPanelPositioned(panel: HTMLElement | null | undefined, message: string): Promise<HTMLElement> {
  return waitFor(
    () => panel,
    value => Boolean(value.style.left && value.style.top && value.dataset.wuiPresence === 'open'),
    message
  )
}

function expectVisibleInDialog(panel: HTMLElement | null | undefined, dialog: HTMLDialogElement) {
  expect(dialog.matches(':modal')).toBe(true)

  const root = panel?.getRootNode()
  const portalHost = root instanceof ShadowRoot ? root.host : null
  expect(
    dialog.contains(panel ?? null) ||
      (portalHost !== null && dialog.contains(portalHost) && portalHost.shadowRoot?.contains(panel ?? null) === true)
  ).toBe(true)

  const rect = panel!.getBoundingClientRect()
  expect(rect.width).toBeGreaterThan(0)
  expect(rect.height).toBeGreaterThan(0)
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(rect.top).toBeGreaterThanOrEqual(0)
  expect(rect.right).toBeLessThanOrEqual(window.innerWidth)
  expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight)
}

describe('Portal overlay 在已打开原生 dialog 内（top layer）', () => {
  it('popover 面板挂载到 dialog 内并保持可视', async () => {
    const dialog = await openDrawerDialog()
    const popover = document.createElement('web-ui-popover') as WebUiPopover
    popover.portal = true
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Popover content</div>'
    drawerDialogAppend(dialog, popover)
    await popover.updateComplete

    popover.show()
    await popover.updateComplete
    await nextFrame()
    await nextFrame()

    const panel = getPortalPanel(dialog, '.popover-panel')
    expectVisibleInDialog(panel, dialog)
    expect(popover.open).toBe(true)
  })

  it('tooltip 面板挂载到 dialog 内并保持可视', async () => {
    const dialog = await openDrawerDialog()
    const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
    tooltip.portal = true
    tooltip.content = 'Tooltip in dialog'
    tooltip.innerHTML = '<button>Trigger</button>'
    drawerDialogAppend(dialog, tooltip)
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    await nextFrame()

    const panel = getPortalPanel(dialog, '.tooltip-panel')
    expectVisibleInDialog(panel, dialog)
    expect(tooltip.open).toBe(true)
  })

  it('select 面板挂载到 dialog 内并可交互', async () => {
    const dialog = await openDrawerDialog()
    const select = document.createElement('web-ui-select') as WebUiSelect
    select.portal = true
    select.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    drawerDialogAppend(dialog, select)
    await select.updateComplete

    select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')?.click()
    await select.updateComplete
    await nextFrame()

    const panel = getPortalPanel(dialog, '.select-overlay')
    expectVisibleInDialog(panel, dialog)

    panel?.querySelector<HTMLElement>('web-ui-option')?.click()
    await select.updateComplete
    expect(select.value).toBe('apple')
  })

  it('autocomplete 面板挂载到 dialog 内并可交互', async () => {
    const dialog = await openDrawerDialog()
    const autocomplete = document.createElement('web-ui-autocomplete') as WebUiAutocomplete
    autocomplete.portal = true
    autocomplete.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    drawerDialogAppend(dialog, autocomplete)
    await autocomplete.updateComplete

    autocomplete.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')?.focus()
    await autocomplete.updateComplete
    await nextFrame()

    const panel = getPortalPanel(dialog, '.autocomplete-overlay')
    expectVisibleInDialog(panel, dialog)

    panel?.querySelector<HTMLElement>('web-ui-option')?.click()
    await autocomplete.updateComplete
    expect(autocomplete.value).toBe('Apple')
  })

  it('context-menu 面板挂载到 dialog 内', async () => {
    const dialog = await openDrawerDialog()
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML = '<web-ui-dropdown-item>Preview</web-ui-dropdown-item>'
    drawerDialogAppend(dialog, menu)
    await menu.updateComplete

    menu.openAt(80, 80)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const panel = dialog.querySelector<HTMLElement>('.context-menu')
    expectVisibleInDialog(panel, dialog)
    expect(menu.isOpen).toBe(true)
    expect(panel?.textContent).toContain('Preview')
  })

  it('context-menu 子菜单在 dialog 内与触发项相邻且在视口内', async () => {
    const dialog = await openDrawerDialog()
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML =
      '<web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
    drawerDialogAppend(dialog, menu)
    await menu.updateComplete

    // x 取视口左缘附近：右开方向给子菜单留出充裕空间，保证右开语义成立，
    // 不因空间不足翻转朝左（翻转朝左会走 gap 断言的另一分支）。
    menu.openAt(8, 60)
    await menu.updateComplete
    const mainPanel = await waitForPanelPositioned(
      dialog.querySelector<HTMLElement>('.context-menu'),
      'Expected the context menu to be positioned'
    )

    const parentItem = mainPanel.querySelector<HTMLElement>('web-ui-dropdown-item')
    parentItem?.click()
    const submenu = await waitForPanelPositioned(
      dialog.querySelector<HTMLElement>('.context-submenu'),
      'Expected the context submenu to be positioned'
    )

    const itemRect = parentItem!.getBoundingClientRect()
    const rect = submenu.getBoundingClientRect()
    // transformed containing block 下直接写视口坐标会把子菜单整体偏移 dialog 宽度；
    // 开合方向的贴锚边缘（右开贴 item 右缘 / 左开贴 item 左缘）必须与触发项相邻。
    const gap = Math.min(Math.abs(rect.right - itemRect.left), Math.abs(rect.left - itemRect.right))
    expect(gap).toBeLessThanOrEqual(8)
    expectVisibleInDialog(submenu, dialog)
    expect(menu.isOpen).toBe(true)
    expect(submenu.textContent).toContain('PDF')
  })

  it('context-menu 在视口下缘打开时面板完整钳制在视口内且 origin 含 bottom', async () => {
    const dialog = await openDrawerDialog()
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML =
      '<web-ui-dropdown-item>Preview</web-ui-dropdown-item><web-ui-dropdown-item>Delete</web-ui-dropdown-item>'
    drawerDialogAppend(dialog, menu)
    await menu.updateComplete

    // dialog 路径 shift 曾只钳制 x（crossAxis 默认 false），下缘打开时底部溢出。
    menu.openAt(40, window.innerHeight - 60)
    await menu.updateComplete
    const panel = await waitForPanelPositioned(
      dialog.querySelector<HTMLElement>('.context-menu'),
      'Expected the context menu to be positioned'
    )

    expectVisibleInDialog(panel, dialog)
    // shift 上推后 origin 应从 bottom 展开进位；旧启发式（dialog 相对坐标与视口
    // 光标比较）在此处恒判 top，动画从错误角缩放。
    expect(panel.style.getPropertyValue('--wui-internal-overlay-transform-origin')).toBe('bottom left')
    expect(menu.isOpen).toBe(true)
  })

  it('context-menu transform-origin 无 shift 推动时为 top left', async () => {
    const dialog = await openDrawerDialog()
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML =
      '<web-ui-dropdown-item>Preview</web-ui-dropdown-item><web-ui-dropdown-item>Delete</web-ui-dropdown-item>'
    drawerDialogAppend(dialog, menu)
    await menu.updateComplete

    // 光标取面板可完整容纳的位置，shift 不推动，origin 应为 top left；
    // 旧启发式把 dialog 相对坐标与视口光标比较，dialog 原点非零时恒判 bottom right。
    menu.openAt(100, 400)
    await menu.updateComplete
    const panel = await waitForPanelPositioned(
      dialog.querySelector<HTMLElement>('.context-menu'),
      'Expected the context menu to be positioned'
    )

    expect(panel.style.getPropertyValue('--wui-internal-overlay-transform-origin')).toBe('top left')
    expect(menu.isOpen).toBe(true)
  })

  it('context-menu 子菜单同帧关闭重开后以最新定位落位', async () => {
    const dialog = await openDrawerDialog()
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML =
      '<web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item><web-ui-dropdown-item>Copy</web-ui-dropdown-item>'
    drawerDialogAppend(dialog, menu)
    await menu.updateComplete

    // 子菜单打开走 hover 延时路径（modal dialog 内 focus() 受 :modal 焦点约束，
    // 键盘导航不可用），全程不依赖焦点即可构造同帧关闭→重开。
    submenuStaleGate.enabled = true
    submenuStaleGate.offset = { x: 300, y: 0 }
    // 拉长退出过渡：hover 关闭走 200ms 定时器重开，需保证重开时面板仍在 closing
    // 缓存内（默认 100ms+80ms buffer 会先于重开完成收尾并移除面板，复用不成立）。
    dialog.style.setProperty('--wui-duration-menu-exit', '2000ms')
    menu.openAt(8, 60)
    await menu.updateComplete
    const mainPanel = await waitForPanelPositioned(
      dialog.querySelector<HTMLElement>('.context-menu'),
      'Expected the context menu to be positioned'
    )
    const parentItem = mainPanel.querySelector<HTMLElement>('web-ui-dropdown-item')
    parentItem?.dispatchEvent(new PointerEvent('pointerenter'))
    await waitFor(
      () => dialog.querySelector<HTMLElement>('.context-submenu'),
      submenu => submenu !== null && submenu.dataset.wuiPresence === 'open',
      'Expected the gated submenu panel to be present'
    )

    // 悬停普通项触发关闭（非即时，面板进 closing 缓存），同帧悬停回父项重开：
    // 复用同一 panel 发起第二次定位并先行完成；随后放行被扣的首次定位——
    // 旧实现下迟到的旧写入会把面板推离触发项、顶出视口。
    const copyItem = mainPanel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')[1]
    copyItem?.dispatchEvent(new PointerEvent('pointerenter'))
    parentItem?.dispatchEvent(new PointerEvent('pointerenter'))
    // 重开可能复用 closing 缓存面板或重建新面板：轮询内动态解析当前活跃子菜单面板；
    // 竞态断言不受面板身份影响（写错坐标的面板必然偏离触发项）。
    const submenu = await waitFor(
      () => dialog.querySelector<HTMLElement>('.context-submenu'),
      panel => Boolean(panel.style.left && panel.style.top && panel.dataset.wuiPresence === 'open'),
      'Expected the reopened submenu to be positioned'
    )

    // 放行被扣的首次定位：其坐标已被重开定位覆盖，迟到写入必须被丢弃而非覆盖。
    submenuStaleGate.release?.()
    await nextFrame()
    await nextFrame()

    const itemRect = parentItem!.getBoundingClientRect()
    const rect = submenu.getBoundingClientRect()
    const gap = Math.min(Math.abs(rect.right - itemRect.left), Math.abs(rect.left - itemRect.right))
    expect(gap).toBeLessThanOrEqual(8)
    expectVisibleInDialog(submenu, dialog)
    expect(menu.isOpen).toBe(true)
    expect(submenu.textContent).toContain('PDF')
  })

  it('dialog 从 drawer 内打开时自身进入 top layer', async () => {
    const drawerDialog = await openDrawerDialog()
    const component = document.createElement('web-ui-dialog') as WebUiDialog
    component.textContent = 'Nested dialog'
    drawerDialogAppend(drawerDialog, component)
    await component.updateComplete

    component.showModal()
    await component.updateComplete
    await nextFrame()

    const nestedDialog = component.shadowRoot?.querySelector('dialog')
    expect(drawerDialog.matches(':modal')).toBe(true)
    expect(nestedDialog?.open).toBe(true)
    expect(nestedDialog?.matches(':modal')).toBe(true)
  })
})

function getPortalPanel(dialog: HTMLDialogElement, selector: string): HTMLElement {
  const host = Array.from(dialog.children).find(element => element.shadowRoot?.querySelector(selector))
  const panel = host?.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!panel) throw new Error(`Expected a ${selector} panel inside the drawer dialog`)
  return panel
}

function drawerDialogAppend(dialog: HTMLDialogElement, element: HTMLElement) {
  const drawer = dialog.getRootNode() as ShadowRoot
  const host = drawer.host as HTMLElement
  element.style.display = 'block'
  element.style.padding = '16px'
  host.append(element)
  return element
}
