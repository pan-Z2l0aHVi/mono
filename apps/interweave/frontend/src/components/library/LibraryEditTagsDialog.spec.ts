// @vitest-environment jsdom

import type { WebUiAutocomplete } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../services/library'

import LibraryEditTagsDialog from './LibraryEditTagsDialog.vue'

function mountDialog(target: LibraryQueueItem, onSave: (resourceId: string, tagNames: string[]) => void) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(LibraryEditTagsDialog, {
        open: true,
        target,
        allTagNames: ['设计', '旅行'],
        busy: false,
        error: '',
        onSave
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

function textContent(host: HTMLElement, text: string) {
  return [...host.querySelectorAll('span')].find(element => element.textContent?.trim() === text)
}

describe('LibraryEditTagsDialog', () => {
  it('queue target 的现有标签可编辑并以队列 id 保存', async () => {
    const target: LibraryQueueItem = {
      id: 'queue-item',
      kind: 'file',
      resourceKind: ResourceKind.ResourceKindImage,
      title: '待添加图片',
      location: '/tmp/photo.png',
      tags: ['设计'],
      previewToken: 'opaque-token',
      mediaUrl: '/pending-resource-media/opaque-token'
    }
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const mounted = mountDialog(target, save)

    try {
      await nextTick()
      expect(textContent(mounted.host, '设计')).not.toBeUndefined()

      const input = mounted.host.querySelector<WebUiAutocomplete>('web-ui-autocomplete')
      if (!input) throw new Error('tag autocomplete was not rendered')
      input.value = '旅行'
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await nextTick()
      expect(textContent(mounted.host, '旅行')).not.toBeUndefined()

      const confirm = [...mounted.host.querySelectorAll('web-ui-button')].find(
        button => button.textContent?.trim() === '确认'
      )
      if (!confirm) throw new Error('confirm button was not rendered')
      confirm.click()

      expect(save).toHaveBeenCalledOnce()
      expect(save).toHaveBeenCalledWith('queue-item', ['设计', '旅行'])
    } finally {
      mounted.close()
    }
  })
})
