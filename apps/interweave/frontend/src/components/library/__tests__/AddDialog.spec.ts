// @vitest-environment jsdom

import type { ImagePreviewHandle, ImagePreviewOptions, WebUiButton, WebUiEditableText } from '@greypan/web-ui'
import { imagePreview } from '@greypan/web-ui'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import {
  ResourceKind,
  TagColor
} from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../../services/library'
import AddDialog from '../AddDialog.vue'

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
    onRequestFilePaths?: (clipboardText?: string) => void
  } = {},
  options: { mobile?: boolean; open?: boolean; tagColors?: Record<string, TagColor> } = {}
) {
  const host = document.createElement('div')
  document.body.append(host)
  const open = ref(options.open ?? true)
  const app = createApp({
    render: () =>
      h(AddDialog, {
        open: open.value,
        queue,
        busy: false,
        error: '',
        mobile: options.mobile ?? false,
        tagColors: options.tagColors ?? {},
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

describe('AddDialog', () => {
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

  it('链接项的编辑框从显示的主机名起步，没改就不算改名', async () => {
    const linkItem = queueItem({
      id: 'link-item',
      kind: 'url',
      resourceKind: ResourceKind.ResourceKindWeb,
      title: '',
      location: 'https://example.com/article',
      previewToken: null,
      mediaUrl: null
    })
    const rename = vi.fn<(itemId: string, title: string) => void>()
    const mounted = mountDialog([linkItem], { onRename: rename })

    try {
      await nextTick()
      expect(mounted.host.textContent).toContain('example.com')

      button(mounted.host, '编辑名称').click()
      await nextTick()
      await nextTick()
      const editor = mounted.host.querySelector<WebUiEditableText>('web-ui-editable-text')
      if (!editor) throw new Error('编辑态未渲染')
      expect(editor.value).toBe('example.com')

      editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await nextTick()
      expect(rename).not.toHaveBeenCalled()

      button(mounted.host, '编辑名称').click()
      await nextTick()
      await nextTick()
      const renamed = mounted.host.querySelector<WebUiEditableText>('web-ui-editable-text')
      if (!renamed) throw new Error('编辑态未渲染')
      renamed.value = '我起的名字'
      renamed.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await nextTick()
      expect(rename).toHaveBeenCalledExactlyOnceWith('link-item', '我起的名字')
    } finally {
      mounted.close()
    }
  })

  /*
   * 回归（#188）：paste 事件原先只派发 requestFilePaths、不带剪贴板文本，页面拿不到
   * 链接。工具栏按钮那条路径本来就没有文本（走 OS 剪贴板文件接口），因此只有事件路径
   * 需要把文本带上去。
   */
  it('paste 事件把剪贴板文本交给页面，弹窗关闭时不响应', async () => {
    const requestFilePaths = vi.fn<(clipboardText?: string) => void>()
    const mounted = mountDialog([], { onRequestFilePaths: requestFilePaths })

    function paste(text: string) {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
      window.dispatchEvent(event)
    }

    try {
      await nextTick()
      paste('https://example.com/article')
      expect(requestFilePaths).toHaveBeenCalledExactlyOnceWith('https://example.com/article')

      await mounted.setOpen(false)
      paste('https://example.com/other')
      expect(requestFilePaths).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
    }
  })

  /*
   * 回归：监听器在 window 上，而编辑控件封在 web-ui 的 shadow 里（editable-text 的编辑层
   * 是 shadow 内的 <textarea>）。paste 是 composed 的，冒到 window 时 event.target 已被
   * retarget 成 shadow host，host 上的 closest() 不跨 shadow 边界——守卫漏掉真正的编辑
   * 控件，「在名称里按 Cmd+V」会当成往队列里粘贴，把剪贴板里的链接也顺带入队。
   */
  it('shadow 内的编辑控件里粘贴不触发入队', async () => {
    const requestFilePaths = vi.fn<(clipboardText?: string) => void>()
    const mounted = mountDialog([], { onRequestFilePaths: requestFilePaths })

    try {
      await nextTick()
      const host = document.createElement('div')
      const textarea = document.createElement('textarea')
      host.attachShadow({ mode: 'open' }).append(textarea)
      mounted.host.append(host)

      // composed 必须开：真实 paste 是 composed 的，事件要真的穿过 shadow 边界冒到
      // window 上，否则事件停在 shadow root 里，守卫压根没被调用，这条用例会空转。
      const event = new Event('paste', { bubbles: true, composed: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'https://example.com/pasted' } })
      textarea.dispatchEvent(event)

      expect(requestFilePaths).not.toHaveBeenCalled()
    } finally {
      mounted.close()
    }
  })

  it('左侧说明同时覆盖文件与链接两种入口', async () => {
    const mounted = mountDialog([])

    try {
      await nextTick()
      const hint = [...mounted.host.querySelectorAll('p')].find(candidate =>
        candidate.textContent?.includes('支持拖入或粘贴')
      )
      expect(hint?.textContent).toContain('远程链接')
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

  it('点编辑标签把目标队列项传给编辑事件', async () => {
    const item = queueItem({ tags: ['设计'] })
    const editTags = vi.fn<(target: LibraryQueueItem) => void>()
    const mounted = mountDialog([item], { onEditTags: editTags }, { tagColors: { 设计: TagColor.TagColorBlue } })

    try {
      await nextTick()
      const editButton = button(mounted.host, '编辑标签')
      expect(editButton.disabled).toBe(false)

      editButton.click()
      expect(editTags).toHaveBeenCalledOnce()
      expect(editTags).toHaveBeenCalledWith(item)
    } finally {
      mounted.close()
    }
  })

  it('队列里尚未落库的标签与已登记颜色的标签渲染成不同 chip', async () => {
    // 队列里的标签还没进库，本来就没有颜色；给它按名称套色会让预览与落库后的
    // 真实颜色对不上。这里只钉「两者渲染结果不同」，不钉具体色值。
    const mounted = mountDialog(
      [queueItem({ tags: ['设计', '待创建'] })],
      {},
      { tagColors: { 设计: TagColor.TagColorPink } }
    )

    try {
      await nextTick()
      const classOf = (name: string) =>
        [...mounted.host.querySelectorAll('li span')]
          .find(candidate => candidate.textContent?.trim() === name)
          ?.getAttribute('class')

      expect(classOf('设计')).toBeTruthy()
      expect(classOf('待创建')).toBeTruthy()
      expect(classOf('设计')).not.toBe(classOf('待创建'))
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

  /*
   * 高度契约：`--wui-dialog-max-height` 的语义已从「整卡高度」改成「内容区高度」，
   * 上限改由 web-ui-dialog 内部的 `.desc` 承担。宿主因此不再复述 chrome 常数——
   * 旧写法 `calc(var(--wui-dialog-max-height) - 108px)` 里的 108 含 footer 的
   * --wui-control-size，触摸端媒体查询把它从 36 抬到 40 后立刻失配。
   *
   * 这条只断言声明本身，不做布局断言：jsdom 没有布局引擎，解不出 Tailwind 任意值里
   * 的 calc。真实几何由浏览器验证与 packages/web-ui 的
   * dialog-content-height.browser.spec.ts 覆盖。
   */
  it('内容区高度由 --wui-dialog-max-height 决定，内层不再复述 chrome 常数', async () => {
    const mounted = mountDialog([queueItem()])

    try {
      await nextTick()

      const dialog = mounted.host.querySelector('web-ui-dialog')
      if (!dialog) throw new Error('web-ui-dialog was not rendered')

      // token 语义已从「整卡高度」改成「内容区高度」，上限改由 web-ui-dialog 内部的
      // .desc 承担，宿主因此不再复述 chrome 常数。这里只断言内层引用 token 而非写死
      // 像素：具体高度由浏览器取证与 packages/web-ui 的 dialog-content-height 覆盖。
      const inner = [...mounted.host.querySelectorAll<HTMLElement>('[style]')].find(el =>
        el.style.height.includes('--wui-dialog-max-height')
      )
      if (!inner) throw new Error('inner grid was not rendered')
      expect(inner.style.height).toBe('var(--wui-dialog-max-height)')
      // 回归护栏：旧的 chrome 常数不得复活（那会让内容区在窄屏下被压扁）。
      expect(inner.style.height).not.toMatch(/\d+px/)
    } finally {
      mounted.close()
    }
  })
})
