/*
 * Escape 归属仲裁（浏览器）。
 *
 * 承载的是 issue #120 Block 1：一次 Escape 只能关闭最内层浮层。缺陷形态是「内层没关、
 * 外层反被关」，且只有在真实按键下才完整——合成 KeyboardEvent 不会触发原生 dialog
 * 的关闭请求，也测不出 drawer 的 keydown 归属守卫。
 *
 * 面板查询不能用 `getPortalPanel()`：它只查 fallback overlay root，而 portal 面板在
 * 开启的 <dialog> 上时会挂到 dialog 里（portal.ts 的 findEnclosingOpenDialog），
 * 必须跨 shadow 边界深搜。
 */
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '@/components/drawer'
import type { WebUiDrawer } from '@/components/drawer'
import '@/components/option'
import '@/components/popover'
import '@/components/select'
import { imagePreview } from '@/components/image-preview'
import type { WebUiPopover } from '@/components/popover'
import type { WebUiSelect } from '@/components/select'
import { pollUntil, waitForFrame } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

const OPTIONS_HTML = `
  <web-ui-option value="apple" label="Apple"></web-ui-option>
  <web-ui-option value="banana" label="Banana"></web-ui-option>
`

async function waitForDrawerOpen(el: WebUiDrawer) {
  const deadline = performance.now() + 5000
  const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
  if (!dialog) throw new Error('Expected the drawer to contain a dialog')
  while (!dialog.open) {
    if (performance.now() > deadline) throw new Error('Expected the drawer dialog to open')
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  await el.updateComplete
  await Promise.allSettled(document.getAnimations().map(animation => animation.finished))
  await el.updateComplete
}

/** 跨 shadow 边界深搜：portal 面板可能挂在开启的 <dialog> 内，不在 fallback overlay root。 */
function deepQuery(root: ParentNode | null, selector: string): HTMLElement | null {
  if (!root) return null
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement)) continue
    if (el.matches(selector)) return el
    const inner = deepQuery(el.shadowRoot, selector)
    if (inner) return inner
  }
  return null
}

const PREVIEW_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#08f"/></svg>'
)}`

/** 预览宿主：挂到主题 overlay root（无主题作用域时回退到 fallback root），同样深搜。 */
function previewHost(): HTMLElement | null {
  return deepQuery(document.body, 'web-ui-image-preview')
}

function createDrawerWithSelect(portal: boolean) {
  const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
  drawer.heading = 'escape ownership'
  const select = document.createElement('web-ui-select') as WebUiSelect
  if (portal) select.setAttribute('portal', '')
  select.innerHTML = OPTIONS_HTML
  drawer.append(select)
  document.body.append(drawer)
  return { drawer, select }
}

async function openSelectInsideDrawer(select: WebUiSelect) {
  const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
  trigger.click()
  await waitForFrame()
  await select.updateComplete
  await pollUntil(() => select.open, 'Expected the select to open')
}

describe('overlay Escape 归属仲裁（浏览器）', () => {
  it('portal select 在 drawer 内打开时，一次 Escape 只关闭 select', async () => {
    const { drawer, select } = createDrawerWithSelect(true)
    await drawer.updateComplete
    const drawerRequests: CustomEvent<{ open: boolean }>[] = []
    // open-change 冒泡：只统计 drawer 自己派发的，避免把 select 的事件算进来。
    drawer.addEventListener('open-change', e => {
      if (e.target === drawer) drawerRequests.push(e as CustomEvent<{ open: boolean }>)
    })

    drawer.open = true
    await drawer.updateComplete
    await waitForDrawerOpen(drawer)
    await openSelectInsideDrawer(select)

    expect(select.open).toBe(true)
    expect(drawer.open).toBe(true)

    await userEvent.keyboard('{Escape}')
    await waitForFrame()
    await select.updateComplete
    await drawer.updateComplete

    // 最内层先关：select 关闭，外层 drawer 保留且不派发关闭请求。
    expect(select.open).toBe(false)
    expect(drawer.open).toBe(true)
    expect(drawerRequests).toHaveLength(0)
  })

  it('非 portal select 在 drawer 内打开时，一次 Escape 只关闭 select', async () => {
    const { drawer, select } = createDrawerWithSelect(false)
    await drawer.updateComplete
    const drawerRequests: CustomEvent<{ open: boolean }>[] = []
    // open-change 冒泡：只统计 drawer 自己派发的，避免把 select 的事件算进来。
    drawer.addEventListener('open-change', e => {
      if (e.target === drawer) drawerRequests.push(e as CustomEvent<{ open: boolean }>)
    })

    drawer.open = true
    await drawer.updateComplete
    await waitForDrawerOpen(drawer)
    await openSelectInsideDrawer(select)

    await userEvent.keyboard('{Escape}')
    await waitForFrame()
    await select.updateComplete
    await drawer.updateComplete

    expect(select.open).toBe(false)
    expect(drawer.open).toBe(true)
    expect(drawerRequests).toHaveLength(0)
  })

  it('内层关闭后，再按一次 Escape 才关闭 drawer', async () => {
    const { drawer, select } = createDrawerWithSelect(true)
    await drawer.updateComplete

    drawer.open = true
    await drawer.updateComplete
    await waitForDrawerOpen(drawer)
    await openSelectInsideDrawer(select)

    await userEvent.keyboard('{Escape}')
    await pollUntil(() => !select.open, 'Expected the first Escape to close only the select')
    expect(drawer.open).toBe(true)

    await userEvent.keyboard('{Escape}')
    await pollUntil(() => !drawer.open, 'Expected the second Escape to close the drawer')
  })

  /*
   * 兜底分支（并列浮层）的守卫用例：resolve() 的 seq 分支承载 README 已对外承诺的
   * 「互不嵌套的并列浮层按打开顺序关闭最上层」，此前没有任何用例压住它。
   */
  it('互不嵌套的两个 popover 先后打开时，一次 Escape 只关闭后开的那个', async () => {
    const first = document.createElement('web-ui-popover') as WebUiPopover
    const second = document.createElement('web-ui-popover') as WebUiPopover
    first.textContent = 'first'
    second.textContent = 'second'
    document.body.append(first, second)
    await first.updateComplete
    await second.updateComplete

    first.open = true
    await first.updateComplete
    second.open = true
    await second.updateComplete
    await waitForFrame()
    expect(first.open).toBe(true)
    expect(second.open).toBe(true)

    const firstRequests: CustomEvent<{ open: boolean }>[] = []
    first.addEventListener('open-change', e => {
      if (e.target === first) firstRequests.push(e as CustomEvent<{ open: boolean }>)
    })

    await userEvent.keyboard('{Escape}')
    await pollUntil(() => !second.open, 'Expected Escape to close the most recently opened popover')
    await first.updateComplete

    // 打开顺序兜底：后开的关闭，先开的保留且不派发关闭请求。
    expect(first.open).toBe(true)
    expect(firstRequests).toHaveLength(0)
  })

  it('后开的并列 popover 关闭后，再按一次 Escape 才关闭先开的那个', async () => {
    const first = document.createElement('web-ui-popover') as WebUiPopover
    const second = document.createElement('web-ui-popover') as WebUiPopover
    first.textContent = 'first'
    second.textContent = 'second'
    document.body.append(first, second)
    await first.updateComplete
    await second.updateComplete

    first.open = true
    await first.updateComplete
    second.open = true
    await second.updateComplete
    await waitForFrame()

    await userEvent.keyboard('{Escape}')
    await pollUntil(() => !second.open, 'Expected the first Escape to close the later popover')
    expect(first.open).toBe(true)

    await userEvent.keyboard('{Escape}')
    await pollUntil(() => !first.open, 'Expected the second Escape to close the remaining popover')
  })

  /*
   * image-preview 是「最上层却不在仲裁里」的最后一个实例：它用原生 <dialog> 的 cancel
   * 自管 Escape，从未参与登记。于是与任何已登记的层同时打开时，一次 Escape 会关掉下面
   * 那层、把最上层的预览留在屏幕上 —— 正是本 spec 守的「内外层错配」。
   */
  it('image-preview 打开在 drawer 之上时，一次 Escape 只关闭预览', async () => {
    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.heading = 'escape ownership'
    document.body.append(drawer)
    await drawer.updateComplete

    drawer.open = true
    await drawer.updateComplete
    await waitForDrawerOpen(drawer)

    imagePreview({ images: [{ src: PREVIEW_SRC, alt: '图 A' }] })
    await pollUntil(() => previewHost() != null, 'Expected the image preview to mount')

    await userEvent.keyboard('{Escape}')

    // 最上层先关：预览走完退场并被卸载，drawer 保留。
    await pollUntil(() => previewHost() == null, 'Expected Escape to close the image preview')
    expect(drawer.open).toBe(true)
  })
})
