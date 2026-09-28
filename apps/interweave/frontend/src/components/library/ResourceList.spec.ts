// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import ResourceList from './ResourceList.vue'

function resource(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'r1',
    title: '一条资源',
    note: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    sources: [
      {
        id: 's1',
        type: 'file',
        location: '/tmp/a.png',
        available: true,
        isPreferred: true,
        orderIndex: 0,
        metadata: null
      }
    ],
    preferred: null,
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 1024,
    ...overrides
  }
}

async function mountList(resources: ResourceView[], checkedIds: string[] = []) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(ResourceList, {
        resources,
        activeResourceId: null,
        checkedIds,
        selectionMode: checkedIds.length > 0,
        editingNameKey: null,
        editorRef: () => () => {},
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '没有符合条件的资源',
        mediaUrlFor: () => null
      })
  })
  app.mount(host)
  await nextTick()
  return {
    host,
    rows: [...host.querySelectorAll('[data-resource-row]')],
    contextMenu: host.querySelector('web-ui-context-menu'),
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

/*
 * Tailwind 在 jsdom 里不生效，computed style 读不到圆角，所以断言行上的圆角类名。
 * 读成「上/下是否直角」而不是整串类名：类名拼写是实现，这两侧直不直才是行为。
 */
function cornersOf(row: Element) {
  const tokens = row.className.split(/\s+/)
  const flat = tokens.includes('rounded-none')
  return {
    top: flat || tokens.includes('rounded-t-none'),
    bottom: flat || tokens.includes('rounded-b-none')
  }
}

describe('ResourceList', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 bridge 的空资源列表渲染空态', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h(ResourceList, {
          resources: [],
          activeResourceId: null,
          checkedIds: [],
          selectionMode: false,
          editingNameKey: null,
          editorRef: () => () => {},
          loading: false,
          runtimeAvailable: false,
          emptyDescription: '资源库还是空的',
          mediaUrlFor: () => null
        })
    })

    try {
      app.mount(host)
      await nextTick()

      const empty = host.querySelector('web-ui-empty')
      expect(empty?.getAttribute('size')).toBe('large')
      expect(empty?.getAttribute('title')).toBe('桌面服务未连接')
      expect(empty?.getAttribute('description')).toBe('资源库还是空的')
    } finally {
      app.unmount()
      host.remove()
    }
  })

  /*
   * 回归：空列表曾能弹出右键菜单。context-menu 监听宿主自己的 contextmenu，而空态区域
   * 就在这个宿主里，所以右键照样命中；此时 contextResource 为 null，弹出的只是一张
   * 空壳菜单。disabled 是 web-ui 侧既有的开关（其 spec 覆盖 disabled 时右键不打开），
   * 这里钉住 app 侧绑对了。
   */
  it('列表为空时禁用右键菜单，有条目时不禁用', async () => {
    const empty = await mountList([])
    try {
      expect(empty.host.querySelectorAll('[data-resource-row]')).toHaveLength(0)
      expect(empty.contextMenu?.hasAttribute('disabled')).toBe(true)
    } finally {
      empty.unmount()
    }

    const filled = await mountList([resource()])
    try {
      expect(filled.host.querySelectorAll('[data-resource-row]')).toHaveLength(1)
      expect(filled.contextMenu?.hasAttribute('disabled')).toBe(false)
    } finally {
      filled.unmount()
    }
  })

  it('相邻选中行交出相接的直角，让选区连成一片', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const mounted = await mountList(
      ids.map(id => resource({ id })),
      ['b', 'c', 'd']
    )
    try {
      expect(mounted.rows.map(cornersOf)).toEqual([
        { top: false, bottom: false }, // a 未选中
        { top: false, bottom: true }, // b 上圆下直
        { top: true, bottom: true }, // c 两侧都挨着
        { top: true, bottom: false }, // d 上直下圆
        { top: false, bottom: false } // e 未选中
      ])
    } finally {
      mounted.unmount()
    }
  })

  it('被选中的行不连续时各自保持完整圆角', async () => {
    const mounted = await mountList(
      ['a', 'b', 'c'].map(id => resource({ id })),
      ['a', 'c']
    )
    try {
      expect(mounted.rows.map(cornersOf)).toEqual([
        { top: false, bottom: false },
        { top: false, bottom: false },
        { top: false, bottom: false }
      ])
    } finally {
      mounted.unmount()
    }
  })

  it('邻居选中不会波及未选中的行', async () => {
    const mounted = await mountList(
      ['a', 'b', 'c'].map(id => resource({ id })),
      ['b']
    )
    try {
      expect(mounted.rows.map(cornersOf)).toEqual([
        { top: false, bottom: false },
        { top: false, bottom: false },
        { top: false, bottom: false }
      ])
    } finally {
      mounted.unmount()
    }
  })

  it('全选时只有首尾两行的外侧保留圆角', async () => {
    const mounted = await mountList(
      ['a', 'b', 'c'].map(id => resource({ id })),
      ['a', 'b', 'c']
    )
    try {
      expect(mounted.rows.map(cornersOf)).toEqual([
        { top: false, bottom: true },
        { top: true, bottom: true },
        { top: true, bottom: false }
      ])
    } finally {
      mounted.unmount()
    }
  })
})
