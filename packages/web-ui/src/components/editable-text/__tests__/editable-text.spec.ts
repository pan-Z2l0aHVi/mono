import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import {
  cleanupElement,
  contractReflection,
  mountElement,
  queryA11y,
  spyEvents,
  waitForUpdate
} from '@/shared/test-utils'

import type { WebUiEditableText } from '..'

afterEach(() => document.body.replaceChildren())

const create = (attrs?: Record<string, string>): WebUiEditableText =>
  mountElement<WebUiEditableText>('web-ui-editable-text', { attrs })

const editorOf = (el: WebUiEditableText): HTMLTextAreaElement => queryA11y(el, 'textarea') as HTMLTextAreaElement
const textLayerOf = (el: WebUiEditableText): HTMLElement => queryA11y(el, 'span') as HTMLElement

/** 模拟编辑层输入：写值并派发原生 input（jsdom 不产生原生文本输入）。 */
const typeDraft = (el: WebUiEditableText, draft: string): void => {
  const editor = editorOf(el)
  editor.value = draft
  editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

/**
 * 本文件只覆盖 editable-text 特有的公开契约。`value` 不反射（attribute 是 reset 初值）、
 * 提交/取消事件模型与 input/textarea 不同，因此不并入 `text-control-contract` 共有矩阵；
 * 原生 FormData 与 reset 语义 jsdom 不触发表单关联回调，由 browser spec 覆盖。
 */
describe('WebUiEditableText 组件契约', () => {
  it('属性默认值', async () => {
    const el = create()
    await waitForUpdate(el)

    expect(el.value).toBe('')
    expect(el.placeholder).toBe('')
    expect(el.name).toBe('')
    expect(el.disabled).toBe(false)
    expect(el.hasAttribute('editing')).toBe(false)
    cleanupElement(el)
  })

  it('可聚焦：默认在 tab 序列内', async () => {
    const el = create()
    await waitForUpdate(el)
    expect(el.getAttribute('tabindex')).toBe('0')
    cleanupElement(el)
  })

  it('value attribute 提供初值，Enter 提交后 attribute 保持 reset 初值', async () => {
    const el = create({ value: 'initial' })
    await waitForUpdate(el)
    expect(el.value).toBe('initial')

    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'edited')
    await waitForUpdate(el)
    expect(el.value).toBe('edited')

    editorOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    await waitForUpdate(el)
    expect(el.value).toBe('edited')
    expect(el.getAttribute('value')).toBe('initial')
    cleanupElement(el)
  })

  it('空值显示 placeholder，有值显示 value', async () => {
    const el = create({ placeholder: '未命名' })
    await waitForUpdate(el)
    expect(textLayerOf(el).textContent).toBe('未命名')

    el.value = '标题'
    await waitForUpdate(el)
    expect(textLayerOf(el).textContent).toBe('标题')
    cleanupElement(el)
  })

  it('disabled 时宿主移出 tab 序列且不进入编辑', async () => {
    const el = create({ value: 'text' })
    el.disabled = true
    await waitForUpdate(el)
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(editorOf(el).disabled).toBe(true)

    textLayerOf(el).click()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(false)
    cleanupElement(el)
  })

  it('点击文本层进入编辑并聚焦编辑层', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)

    textLayerOf(el).click()
    await waitForUpdate(el)

    expect(el.hasAttribute('editing')).toBe(true)
    expect(editorOf(el).value).toBe('hello')
    cleanupElement(el)
  })

  it('编程式聚焦进入编辑且光标到末尾', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)

    el.focus()
    await waitForUpdate(el)

    expect(el.hasAttribute('editing')).toBe(true)
    expect(editorOf(el).selectionStart).toBe(5)
    expect(editorOf(el).selectionEnd).toBe(5)
    cleanupElement(el)
  })

  it('select() 空闲态进入编辑并全选内容', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)

    el.select()
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(el.shadowRoot!.activeElement, '焦点落在编辑层').toBe(editor)
    expect(editor.selectionStart).toBe(0)
    expect(editor.selectionEnd).toBe(5)
    expect(el.value).toBe('hello')
    cleanupElement(el)
  })

  it('select() 编辑态只重新全选，不改值与编辑态', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    editorOf(el).setSelectionRange(2, 2)

    el.select()
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(editor.selectionStart).toBe(0)
    expect(editor.selectionEnd).toBe(5)
    expect(el.value).toBe('hello')
    cleanupElement(el)
  })

  it('空值 select() 进入编辑，全选区间为空', async () => {
    const el = create({ placeholder: '未命名' })
    await waitForUpdate(el)

    el.select()
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(editor.selectionStart).toBe(0)
    expect(editor.selectionEnd).toBe(0)
    expect(el.value).toBe('')
    cleanupElement(el)
  })

  it('disabled 时 select() 不进入编辑', async () => {
    const el = create({ value: 'hello' })
    el.disabled = true
    await waitForUpdate(el)

    el.select()
    await waitForUpdate(el)

    expect(el.hasAttribute('editing')).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(null)
    cleanupElement(el)
  })

  it('输入草稿派发 input 且 value 跟随草稿', async () => {
    const el = create()
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [inputs, detachInputs] = spyEvents(el, 'input')
    try {
      typeDraft(el, 'ab')
      await waitForUpdate(el)
      expect(inputs).toHaveLength(1)
      expect(inputs[0].composed).toBe(true)
      expect(el.value).toBe('ab')
    } finally {
      detachInputs()
    }
    cleanupElement(el)
  })

  it('blur 取消：恢复原值、派发 cancel、不派发 change', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'hello world')
    await waitForUpdate(el)

    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      editorOf(el).blur()
      await waitForUpdate(el)
      expect(cancels).toHaveLength(1)
      expect(changes).toHaveLength(0)
      expect(el.value, '草稿丢弃，回到进入编辑时的值').toBe('hello')
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachCancels()
      detachChanges()
    }
    cleanupElement(el)
  })

  it('空草稿 blur 取消：恢复进入编辑时的值', async () => {
    const el = create({ value: 'hello', placeholder: '未命名' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    typeDraft(el, '')
    await waitForUpdate(el)
    editorOf(el).blur()
    await waitForUpdate(el)

    expect(el.value, '空草稿被丢弃').toBe('hello')
    expect(textLayerOf(el).textContent).toBe('hello')
    cleanupElement(el)
  })

  it('值为空时文本层回落 placeholder', async () => {
    const el = create({ value: 'hello', placeholder: '未命名' })
    await waitForUpdate(el)

    el.value = ''
    await waitForUpdate(el)

    expect(textLayerOf(el).textContent).toBe('未命名')
    cleanupElement(el)
  })

  it('Escape 取消：恢复原值、派发 cancel、不派发 change、不再次进入编辑', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'draft')
    await waitForUpdate(el)

    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    const [changes, detachChanges] = spyEvents(el, 'change')
    // 浮层仲裁者在 document 捕获阶段收 Escape：它收不到，才证明按键被编辑层消费
    const documentCapture: string[] = []
    const onDocumentCapture = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') documentCapture.push('escape')
    }
    document.addEventListener('keydown', onDocumentCapture, true)
    try {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
      editorOf(el).dispatchEvent(event)
      await waitForUpdate(el)

      expect(cancels).toHaveLength(1)
      expect(changes).toHaveLength(0)
      expect(documentCapture, 'Escape 不穿透到 document 捕获监听').toEqual([])
      expect(event.defaultPrevented, 'Escape 被 preventDefault').toBe(true)
      expect(el.value).toBe('hello')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement).toBe(el)
    } finally {
      document.removeEventListener('keydown', onDocumentCapture, true)
      detachCancels()
      detachChanges()
    }
    cleanupElement(el)
  })

  it('cancel 只在宿主上派发：外层浮层 shadow 内的 dialog 与 light DOM 祖先都收不到', async () => {
    /*
     * issue #159 的实测形态：drawer 把 <dialog> 放在自己 shadow 里并监听原生 cancel，
     * 消费者的 editable-text 经 slot 投映其中。自定义 cancel 一旦冒泡——composed 与否
     * 都一样，slot 都会把事件带进 shadow 树——就会被那个 dialog 当成关闭请求。因此
     * cancel 不冒泡不组合，只在宿主上派发；监听一律挂在组件本身。
     */
    if (!customElements.get('x-overlay-cancel-probe')) {
      customElements.define(
        'x-overlay-cancel-probe',
        class extends HTMLElement {
          dialogCancels = 0
          constructor() {
            super()
            const root = this.attachShadow({ mode: 'open' })
            const dialog = document.createElement('dialog')
            dialog.addEventListener('cancel', () => {
              this.dialogCancels += 1
            })
            dialog.append(document.createElement('slot'))
            root.append(dialog)
          }
        }
      )
    }
    const overlay = mountElement<HTMLElement & { dialogCancels: number }>('x-overlay-cancel-probe')
    const lightAncestor = mountElement('div', { parent: document.body })
    lightAncestor.append(overlay)
    const el = create({ value: 'hello' })
    overlay.append(el)
    await waitForUpdate(el)

    const seenByAncestor: Event[] = []
    const onAncestorCancel = (e: Event) => seenByAncestor.push(e)
    lightAncestor.addEventListener('cancel', onAncestorCancel)
    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    try {
      // blur 路径：点到浮层内别处
      el.focus()
      await waitForUpdate(el)
      typeDraft(el, 'draft')
      await waitForUpdate(el)
      editorOf(el).blur()
      await waitForUpdate(el)

      expect(cancels).toHaveLength(1)
      expect(cancels[0].bubbles, 'cancel 不冒泡').toBe(false)
      expect(cancels[0].composed, 'cancel 不组合').toBe(false)
      expect(overlay.dialogCancels, 'shadow 内 dialog 的 cancel 监听不应被触发').toBe(0)
      expect(seenByAncestor, 'light DOM 祖先也收不到：监听须挂在组件本身').toHaveLength(0)
      expect(el.value, '草稿丢弃').toBe('hello')

      // Escape 路径：同样不得借道 dialog
      el.focus()
      await waitForUpdate(el)
      typeDraft(el, 'draft2')
      await waitForUpdate(el)
      editorOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
      )
      await waitForUpdate(el)

      expect(cancels).toHaveLength(2)
      expect(overlay.dialogCancels, 'Escape 取消不得触发 dialog 的 cancel 监听').toBe(0)
      expect(seenByAncestor).toHaveLength(0)
      expect(el.value, '恢复进入编辑时的值').toBe('hello')
    } finally {
      detachCancels()
      lightAncestor.removeEventListener('cancel', onAncestorCancel)
      cleanupElement(el)
      lightAncestor.remove()
    }
  })

  it('断开重连后 Enter 提交仍正常：connectedCallback 重复进场不失效', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    const parent = el.parentElement!
    el.remove()
    await waitForUpdate(el)
    parent.append(el)
    await waitForUpdate(el)

    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing'), '重连后可进入编辑').toBe(true)

    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })
      editorOf(el).dispatchEvent(event)
      await waitForUpdate(el)
      expect(event.defaultPrevented, '重连后 Enter 换行默认行为仍被压掉').toBe(true)
      expect(changes, '重连后提交仍派发一次 change').toHaveLength(1)
      expect(el.hasAttribute('editing')).toBe(false)
      expect(el.value).toBe('hello')
    } finally {
      detachChanges()
    }
    cleanupElement(el)
  })

  it('Enter 提交：派发 change、退出编辑、不插入换行', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    const [changes, detachChanges] = spyEvents(el, 'change')
    // 与 Escape 同套消费策略：按键不外泄，外层表单/浮层监听不应收到
    const documentCapture: string[] = []
    const onDocumentCapture = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Enter') documentCapture.push('enter')
    }
    document.addEventListener('keydown', onDocumentCapture, true)
    try {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })
      editorOf(el).dispatchEvent(event)
      await waitForUpdate(el)
      expect(event.defaultPrevented, 'Enter 的换行默认行为被压掉').toBe(true)
      expect(documentCapture, 'Enter 不穿透到 document 捕获监听').toEqual([])
      expect(changes, '提交只派发一次 change').toHaveLength(1)
      expect(cancels).toHaveLength(0)
      expect(el.value).toBe('hello')
      expect(editorOf(el).value, '编辑层没有换行符').toBe('hello')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement, '焦点回宿主').toBe(el)
    } finally {
      document.removeEventListener('keydown', onDocumentCapture, true)
      detachCancels()
      detachChanges()
    }
    cleanupElement(el)
  })

  it('Enter 提交后再次聚焦可重新进入编辑', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    editorOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(false)

    el.blur()
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    expect(el.hasAttribute('editing'), '提交不锁死编辑入口').toBe(true)
    cleanupElement(el)
  })

  it('编程式设值不派发事件', async () => {
    const el = create()
    await waitForUpdate(el)

    const [inputs, detachInputs] = spyEvents(el, 'input')
    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      el.value = 'programmatic'
      await waitForUpdate(el)
      expect(inputs).toHaveLength(0)
      expect(changes).toHaveLength(0)
    } finally {
      detachInputs()
      detachChanges()
    }
    cleanupElement(el)
  })

  it('formDisabledCallback 禁用后移出 tab 序列并退出编辑', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(true)

    el.formDisabledCallback(true)
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(false)
    expect(el.hasAttribute('tabindex')).toBe(false)
    cleanupElement(el)
  })

  it('formStateRestoreCallback 恢复外部状态', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)

    el.formStateRestoreCallback('restored')
    await waitForUpdate(el)
    expect(el.value).toBe('restored')
    cleanupElement(el)
  })

  contractReflection('WebUiEditableText 属性反射', () => create(), [
    ['name', 'field', 'name', 'field'],
    ['placeholder', '请输入', 'placeholder', '请输入'],
    ['disabled', true, 'disabled', '']
  ])
})
