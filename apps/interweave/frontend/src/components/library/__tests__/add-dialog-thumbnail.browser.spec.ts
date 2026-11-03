// 图片 complete 语义与真实 load/error 事件只在真实浏览器成立，jsdom 无法覆盖。
import '@greypan/web-ui'

import type { WebUiButton } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../../services/library'
import AddDialog from '../AddDialog.vue'

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function queueItem(overrides: Partial<LibraryQueueItem> = {}): LibraryQueueItem {
  return {
    id: 'queue-item',
    kind: 'file',
    resourceKind: ResourceKind.ResourceKindImage,
    title: '待添加图片',
    location: '/tmp/photo.png',
    tags: [],
    previewToken: 'opaque-token',
    mediaUrl: PIXEL,
    ...overrides
  }
}

const hosts: HTMLElement[] = []
const apps: { unmount: () => void }[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

function mountDialog(queue: LibraryQueueItem[]) {
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)
  const app = createApp({
    render: () => h(AddDialog, { open: true, queue, busy: false, error: '', mobile: false, tagColors: {} })
  })
  apps.push(app)
  app.mount(host)
  return host
}

async function waitFor(condition: () => boolean, label: string, maxFrames = 300): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

describe('AddDialog 队列缩略图（真实浏览器）', () => {
  it('图片加载完成后点「编辑名称」，各队列项缩略图不消失、fallback 不叠加', async () => {
    const queue = ref([
      queueItem(),
      queueItem({
        id: 'queue-item-2',
        title: '第二张',
        location: '/tmp/photo-2.png',
        previewToken: 'token-2',
        mediaUrl: PIXEL
      })
    ])
    const host = mountDialog(queue.value)
    await nextTick()

    const thumbnails = [...host.querySelectorAll<HTMLElement>('[data-queue-thumbnail]')]
    expect(thumbnails, '两个图片项都渲染在 button 里').toHaveLength(2)
    const images = thumbnails.map(thumbnail => thumbnail.querySelector('img')!)
    expect(images.every(image => !!image)).toBe(true)

    for (const image of images) {
      await waitFor(() => image.complete && image.naturalWidth > 0, '图片加载完成')
    }
    await waitFor(() => thumbnails.every(thumbnail => !thumbnail.querySelector('web-ui-icon')), '加载后 fallback 退场')

    const editButton = [...host.querySelectorAll<WebUiButton>('web-ui-button')].find(
      candidate => candidate.getAttribute('aria-label') === '编辑名称'
    )!
    editButton.click()
    await nextTick()
    await nextTick()
    // 渲染与 pre-watch 都跑完后，再等几帧观察后续事件（error / 重载）。
    await waitFor(() => host.querySelector('web-ui-editable-text') !== null, '进入编辑态')

    expect(host.querySelector('web-ui-editable-text')).not.toBeNull()
    const thumbnailsAfter = [...host.querySelectorAll<HTMLElement>('[data-queue-thumbnail]')]
    expect(thumbnailsAfter, '编辑态下缩略图容器不重建').toEqual(thumbnails)
    for (let index = 0; index < images.length; index++) {
      expect(thumbnailsAfter[index]?.querySelector('img'), `第 ${index + 1} 项的 img 仍在`).toBe(images[index])
      expect(thumbnailsAfter[index]?.querySelector('web-ui-icon'), `第 ${index + 1} 项 fallback 不叠加`).toBeNull()
    }
  })
})
