// @vitest-environment jsdom

import type { WebUiButton, WebUiEditableText, WebUiIcon, WebUiTooltip } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../services/library'

import LibraryAddDialog from './LibraryAddDialog.vue'

function queueItem(overrides: Partial<LibraryQueueItem> = {}): LibraryQueueItem {
  return {
    id: 'queue-item',
    kind: 'file',
    resourceKind: ResourceKind.ResourceKindImage,
    title: '待添加图片',
    location: '/tmp/photo.png',
    tags: [],
    previewToken: 'opaque-token',
    mediaUrl: '/pending-resource-media/opaque-token',
    ...overrides
  }
}

function mountDialog(
  queue: LibraryQueueItem[],
  listeners: {
    onRename?: (itemId: string, title: string) => void
    onEditTags?: (item: LibraryQueueItem) => void
  } = {}
) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(LibraryAddDialog, {
        open: true,
        queue,
        busy: false,
        error: '',
        mobile: false,
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

describe('LibraryAddDialog', () => {
  it('图片加载后只显示真实缩略图，非媒体项显示 fallback', async () => {
    const imageItem = queueItem()
    const documentItem = queueItem({
      id: 'document-item',
      resourceKind: ResourceKind.ResourceKindDocument,
      title: '待添加文档',
      location: '/tmp/notes.md',
      previewToken: null,
      mediaUrl: null
    })
    const mounted = mountDialog([imageItem, documentItem])

    try {
      await nextTick()
      const thumbnails = mounted.host.querySelectorAll('[data-queue-thumbnail]')
      const imageThumbnail = thumbnails[0]
      const documentThumbnail = thumbnails[1]
      const image = imageThumbnail?.querySelector('img')
      if (!imageThumbnail || !documentThumbnail || !image) throw new Error('queue thumbnails were not rendered')

      expect(image.getAttribute('src')).toBe('/pending-resource-media/opaque-token')
      expect(imageThumbnail.querySelector('web-ui-icon')).not.toBeNull()
      image.dispatchEvent(new Event('load'))
      await nextTick()
      expect(imageThumbnail.querySelector('img')).toBe(image)
      expect(imageThumbnail.querySelector('web-ui-icon')).toBeNull()
      expect(documentThumbnail.querySelector('img')).toBeNull()
      expect(documentThumbnail.querySelector('web-ui-icon')).not.toBeNull()
    } finally {
      mounted.close()
    }
  })

  it('editable-text 同时只编辑一个队列项，change 提交而 cancel 放弃', async () => {
    const first = queueItem({ id: 'first', title: '第一项' })
    const second = queueItem({ id: 'second', title: '第二项', location: '/tmp/second.png' })
    const rename = vi.fn<(itemId: string, title: string) => void>()
    const mounted = mountDialog([first, second], { onRename: rename })

    try {
      await nextTick()
      button(mounted.host, '编辑名称').click()
      await nextTick()
      await nextTick()
      expect(mounted.host.querySelectorAll('web-ui-editable-text')).toHaveLength(1)

      button(mounted.host, '编辑名称').click()
      await nextTick()
      await nextTick()
      const editors = mounted.host.querySelectorAll<WebUiEditableText>('web-ui-editable-text')
      expect(editors).toHaveLength(1)
      expect(editors[0]?.value).toBe('第二项')

      const editor = editors[0]
      if (!editor) throw new Error('editable text was not rendered')
      editor.value = '改名后的第二项'
      editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await nextTick()
      expect(rename).toHaveBeenCalledOnce()
      expect(rename).toHaveBeenCalledWith('second', '改名后的第二项')
      expect(mounted.host.querySelector('web-ui-editable-text')).toBeNull()

      button(mounted.host, '编辑名称').click()
      await nextTick()
      await nextTick()
      const cancelled = mounted.host.querySelector<WebUiEditableText>('web-ui-editable-text')
      if (!cancelled) throw new Error('editable text was not rendered')
      cancelled.value = '不会提交'
      cancelled.dispatchEvent(new Event('cancel'))
      await nextTick()
      expect(rename).toHaveBeenCalledOnce()
      expect(mounted.host.querySelector('web-ui-editable-text')).toBeNull()
    } finally {
      mounted.close()
    }
  })

  it('逐字保留原型 tags 行 class 并把目标队列项传给编辑事件', async () => {
    const item = queueItem({ tags: ['设计'] })
    const editTags = vi.fn<(target: LibraryQueueItem) => void>()
    const mounted = mountDialog([item], { onEditTags: editTags })

    try {
      await nextTick()
      const chip = [...mounted.host.querySelectorAll('li span')].find(
        candidate => candidate.textContent?.trim() === '设计'
      )
      const tooltip = [...mounted.host.querySelectorAll<WebUiTooltip>('web-ui-tooltip')].find(
        candidate => candidate.content === '编辑标签'
      )
      const editButton = button(mounted.host, '编辑标签')
      const icon = editButton.querySelector<WebUiIcon>('web-ui-icon')

      expect(chip?.getAttribute('class')).toBe(
        'inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200'
      )
      expect(tooltip).toBeDefined()
      expect(tooltip?.placement).toBe('bottom')
      expect(editButton.getAttribute('class')).toBe('shrink-0 [--wui-button-color:var(--wui-color-accent,#08f)]')
      expect(editButton.size).toBe('20')
      expect(icon?.size).toBe(12)

      editButton.click()
      expect(editTags).toHaveBeenCalledOnce()
      expect(editTags).toHaveBeenCalledWith(item)
    } finally {
      mounted.close()
    }
  })
})
