// @vitest-environment jsdom

import type { WebUiAutocomplete } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../../services/library'
import EditTagsDialog from '../EditTagsDialog.vue'

function mountDialog(
  target: LibraryQueueItem,
  onSave: (resourceId: string, tagNames: string[]) => void,
  onClose = vi.fn<(open: boolean) => void>()
) {
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
        'onUpdate:open': onClose
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

const TARGET: LibraryQueueItem = {
  id: 'queue-item',
  kind: 'file',
  resourceKind: ResourceKind.ResourceKindImage,
  title: '待添加图片',
  location: '/tmp/photo.png',
  tags: ['设计'],
  previewToken: 'opaque-token',
  mediaUrl: '/pending-resource-media/opaque-token'
}

/** 在 tag autocomplete 里选中一个候选并提交 change。 */
async function selectCandidate(host: HTMLElement, tagName: string): Promise<void> {
  const input = host.querySelector<WebUiAutocomplete>('web-ui-autocomplete')
  if (!input) throw new Error('tag autocomplete was not rendered')

  input.value = tagName
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  await nextTick()
}

function clickButtonByLabel(host: HTMLElement, label: string): void {
  const button = host.querySelector<HTMLElement>(`web-ui-button[aria-label="${label}"]`)
  if (!button) throw new Error(`${label} button was not rendered`)
  button.click()
}

function clickButtonByText(host: HTMLElement, text: string): void {
  const button = [...host.querySelectorAll('web-ui-button')].find(node => node.textContent?.trim() === text)
  if (!button) throw new Error(`${text} button was not rendered`)
  ;(button as HTMLElement).click()
}

describe('EditTagsDialog', () => {
  it('选中候选只回写 input，不直接落入当前标签、不触发保存', async () => {
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const mounted = mountDialog(TARGET, save)

    try {
      await nextTick()
      expect(textContent(mounted.host, '设计')).not.toBeUndefined()

      await selectCandidate(mounted.host, '旅行')
      expect(textContent(mounted.host, '旅行')).toBeUndefined()
      expect(save).not.toHaveBeenCalled()
    } finally {
      mounted.close()
    }
  })

  it('添加和移除标签只修改草稿，更新时一次保存', async () => {
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const mounted = mountDialog(TARGET, save)

    try {
      await nextTick()
      expect(textContent(mounted.host, '当前标签')).toBeDefined()
      await selectCandidate(mounted.host, '旅行')

      clickButtonByLabel(mounted.host, '确认添加标签')
      await nextTick()
      expect(textContent(mounted.host, '旅行')).not.toBeUndefined()
      expect(textContent(mounted.host, '未保存标签')).toBeDefined()
      clickButtonByLabel(mounted.host, '移除标签 设计')
      await nextTick()
      expect(save).not.toHaveBeenCalled()

      clickButtonByText(mounted.host, '更新标签')
      expect(save).toHaveBeenCalledOnce()
      expect(save).toHaveBeenCalledWith('queue-item', ['旅行'])
    } finally {
      mounted.close()
    }
  })

  it('草稿恢复原样后显示当前标签', async () => {
    const mounted = mountDialog(TARGET, vi.fn<(resourceId: string, tagNames: string[]) => void>())
    try {
      await selectCandidate(mounted.host, '旅行')
      clickButtonByLabel(mounted.host, '确认添加标签')
      await nextTick()
      expect(textContent(mounted.host, '未保存标签')).toBeDefined()
      clickButtonByLabel(mounted.host, '移除标签 旅行')
      await nextTick()
      expect(textContent(mounted.host, '当前标签')).toBeDefined()
    } finally {
      mounted.close()
    }
  })

  it('更新时将输入框内容加入草稿，并忽略重复标签', async () => {
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const mounted = mountDialog(TARGET, save)
    try {
      await selectCandidate(mounted.host, '  新   标签  ')
      clickButtonByText(mounted.host, '更新标签')
      expect(save).toHaveBeenLastCalledWith('queue-item', ['设计', '新 标签'])
      await selectCandidate(mounted.host, '设计')
      clickButtonByText(mounted.host, '更新标签')
      expect(save).toHaveBeenLastCalledWith('queue-item', ['设计', '新 标签'])
    } finally {
      mounted.close()
    }
  })

  it('关闭时不保存尚未提交的草稿', async () => {
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const close = vi.fn<(open: boolean) => void>()
    const mounted = mountDialog(TARGET, save, close)

    try {
      await nextTick()
      await selectCandidate(mounted.host, '旅行')
      clickButtonByLabel(mounted.host, '确认添加标签')
      await nextTick()
      clickButtonByText(mounted.host, '取消')
      expect(close).toHaveBeenCalledWith(false)
      expect(save).not.toHaveBeenCalled()
    } finally {
      mounted.close()
    }
  })
})
