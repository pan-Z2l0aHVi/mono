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
function pointer(type: string, init: Record<string, unknown> = {}, pointerType = 'mouse') {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
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

  /*
   * 触摸长按是**扫选**的武装延迟，不是「长按预览」：触摸没有 hover，落指就武装会把「本来
   * 想滚动」误判成扫选，所以先按住不动等长按确认。预览早已不由 hover 或长按触发，但这条
   * 路径是选择态下唯一的批量勾选手势，钉住它免得被当成死代码清掉。
   */
  it('触摸按住不动到长按阈值，扫选武装并勾上首行', async () => {
    vi.useFakeTimers()
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 100, clientY: 100 }, 'touch'))
      // 还没到阈值：这一次按下只代表可能想滚动，不该武装
      expect(setChecked).not.toHaveBeenCalled()

      vi.advanceTimersByTime(400)
      expect(setChecked).toHaveBeenCalledExactlyOnceWith('a', true)
    } finally {
      vi.useRealTimers()
      mounted.unmount()
    }
  })

  it('触摸在长按确认前移动超阈值，判定为滚动而不是扫选', async () => {
    vi.useFakeTimers()
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 100, clientY: 100 }, 'touch'))
      hit.pointAt(mounted.rows[1])
      window.dispatchEvent(pointer('pointermove', { clientX: 140, clientY: 100 }, 'touch'))
      vi.advanceTimersByTime(400)

      expect(setChecked).not.toHaveBeenCalled()
    } finally {
      hit.restore()
      vi.useRealTimers()
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

/*
 * 键盘呼出右键菜单这条路的回归。web-ui-context-menu 自己在宿主元素上听 ContextMenu 键与
 * Shift+F10，并且只按 document.activeElement 的 rect 摆面板——它不看菜单项 gate 的
 * contextResource。contextResource 原本只有行上的 contextmenu 事件这一个赋值点，纯键盘
 * 呼出时它是 null，于是弹出一张紧贴该行、内容却只有「删除」和两条分隔线的菜单。行成了
 * tab stop 之后这条路径才可达，所以焦点必须成为 contextResource 的第二个来源。
 *
 * jsdom 里的 web-ui-context-menu 是个只有 openAt/close 的桩，不实现键盘呼出，所以这里
 * 钉的是本组件该保证的那一半：行获焦时菜单项讲的是那一行。真机上「菜单确实弹出来了、
 * 而且锚在该行上」由浏览器验证取证。
 */
describe('ResourceList：键盘呼出右键菜单', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function missingSource(): ResourceSourceView {
    return {
      id: 's1',
      type: 'file',
      location: '/tmp/gone.png',
      available: false,
      isPreferred: true,
      orderIndex: 0,
      metadata: null
    }
  }

  /*
   * 只读顶层项、且只读项自己的文字。「打开方式」是子菜单，textContent 会把它下面的
   * 「系统默认应用」「看图」等一起吞进来——那样就既认不出「打开方式」这一项，也会把子菜单
   * 里的「预览 看图」误当成顶层的「预览」。子节点里的文本不算这一项的。
   */
  function labelsOf(host: HTMLElement) {
    return [...host.querySelectorAll('web-ui-context-menu > .contents > web-ui-dropdown-item')].map(item =>
      [...item.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join('')
        .trim()
    )
  }

  it('行获焦时菜单项讲的是那一行', async () => {
    const mounted = await mountList([resource({ id: 'r1' })])
    try {
      ;(mounted.rows[0] as HTMLElement).focus()
      await nextTick()

      // 六项齐全。缺哪一项，那一项的键盘入口就是断的
      expect(labelsOf(mounted.host)).toEqual(
        expect.arrayContaining(['预览', '打开方式', '详情', '重命名', '标签', '删除'])
      )
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 要证明的是「跟着焦点走」，不是「有行获焦菜单就不空」：焦点挪到不可用的行上，菜单必须
   * 跟着换掉。否则 sync 落在容器上、拿第一条糊弄过去，第二条资源的菜单项仍然是错的。
   */
  it('焦点挪到另一行时菜单项跟着换', async () => {
    const mounted = await mountList([
      resource({ id: 'r1' }),
      resource({ id: 'r2', available: false, sources: [missingSource()] })
    ])
    try {
      const [first, second] = mounted.rows as HTMLElement[]
      first.focus()
      await nextTick()
      expect(labelsOf(mounted.host)).toContain('预览')

      second.focus()
      await nextTick()

      const labels = labelsOf(mounted.host)
      expect(labels).not.toContain('预览')
      expect(labels).not.toContain('标签')
      expect(labels).toContain('找回资源')
      expect(labels).toContain('详情')
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 焦点退回容器（Shift+Tab 一步就能到）时，「当前行」这个东西不存在了。此时必须置空，
   * 不能留着上一行的资源——否则那张菜单的位置在列表上、内容却是某一条具体资源。
   */
  it('焦点在容器上时不残留上一行的菜单项', async () => {
    const mounted = await mountList([resource({ id: 'r1' })])
    try {
      const row = mounted.rows[0] as HTMLElement
      const container = row.parentElement as HTMLElement
      row.focus()
      await nextTick()
      expect(labelsOf(mounted.host)).toContain('预览')

      container.focus()
      await nextTick()

      const labels = labelsOf(mounted.host)
      expect(labels).not.toContain('预览')
      expect(labels).not.toContain('详情')
      expect(labels).not.toContain('重命名')
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 焦点在容器上按 Shift+F10，宿主照样会开菜单并把面板锚到容器上。容器不对应任何一条资源，
   * 所以这里先把焦点交给行：事件继续冒泡，宿主再读 document.activeElement 时读到的已经是
   * 那一行，菜单于是既锚在行上、也讲这一行的事。
   */
  it('容器上按 Shift+F10 先把焦点交给行', async () => {
    const mounted = await mountList([resource({ id: 'r1' }), resource({ id: 'r2' })])
    try {
      const container = mounted.host.querySelector('[data-resource-row]')?.parentElement as HTMLElement
      container.focus()
      expect(document.activeElement).toBe(container)

      keydown(container, { key: 'F10', shiftKey: true })

      expect(document.activeElement).toBe(mounted.rows[0])
    } finally {
      mounted.unmount()
    }
  })

  it('裸 F10 不当作 context-menu 键，交给浏览器', async () => {
    const mounted = await mountList([resource({ id: 'r1' })])
    try {
      const container = mounted.host.querySelector('[data-resource-row]')?.parentElement as HTMLElement
      container.focus()

      const event = keydown(container, { key: 'F10' })

      expect(document.activeElement).toBe(container)
      expect(event.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 鼠标右键是 contextResource 的原有来源，focusin 不能抢它的戏：焦点还停在上一行时右键
   * 另一行，菜单必须讲右键那一行。
   */
  it('焦点在别行时右键，菜单仍然讲右键那一行', async () => {
    const mounted = await mountList([
      resource({ id: 'r1' }),
      resource({ id: 'r2', available: false, sources: [missingSource()] })
    ])
    try {
      ;(mounted.rows[0] as HTMLElement).focus()
      await nextTick()

      mounted.rows[1]!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
      )
      await nextTick()

      const labels = labelsOf(mounted.host)
      expect(labels).not.toContain('预览')
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

function keydown(target: Element, init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

/*
 * 预览的判据从「hover 行 + 空格」换成「焦点进入行」（#187 的 hover 入口已下线）。键盘
 * 用户没有 hover，列表的键盘可达性靠 focus 承担，所以 tab stop 与 focus 环一起钉在这里。
 *
 * jsdom 不实现 Tab 键的真实焦点推进（那是浏览器行为），所以「行间可切换」在这里断言
 * 可聚焦前提（容器与行都是 tab stop），真实 Tab 推进由浏览器验证取证。
 */
describe('ResourceList：键盘导航与预览入口', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /*
   * 键盘用户没有 hover，focus 环是他唯一的到位指示。环由 assets/global.css 的页面级规则画，
   * 那条规则命中 [tabindex]:not([tabindex='-1'])，所以这里钉住容器与行都落在它的命中范围内：
   * 行一旦被移出 Tab 序列，键盘用户就彻底看不见自己在哪一行。环的颜色与粗细由浏览器取证，
   * jsdom 里 Tailwind 不生效，读不到。
   */
  it('容器与每一行都是 tab stop，落在页面级 focus 环的命中范围内', async () => {
    const mounted = await mountList(['a', 'b'].map(id => resource({ id })))
    try {
      const container = mounted.host.querySelector('[data-resource-row]')?.parentElement
      expect(container?.getAttribute('tabindex')).toBe('0')
      expect(mounted.rows.map(row => row.getAttribute('tabindex'))).toEqual(['0', '0'])
      for (const element of [...mounted.rows, container!]) {
        expect(element.matches("[tabindex]:not([tabindex='-1'])")).toBe(true)
      }
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：焦点进入行**不**自动开预览。预览抽屉内部是原生 <dialog> 的 showModal()，打开
   * 时浏览器把焦点拉进 dialog 并让其后的文档 inert——真机上实测过抽屉一开，row.focus()
   * 就没有响应，Tab 在行间切换这条主路径会当场断掉。预览改由焦点行上的空格触发。
   */
  it('焦点进入行不自动开预览', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList(
      [resource({ id: 'r1' }), resource({ id: 'r2', title: '第二条' })],
      [],
      {},
      { onPreview: preview }
    )

    try {
      ;(mounted.rows[1] as HTMLElement).focus()
      expect(document.activeElement).toBe(mounted.rows[1])
      expect(preview).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 行间切换靠浏览器原生的 Tab 焦点推进，组件不自己接管 Tab：接管了就出不去列表。
   */
  it('Tab 不由列表接管，行间切换交给浏览器原生焦点推进', async () => {
    const select = vi.fn<RowHandler>()
    const detail = vi.fn<RowHandler>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onSelect: select, onDetail: detail })
    try {
      const event = keydown(mounted.rows[0]!, { key: 'Tab' })
      expect(event.defaultPrevented).toBe(false)
      expect(select).not.toHaveBeenCalled()
      expect(detail).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('鼠标 hover 仍留底色，但不再触发预览', async () => {
    const preview = vi.fn<(resource: ResourceView) => void>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onPreview: preview })

    try {
      const row = mounted.rows[0]!
      row.dispatchEvent(new MouseEvent('mouseenter'))
      row.dispatchEvent(new MouseEvent('mouseleave'))

      expect(preview).not.toHaveBeenCalled()
      // 要去掉的是「hover 作为预览触发判据」，底色本身是 hover 视觉反馈，必须留着
      expect(row.className.split(/\s+/)).toContain('hover:bg-black/3.5')
    } finally {
      mounted.unmount()
    }
  })

  it('Enter 打开详情', async () => {
    const detail = vi.fn<RowHandler>()
    const preview = vi.fn<RowHandler>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onDetail: detail, onPreview: preview })

    try {
      const event = keydown(mounted.rows[0]!, { key: 'Enter' })

      expect(detail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'r1' }))
      expect(preview).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 空格接在点击的语义上（父级收到 select 后开预览），这就是 hover 下线后预览的入口：
   * 判据从「鼠标悬停」换成了「焦点在行上」，功能本身没删。
   */
  it('Space 与点击一致，走 select', async () => {
    const select = vi.fn<RowHandler>()
    const detail = vi.fn<RowHandler>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onSelect: select, onDetail: detail })

    try {
      const event = keydown(mounted.rows[0]!, { key: ' ' })

      expect(select).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'r1' }))
      expect(detail).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：Shift+Space 是「向上滚一屏」的常规手势，焦点落在行上也不能吃掉它。
   */
  it('Shift+Space 不接管，向上滚一屏留给页面', async () => {
    const select = vi.fn<RowHandler>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onSelect: select })

    try {
      const event = keydown(mounted.rows[0]!, { key: ' ', shiftKey: true })

      expect(select).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  it('带修饰键的 Enter 与 Space 不接管，浏览器与系统的组合键优先', async () => {
    const select = vi.fn<RowHandler>()
    const detail = vi.fn<RowHandler>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onSelect: select, onDetail: detail })

    try {
      keydown(mounted.rows[0]!, { key: ' ', metaKey: true })
      keydown(mounted.rows[0]!, { key: 'Enter', ctrlKey: true })

      expect(select).not.toHaveBeenCalled()
      expect(detail).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('方向键在行间移动焦点，Home / End 到首尾', async () => {
    const mounted = await mountList(['a', 'b', 'c'].map(id => resource({ id })))
    try {
      const [a, b, c] = mounted.rows as HTMLElement[]
      a.focus()

      keydown(a, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(b)

      keydown(b, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(c)

      keydown(c, { key: 'Home' })
      expect(document.activeElement).toBe(a)

      keydown(a, { key: 'End' })
      expect(document.activeElement).toBe(c)
    } finally {
      mounted.unmount()
    }
  })

  it('首尾再按方向键不越界，也不吞掉按键：列表不是环', async () => {
    const mounted = await mountList(['a', 'b'].map(id => resource({ id })))
    try {
      const [a, b] = mounted.rows as HTMLElement[]
      a.focus()
      const atFirst = keydown(a, { key: 'ArrowUp' })
      expect(document.activeElement).toBe(a)
      expect(atFirst.defaultPrevented).toBe(false)

      b.focus()
      const atLast = keydown(b, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(b)
      expect(atLast.defaultPrevented).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  it('行内勾选框的按键不被行接管', async () => {
    const select = vi.fn<RowHandler>()
    const detail = vi.fn<RowHandler>()
    const mounted = await mountList(
      [resource({ id: 'r1' })],
      [],
      { selectionMode: true },
      { onSelect: select, onDetail: detail }
    )
    try {
      const checkbox = mounted.rows[0]!.querySelector('web-ui-checkbox')
      if (!checkbox) throw new Error('选择态下没有勾选框')

      keydown(checkbox, { key: ' ' })
      keydown(checkbox, { key: 'Enter' })

      expect(select).not.toHaveBeenCalled()
      expect(detail).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：改名编辑器封在 web-ui 的 shadow 里，它的 keydown 是 composed 的，冒到列表容器
   * 时 target 已被 retarget 成 shadow host。宿主仍能 closest 到那一行，若只判「有没有落在
   * 行内」，编辑途中打的 Enter / Space 就会被行再解释一遍。
   */
  it('shadow 内的行内改名编辑器按键不被行接管', async () => {
    const select = vi.fn<RowHandler>()
    const detail = vi.fn<RowHandler>()
    const mounted = await mountList(
      [resource({ id: 'r1' })],
      [],
      { editingNameKey: 'r1' },
      { onSelect: select, onDetail: detail }
    )
    try {
      const editor = mounted.rows[0]!.querySelector('web-ui-editable-text')
      if (!editor) throw new Error('改名态下没有行内编辑器')

      keydown(editor, { key: ' ', composed: true })
      keydown(editor, { key: 'Enter', composed: true })

      expect(select).not.toHaveBeenCalled()
      expect(detail).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })

  it('容器上 Enter 把焦点交给当前活动行', async () => {
    const mounted = await mountList(
      ['a', 'b', 'c'].map(id => resource({ id })),
      [],
      { activeResourceId: 'b' }
    )
    try {
      const container = mounted.host.querySelector('[data-resource-row]')!.parentElement as HTMLElement
      container.focus()
      keydown(container, { key: 'Enter' })

      expect(document.activeElement).toBe(mounted.rows[1])
    } finally {
      mounted.unmount()
    }
  })

  it('没有活动行时，容器上 ArrowDown 把焦点交给首行', async () => {
    const mounted = await mountList(['a', 'b'].map(id => resource({ id })))
    try {
      const container = mounted.host.querySelector('[data-resource-row]')!.parentElement as HTMLElement
      container.focus()
      keydown(container, { key: 'ArrowDown' })

      expect(document.activeElement).toBe(mounted.rows[0])
    } finally {
      mounted.unmount()
    }
  })

  it('容器自己只承接「进列表」这一跳，方向键之外不解释按键', async () => {
    const select = vi.fn<RowHandler>()
    const detail = vi.fn<RowHandler>()
    const mounted = await mountList([resource({ id: 'r1' })], [], {}, { onSelect: select, onDetail: detail })
    try {
      const container = mounted.host.querySelector('[data-resource-row]')!.parentElement as HTMLElement
      container.focus()
      const event = keydown(container, { key: 'a' })

      expect(event.defaultPrevented).toBe(false)
      expect(select).not.toHaveBeenCalled()
      expect(detail).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(container)
    } finally {
      mounted.unmount()
    }
  })
})
