// @vitest-environment jsdom

import type { WebUiButton } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import LibraryDetailDrawer from './LibraryDetailDrawer.vue'

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
  const app = createApp({
    render: () =>
      h(LibraryDetailDrawer, {
        open: true,
        resource,
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
    close: () => {
      app.unmount()
      host.remove()
    }
  }
}

function button(host: HTMLElement, label: string) {
  const element = [...host.querySelectorAll<WebUiButton>('web-ui-button')].find(
    candidate => candidate.getAttribute('aria-label') === label
  )
  if (!element) throw new Error(`button ${label} not found`)
  return element
}

describe('LibraryDetailDrawer', () => {
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
})
