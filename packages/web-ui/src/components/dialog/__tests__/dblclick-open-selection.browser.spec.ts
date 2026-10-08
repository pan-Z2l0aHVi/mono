import { afterEach, describe, expect, it } from 'vite-plus/test'

import { realDoubleClick, realDragSelectText, waitForOpenTransition } from '@/shared/test-utils/real-gesture'

import '..'
import type { WebUiDialog } from '..'

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

function createDialog(): WebUiDialog {
  const component = document.createElement('web-ui-dialog') as WebUiDialog
  component.innerHTML = '<span slot="header">对话框标题</span>对话框正文里的可读文本'
  document.body.append(component)
  return component
}

describe('WebUiDialog 双击打开的选区（浏览器）', () => {
  it('双击打开后不留选区', async () => {
    const trigger = createTrigger('双击这里打开对话框的触发卡片文本 alpha')
    const component = createDialog()
    trigger.addEventListener('dblclick', () => {
      component.open = true
    })

    await realDoubleClick(trigger)
    await component.updateComplete

    // 前提：overlay 真的打开了，否则「没有选区」是因为根本没开而伪通过。
    expect(component.open).toBe(true)
    expect(component.shadowRoot?.querySelector('dialog')?.open).toBe(true)
    // 断言 rangeCount 而不是 toString()：选区被重解析后可能塌成一条空 range，
    // 此时 toString() 已经是空串，只有 rangeCount 还留着这条 range。
    expect(document.getSelection()?.rangeCount).toBe(0)
    expect(document.getSelection()?.toString()).toBe('')
  })

  it('打开后正文仍可手动拖选', async () => {
    const trigger = createTrigger('双击这里打开对话框的触发卡片文本 alpha')
    const component = createDialog()
    trigger.addEventListener('dblclick', () => {
      component.open = true
    })
    await realDoubleClick(trigger)
    await component.updateComplete
    await waitForOpenTransition(component)

    // 不用一刀切 user-select: none 换「打开没选区」：面板内文本照旧可选。
    // 必须是真实拖拽：程序化 addRange 绕开 user-select，面板被改成
    // `user-select: none` 时那种写法照样绿，守不住这里要守的东西。
    const title = component.querySelector('span[slot="header"]')!.firstChild!
    await realDragSelectText(title)
    expect(document.getSelection()?.toString()).toBe('对话框标题')
  })
})
