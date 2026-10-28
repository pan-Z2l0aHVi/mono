// @vitest-environment jsdom

import type { WebUiAutocomplete } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../../services/library'
import EditTagsDialog from '../EditTagsDialog.vue'

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

  it('点确认才把 input 内容加入当前标签，并以队列 id 即时保存', async () => {
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const mounted = mountDialog(TARGET, save)

    try {
      await nextTick()
      await selectCandidate(mounted.host, '旅行')

      clickButtonByLabel(mounted.host, '确认添加标签')
      await nextTick()
      expect(textContent(mounted.host, '旅行')).not.toBeUndefined()
      expect(save).toHaveBeenCalledOnce()
      expect(save).toHaveBeenCalledWith('queue-item', ['设计', '旅行'])
    } finally {
      mounted.close()
    }
  })

  it('「完成」只是关闭，不再触发保存', async () => {
    const save = vi.fn<(resourceId: string, tagNames: string[]) => void>()
    const mounted = mountDialog(TARGET, save)

    try {
      await nextTick()
      await selectCandidate(mounted.host, '旅行')
      clickButtonByLabel(mounted.host, '确认添加标签')
      await nextTick()
      expect(save).toHaveBeenCalledOnce()

      clickButtonByText(mounted.host, '完成')
      expect(save).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
    }
  })
})
