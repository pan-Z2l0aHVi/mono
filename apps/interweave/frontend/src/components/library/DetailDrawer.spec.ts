// @vitest-environment jsdom

import type { WebUiButton } from '@greypan/web-ui'
import type { WebUiTextarea } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, shallowRef } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import DetailDrawer from './DetailDrawer.vue'

type NoteChangeHandler = (resource: ResourceView, note: string, editor: WebUiTextarea | null) => void

function resourceView(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'resource-1',
    title: '示例资源',
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [],
    preferred: null,
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: null,
    ...overrides
  }
}

function mountDrawer(resource: ResourceView, listeners: Record<string, unknown> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const current = shallowRef<ResourceView | null>(resource)
  const app = createApp({
    render: () =>
      h(DetailDrawer, {
        open: true,
        resource: current.value,
        mobile: false,
        editingNameKey: null,
        editorRef: () => () => {},
        replacingSourceIds: [],
        ...listeners
      })
  })
  app.mount(host)
  return {
    host,
    setResource: (next: ResourceView | null) => {
      current.value = next
    },
    close: () => {
      app.unmount()
      host.remove()
    }
  }
}

function noteEditor(host: HTMLElement): WebUiTextarea {
  const element = host.querySelector<WebUiTextarea>('web-ui-textarea')
  if (!element) throw new Error('note textarea not found')
  return element
}

function typeNote(host: HTMLElement, value: string) {
  const editor = noteEditor(host)
  editor.value = value
  editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  return editor
}

function button(host: HTMLElement, label: string) {
  const element = [...host.querySelectorAll<WebUiButton>('web-ui-button')].find(
    candidate => candidate.getAttribute('aria-label') === label
  )
  if (!element) throw new Error(`button ${label} not found`)
  return element
}

describe('DetailDrawer', () => {
  it('重命名按钮常显且不残留 hover 显隐 class，点击仍进入重命名流程', async () => {
    const resource = resourceView()
    const startRename = vi.fn<(target: ResourceView) => void>()
    const mounted = mountDrawer(resource, { onStartRename: startRename })

    try {
      await nextTick()
      const renameButton = button(mounted.host, '重命名')

      expect(renameButton.getAttribute('class')).toBe('shrink-0')

      renameButton.click()
      expect(startRename).toHaveBeenCalledOnce()
      expect(startRename).toHaveBeenCalledWith(resource)
    } finally {
      mounted.close()
    }
  })

  it('编辑态下不渲染重命名按钮', async () => {
    const mounted = mountDrawer(resourceView(), { editingNameKey: '__drawer-title__' })

    try {
      await nextTick()
      expect(mounted.host.querySelector('web-ui-button[aria-label="重命名"]')).toBeNull()
    } finally {
      mounted.close()
    }
  })

  it('失焦提交备注，并把待存值清掉', async () => {
    const resource = resourceView()
    const noteChange = vi.fn<NoteChangeHandler>()
    const mounted = mountDrawer(resource, { onNoteChange: noteChange })

    try {
      await nextTick()
      const editor = typeNote(mounted.host, '失焦备注')
      editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

      expect(noteChange).toHaveBeenCalledOnce()
      expect(noteChange).toHaveBeenCalledWith(resource, '失焦备注', editor)

      // change 已提交，之后关闭不该再补一次。
      mounted.setResource(null)
      await nextTick()
      expect(noteChange).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
    }
  })

  it('Escape 关闭把 resource 置空时，补提交未落库的备注', async () => {
    const resource = resourceView()
    const noteChange = vi.fn<NoteChangeHandler>()
    const mounted = mountDrawer(resource, { onNoteChange: noteChange })

    try {
      await nextTick()
      // 只 input 不 change：聚焦元素被摘出文档时不会再来 blur/change。
      typeNote(mounted.host, '键盘备注')
      expect(noteChange).not.toHaveBeenCalled()

      mounted.setResource(null)
      await nextTick()

      expect(noteChange).toHaveBeenCalledOnce()
      // 字段随 patch 卸载，没有可写回的编辑器。
      expect(noteChange).toHaveBeenCalledWith(resource, '键盘备注', null)
    } finally {
      mounted.close()
    }
  })

  it('抽屉切到另一条资源时，补提交上一条的待存备注', async () => {
    const resource = resourceView()
    const noteChange = vi.fn<NoteChangeHandler>()
    const mounted = mountDrawer(resource, { onNoteChange: noteChange })

    try {
      await nextTick()
      typeNote(mounted.host, '切走前的备注')

      mounted.setResource(resourceView({ id: 'resource-2', title: '另一条' }))
      await nextTick()

      expect(noteChange).toHaveBeenCalledOnce()
      expect(noteChange).toHaveBeenCalledWith(resource, '切走前的备注', null)
    } finally {
      mounted.close()
    }
  })

  it('store 回写同一条资源不触发补提交，避免重复落库', async () => {
    const resource = resourceView()
    const noteChange = vi.fn<NoteChangeHandler>()
    const mounted = mountDrawer(resource, { onNoteChange: noteChange })

    try {
      await nextTick()
      typeNote(mounted.host, '回写场景')

      // 同一 id 的新对象 = 保存成功或打标签后的 store 回写，不是切换也不是关闭。
      mounted.setResource(resourceView({ note: '回写场景' }))
      await nextTick()

      expect(noteChange).not.toHaveBeenCalled()
    } finally {
      mounted.close()
    }
  })

  it('没有未存输入时关闭不触发补提交', async () => {
    const noteChange = vi.fn<NoteChangeHandler>()
    const mounted = mountDrawer(resourceView(), { onNoteChange: noteChange })

    try {
      await nextTick()
      // 输入后又改回原值：待存值与已存值相同，不该产生写入。
      typeNote(mounted.host, '原值')
      typeNote(mounted.host, '')

      mounted.setResource(null)
      await nextTick()

      expect(noteChange).not.toHaveBeenCalled()
    } finally {
      mounted.close()
    }
  })
})
