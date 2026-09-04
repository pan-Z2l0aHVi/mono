import { afterEach, describe, expect, it } from 'vite-plus/test'

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

afterEach(() => document.body.replaceChildren())

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

// 菜单面板的定位是异步完成的（Floating UI promise + presence 翻转），轮询到
// left/top 已写入且 presence 进入 open 为止，避免固定 sleep 的竞态。
async function waitForPanelPositioned(panel: HTMLElement | null | undefined, message: string): Promise<HTMLElement> {
  const deadline = performance.now() + 1000
  while (performance.now() < deadline) {
    if (panel && panel.style.left && panel.style.top && panel.dataset.wuiPresence === 'open') return panel
    await nextFrame()
  }
  throw new Error(message)
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

    // 414px 视口下 x=20 时子菜单右开放不下会翻转朝左，x=8 保证右开语义成立。
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

  it('context-menu 在视口下缘打开时面板完整钳制在视口内', async () => {
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
    expect(menu.isOpen).toBe(true)
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
