import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(initialHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

function card(el: WebUiDialog): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-dialog-body') as HTMLElement
}

function closeButton(el: WebUiDialog): HTMLElement | null {
  return el.shadowRoot?.querySelector('.wui-dialog-close') ?? null
}

/** 卡片直接子元素的 class 序列，用来钉住「默认渲染结构不变」这条契约。 */
function childClasses(el: WebUiDialog): string[] {
  return Array.from(card(el).children).map(child => child.className)
}

describe('WebUiDialog closable（jsdom）', () => {
  it('默认不渲染关闭按钮，也不引入 .title-row 包裹层', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    await waitForUpdate(el)

    expect(el.closable).toBe(false)
    expect(el.hasAttribute('closable')).toBe(false)
    expect(closeButton(el)).toBeNull()
    expect(el.shadowRoot?.querySelector('.title-row')).toBeNull()
    // 默认结构：slot + .title + .desc + .wui-dialog-footer，与 closable 引入前一致。
    expect(childClasses(el)).toEqual(['', 'title', 'desc', 'wui-dialog-footer'])
    cleanupElement(el)
  })

  it('默认在 body 模式下同样不渲染关闭按钮', async () => {
    const el = createDialog('<section slot="body">自定义主体</section>')
    await waitForUpdate(el)

    expect(closeButton(el)).toBeNull()
    expect(childClasses(el)).toEqual([''])
    cleanupElement(el)
  })

  it('closable 在默认模式下把标题与按钮包进 .title-row', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    el.closable = true
    await waitForUpdate(el)

    const row = el.shadowRoot?.querySelector('.title-row')
    expect(row).toBeTruthy()
    expect(row?.querySelector('.title')).toBeTruthy()
    expect(closeButton(el)).toBeTruthy()
    expect(closeButton(el)?.classList.contains('wui-dialog-close-inline')).toBe(true)
    // .title 仍是 .title-row 的直接子元素，自身 margin 语义未被包裹层改写。
    expect(row?.querySelector('.title')?.parentElement).toBe(row)
    cleanupElement(el)
  })

  it('closable 在 body 模式下把按钮作为卡片直接子元素浮在右上角', async () => {
    const el = createDialog('<section slot="body">自定义主体</section>')
    el.closable = true
    await waitForUpdate(el)

    expect(el.shadowRoot?.querySelector('.title-row')).toBeNull()
    expect(closeButton(el)?.classList.contains('wui-dialog-close-floating')).toBe(true)
    expect(closeButton(el)?.parentElement).toBe(card(el))
    cleanupElement(el)
  })

  it('点击关闭按钮走用户关闭路径', async () => {
    const el = createDialog()
    el.closable = true
    el.open = true
    await waitForUpdate(el)

    closeButton(el)?.click()
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    cleanupElement(el)
  })

  it('controlled 下点击关闭按钮只派发请求，不自行关闭', async () => {
    const el = createDialog()
    el.closable = true
    el.controlled = true
    el.open = true
    await waitForUpdate(el)

    const events: CustomEvent<{ open: boolean }>[] = []
    el.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))

    closeButton(el)?.click()
    await waitForUpdate(el)

    expect(events).toHaveLength(1)
    expect(events[0]?.detail).toEqual({ open: false })
    expect(el.open).toBe(true)
    cleanupElement(el)
  })

  it('关闭按钮带可访问名称', async () => {
    const el = createDialog()
    el.closable = true
    await waitForUpdate(el)

    expect(closeButton(el)?.getAttribute('aria-label')).toBe('关闭')
    cleanupElement(el)
  })

  it('开启期间切换 closable 可增删按钮', async () => {
    const el = createDialog()
    el.open = true
    await waitForUpdate(el)
    expect(closeButton(el)).toBeNull()

    el.closable = true
    await waitForUpdate(el)
    expect(closeButton(el)).toBeTruthy()

    el.closable = false
    await waitForUpdate(el)
    expect(closeButton(el)).toBeNull()
    expect(el.shadowRoot?.querySelector('.title-row')).toBeNull()
    cleanupElement(el)
  })
})
