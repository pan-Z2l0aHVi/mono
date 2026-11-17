// @vitest-environment jsdom
import type { WebUiEditableText } from '@greypan/web-ui'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'

import { focusLitControl, selectLitEditor, useEditorFocusRestore } from '../useEditorFocusRestore'

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

function createLitHost() {
  const host = document.createElement('div')
  const shadow = host.attachShadow({ mode: 'open' })
  const button = document.createElement('button')
  button.textContent = 'trigger'
  shadow.append(button)
  ;(host as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete = Promise.resolve()
  document.body.append(host)
  return { host, button }
}

afterEach(() => document.body.replaceChildren())

describe('focusLitControl', () => {
  it('等待 updateComplete 与一帧后聚焦 shadowRoot 内的按钮', async () => {
    const { host, button } = createLitHost()
    const pending = focusLitControl(host)
    expect(document.activeElement).not.toBe(button)
    await pending
    expect(host.shadowRoot?.activeElement).toBe(button)
  })

  it('selector 为空时聚焦宿主本身', async () => {
    const host = document.createElement('div')
    host.tabIndex = 0
    document.body.append(host)
    await focusLitControl(host, '')
    expect(document.activeElement).toBe(host)
  })

  it('宿主缺失时静默返回', async () => {
    await expect(focusLitControl(null)).resolves.toBeUndefined()
  })
})

describe('selectLitEditor', () => {
  it('等待控件布局后全选，并在过期时跳过', async () => {
    const select = vi.fn<() => void>()
    const editor = { updateComplete: Promise.resolve(), select } as unknown as WebUiEditableText

    await selectLitEditor(editor)
    expect(select).toHaveBeenCalledOnce()

    select.mockClear()
    await selectLitEditor(editor, () => false)
    expect(select).not.toHaveBeenCalled()
  })

  it('编辑器为空时不报错', async () => {
    await expect(selectLitEditor(null)).resolves.toBeUndefined()
  })
})

describe('useEditorFocusRestore', () => {
  it('编辑态回到 null 时把焦点交还给目标控件', async () => {
    const { host } = createLitHost()
    const editing = ref<string | null>('row-1')
    useEditorFocusRestore(editing, { target: () => host })

    editing.value = null
    await nextTick()
    await nextFrame()
    await nextFrame()
    expect(host.shadowRoot?.activeElement).toBe(host.shadowRoot?.querySelector('button'))
  })

  it('heldFocus 不成立时不抢焦点', async () => {
    const { host } = createLitHost()
    const editing = ref<string | null>('row-1')
    useEditorFocusRestore(editing, { heldFocus: () => false, target: () => host })

    editing.value = null
    await nextTick()
    await nextFrame()
    expect(host.shadowRoot?.activeElement).toBeNull()
  })

  it('selector 为空时让目标宿主自己接焦点', async () => {
    const row = document.createElement('div')
    row.tabIndex = 0
    document.body.append(row)
    const editing = ref<string | null>('row-1')
    useEditorFocusRestore(editing, { target: () => row, selector: '' })

    editing.value = null
    await nextTick()
    await nextFrame()
    await nextFrame()
    expect(document.activeElement).toBe(row)
  })
})
