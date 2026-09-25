// @vitest-environment jsdom

import type {
  ImagePreviewHandle,
  ImagePreviewOptions,
  WebUiButton,
  WebUiEditableText,
  WebUiIcon,
  WebUiTooltip
} from '@greypan/web-ui'
import { imagePreview } from '@greypan/web-ui'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../services/library'

import LibraryAddDialog from './LibraryAddDialog.vue'

vi.mock('@greypan/web-ui', async importOriginal => {
  const actual = await importOriginal<typeof import('@greypan/web-ui')>()
  return { ...actual, imagePreview: vi.fn<(options: ImagePreviewOptions) => ImagePreviewHandle>() }
})

const openPreview = vi.mocked(imagePreview)

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
  } = {},
  options: { mobile?: boolean; open?: boolean } = {}
) {
  const host = document.createElement('div')
  document.body.append(host)
  const open = ref(options.open ?? true)
  const app = createApp({
    render: () =>
      h(LibraryAddDialog, {
        open: open.value,
        queue,
        busy: false,
        error: '',
        mobile: options.mobile ?? false,
        ...listeners
      })
  })
  app.mount(host)
  return {
    host,
    setOpen: async (value: boolean) => {
      open.value = value
      await nextTick()
    },
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

function previewHandle(): ImagePreviewHandle {
  let settle: () => void = () => undefined
  const closed = new Promise<void>(resolve => {
    settle = resolve
  })
  return {
    index: 0,
    scale: 1,
    images: [],
    closed,
    next: vi.fn<() => void>(),
    prev: vi.fn<() => void>(),
    goTo: vi.fn<(index: number) => void>(),
    zoomIn: vi.fn<() => void>(),
    zoomOut: vi.fn<() => void>(),
    resetZoom: vi.fn<() => void>(),
    close: vi.fn<() => void>(() => settle())
  }
}

describe('LibraryAddDialog', () => {
  beforeEach(() => {
    openPreview.mockReset()
  })

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

  it('名称编辑按钮常显，不带 hover 显隐 class', async () => {
    const mounted = mountDialog([queueItem()])

    try {
      await nextTick()
      const editButton = button(mounted.host, '编辑名称')
      const classList = editButton.getAttribute('class') ?? ''

      expect(classList).not.toContain('opacity-0')
      expect(classList).not.toContain('group-hover')
      expect(classList).not.toContain('group-focus-within')
      expect(editButton.hidden).toBe(false)
    } finally {
      mounted.close()
    }
  })

  it('空态与左侧 drop 区对称：icon 盒尺寸、字形、间距和文案排版逐项对齐', async () => {
    const mounted = mountDialog([])

    try {
      await nextTick()
      const aside = mounted.host.querySelector('aside[aria-labelledby="library-add-queue-title"]')
      const empty = aside?.querySelector('web-ui-empty')
      if (!empty) throw new Error('empty state was not rendered')

      // 左侧 drop 区的基准值：icon 盒 52px/圆角 18px、字形 23、icon 到文案 12px、
      // 文案 15px/600/1.4；max-[640px] 断点为 40px/12px、字形 23、间距 8px、文案 13px。
      const emptyClass = empty.getAttribute('class') ?? ''
      expect(emptyClass).toContain('[--wui-empty-min-height:0]')
      expect(emptyClass).toContain('[--wui-empty-padding:0]')
      expect(emptyClass).toContain('[--wui-empty-icon-size:52px]')
      expect(emptyClass).toContain('[--wui-internal-empty-icon-radius:18px]')
      expect(emptyClass).toContain('max-[640px]:[--wui-empty-icon-size:40px]')
      expect(emptyClass).toContain('max-[640px]:[--wui-internal-empty-icon-radius:12px]')

      const icon = empty.querySelector<WebUiIcon>('web-ui-icon[slot="icon"]')
      expect(icon?.getAttribute('size')).toBe('23')

      // 两行文案与左侧同样是「主文案 + 辅助说明」：行数相同，合成块高度才与左侧相等，
      // 居中后 icon 行才对得齐。mt-1.5 补足组件内部写死的 6px，凑齐左侧 gap-3 的 12px。
      const copy = empty.querySelector('span[slot="description"]')
      expect(copy?.getAttribute('class')).toBe('mt-1.5 grid gap-3 max-[640px]:mt-0.5 max-[640px]:gap-2')

      const lines = [...(copy?.querySelectorAll('span') ?? [])]
      expect(lines.map(line => line.textContent?.trim())).toEqual([
        '暂无待添加资源',
        '添加的资源会显示在这里，可先修改名称和标签'
      ])
      expect(lines[0]?.getAttribute('class')).toBe(
        'block text-[15px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) max-[640px]:text-[13px]'
      )
      expect(lines[1]?.getAttribute('class')).toBe(
        'block text-xs leading-[1.4] text-[#6a6a6a] dark:text-(--wui-color-text-secondary) max-[640px]:text-[11px]'
      )
    } finally {
      mounted.close()
    }
  })

  it('有队列项时右侧渲染列表且不残留空态', async () => {
    const mounted = mountDialog([queueItem()])

    try {
      await nextTick()
      const aside = mounted.host.querySelector('aside[aria-labelledby="library-add-queue-title"]')
      expect(aside?.querySelector('web-ui-empty')).toBeNull()
      expect(aside?.querySelectorAll('ol > li')).toHaveLength(1)
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

  it('图片项按队列顺序打开预览，桌面启用 toolbar 且非图片项不响应', async () => {
    const first = queueItem({ id: 'first', title: '第一张', location: '/tmp/first.png' })
    const video = queueItem({
      id: 'video',
      resourceKind: ResourceKind.ResourceKindVideo,
      title: '待添加视频',
      location: '/tmp/movie.mp4',
      previewToken: 'video-token',
      mediaUrl: '/pending-resource-media/video-token'
    })
    const second = queueItem({
      id: 'second',
      title: '第二张',
      location: '/tmp/second.png',
      previewToken: 'second-token',
      mediaUrl: '/pending-resource-media/second-token'
    })
    const handle = previewHandle()
    openPreview.mockReturnValue(handle)
    const mounted = mountDialog([first, video, second])

    try {
      await nextTick()
      const thumbnails = [...mounted.host.querySelectorAll<HTMLElement>('[data-queue-thumbnail]')]
      const [firstThumbnail, videoThumbnail, secondThumbnail] = thumbnails
      if (!firstThumbnail || !videoThumbnail || !secondThumbnail) throw new Error('queue thumbnails were not rendered')

      expect(firstThumbnail.tagName).toBe('BUTTON')
      expect(firstThumbnail.getAttribute('type')).toBe('button')
      expect(firstThumbnail.getAttribute('aria-label')).toBe('预览 第一张')
      expect(videoThumbnail.tagName).toBe('DIV')

      videoThumbnail.click()
      expect(openPreview).not.toHaveBeenCalled()

      secondThumbnail.click()
      expect(openPreview).toHaveBeenCalledOnce()
      expect(openPreview).toHaveBeenCalledWith({
        images: [
          { src: '/pending-resource-media/opaque-token', alt: '第一张' },
          { src: '/pending-resource-media/second-token', alt: '第二张' }
        ],
        index: 1,
        target: secondThumbnail,
        toolbar: true,
        swipe: false
      })
    } finally {
      mounted.close()
    }
  })

  it('移动端图片预览启用 swipe、关闭 toolbar，并在添加资源 dialog 关闭时释放句柄', async () => {
    const item = queueItem()
    const handle = previewHandle()
    openPreview.mockReturnValue(handle)
    const mounted = mountDialog([item], {}, { mobile: true })

    try {
      await nextTick()
      const thumbnail = mounted.host.querySelector<HTMLElement>('[data-queue-thumbnail]')
      if (!thumbnail) throw new Error('queue thumbnail was not rendered')

      thumbnail.click()
      expect(openPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [{ src: '/pending-resource-media/opaque-token', alt: '待添加图片' }],
          index: 0,
          toolbar: false,
          swipe: true
        })
      )

      await mounted.setOpen(false)
      expect(handle.close).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
    }
  })
})
