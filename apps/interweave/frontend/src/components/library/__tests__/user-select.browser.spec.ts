import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick, type VNode } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceView } from '../../../stores/library'
import ResourceList from '../ResourceList.vue'

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

function resource(): ResourceView {
  return {
    id: 'r1',
    title: '一条可以复制的资源标题',
    note: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    sources: [
      {
        id: 's1',
        type: 'url',
        location: 'https://example.com/article',
        available: true,
        isPreferred: true,
        orderIndex: 0,
        mediaUrl: null,
        thumbnailUrl: null,
        metadata: null
      }
    ],
    preferred: null,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindWeb,
    sizeBytes: null
  }
}

async function mountList(selectionMode: boolean) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 900px; height: 600px'
  document.body.append(host)
  hosts.push(host)

  const app = createApp({
    render: (): VNode =>
      h(ResourceList, {
        resources: [resource()],
        activeResourceId: null,
        checkedIds: [],
        selectionMode,
        editingNameKey: null,
        editorRef: () => () => {},
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '没有符合条件的资源',
        resolveDefaultOpenWith: () => Promise.resolve(''),
        onActivate: () => {}
      })
  })
  app.mount(host)
  await nextTick()
  // virtua 的窗口测量要跨过首帧与 ResizeObserver 回调，等行真正渲染出来再读样式。
  const title = await waitForElement(host, 'web-ui-middle-ellipsis')

  return {
    host,
    container: host.querySelector<HTMLElement>('[role="list"]'),
    title,
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

async function waitForElement(host: HTMLElement, selector: string): Promise<HTMLElement | null> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const element = host.querySelector<HTMLElement>(selector)
    if (element) return element
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
  }
  return null
}

/*
 * 选中策略是层叠契约：jsdom 不继承、不算层叠，只有在真实浏览器里读 computed 值才算数。
 * 浏览态列表内容文本可选中（标题能拖选/复制）；进入多选态后整行变成控件，drag sweep
 * 与文本选择是同一手势，此时列表容器与标题一起禁选。
 */
describe('资源列表：选中策略（真实读数，浏览器）', () => {
  it('浏览态标题与列表都不禁选，标题按文本语义可选', async () => {
    const mounted = await mountList(false)
    try {
      expect(mounted.container).toBeTruthy()
      expect(mounted.title).toBeTruthy()
      expect(getComputedStyle(mounted.container!).userSelect).not.toBe('none')
      expect(getComputedStyle(mounted.container!).webkitUserSelect).not.toBe('none')
      expect(getComputedStyle(mounted.title!).userSelect).not.toBe('none')
    } finally {
      mounted.unmount()
    }
  })

  it('多选态列表容器与行标题一起禁选，避免 drag sweep 选中文字', async () => {
    const mounted = await mountList(true)
    try {
      expect(getComputedStyle(mounted.container!).userSelect).toBe('none')
      expect(getComputedStyle(mounted.title!).userSelect).toBe('none')
      expect(getComputedStyle(mounted.container!).cursor).toBe('default')
    } finally {
      mounted.unmount()
    }
  })
})
