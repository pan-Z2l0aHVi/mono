// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, flushSlotChange, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(initialHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

/** shadow 内的 chrome 带（`.header`）；headless 模式整条不渲染，返回 null。 */
function headerBand(el: WebUiDialog): HTMLElement | null {
  return el.shadowRoot?.querySelector('.header') ?? null
}

/** `heading` 属性的 fallback 节点（带未渲染时不存在）。 */
function headingNode(el: WebUiDialog): HTMLElement | null {
  return el.shadowRoot?.querySelector('.wui-dialog-heading') ?? null
}

/** header 槽的分配元素数：>0 表示槽接管，fallback 被浏览器隐藏。 */
function assignedHeader(el: WebUiDialog): number {
  const slot = el.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement | null
  return slot?.assignedElements().length ?? 0
}

describe('WebUiDialog header chrome', () => {
  it('header 槽与 heading 都为空时 chrome 带隐藏', async () => {
    const el = createDialog('<p>正文</p>')
    await flushSlotChange(el)

    const band = headerBand(el)
    expect(band).toBeTruthy()
    expect(band?.hidden).toBe(true)
    expect(headingNode(el)).toBeNull()
    cleanupElement(el)
  })

  it('heading 属性渲染 .wui-dialog-heading 并让带可见', async () => {
    const el = createDialog('<p>正文</p>')
    el.heading = '设置'
    await waitForUpdate(el)

    expect(headerBand(el)?.hidden).toBe(false)
    expect(headingNode(el)?.textContent).toBe('设置')
    cleanupElement(el)
  })

  it('header 槽有内容时整条接管，heading 被忽略', async () => {
    const el = createDialog('<span slot="header">槽标题</span>')
    el.heading = '属性标题'
    await flushSlotChange(el)

    expect(headerBand(el)?.hidden).toBe(false)
    // 槽优先于属性：有分配元素时浏览器只渲染槽内容，fallback 被隐藏。
    expect(assignedHeader(el)).toBe(1)
    expect(el.querySelector('[slot="header"]')?.textContent).toBe('槽标题')
    cleanupElement(el)
  })

  it('运行时移除槽内容后，heading 接管', async () => {
    const el = createDialog('<span slot="header">槽标题</span>')
    el.heading = '属性标题'
    await flushSlotChange(el)
    expect(assignedHeader(el)).toBe(1)

    el.querySelector('[slot="header"]')!.remove()
    await flushSlotChange(el)

    expect(assignedHeader(el)).toBe(0)
    expect(headingNode(el)?.textContent).toBe('属性标题')
    cleanupElement(el)
  })

  it('heading 清空且槽为空时带重新隐藏', async () => {
    const el = createDialog('<p>正文</p>')
    el.heading = '设置'
    await waitForUpdate(el)
    expect(headerBand(el)?.hidden).toBe(false)

    el.heading = ''
    await waitForUpdate(el)
    expect(headerBand(el)?.hidden).toBe(true)
    expect(headingNode(el)).toBeNull()
    cleanupElement(el)
  })

  it('headless 模式不渲染 chrome 带，heading 一并失效', async () => {
    const el = createDialog('<section>自定义主体</section>')
    el.headless = true
    el.heading = '设置'
    await waitForUpdate(el)

    expect(el.shadowRoot?.querySelector('.wui-dialog-content')).toBeTruthy()
    expect(headerBand(el)).toBeNull()
    expect(headingNode(el)).toBeNull()
    cleanupElement(el)
  })
})

/*
 * accessible name 的接线（与 drawer 同形）：
 * - 显式 dialog-label 优先，直接写原生 dialog 的 aria-label；
 * - 否则非 headless 且带可见时，aria-labelledby 指向带（id="wui-dialog-heading"）；
 * - headless 没有可自动关联的内置标题，两个属性都不写——名字由 Consumer 负责。
 * 判据读的是原生 <dialog> 上的 attribute，不是内部 id，后者是接线细节。
 */
describe('WebUiDialog accessible name', () => {
  function nativeDialog(el: WebUiDialog): HTMLDialogElement {
    return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
  }

  it('非 headless 且有可命名的带时，aria-labelledby 指向带', async () => {
    const el = createDialog('<span slot="header">设置</span>')
    await flushSlotChange(el)

    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('heading 属性 fallback 时同样接线', async () => {
    const el = createDialog('<p>正文</p>')
    el.heading = '设置'
    await waitForUpdate(el)

    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')
    cleanupElement(el)
  })

  it('带为空且无 heading 时不接线，不指向隐藏的带', async () => {
    const el = createDialog('<p>正文</p>')
    await waitForUpdate(el)

    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('dialog-label 优先于带，直接写 aria-label', async () => {
    const el = createDialog('<span slot="header">设置</span>')
    el.dialogLabel = '设置'
    await flushSlotChange(el)

    expect(nativeDialog(el).getAttribute('aria-label')).toBe('设置')
    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    cleanupElement(el)
  })

  it('headless 不接线：没有可自动关联的内置标题，名字留给 Consumer', async () => {
    const el = createDialog('<section>自定义主体</section>')
    el.headless = true
    el.heading = '设置'
    await waitForUpdate(el)

    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('headless 下 Consumer 仍可用 dialog-label 提供名字', async () => {
    const el = createDialog('<section>自定义主体</section>')
    el.headless = true
    el.dialogLabel = '自定义主体'
    await waitForUpdate(el)

    expect(nativeDialog(el).getAttribute('aria-label')).toBe('自定义主体')
    cleanupElement(el)
  })
})
