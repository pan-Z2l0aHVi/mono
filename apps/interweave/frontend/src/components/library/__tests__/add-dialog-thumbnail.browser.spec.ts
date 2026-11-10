import '../../../assets/global.css'
// 图片 complete 语义与真实 load/error 事件只在真实浏览器成立，jsdom 无法覆盖。
import '@greypan/web-ui'

import type { WebUiButton } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem } from '../../../services/library'
import AddDialog from '../AddDialog.vue'
import EditTagsDialog from '../EditTagsDialog.vue'
import RestoreDialog from '../RestoreDialog.vue'

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

function expectFocusRingFits(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const margins: number[] = []
  let ancestor: Element | null = element
  while (ancestor) {
    const root = ancestor.getRootNode()
    ancestor = ancestor.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
    if (!(ancestor instanceof HTMLElement)) continue
    const style = getComputedStyle(ancestor)
    const bounds = ancestor.getBoundingClientRect()
    if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
      margins.push(rect.left - bounds.left, bounds.right - rect.right)
    }
    if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) {
      margins.push(rect.top - bounds.top, bounds.bottom - rect.bottom)
    }
  }
  expect(margins.length).toBeGreaterThan(0)
  expect(Math.min(...margins)).toBeGreaterThanOrEqual(5)
}

describe('AddDialog 队列缩略图（真实浏览器）', () => {
  it('上传区、粘贴和队列操作的焦点环有完整显示空间', async () => {
    const host = mountDialog([queueItem()])
    await nextTick()
    const drop = host.querySelector<HTMLButtonElement>('[data-file-drop-target="library-add-files"]')!
    const buttons = [...host.querySelectorAll<WebUiButton>('web-ui-button')].filter(button =>
      ['粘贴复制的文件', '编辑名称', '编辑标签', '移除待添加资源'].includes(button.getAttribute('aria-label') ?? '')
    )
    expect(buttons).toHaveLength(4)
    await waitFor(() => buttons.every(button => !!button.shadowRoot?.querySelector('button')), '按钮已渲染')
    expectFocusRingFits(drop)
    for (const button of buttons) expectFocusRingFits(button.shadowRoot!.querySelector('button')!)
  })

  it('找回资源的长标题和原链接换行，新链接输入框保留焦点环空间', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    const title = 'long-title-'.repeat(20)
    const location = `https://example.com/${'long-path-'.repeat(20)}`
    const app = createApp({
      render: () =>
        h(RestoreDialog, {
          open: true,
          queue: [
            {
              id: 'source',
              sourceId: 'source',
              resourceId: 'resource',
              resourceTitle: title,
              kind: 'url',
              location,
              replacementLocation: location
            }
          ],
          busy: false,
          error: '',
          mobile: false,
          activeItemId: null
        })
    })
    apps.push(app)
    app.mount(host)
    await nextTick()
    const name = [...host.querySelectorAll('span')].find(element => element.textContent?.trim() === title)!
    const path = host.querySelector<HTMLElement>(`[title="${location}"]`)!
    const input = host.querySelector<HTMLElement>('web-ui-input')!
    await waitFor(() => input.getBoundingClientRect().height > 0, '找回输入框已渲染')
    expect(name.getBoundingClientRect().height).toBeGreaterThan(25)
    expect(path.getBoundingClientRect().height).toBeGreaterThan(20)
    input.shadowRoot!.querySelector('input')!.focus()
    await waitFor(() => {
      const viewport = input.closest('[data-overlayscrollbars-viewport]')
      return !!viewport && input.getBoundingClientRect().bottom <= viewport.getBoundingClientRect().bottom - 5
    }, '聚焦时输入框滚入可见区域')
    expectFocusRingFits(input)
  })

  it('Tab 可依次到达待添加资源的操作按钮', async () => {
    const host = mountDialog([queueItem()])
    await nextTick()
    const edit = host.querySelector<WebUiButton>('web-ui-button[aria-label="编辑名称"]')!
    const tags = host.querySelector<WebUiButton>('web-ui-button[aria-label="编辑标签"]')!
    const remove = host.querySelector<WebUiButton>('web-ui-button[aria-label="移除待添加资源"]')!
    await waitFor(() => !!edit.shadowRoot?.querySelector('button'), '操作按钮已渲染')
    edit.shadowRoot!.querySelector('button')!.focus()
    await userEvent.tab()
    expect(tags.shadowRoot?.activeElement?.tagName).toBe('BUTTON')
    await userEvent.tab()
    expect(remove.shadowRoot?.activeElement?.tagName).toBe('BUTTON')
  })

  it('标签输入后 Tab 能到达添加和底部按钮', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    const app = createApp({
      render: () =>
        h(EditTagsDialog, { open: true, target: queueItem(), allTagNames: [], tagColors: {}, busy: false, error: '' })
    })
    apps.push(app)
    app.mount(host)
    await nextTick()
    const input = host.querySelector('web-ui-input')!
    await waitFor(() => !!input.shadowRoot?.querySelector('input'), '标签输入框已渲染')
    input.shadowRoot!.querySelector('input')!.focus()
    await userEvent.keyboard('tag')
    await nextTick()
    const add = host.querySelector<WebUiButton>('web-ui-button[aria-label="确认添加标签"]')!
    await userEvent.tab()
    expect(add.shadowRoot?.activeElement?.tagName).toBe('BUTTON')
    await userEvent.tab()
    const save = [...host.querySelectorAll<WebUiButton>('web-ui-button')].find(
      button => button.textContent?.trim() === '更新标签'
    )!
    expect(save.shadowRoot?.activeElement?.tagName).toBe('BUTTON')
  })

  it('长名称和路径完整换行，编辑名称仍可操作', async () => {
    const title = 'long-name-'.repeat(16)
    const location = `/tmp/${'long-path-'.repeat(20)}file.png`
    const host = mountDialog([queueItem({ title, location })])
    await nextTick()
    const name = [...host.querySelectorAll('span')].find(element => element.textContent?.trim() === title)!
    const path = host.querySelector<HTMLElement>(`[title="${location}"]`)!
    await waitFor(() => name.getBoundingClientRect().height > 0, '名称可见')
    const before = name.getBoundingClientRect()
    const beforeRow = name.closest('li')!.getBoundingClientRect()
    expect(name.getBoundingClientRect().height).toBeGreaterThan(25)
    expect(path.getBoundingClientRect().height).toBeGreaterThan(20)
    expect(path.scrollWidth).toBeLessThanOrEqual(path.clientWidth + 1)
    const edit = host.querySelector<WebUiButton>('web-ui-button[aria-label="编辑名称"]')!
    edit.click()
    await waitFor(() => !!host.querySelector('web-ui-editable-text'), '进入名称编辑')
    const editor = host.querySelector('web-ui-editable-text')!
    await waitFor(() => editor.hasAttribute('editing'), '名称编辑器获得焦点')
    const after = editor.getBoundingClientRect()
    expect(after.height).toBeCloseTo(before.height, 0)
    const afterRow = editor.closest('li')!.getBoundingClientRect()
    expect(after.top - afterRow.top).toBeCloseTo(before.top - beforeRow.top, 0)
    expect(after.left).toBeCloseTo(before.left, 0)
  })

  it('短标题右侧依次显示编辑名称、标签和删除操作', async () => {
    const host = mountDialog([queueItem({ title: '短名称' })])
    await nextTick()
    const actions = ['编辑名称', '编辑标签', '移除待添加资源'].map(label =>
      host.querySelector<HTMLElement>(`web-ui-button[aria-label="${label}"]`)!
    )
    expect(actions.every(Boolean)).toBe(true)
    expect(actions[0]!.getBoundingClientRect().right).toBeLessThanOrEqual(actions[1]!.getBoundingClientRect().left)
    expect(actions[1]!.getBoundingClientRect().right).toBeLessThanOrEqual(actions[2]!.getBoundingClientRect().left)
    const name = [...host.querySelectorAll('span')].find(element => element.textContent?.trim() === '短名称')!
    const rect = name.getBoundingClientRect()
    const action = actions[0]!.getBoundingClientRect()
    expect(Math.abs((rect.top + rect.bottom) / 2 - (action.top + action.bottom) / 2)).toBeLessThan(2)
  })

  it('空队列的左右标题在同一水平线上', async () => {
    const original = { width: window.innerWidth, height: window.innerHeight }
    try {
      await page.viewport(1280, 800)
      await waitFor(() => window.innerWidth === 1280, '桌面视口生效')
      const host = mountDialog([])
      await nextTick()
      const empties = [...host.querySelectorAll<HTMLElement>('web-ui-empty')]
      expect(empties).toHaveLength(2)
      await waitFor(() => empties.every(empty => !!empty.shadowRoot?.querySelector('.empty-title')), '空状态已渲染')
      const titles = empties.map(empty => empty.shadowRoot!.querySelector('.empty-title')!.getBoundingClientRect())
      expect(Math.abs(titles[0]!.top - titles[1]!.top)).toBeLessThan(2)
    } finally {
      await page.viewport(original.width, original.height)
    }
  })

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
