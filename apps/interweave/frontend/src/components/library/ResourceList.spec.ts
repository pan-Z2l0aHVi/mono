// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import ResourceList from './ResourceList.vue'

// 右键菜单的渲染由 web-ui 自己接管，单测只需要它有这两个接口。detail 那一项的用例
// 要真的走一遍「右键唤起 → 点详情」。
if (!customElements.get('web-ui-context-menu')) {
  customElements.define(
    'web-ui-context-menu',
    class extends HTMLElement {
      openAt() {}
      close() {}
    }
  )
}

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

async function mountList(
  resources: ResourceView[],
  checkedIds: string[] = [],
  overrides: Record<string, unknown> = {},
  handlers: Record<string, unknown> = {}
) {
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
        mediaUrlFor: () => null,
        ...overrides,
        ...handlers
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
 * jsdom 不实现 elementFromPoint，扫选「划到哪一行」全靠它现查。桩成由用例指定当前
 * 命中的行：这里要验的是「命中之后哪些行被置成什么状态」，不是命中算法本身。
 */
function stubHitTest() {
  const original = document.elementFromPoint
  let current: Element | null = null
  document.elementFromPoint = () => current
  return {
    pointAt(element: Element | null) {
      current = element
    },
    restore() {
      if (original) document.elementFromPoint = original
      else delete (document as { elementFromPoint?: unknown }).elementFromPoint
    }
  }
}

/** jsdom 没有 PointerEvent，用 MouseEvent 补上扫选要读的那几个字段。 */
function pointer(type: string, init: Record<string, unknown> = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
  Object.defineProperty(event, 'pointerType', { value: 'mouse' })
  Object.defineProperty(event, 'isPrimary', { value: true })
  return event
}

function menuItem(host: HTMLElement, label: string) {
  const found = [...host.querySelectorAll('web-ui-dropdown-item')].find(node => node.textContent?.trim() === label)
  if (!found) throw new Error(`右键菜单里没有「${label}」项`)
  return found
}

type SetChecked = (resourceId: string, checked: boolean) => void
type RowHandler = (resource: ResourceView) => void

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
      expect(empty?.getAttribute('size')).toBe('72')
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

describe('ResourceList：按住拖动批量勾选', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('从未选中的行按住划过，划过的行全部勾上', async () => {
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b', 'c', 'd'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      hit.pointAt(mounted.rows[1])
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2 }))
      hit.pointAt(mounted.rows[2])
      window.dispatchEvent(pointer('pointermove', { clientX: 3, clientY: 3 }))
      window.dispatchEvent(pointer('pointerup'))

      expect(setChecked.mock.calls).toEqual([
        ['a', true],
        ['b', true],
        ['c', true]
      ])
      // 方向取自首个行：d 从未被划到，不该被动过
      expect(setChecked.mock.calls.filter(([id]) => id === 'd')).toHaveLength(0)
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  it('从已选中的行按住划过，划过的行全部取消勾选', async () => {
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b', 'c', 'd'].map(id => resource({ id })),
      ['b'],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[1].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      hit.pointAt(mounted.rows[2])
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2 }))
      hit.pointAt(mounted.rows[3])
      window.dispatchEvent(pointer('pointermove', { clientX: 3, clientY: 3 }))
      window.dispatchEvent(pointer('pointerup'))

      expect(setChecked.mock.calls).toEqual([
        ['b', false],
        ['c', false],
        ['d', false]
      ])
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  /*
   * 回归：扫选改的是状态而不是翻状态。同一行被来回划到两次，末位必须还是目标状态；
   * 翻状态的写法这里会变成 false，勾选凭空弹回去。
   */
  it('同一行被反复划到时保持目标状态，不会自己弹回去', async () => {
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      for (const index of [1, 0, 1, 0]) {
        hit.pointAt(mounted.rows[index])
        window.dispatchEvent(pointer('pointermove', { clientX: index, clientY: index }))
      }
      window.dispatchEvent(pointer('pointerup'))

      const lastForRow = (id: string) => setChecked.mock.calls.filter(([resourceId]) => resourceId === id).at(-1)?.[1]
      expect(lastForRow('a')).toBe(true)
      expect(lastForRow('b')).toBe(true)
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  /*
   * 回归：扫选收尾时浏览器会补一个 click。它若照常走到 select，选择态下就会在落点
   * 那一行上再翻一次，把刚划出来的结果推翻。
   */
  it('扫选结束后补上的 click 不再翻一次状态', async () => {
    const select = vi.fn<RowHandler>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSelect: select }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      window.dispatchEvent(pointer('pointerup'))
      mounted.rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(select).not.toHaveBeenCalled()
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  it('非选择态下 pointerdown 不启动扫选，行点击照旧交给 select', async () => {
    const setChecked = vi.fn<SetChecked>()
    const select = vi.fn<RowHandler>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: false },
      { onSetChecked: setChecked, onSelect: select }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      hit.pointAt(mounted.rows[1])
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2 }))
      window.dispatchEvent(pointer('pointerup'))

      expect(setChecked).not.toHaveBeenCalled()

      mounted.rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(select).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'b' }))
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  it('右键按下不启动扫选，把手势让给右键菜单', async () => {
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 2, clientX: 1, clientY: 1 }))
      hit.pointAt(mounted.rows[1])
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2 }))
      window.dispatchEvent(pointer('pointerup'))

      expect(setChecked).not.toHaveBeenCalled()
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  it('勾选框上的按下不参与扫选，免得和它自己的 click 打架', async () => {
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      const checkbox = mounted.rows[0].querySelector('web-ui-checkbox')
      if (!checkbox) throw new Error('选择态下没有勾选框')
      checkbox.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      hit.pointAt(mounted.rows[1])
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 2 }))
      window.dispatchEvent(pointer('pointerup'))

      expect(setChecked).not.toHaveBeenCalled()
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })
})

describe('ResourceList：右键菜单的详情入口', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('资源可用时，详情排在预览与打开方式之后', async () => {
    const detail = vi.fn<RowHandler>()
    const preview = vi.fn<RowHandler>()
    const mounted = await mountList([resource()], [], {}, { onDetail: detail, onPreview: preview })
    try {
      mounted.rows[0].dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
      )
      await nextTick()

      const labels = [...mounted.host.querySelectorAll('web-ui-dropdown-item')].map(node => node.textContent?.trim())
      // 打开方式是子菜单，它的子项在 querySelectorAll 的文档序里也占位，
      // 所以详情要排在「打开方式」这棵子树之后，而不是紧邻它。
      expect(labels.indexOf('详情')).toBeGreaterThan(labels.indexOf('打开方式'))
      // 详情与重命名之间是一道分隔线，所以两者在项序上相邻。
      expect(labels.indexOf('重命名')).toBe(labels.indexOf('详情') + 1)

      menuItem(mounted.host, '详情').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(detail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'r1' }))
      expect(preview).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('资源不可用时没有预览，但详情仍留着', async () => {
    const missing: ResourceSourceView = {
      id: 's1',
      type: 'file',
      location: '/tmp/gone.png',
      available: false,
      isPreferred: true,
      orderIndex: 0,
      metadata: null
    }
    const mounted = await mountList([resource({ available: false, sources: [missing] })])
    try {
      mounted.rows[0].dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
      )
      await nextTick()

      const labels = [...mounted.host.querySelectorAll('web-ui-dropdown-item')].map(node => node.textContent?.trim())
      expect(labels).not.toContain('预览')
      // 打开详情才会探测失效入口、也才够得着备注和来源，所以它不能跟着预览一起消失
      expect(labels).toContain('详情')
      expect(labels).toContain('找回资源')
    } finally {
      mounted.unmount()
    }
  })
})

describe('ResourceList：右键菜单项的搬运包装', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /**
   * 回归两件事，都不是结构偏好：
   *
   * 一，菜单项必须收在同一个 wrapper 里。菜单打开时组件把项搬进自己的 portal 面板，
   * 关闭时再搬回来，而搬回要等退场动画。这段窗口里再右键另一行，v-if 就会在面板里增删
   * 节点，和组件自己的锚点搬运撞上，v-if 注释锚点被丢在错位处——实测后果是菜单只剩几项，
   * 且锚点丢失后无法自愈，菜单从此再也打不开。收进 wrapper 后组件搬的是「整块」，锚点
   * 不可能与项走散。
   *
   * 二，wrapper 必须带 slot="context-menu-hidden"。组件关闭时靠这个属性隐藏菜单项（宿主
   * 模板里只有默认 slot，名字对不上的节点不渲染），而 slot 分配只对**宿主的直接子节点**
   * 生效。项一旦被包进 wrapper 而 wrapper 漏了这个属性，项就成了默认 slot 分配节点的
   * 内部后代、不再是 slottable，隐藏失效，菜单项会以明文形式漏在列表下面。
   */
  it('所有菜单项收在带隐藏属性的 wrapper 里，wrapper 是宿主的直接子节点', async () => {
    const mounted = await mountList([resource()])
    try {
      const wrapper = mounted.host.querySelector('web-ui-context-menu > .contents')
      expect(wrapper).not.toBeNull()
      // 直接子节点才是 slottable，挂在更深的位置这个属性就不起作用了
      expect(wrapper?.parentElement?.tagName).toBe('WEB-UI-CONTEXT-MENU')
      expect(wrapper?.getAttribute('slot')).toBe('context-menu-hidden')
      // 项全在 wrapper 内，组件搬整块时不会漏下任何一个
      const inside = wrapper?.querySelectorAll('web-ui-dropdown-item').length ?? 0
      const total = mounted.host.querySelectorAll('web-ui-context-menu > web-ui-dropdown-item').length
      expect(inside).toBeGreaterThan(0)
      expect(total).toBe(0)
    } finally {
      mounted.unmount()
    }
  })
})

function hover(element: Element, entered: boolean) {
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
describe('ResourceList：hover 行按空格预览', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('hover 任一行后按空格弹出该行预览，并吃掉空格默认的滚动', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList(
      [resource({ id: 'r1' }), resource({ id: 'r2', title: '第二条' })],
      [],
      {},
      { onPreview: preview }
    )

    try {
      hover(mounted.rows[1]!, true)
      const event = pressSpace()

      expect(preview).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'r2' }))
      expect(event.defaultPrevented).toBe(true)
    } finally {
      mounted.unmount()
    }
  })

  it('鼠标不在列表上时空格不拦截，交给页面滚动', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

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
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

    try {
      const element = mounted.rows[0]!
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
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

    try {
      hover(mounted.rows[0]!, true)
      pressSpace({ metaKey: true })

      expect(preview).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('Shift+空格不接管，向上滚一屏的手势留给页面', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

    try {
      hover(mounted.rows[0]!, true)
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
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

    try {
      hover(mounted.rows[0]!, true)
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
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

    try {
      const element = mounted.rows[0]!
      hover(element, true)
      // scroll 不冒泡，组件在 window 上按捕获阶段收；从行上派发最接近真实来源。
      element.dispatchEvent(new Event('scroll'))
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
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })

    try {
      const element = mounted.rows[0]!
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
    const mounted = await mountList([resource()], [], {}, { onPreview: preview })
    hover(mounted.rows[0]!, true)

    mounted.unmount()
    pressSpace()

    expect(preview).not.toHaveBeenCalled()
  })
})
