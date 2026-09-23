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
    expect(el.readonly).toBe(false)
    expect(el.hasAttribute('editing')).toBe(false)
    cleanupElement(el)
  })

  it('可聚焦：默认在 tab 序列内', async () => {
    const el = create()
    await waitForUpdate(el)
    expect(el.getAttribute('tabindex')).toBe('0')
    cleanupElement(el)
  })

  it('编辑层有稳定且实例唯一的 id', async () => {
    const first = create()
    const second = create()
    await Promise.all([waitForUpdate(first), waitForUpdate(second)])

    const firstId = editorOf(first).id
    const secondId = editorOf(second).id
    expect(firstId).not.toBe('')
    expect(secondId).not.toBe('')
    expect(secondId).not.toBe(firstId)

    first.value = 'updated'
    await waitForUpdate(first)
    expect(editorOf(first).id).toBe(firstId)

    cleanupElement(first)
    cleanupElement(second)
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

  it('readonly 仍可聚焦与全选，但阻止输入、提交 change', async () => {
    const el = create({ value: 'hello', readonly: '' })
    await waitForUpdate(el)
    expect(editorOf(el).readOnly).toBe(true)

    el.select()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(editorOf(el))
    expect(editorOf(el).selectionStart).toBe(0)
    expect(editorOf(el).selectionEnd).toBe(5)

    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      typeDraft(el, 'blocked')
      await waitForUpdate(el)
      expect(el.value).toBe('hello')
      expect(editorOf(el).value).toBe('hello')

      editorOf(el).blur()
      await waitForUpdate(el)
      expect(el.hasAttribute('editing')).toBe(false)
      expect(el.value).toBe('hello')
      expect(changes).toHaveLength(0)
    } finally {
      detachChanges()
    }
    cleanupElement(el)
  })

  it('readonly 编辑态 Enter 被编辑层消费，不外泄也不提交', async () => {
    const el = create({ value: 'hello', readonly: '' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(true)

    const documentCapture: string[] = []
    const onDocumentCapture = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Enter') documentCapture.push('enter')
    }
    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    const [changes, detachChanges] = spyEvents(el, 'change')
    document.addEventListener('keydown', onDocumentCapture, true)
    try {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })
      editorOf(el).dispatchEvent(event)
      await waitForUpdate(el)

      expect(event.defaultPrevented, 'readonly Enter 的默认行为被压掉').toBe(true)
      expect(documentCapture, 'readonly Enter 不穿透到 document 捕获监听').toEqual([])
      expect(el.hasAttribute('editing'), '消费按键但不退出编辑').toBe(true)
      expect(el.value, 'readonly Enter 不提交').toBe('hello')
      expect(cancels, 'readonly Enter 不派发 cancel').toHaveLength(0)
      expect(changes, 'readonly Enter 不派发 change').toHaveLength(0)
    } finally {
      document.removeEventListener('keydown', onDocumentCapture, true)
      detachCancels()
      detachChanges()
    }
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

  it('blur 提交：草稿成为新值、派发一次 change、不派发 cancel', async () => {
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
      expect(changes, '提交只派发一次 change').toHaveLength(1)
      expect(cancels).toHaveLength(0)
      expect(el.value, '草稿成为新值').toBe('hello world')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement, '焦点不被抢回宿主：blur 是被动失焦').not.toBe(el)
    } finally {
      detachCancels()
      detachChanges()
    }
    cleanupElement(el)
  })

  it('空草稿 blur 提交：空值被提交，文本层回落 placeholder', async () => {
    const el = create({ value: 'hello', placeholder: '未命名' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    typeDraft(el, '')
    await waitForUpdate(el)
    editorOf(el).blur()
    await waitForUpdate(el)

    expect(el.value, '空草稿被提交').toBe('')
    expect(textLayerOf(el).textContent, '文本层回落 placeholder').toBe('未命名')
    cleanupElement(el)
  })

  it('blur 提交不锁死编辑入口：再次聚焦重新进入编辑', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'hello world')
    await waitForUpdate(el)
    editorOf(el).blur()
    await waitForUpdate(el)
    expect(el.value).toBe('hello world')

    el.focus()
    await waitForUpdate(el)

    expect(el.hasAttribute('editing'), '提交不锁死编辑入口').toBe(true)
    expect(editorOf(el).value).toBe('hello world')
    cleanupElement(el)
  })

  it('Escape 取消后随后的 blur 不再提交：先摘除编辑态，blur 早退', async () => {
    /*
     * blur 改为提交后，取消路径的时序成为不变量：Escape 必须先摘除编辑态，再让
     * 交还焦点触发的 blur 到达，否则那次 blur 会把取消误判成提交。spy 编辑层的
     * blur 计数：证明这次 blur 真的到达过（而非隐藏元素上的空操作），断言才不恒真。
     */
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'draft')
    await waitForUpdate(el)

    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      editorOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
      )
      await waitForUpdate(el)

      expect(editorBlurs.length, '交还焦点确实把编辑层 blur 了：取消路径上有真实 blur 到达').toBeGreaterThanOrEqual(1)
      expect(document.activeElement, '取消后焦点回宿主').toBe(el)
      editorOf(el).focus()
      editorOf(el).blur()
      await waitForUpdate(el)

      expect(cancels, '只有 Escape 派发的那一次 cancel').toHaveLength(1)
      expect(changes, '取消与其后的 blur 都不产生 change').toHaveLength(0)
      expect(el.value, '值恢复进入编辑时的状态').toBe('hello')
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachCancels()
      detachChanges()
      detachEditorBlurs()
    }
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
    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      // blur 路径：点到浮层内别处——提交而非取消，本就无关 dialog 的 cancel 管线
      el.focus()
      await waitForUpdate(el)
      typeDraft(el, 'draft')
      await waitForUpdate(el)
      editorOf(el).blur()
      await waitForUpdate(el)

      expect(changes, 'blur 提交派发一次 change').toHaveLength(1)
      expect(cancels, '提交不派发 cancel').toHaveLength(0)
      expect(overlay.dialogCancels, 'shadow 内 dialog 的 cancel 监听不应被触发').toBe(0)
      expect(seenByAncestor, 'light DOM 祖先也收不到：监听须挂在组件本身').toHaveLength(0)
      expect(el.value, '草稿成为新值').toBe('draft')

      // Escape 路径：取消不得借道 dialog
      el.focus()
      await waitForUpdate(el)
      typeDraft(el, 'draft2')
      await waitForUpdate(el)
      editorOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
      )
      await waitForUpdate(el)

      expect(cancels, '只有 Escape 派发的那一次 cancel').toHaveLength(1)
      expect(cancels[0].bubbles, 'cancel 不冒泡').toBe(false)
      expect(cancels[0].composed, 'cancel 不组合').toBe(false)
      expect(changes, '取消不派发 change').toHaveLength(1)
      expect(overlay.dialogCancels, 'Escape 取消不得触发 dialog 的 cancel 监听').toBe(0)
      expect(seenByAncestor).toHaveLength(0)
      expect(el.value, '恢复本次进入编辑时的值（blur 已提交的 draft）').toBe('draft')
    } finally {
      detachCancels()
      detachChanges()
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

  it('Enter 提交后的 blur 不再次派发 change', async () => {
    /*
     * 提交路径先退出编辑再交还焦点：focus 触发的 blur 到达时 _editing 已为 false。
     * blur 改为提交后，这条早退是「各恰好一次 change」的另一半——退出与焦点迁移的
     * 次序一旦反了，同一次提交会拿到两次 change。spy 编辑层的 blur 计数：证明
     * 这次 blur 真的到达过，断言不恒真。
     */
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      editorOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
      await waitForUpdate(el)
      expect(editorBlurs.length, '交还焦点确实把编辑层 blur 了：提交路径上有真实 blur 到达').toBeGreaterThanOrEqual(1)
      expect(changes, 'Enter 提交恰好一次').toHaveLength(1)

      editorOf(el).focus()
      editorOf(el).blur()
      await waitForUpdate(el)
      expect(changes, '提交后的 blur 早退，不再派发').toHaveLength(1)
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachChanges()
      detachEditorBlurs()
    }
    cleanupElement(el)
  })

  it('cancel 监听器内 el.focus() 不重新进入编辑，随后的 blur 不误提交', async () => {
    /*
     * cancel 同步派发，消费者常在监听器里把焦点还给组件。重入守卫必须先于
     * dispatch 置位：否则这次 focus 会重新进入编辑，随后一次 blur 就把恢复后的
     * 原值当成新草稿提交——用户什么都没改，却收到一次 change。
     *
     * jsdom 复现不了这条路径：shadow 内聚焦时 document.activeElement 已是宿主，
     * 监听器里的 el.focus() 不派发宿主 focus 事件（实测无 host-focus），重入无从
     * 发生。该不变量由 browser spec 的真实焦点迁移锁定。
     */
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'draft')
    await waitForUpdate(el)

    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    const [changes, detachChanges] = spyEvents(el, 'change')
    const onCancel = () => el.focus()
    el.addEventListener('cancel', onCancel)
    try {
      editorOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
      )
      await waitForUpdate(el)

      expect(cancels).toHaveLength(1)
      expect(el.value, '值恢复进入编辑时的状态').toBe('hello')
      expect(el.hasAttribute('editing'), '监听器里的 focus 被重入守卫消费，不重新进入编辑').toBe(false)
      expect(changes, '取消不派发 change').toHaveLength(0)

      editorOf(el).focus()
      editorOf(el).blur()
      await waitForUpdate(el)
      expect(changes, '随后的 blur 不误提交').toHaveLength(0)
    } finally {
      el.removeEventListener('cancel', onCancel)
      detachCancels()
      detachChanges()
    }
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
    ['disabled', true, 'disabled', ''],
    ['readonly', true, 'readonly', '']
  ])
})
