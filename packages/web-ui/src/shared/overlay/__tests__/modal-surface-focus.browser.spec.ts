import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/dialog'
import '@/components/drawer'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiDrawer } from '@/components/drawer'
import { pollUntil } from '@/shared/test-utils'

/*
 * 模态表面（dialog / drawer）与它的滚动区不该画 UA 默认焦点环。
 *
 * 背景：Chromium 会把「可滚动的滚动容器」变成键盘可聚焦项（keyboard-focusable
 * scrollers）。面板内容区一旦可滚动、内部又没有被聚焦的控件，`showModal()` 的
 * focusing steps 就会选中这个滚动区，UA 为它画一枚默认蓝环
 * （`outline: auto` + `-webkit-focus-ring-color`）——与库的统一 ring
 * （`outline: var(--wui-focus-ring-width) solid var(--wui-color-focus-ring)`）不同形，
 * 是「dialog / drawer 打开后卡片上多出一圈蓝框」的来源。
 *
 * 断言钉的是**用户后果**：真正吃到焦点的那个滚动区，计算值必须是明确的 `outline: none`，
 * 不是 UA 的 `auto`。变异自证：把 assets/modal-surface.css 里那条抑制规则去掉，这里必红。
 */

afterEach(() => {
  document.body.replaceChildren()
})

function shadow<T extends HTMLElement>(host: HTMLElement, selector: string): T {
  const el = host.shadowRoot?.querySelector(selector) as T | null
  if (!el) throw new Error(`Expected ${selector} to exist.`)
  return el
}

/** 塞入足够高的内容：滚动区必须真的可滚动，Chromium 才会把它纳入键盘焦点。 */
function fillTall(node: HTMLElement, lines = 120): void {
  const block = document.createElement('div')
  block.style.cssText = 'height: 3000px;'
  for (let i = 0; i < lines; i++) {
    const p = document.createElement('p')
    p.textContent = `line ${i}`
    block.append(p)
  }
  node.append(block)
}

async function openAndWaitForScrollerRing(host: WebUiDialog | WebUiDrawer, scroller: HTMLElement): Promise<void> {
  host.open = true
  await host.updateComplete
  // 先等滚动区成为真正的滚动容器，再等 UA 的 focusing steps 把焦点交给它。
  await pollUntil(() => scroller.scrollHeight > scroller.clientHeight, 'scroller never overflowed')
  await pollUntil(() => scroller.matches(':focus-visible'), 'scroll container was not focused')
}

describe('模态表面的焦点环（浏览器）', () => {
  it('dialog body 模式的滚动区拿到焦点时，计算 outline 是 none 而不是 UA ring', async () => {
    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    const body = document.createElement('div')
    body.slot = 'body'
    fillTall(body)
    dialog.append(body)
    document.body.append(dialog)
    await dialog.updateComplete
    // body slot 的 _hasBody 由 slotchange 异步置位，等 body 模式真正渲染出来。
    await pollUntil(() => !!dialog.shadowRoot?.querySelector('.wui-dialog-content'), 'body mode not rendered')

    const scroller = shadow<HTMLElement>(dialog, '.wui-dialog-content')
    await openAndWaitForScrollerRing(dialog, scroller)

    expect(getComputedStyle(scroller).outlineStyle, 'UA 默认焦点环必须被压成 none').toBe('none')
  })

  it('drawer 的滚动区拿到焦点时，计算 outline 是 none 而不是 UA ring', async () => {
    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.setAttribute('heading', '标题')
    fillTall(drawer)
    document.body.append(drawer)
    await drawer.updateComplete

    const scroller = shadow<HTMLElement>(drawer, '.wui-drawer-content')
    await openAndWaitForScrollerRing(drawer, scroller)

    expect(getComputedStyle(scroller).outlineStyle, 'UA 默认焦点环必须被压成 none').toBe('none')
  })
})
