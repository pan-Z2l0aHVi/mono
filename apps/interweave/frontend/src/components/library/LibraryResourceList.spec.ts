// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import LibraryResourceList from './LibraryResourceList.vue'

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
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 1024,
    ...overrides
  }
}

async function mountList(resources: ResourceView[], listeners: { onPreview?: (resource: ResourceView) => void } = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(LibraryResourceList, {
        resources,
        activeResourceId: null,
        checkedIds: [],
        selectionMode: false,
        editingNameKey: null,
        editorRef: () => () => {},
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '没有符合条件的资源',
        mediaUrlFor: () => null,
        ...listeners
      })
  })
  app.mount(host)
  await nextTick()
  return {
    host,
    contextMenu: host.querySelector('web-ui-context-menu'),
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

function row(host: HTMLElement, index = 0) {
  const element = host.querySelectorAll<HTMLElement>('[data-resource-row]')[index]
  if (!element) throw new Error(`row ${index} not found`)
  return element
}

function hover(element: HTMLElement, entered: boolean) {
  element.dispatchEvent(new MouseEvent(entered ? 'mouseenter' : 'mouseleave'))
}

function pressSpace(init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true, ...init })
  window.dispatchEvent(event)
  return event
}

/*
 * #187：hover 行 + 空格预览。
 *
 * 按已确认的决定做成纯鼠标的隐藏入口（不引入焦点管理），因此拦截范围必须收在「本列表
 * 当前有 hover 行」这一个条件上：鼠标不在行上、带修饰键、列表滚动中都不接管。
 */
describe('LibraryResourceList：hover 行按空格预览', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hover 任一行后按空格弹出该行预览，并吃掉空格默认的滚动', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource({ id: 'r1' }), resource({ id: 'r2', title: '第二条' })], {
      onPreview: preview
    })

    try {
      hover(row(mounted.host, 1), true)
      const event = pressSpace()

      expect(preview).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'r2' }))
      expect(event.defaultPrevented).toBe(true)
    } finally {
      mounted.unmount()
    }
  })

  it('鼠标不在列表上时空格不拦截，交给页面滚动', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      const event = pressSpace()

      expect(preview).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  it('指针移出该行后空格恢复默认滚动', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      const element = row(mounted.host)
      hover(element, true)
      hover(element, false)
      const event = pressSpace()

      expect(preview).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  it('带修饰键的空格不接管', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      hover(row(mounted.host), true)
      pressSpace({ metaKey: true })

      expect(preview).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('Shift+空格不接管，向上滚一屏的手势留给页面', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      hover(row(mounted.host), true)
      const event = pressSpace({ shiftKey: true })

      expect(preview).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：编辑控件封在 web-ui 的 shadow 里（input 的 <input>、editable-text 的编辑层
   * <textarea>），它们的 keydown 是 composed 的，冒到 window 时 event.target 已被
   * retarget 成 shadow host。守卫若只看 target，搜索框和行内改名里打的空格会被本功能
   * 吃掉：查询词少一个词、改名打不出空格，还顺带弹一个预览抽屉。
   */
  it('shadow 内的编辑控件里按空格不接管，空格照常进控件', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      hover(row(mounted.host), true)
      const host = document.createElement('div')
      const textarea = document.createElement('textarea')
      host.attachShadow({ mode: 'open' }).append(textarea)
      mounted.host.append(host)

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true, cancelable: true })
      textarea.dispatchEvent(event)

      expect(preview).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  it('列表滚动期间不触发，滚动停下后恢复', async () => {
    vi.useFakeTimers()
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      hover(row(mounted.host), true)
      // scroll 不冒泡，组件在 window 上按捕获阶段收；从行上派发最接近真实来源。
      row(mounted.host).dispatchEvent(new Event('scroll'))
      pressSpace()
      expect(preview).not.toHaveBeenCalled()

      vi.advanceTimersByTime(200)
      pressSpace()

      expect(preview).toHaveBeenCalledOnce()
    } finally {
      mounted.unmount()
    }
  })

  it('右键打开菜单后 hover 态作废，空格不会从菜单背后再开预览', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })

    try {
      const element = row(mounted.host)
      hover(element, true)
      element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
      await nextTick()
      pressSpace()

      expect(preview).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('卸载后不再监听全局按键', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], { onPreview: preview })
    hover(row(mounted.host), true)

    mounted.unmount()
    pressSpace()

    expect(preview).not.toHaveBeenCalled()
  })
})

describe('LibraryResourceList', () => {
  it('无 bridge 的空资源列表渲染空态', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h(LibraryResourceList, {
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
})
