import type { LitElement } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { imagePreview } from '..'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#fb0"/></svg>'
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

/** 触发宿主的挂载点：宽度要够，字号够大时页面文本才可能被选中。 */
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

describe('web-ui-image-preview 打开时的选区清理（浏览器）', () => {
  /*
   * 本组件的判别力只落在这一条上。
   *
   * 原先还有一条「双击打开后不留选区」，已按政策第 9 条删除：双击路径在
   * image-preview 上根本不复现——预览层自身是 `user-select: none`，浏览器重解析选区时
   * 拿不到可落的文本，`rangeCount` 恒为 0，与触发目标是否可选中文本无关。实测把
   * `window.getSelection()?.removeAllRanges()`（index.ts 的打开路径）整行删掉，那条
   * 照样绿。dialog / drawer 上的同形态用例有判别力（拆掉修复即红），但那是另两个 spec。
   *
   * 下面这条会红：showModal() 不会动打开前就已存在的选区，用户「先选中页面文本、
   * 再打开预览」时那条选区会原样留在预览层后面的页面上。
   */
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
