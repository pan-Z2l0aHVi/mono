// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView } from '../../../stores/library'
import ResourceThumbnail from '../ResourceThumbnail.vue'

function fileSource(location = '/tmp/image.jpg'): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location,
    available: true,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: null,
    thumbnailUrl: null,
    metadata: null
  }
}

describe('ResourceThumbnail', () => {
  it('失效来源优先显示缓存，缓存缺失时显示类型图标', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h(ResourceThumbnail, {
          kind: ResourceKind.ResourceKindImage,
          source: { ...fileSource(), available: false },
          mediaUrl: '/original',
          thumbnailUrl: '/cached'
        })
    })
    app.mount(host)
    try {
      const image = host.querySelector('img')!
      expect(image.getAttribute('src')).toBe('/cached')
      image.dispatchEvent(new Event('load'))
      await nextTick()
      expect(host.querySelector('web-ui-icon')).toBeNull()
      image.dispatchEvent(new Event('error'))
      await nextTick()
      expect(host.querySelector('img')).toBeNull()
      expect(host.querySelector('web-ui-icon')).not.toBeNull()
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('source props 对象更换但 src 不变且没有新 load 事件时保持 image 与 fallback 互斥', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const source = ref(fileSource())
    const mediaUrl = 'file:///tmp/image.jpg'
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
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

  /*
   * 回归：AddDialog 的 queueSource 在父组件每次渲染时新建 source 对象，仅身份变化、字段未变
   * 时不得走重置。重置对 video 的破坏是双重的：thumbnailURL 清空丢掉已捕获的帧，video 的
   * src 属性被卸下后 Vue 不会因 mediaUrl 未变而写回，随后的 load() 只能报错——表现即
   * 「编辑名称后列表图片消失」。
   */
  it('source 对象更换但 kind/id/mediaUrl 都没变时，不重置视频缩略图', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const source = ref(fileSource('/tmp/movie.mp4'))
    const mediaUrl = '/pending-resource-media/token-1'
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindVideo,
            source: source.value,
            mediaUrl
          })
      }
    })

    try {
      app.mount(host)
      await nextTick()

      const video = host.querySelector('video')
      expect(video).not.toBeNull()
      expect(video?.getAttribute('src')).toBe(mediaUrl)

      // 仅换对象身份，字段全部不变（AddDialog 的 queueSource 每次渲染都新建对象）。
      source.value = { ...source.value }
      await nextTick()
      await nextTick()

      expect(host.querySelector('video')).toBe(video)
      expect(video?.getAttribute('src'), 'src 不应被移除').toBe(mediaUrl)
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('source location 变化时重建媒体元素，避免继续展示替换前的文件', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const source = ref(fileSource('/tmp/first.mp4'))
    const mediaUrl = '/resource-media/source-1'
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindVideo,
            source: source.value,
            mediaUrl
          })
      }
    })

    try {
      app.mount(host)
      await nextTick()

      const video = host.querySelector('video')
      expect(video?.getAttribute('src')).toBe(mediaUrl)

      source.value = { ...source.value, location: '/tmp/second.mp4' }
      await nextTick()
      await nextTick()

      const replaced = host.querySelector('video')
      expect(replaced, 'location 变化应重建 video').not.toBe(video)
      expect(replaced?.getAttribute('src')).toBe(mediaUrl)
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('thumbnailUrl 有值时优先展示缩略图，原图与视频本体都不加载', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const mediaUrl = '/resource-media/source-1'
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindVideo,
            source: fileSource('/tmp/movie.mp4'),
            mediaUrl,
            thumbnailUrl: '/resource-thumbnail/source-1'
          })
      }
    })

    try {
      app.mount(host)
      await nextTick()

      const thumb = host.querySelector<HTMLImageElement>('img')
      expect(thumb?.getAttribute('src')).toBe('/resource-thumbnail/source-1')
      // 视频本体不加载：这是列表滚动不拉视频的关键路径。
      expect(host.querySelector('video')).toBeNull()
      expect(host.querySelector('web-ui-icon')).not.toBeNull()
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('缩略图缺席（error）时回退原图路径，缩略图 img 退场', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const mediaUrl = '/resource-media/source-1'
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindImage,
            source: fileSource(),
            mediaUrl,
            thumbnailUrl: '/resource-thumbnail/source-1'
          })
      }
    })

    try {
      app.mount(host)
      await nextTick()

      const thumb = host.querySelector<HTMLImageElement>('img')!
      expect(thumb.getAttribute('src')).toBe('/resource-thumbnail/source-1')
      thumb.dispatchEvent(new Event('error'))
      await nextTick()
      await nextTick()

      const images = [...host.querySelectorAll('img')]
      expect(images.some(node => node.getAttribute('src') === '/resource-thumbnail/source-1')).toBe(false)
      const original = images.find(node => node.getAttribute('src') === mediaUrl)
      expect(original, '回退到原图 img').toBeDefined()
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('缩略图加载完成后不再显示 fallback 图标', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindImage,
            source: fileSource(),
            mediaUrl: '/resource-media/source-1',
            thumbnailUrl: '/resource-thumbnail/source-1'
          })
      }
    })

    try {
      app.mount(host)
      await nextTick()
      expect(host.querySelector('web-ui-icon')).not.toBeNull()

      const thumb = host.querySelector<HTMLImageElement>('img')!
      Object.defineProperty(thumb, 'complete', { configurable: true, value: true })
      thumb.dispatchEvent(new Event('load'))
      await nextTick()

      expect(host.querySelector('web-ui-icon')).toBeNull()
    } finally {
      app.unmount()
      host.remove()
    }
  })
})
