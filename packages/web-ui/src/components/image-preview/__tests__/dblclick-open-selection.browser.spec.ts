import type { LitElement } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { realDoubleClick } from '@/shared/test-utils/real-gesture'

import { imagePreview, type ImagePreviewHandle } from '..'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#fb0"/></svg>'
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

/** 可被双击选词的触发文本：宽度与字号都要够，否则双击落在空白处选不出词。 */
function createTrigger(text: string): HTMLElement {
  const trigger = document.createElement('div')
  trigger.textContent = text
  trigger.style.cssText = 'width:420px;padding:20px;font-size:20px'
  document.body.append(trigger)
  return trigger
}

/** 预览宿主挂在 fallback overlay root 的 shadow DOM 内（公开结构见 test-utils.getPortalPanel）。 */
function hostElement(): LitElement {
  const host = document.querySelector('[data-wui-overlay-root]')?.shadowRoot?.querySelector('web-ui-image-preview')
  if (!host) throw new Error('image preview host is not mounted')
  return host as LitElement
}

function selectTriggerPrefix(trigger: HTMLElement, length: number) {
  const text = trigger.firstChild!
  const range = document.createRange()
  range.setStart(text, 0)
  range.setEnd(text, length)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

describe('web-ui-image-preview 双击打开的选区（浏览器）', () => {
  /**
   * 注意：下面这条对**本组件**不具判别力——拆掉修复它照样绿。
   *
   * 原因是双击路径在 image-preview 上根本不复现：预览层自身是 `user-select: none`，
   * 浏览器重解析选区时拿不到可落的文本。触发用的正是一块可选中文本 div，测下来仍是
   * `rangeCount: 0`，所以与触发目标是否可选中文本无关。dialog / drawer 上的同一形态
   * 则会留下选区（见那两个 spec 的同名用例，拆掉修复即红）。
   *
   * 本组件的判别力落在下一条「打开前就存在的选区在打开时被清掉」：那条拆掉修复会红。
   */
  it('双击打开后不留选区', async () => {
    const trigger = createTrigger('双击这里打开图片预览的触发卡片文本 alpha')
    let handle: ImagePreviewHandle | undefined
    trigger.addEventListener('dblclick', () => {
      handle = imagePreview({ images: [{ src: IMAGE_SRC, alt: '图 A' }], target: trigger })
    })

    await realDoubleClick(trigger)
    const host = hostElement()
    await host.updateComplete

    // 前提：overlay 真的打开了，否则「没有选区」是因为根本没开而伪通过。
    expect(handle).toBeDefined()
    expect(host.shadowRoot?.querySelector('dialog')?.open).toBe(true)
    // 断言 rangeCount 而不是 toString()：选区被重解析后可能塌成一条空 range，
    // 此时 toString() 已经是空串，只有 rangeCount 还留着这条 range。
    expect(document.getSelection()?.rangeCount).toBe(0)
    expect(document.getSelection()?.toString()).toBe('')
  })

  it('打开前就存在的选区在打开时被清掉', async () => {
    const trigger = createTrigger('双击这里打开图片预览的触发卡片文本 alpha')
    // showModal() 不会动打开前就已存在的选区：用户先选中页面文本再打开预览，
    // 这条选区会原样留在预览层后面的页面上（实测 rangeCount 仍为 1）。
    selectTriggerPrefix(trigger, 5)
    expect(document.getSelection()?.toString()).not.toBe('')

    const handle = imagePreview({ images: [{ src: IMAGE_SRC, alt: '图 A' }], target: trigger })
    const host = hostElement()
    await host.updateComplete

    expect(host.shadowRoot?.querySelector('dialog')?.open).toBe(true)
    expect(document.getSelection()?.rangeCount).toBe(0)
    expect(document.getSelection()?.toString()).toBe('')

    handle.close()
    await handle.closed
  })
})
