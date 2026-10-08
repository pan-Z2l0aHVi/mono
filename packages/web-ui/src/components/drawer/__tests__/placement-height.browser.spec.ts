import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

/*
 * 上下 placement 的高度由公开 token `--wui-drawer-height` 决定（README 双方记录，
 * demo 的「自定义高」按钮直接指向它）。它同时是内容滚不滚得动的前提：
 * `.wui-drawer-content` 靠 `.wui-drawer-body { height: 100% }` 拿到面板高度，面板高度
 * 又必须来自 dialog 这个盒子。dialog 一旦退化成内容高度（`:host(:not([headless])) dialog`
 * 的 `height: auto` 压掉了 placement 块里的 height），`flex: 1` 就没有可收缩的空间，
 * 长内容直接溢出 dialog 盒子（overflow: visible）落到视口之下——够不着，也滚不动。
 *
 * 判据取用户后果——token 生不生效、最后一条内容够不够得着——不钉具体像素。
 */

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getContent(el: WebUiDrawer): HTMLElement {
  const content = el.shadowRoot?.querySelector<HTMLElement>('.wui-drawer-content')
  if (!content) throw new Error('Expected .wui-drawer-content to exist.')
  return content
}

function createDrawer(placement: 'top' | 'bottom', contentHeight: number): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  el.setAttribute('placement', placement)
  const content = document.createElement('div')
  content.style.cssText = `height: ${contentHeight}px;`
  el.append(content)
  document.body.append(el)
  return el
}

async function openDrawer(el: WebUiDrawer): Promise<void> {
  el.open = true
  await el.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer 上下 placement 的面板高度（浏览器）', () => {
  it('--wui-drawer-height 决定面板高度', async () => {
    const el = createDrawer('bottom', 40)
    el.style.setProperty('--wui-drawer-height', '260px')
    await openDrawer(el)

    // 没有这条时 dialog 会退回内容高度（40px + 内边距），token 静默失效。
    expect(getDialog(el).offsetHeight).toBeGreaterThan(200)
    expect(getDialog(el).offsetHeight).toBeLessThanOrEqual(260)
  })

  it('内容高过面板时在内容区滚到最后一块，不溢出 dialog 盒子', async () => {
    const el = createDrawer('bottom', 2000)
    await openDrawer(el)

    const dialog = getDialog(el)
    const card = el.shadowRoot?.querySelector<HTMLElement>('.wui-drawer-body') as HTMLElement
    const content = getContent(el)

    expect(card.offsetHeight).toBeLessThanOrEqual(dialog.offsetHeight)
    expect(content.scrollHeight).toBeGreaterThan(content.clientHeight)
    content.scrollTop = 99999
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(content.scrollTop).toBeGreaterThan(0)

    // 与 dialog 那条同理：hidden 也满足上一条，只有 auto / scroll 是用户滚得动的。
    expect(['auto', 'scroll']).toContain(getComputedStyle(content).overflowY)
  })

  it('对照组：内容装得下时不产生滚动', async () => {
    const el = createDrawer('top', 60)
    await openDrawer(el)

    const content = getContent(el)
    expect(content.scrollHeight).toBe(content.clientHeight)
    content.scrollTop = 99999
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(content.scrollTop).toBe(0)
  })
})
