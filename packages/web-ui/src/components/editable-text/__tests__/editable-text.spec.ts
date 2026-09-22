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

  it('value attribute 提供初值，提交后 attribute 保持 reset 初值', async () => {
    const el = create({ value: 'initial' })
    await waitForUpdate(el)
    expect(el.value).toBe('initial')

    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'edited')
    await waitForUpdate(el)
    expect(el.value).toBe('edited')

    editorOf(el).blur()
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

  it('blur 提交并派发 change', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    typeDraft(el, 'hello world')
    await waitForUpdate(el)

    const [changes, detachChanges] = spyEvents(el, 'change')
    try {
      editorOf(el).blur()
      await waitForUpdate(el)
      expect(changes).toHaveLength(1)
      expect(el.hasAttribute('editing')).toBe(false)
      expect(el.value).toBe('hello world')
    } finally {
      detachChanges()
    }
    cleanupElement(el)
  })

  it('空草稿 blur 提交空值，文本层回落 placeholder', async () => {
    const el = create({ value: 'hello', placeholder: '未命名' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    typeDraft(el, '')
    await waitForUpdate(el)
    editorOf(el).blur()
    await waitForUpdate(el)

    expect(el.value).toBe('')
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
    try {
      editorOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(cancels).toHaveLength(1)
      expect(changes).toHaveLength(0)
      expect(el.value).toBe('hello')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement).toBe(el)
    } finally {
      detachCancels()
      detachChanges()
    }
    cleanupElement(el)
  })

  it('Enter 不被拦截，编辑继续（多行换行由 textarea 原生处理）', async () => {
    const el = create({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [cancels, detachCancels] = spyEvents(el, 'cancel')
    try {
      editorOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
      await waitForUpdate(el)
      expect(cancels).toHaveLength(0)
      expect(el.hasAttribute('editing')).toBe(true)
      expect(el.value).toBe('hello')
    } finally {
      detachCancels()
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
    ['disabled', true, 'disabled', '']
  ])
})
