import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

type Upgradable = HTMLElement & { updateComplete?: Promise<unknown> }

function createDialog(innerHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = innerHTML
  document.body.append(el)
  return el
}

/**
 * 关闭按钮是嵌套自定义元素（dialog > web-ui-button > web-ui-icon）。只等 dialog 的
 * updateComplete 时按钮尚未 upgrade，宿主没有 shadow 内容，量到的宽度是 0。
 */
async function openDialog(el: WebUiDialog) {
  el.open = true
  await el.updateComplete
  const button = el.shadowRoot?.querySelector('web-ui-button') as Upgradable | null
  await button?.updateComplete
  const icon = button?.shadowRoot?.querySelector('web-ui-icon') as Upgradable | null
  await icon?.updateComplete
  await settleEnterTransform(el)
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * dialog 进场有 `transform: scale(1.1 → 1)`，未落定时 getBoundingClientRect 会带上
 * 缩放（16px 的偏移会量成 17.6px）。`is-visible` 由 presence 在 showModal 之后才补上，
 * 所以这里按「变换已收敛」这个条件轮询，而不是等一个固定时长、也不靠 getAnimations 的条数。
 */
async function settleEnterTransform(el: WebUiDialog) {
  const dialog = el.shadowRoot?.querySelector('dialog') as HTMLElement
  await pollUntil(() => {
    const transform = getComputedStyle(dialog).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }, 'Expected the dialog enter transform to settle at scale(1)')
}

function rectOf(el: WebUiDialog, selector: string): DOMRect {
  const target = el.shadowRoot?.querySelector(selector)
  if (!target) throw new Error(`Expected ${selector} to exist.`)
  return target.getBoundingClientRect()
}

describe('WebUiDialog closable（浏览器几何）', () => {
  it('body 模式下按钮浮在卡片内右上角', async () => {
    const el = createDialog('<section slot="body">自定义主体</section>')
    el.closable = true
    await openDialog(el)

    const card = rectOf(el, '.wui-dialog-body')
    const close = rectOf(el, '.wui-dialog-close')

    expect(close.width).toBeGreaterThan(0)
    expect(close.top).toBeGreaterThan(card.top)
    expect(close.right).toBeLessThanOrEqual(card.right)
    // 默认 16px 偏移：贴着卡片内右上角，而不是压到卡片外或贴死边。
    expect(card.right - close.right).toBeCloseTo(16, 0)
    expect(close.top - card.top).toBeCloseTo(16, 0)
  })

  it('title-row 模式下按钮与标题同行且在标题右侧', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    el.closable = true
    await openDialog(el)

    const title = rectOf(el, '.title')
    const close = rectOf(el, '.wui-dialog-close')
    const card = rectOf(el, '.wui-dialog-body')

    expect(close.left).toBeGreaterThanOrEqual(title.right)
    // 同行：按钮纵向落在标题行范围内，而不是被推到标题下方。
    expect(close.top).toBeLessThan(title.bottom)
    expect(close.bottom).toBeGreaterThan(title.top)
    // 包裹层不改变卡片宽度语义，按钮仍在卡片内。
    expect(close.right).toBeLessThanOrEqual(card.right)
  })

  it('点击按钮在真实浏览器里关闭原生 dialog', async () => {
    const el = createDialog()
    el.closable = true
    await openDialog(el)

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)

    const close = el.shadowRoot?.querySelector('.wui-dialog-close') as HTMLElement
    close.click()
    await el.updateComplete

    expect(el.open).toBe(false)
  })

  it('不启用 closable 时不产生任何关闭按钮几何', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    await openDialog(el)

    expect(el.shadowRoot?.querySelector('.wui-dialog-close')).toBeNull()
    expect(el.shadowRoot?.querySelector('.title-row')).toBeNull()
  })
})
