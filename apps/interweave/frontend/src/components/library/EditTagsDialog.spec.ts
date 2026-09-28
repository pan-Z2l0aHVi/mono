// @vitest-environment jsdom

import type { WebUiAutocomplete } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../services/library'

import EditTagsDialog from './EditTagsDialog.vue'

function mountDialog(target: LibraryQueueItem, onSave: (resourceId: string, tagNames: string[]) => void) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(EditTagsDialog, {
        open: true,
        target,
        allTagNames: ['设计', '旅行'],
        tagColors: {},
        busy: false,
        error: '',
        onSave,
        'onUpdate:open': () => {}
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

describe('EditTagsDialog', () => {
  it('选中候选只回写输入框，确认后才增删并即时保存，完成按钮只关闭', async () => {
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

      // 选中候选（change）只回写输入框，不直接落入当前标签、不触发保存。
      input.value = '旅行'
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await nextTick()
      expect(textContent(mounted.host, '旅行')).toBeUndefined()
      expect(save).not.toHaveBeenCalled()

      // 点确认按钮才把输入框内容加入当前标签，并即时以队列 id 保存。
      const confirmAdd = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="确认添加标签"]')
      if (!confirmAdd) throw new Error('confirm add button was not rendered')
      confirmAdd.click()
      await nextTick()
      expect(textContent(mounted.host, '旅行')).not.toBeUndefined()
      expect(save).toHaveBeenCalledOnce()
      expect(save).toHaveBeenCalledWith('queue-item', ['设计', '旅行'])

      // 「完成」只是关闭，不再触发保存。
      const done = [...mounted.host.querySelectorAll('web-ui-button')].find(
        button => button.textContent?.trim() === '完成'
      )
      if (!done) throw new Error('done button was not rendered')
      done.click()
      expect(save).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
    }
  })
})
