// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView } from '../../stores/library'

import LibraryResourceThumbnail from './LibraryResourceThumbnail.vue'

function fileSource(): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location: '/tmp/image.jpg',
    available: true,
    isPreferred: true,
    orderIndex: 0,
    metadata: null
  }
}

describe('LibraryResourceThumbnail', () => {
  it('source props 对象更换但 src 不变且没有新 load 事件时保持 image 与 fallback 互斥', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const source = ref(fileSource())
    const mediaUrl = 'file:///tmp/image.jpg'
    const app = createApp({
      setup() {
        return () =>
          h(LibraryResourceThumbnail, {
            kind: ResourceKind.ResourceKindImage,
            source: source.value,
            mediaUrl
          })
      }
    })

    try {
      app.mount(host)
      await nextTick()

      const image = host.querySelector<HTMLImageElement>('img')
      expect(image).not.toBeNull()
      if (!image) throw new Error('thumbnail image was not rendered')
      expect(host.querySelector('web-ui-icon')).not.toBeNull()

      Object.defineProperty(image, 'complete', { configurable: true, value: true })
      const laterLoad = vi.fn<() => void>()
      image.addEventListener('load', laterLoad)
      image.dispatchEvent(new Event('load'))
      await nextTick()

      expect(host.querySelector('web-ui-icon')).toBeNull()
      laterLoad.mockClear()

      source.value = { ...source.value, id: 'source-2' }
      await nextTick()
      await nextTick()

      expect(host.querySelector('img')).toBe(image)
      expect(host.querySelector('web-ui-icon')).toBeNull()
      expect(laterLoad).not.toHaveBeenCalled()
    } finally {
      app.unmount()
      host.remove()
    }
  })
})
