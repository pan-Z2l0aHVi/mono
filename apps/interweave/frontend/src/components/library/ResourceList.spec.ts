// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import { currentScrollY, stubLayout, ROW_ESTIMATE, ROW_HEIGHT, VIEWPORT_HEIGHT } from './__tests__/virtualLayout'
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
  // 虚拟列表在 jsdom 里没有高度就算不出窗口，组件会一行都不渲染。见 __tests__/virtualLayout。
  const restoreLayout = stubLayout()
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
    // 虚拟化之后行不再直接挂在容器下，中间多了一层撑总高的定位包裹，所以按 role 认容器，
    // 不用 parentElement 顺推。
    container: host.querySelector<HTMLElement>('[role="list"]'),
    contextMenu: host.querySelector('web-ui-context-menu'),
    unmount: () => {
      app.unmount()
      host.remove()
      restoreLayout()
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

  /*
   * S3：虚拟化之前整个列表都是 DOM，按住拖到底能一路勾到最后一条；虚拟化之后
   * elementFromPoint 只认窗口内那十几行，不主动把窗口滚下去就永远勾不过边界。
   * 这条用例钉的是「指针停在视口底边时页面自己会滚」，跨窗口的勾选由浏览器取证补。
   * window 模式下边缘带按 window.innerHeight 算，不再读列表容器的 rect。
   */
  it('指针停在视口底边时页面自动滚动，扫选得以越过窗口边界', async () => {
    const setChecked = vi.fn<SetChecked>()
    const resources = Array.from({ length: 200 }, (_, i) => resource({ id: `r${i}` }))
    const mounted = await mountList(resources, [], { selectionMode: true }, { onSetChecked: setChecked })
    const hit = stubHitTest()
    try {
      const firstRow = mounted.rows[0]
      firstRow.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      // 指针移到视口下边界内侧 8px，落在 32px 的边缘带内。这条守的是「新几何在视口内靠边
      // 就能触发」——触摸为什么必须这样判、clientY 为什么恒在视口内，由下面那条 touch 用例守。
      hit.pointAt(firstRow)
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: VIEWPORT_HEIGHT - 8 }))
      // 让 rAF 回调跑起来：边缘滚动是按帧推进的
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      await flushRenders()

      expect(currentScrollY()).toBeGreaterThan(0)
      window.dispatchEvent(pointer('pointerup'))
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  /*
   * 速度上限：指针被拖到视口外很远时，单帧位移不得超过设计上限。
   *
   * 旧几何每一支都有 `distance >= ZONE ? 0` 的早退，天然把速度钳在 [0, MAX]；改成「视口内
   * 靠边」的几何时那层钳制丢了，(1 - d/ZONE) 随 d 线性无界增长——clientY=-1000 时算出
   * 774px/帧、是 SWEEP_MAX_SPEED 的 32 倍，列表直接「飞」过去、大量行被跳过，用户想停在
   * 某一行上勾它根本停不住。stepSweepScroll 只钳了滚动上限、没钳速度，所以那道钳制必须
   * 落在 sweepEdgeSpeed 里。
   *
   * 断言用「相对上限的单帧位移」而不是绝对值：上限是实现常量，写死 24 会让调参变成改测试。
   */
  it('指针拖到视口外很远时，单帧位移不超过速度上限', async () => {
    const setChecked = vi.fn<SetChecked>()
    const resources = Array.from({ length: 400 }, (_, i) => resource({ id: `r${i}` }))
    const mounted = await mountList(resources, [], { selectionMode: true }, { onSetChecked: setChecked })
    const hit = stubHitTest()
    const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    try {
      const firstRow = mounted.rows[0]
      firstRow.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
      hit.pointAt(firstRow)

      // 拖到视口下沿之外 1000px。若不钳，这里一帧就是数百 px。
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: VIEWPORT_HEIGHT + 1000 }))
      await frame()
      await frame()
      const jumped = currentScrollY()

      // 速度上限 24px/帧，放行两帧（加上首帧）最多 ~72px。取一个宽松但能区分的界：
      // 不钳时首帧就是 774px 量级。
      expect(jumped).toBeLessThanOrEqual(96)
      expect(jumped).toBeGreaterThan(0)
      window.dispatchEvent(pointer('pointerup'))
    } finally {
      hit.restore()
      mounted.unmount()
    }
  })

  /*
   * 边缘带内速度贴边最快、离边越远越慢——底部与顶部两侧都要验。
   *
   * 这条守的是梯度方向。某一支的 distance 写错（底部写成 clientY 本身、顶部写成
   * ZONE-clientY）梯度就倒过来：贴着屏幕边速度 0、离边 32px 处反而满速，触摸会「越靠边
   * 越慢」——一个不会报错、只会让手感变怪的方向性缺陷，两侧对称所以要各测一次。
   *
   * 顶部带不能直接比：scrollY=0 时向上滚不动（已经在顶）。所以先滚到中段再测。
   */
  it('边缘带内速度贴边最快、离边越远越慢', async () => {
    const resources = Array.from({ length: 400 }, (_, i) => resource({ id: `r${i}` }))
    // 同样的两帧，贴边应该比带内靠里滚得更多
    const measure = async (clientY: number, fromTop = false) => {
      const setChecked = vi.fn<SetChecked>()
      const mounted = await mountList(resources, [], { selectionMode: true }, { onSetChecked: setChecked })
      const hit = stubHitTest()
      const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      try {
        mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }))
        hit.pointAt(mounted.rows[0])
        if (fromTop) {
          // 滚离顶部必须在 pointerdown 之后做：mountList 里的 stubLayout 每次都把 scrollY
          // 归零，放在它之前滚会被抹掉；而 scrollY 为 0 时向上滚被 maxScrollY 夹住、
          // 根本退不动，梯度差异就测不出来。
          window.scrollTo({ top: 5000 })
          await flushRenders()
        }
        // 基线在 pointerdown 之后取：按下这一刻页面可能被夹一下（实测 5000 → 4856），
        // 拿按下前的值当基线会把那一下算进梯度里。
        const before = currentScrollY()
        window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY }))
        await frame()
        await frame()
        return { before, after: currentScrollY() }
      } finally {
        hit.restore()
        mounted.unmount()
      }
    }

    // 底部带：贴底边 clientY=底-1 比带内靠里 clientY=底-16 滚得更多
    const bottomEdge = await measure(VIEWPORT_HEIGHT - 1)
    const bottomInner = await measure(VIEWPORT_HEIGHT - 16)
    expect(bottomEdge.after).toBeGreaterThan(bottomEdge.before)
    expect(bottomEdge.after).toBeGreaterThan(bottomInner.after)
    expect(bottomInner.after).toBeGreaterThan(bottomInner.before)

    // 顶部带：贴顶边 clientY=1 比带内靠里 clientY=16 退得更多（向上滚，after < before）
    const topEdge = await measure(1, true)
    const topInner = await measure(16, true)
    expect(topEdge.before - topEdge.after).toBeGreaterThan(topInner.before - topInner.after)
    expect(topInner.before - topInner.after).toBeGreaterThan(0)
  })

  /*
   * 触摸端扫选（Block 级回归的护栏）。
   *
   * 缺陷本体：sweepEdgeSpeed 原来按「指针越出视口」给速度，而触摸的 clientY 按 Pointer
   * Events 恒落在 [0, innerHeight]（这一条由本组用例守，与上面 mouse 那条分工不同）——
   * 手指接触点不可能在视口之外，于是两个分支都是死代码、
   * speed 恒 0；同时 blockSweepScroll 一律 preventDefault，手指滑动也被拦。净效果是触摸端
   * 既无边缘自动滚、也滑不动，只能勾到窗口边缘就停住——正是本 task 要消除的能力退化。
   *
   * 四条用例分别钉住：边缘带能触发自动滚、长按确认仍能 arm、边缘带内放行带外仍拦、
   * 以及带外手势不被滑动打断（放行过头会让长按判定失效）。
   */
  it('触摸：指针停在视口底边内侧时同样触发边缘自动滚', async () => {
    // 触摸必须先过 320ms 长按才进入扫选，所以先用假定时器推进长按计时；
    // 边缘自动滚由 rAF 驱动，假定时器会把 rAF 一起停掉，所以放行之前换回真定时器。
    vi.useFakeTimers()
    const setChecked = vi.fn<SetChecked>()
    const resources = Array.from({ length: 200 }, (_, i) => resource({ id: `r${i}` }))
    const mounted = await mountList(resources, [], { selectionMode: true }, { onSetChecked: setChecked })
    const hit = stubHitTest()
    try {
      const firstRow = mounted.rows[0]
      firstRow.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }, 'touch'))
      vi.advanceTimersByTime(400)
      vi.useRealTimers()

      hit.pointAt(firstRow)
      // 触摸的 clientY 落在视口内靠边处，边缘带必须仍然给速度
      window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: VIEWPORT_HEIGHT - 8 }, 'touch'))
      // 边缘滚动按帧推进，放行两帧
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      await flushRenders()

      expect(currentScrollY()).toBeGreaterThan(0)
      window.dispatchEvent(pointer('pointerup', {}, 'touch'))
    } finally {
      vi.useRealTimers()
      hit.restore()
      mounted.unmount()
    }
  })

  it('触摸：边缘带内的 touchmove 放行滚动，带外仍拦住', async () => {
    vi.useFakeTimers()
    const resources = Array.from({ length: 200 }, (_, i) => resource({ id: `r${i}` }))
    const mounted = await mountList(resources, [], { selectionMode: true })
    const hit = stubHitTest()
    const touchMove = (clientY: number) => {
      const event = new Event('touchmove', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: [{ clientX: 1, clientY }] })
      document.dispatchEvent(event)
      return event
    }
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 1 }, 'touch'))
      vi.advanceTimersByTime(400)

      // 边缘带内（离下沿 8px）：放行，否则手指滑不动、自动滚又被拦，扫选卡死在窗口边界
      expect(touchMove(VIEWPORT_HEIGHT - 8).defaultPrevented).toBe(false)
      // 视口中段：拦住。长按确认与「滑动 = 放弃扫选」都依赖这一条
      expect(touchMove(VIEWPORT_HEIGHT / 2).defaultPrevented).toBe(true)

      window.dispatchEvent(pointer('pointerup', {}, 'touch'))
    } finally {
      vi.useRealTimers()
      hit.restore()
      mounted.unmount()
    }
  })

  it('触摸：长按确认仍能 arm，且不因边缘带放行而失效', async () => {
    vi.useFakeTimers()
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    try {
      // 从边缘带内起手：放行滚动不能妨碍长按计时
      mounted.rows[0].dispatchEvent(
        pointer('pointerdown', { button: 0, clientX: 1, clientY: VIEWPORT_HEIGHT - 8 }, 'touch')
      )
      vi.advanceTimersByTime(400)

      expect(setChecked).toHaveBeenCalledExactlyOnceWith('a', true)
      window.dispatchEvent(pointer('pointerup', {}, 'touch'))
    } finally {
      vi.useRealTimers()
      mounted.unmount()
    }
  })

  it('触摸：手势不在边缘带内时，手指滑动仍被拦、扫选不被滚动打断', async () => {
    vi.useFakeTimers()
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      ['a', 'b', 'c'].map(id => resource({ id })),
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    const hit = stubHitTest()
    try {
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 1, clientY: 100 }, 'touch'))
      vi.advanceTimersByTime(400)
      expect(setChecked).toHaveBeenCalledExactlyOnceWith('a', true)

      // 视口中段滑动：被拦，页面不滚，扫选也不该因此中断到下一行
      const event = new Event('touchmove', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: [{ clientX: 1, clientY: 120 }] })
      document.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)

      // 扫选仍激活：继续划过下一行照常勾上
      hit.pointAt(mounted.rows[1])
      window.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 130 }, 'touch'))
      expect(setChecked).toHaveBeenCalledWith('b', true)

      window.dispatchEvent(pointer('pointerup', {}, 'touch'))
    } finally {
      vi.useRealTimers()
      hit.restore()
      mounted.unmount()
    }
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

/*
 * 触屏长按出行菜单（#3）。组件侧契约是 web-ui-context-menu 的 long-press opt-in 属性，
 * 这一组钉的是 app 侧的三件事：属性挂对了、菜单项讲的是长按那一行、扫选之后右键没被吞掉。
 */
describe('ResourceList：触屏长按菜单', () => {
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

  function labelsOf(host: HTMLElement) {
    return [...host.querySelectorAll('web-ui-context-menu > .contents > web-ui-dropdown-item')].map(item =>
      [...item.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join('')
        .trim()
    )
  }

  /*
   * 属性必须「在」或「不在」，不能是字符串 "false"。
   *
   * Vue 对自定义元素走属性路径（`'long-press' in el` 为 false，因为 Lit 的属性名是 longPress），
   * 布尔 false 会被写成字符串 "false"；Lit 的 Boolean converter 只看属性在不在
   * （fromAttribute 是 `value !== null`），于是 "false" 读出来是 true，布尔整个反过来。
   *
   * 这条在真机上验过：进选择模式后 getAttribute('long-press') === "false" 而 longPress === true。
   * 少这条断言的话，写成 `:long-press="!selectionMode"` 会一路绿到用户手上——
   * 选择模式里长按先勾选、然后菜单照弹。
   */
  it('非选择模式挂 long-press，选择模式让属性整个消失而不是变成 "false"', async () => {
    const normal = await mountList([resource()])
    try {
      expect(normal.contextMenu?.hasAttribute('long-press')).toBe(true)
    } finally {
      normal.unmount()
    }

    const selecting = await mountList([resource()], [], { selectionMode: true })
    try {
      expect(selecting.contextMenu?.hasAttribute('long-press')).toBe(false)
      expect(selecting.contextMenu?.getAttribute('long-press')).toBeNull()
    } finally {
      selecting.unmount()
    }
  })

  /*
   * 长按菜单的内容必须讲长按的那一行。
   *
   * 长按是组件自己在宿主上计时打开的，它不发事件、也不认行——菜单项却全部 gate 在
   * contextResource 上。所以 contextResource 必须在 pointerdown 那一刻就落定（syncTouchContext），
   * 否则长按弹出来的是一张位置在某一行的空菜单：只剩两条分隔线和一个删除「null」的空项。
   *
   * 这里断言的是「长按 b 之后菜单项已经是 b 的」，而不是「菜单能打开」——后者在
   * contextResource 为空壳时同样成立。
   */
  it('触屏按下就把 contextResource 落到那一行，长按菜单项讲的是这一行', async () => {
    const mounted = await mountList([
      resource({ id: 'r1' }),
      resource({ id: 'r2', available: false, sources: [missingSource()] })
    ])
    try {
      // 右键路径本来就会写 contextResource，所以先用它把状态推到 r1
      mounted.rows[0].dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
      )
      await nextTick()
      expect(labelsOf(mounted.host)).toContain('预览')

      // 触屏按在 r2 上：只按下、不抬手。这一步就该把 contextResource 换成 r2。
      mounted.rows[1].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 100, clientY: 100 }, 'touch'))
      await nextTick()

      const labels = labelsOf(mounted.host)
      expect(labels).not.toContain('预览')
      expect(labels).toContain('找回资源')
      expect(labels).toContain('详情')
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：suppressContextMenu 曾经只在下一次 pointerdown 才清，于是扫过一次之后右键整个失灵。
   *
   * 它由 armTouchSweep 置位，而 armTouchSweep 只在选择模式下发生；endSweep 当时只清
   * suppressRowClick。所以「进过一次选择模式并长按扫选」之后，这个标志一直留着，
   * openContextMenu 见到它就 preventDefault 直接 return，右键菜单再也弹不出来。
   *
   * 观察点是菜单项内容而不是「菜单有没有开」：被吞掉时 openContextMenu 提前 return，
   * contextResource 停在上一手那行，于是菜单讲的是错的行。这正是用户看到的现象。
   */
  it('触摸扫选收尾后右键菜单照常弹出，且讲的是右键那一行', async () => {
    vi.useFakeTimers()
    const setChecked = vi.fn<SetChecked>()
    const mounted = await mountList(
      [resource({ id: 'r1' }), resource({ id: 'r2', available: false, sources: [missingSource()] })],
      [],
      { selectionMode: true },
      { onSetChecked: setChecked }
    )
    try {
      // 在 r1 上长按到扫选武装：这一步把 suppressContextMenu 置上
      mounted.rows[0].dispatchEvent(pointer('pointerdown', { button: 0, clientX: 100, clientY: 100 }, 'touch'))
      vi.advanceTimersByTime(400)
      expect(setChecked).toHaveBeenCalledExactlyOnceWith('r1', true)

      // 抬手收尾。endSweep 必须在这里把 suppressContextMenu 清掉。
      window.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 100 }, 'touch'))

      // 之后右键另一行：菜单项必须换成 r2 的
      mounted.rows[1].dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
      )
      await nextTick()

      const labels = labelsOf(mounted.host)
      expect(labels).toContain('找回资源')
      expect(labels).not.toContain('预览')
    } finally {
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
      const container = mounted.container!
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
      const container = mounted.container!
      container.focus()
      expect(document.activeElement).toBe(container)

      keydown(container, { key: 'F10', shiftKey: true })
      // 焦点交接跨一个 tick：scrollToIndex 触发的渲染完成后才落焦，见 focusIndex
      await flushRenders()

      expect(document.activeElement).toBe(mounted.rows[0])
    } finally {
      mounted.unmount()
    }
  })

  it('裸 F10 不当作 context-menu 键，交给浏览器', async () => {
    const mounted = await mountList([resource({ id: 'r1' })])
    try {
      const container = mounted.container!
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
 * 一次键盘导航要跨两轮渲染：focusIndex 先改 activeIndex 并 scrollToIndex，滚动的回调再触发
 * 虚拟窗口重算、新行挂载，所以单次 nextTick 之后 DOM 仍可能停在上一帧。断言涉及行元素时
 * 多冲一帧，避免把「还没渲染完」误读成「行为不对」。
 */
async function flushRenders() {
  await nextTick()
  await nextTick()
  await nextTick()
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
   * 虚拟化本体：1000 条资源在 DOM 里只留下窗口内的十几行。
   *
   * 撑总高的内层 div 按 getTotalSize 给高度，整页据此产生滚动条，所以「列表有多长」与
   * 「DOM 里有多少行」从此解耦。
   *
   * window 模式（滚动元素是 window）下两件事与 element 模式不同，都在这里钉住：
   * 容器不再是滚动容器（没有 overflow-y-auto / min-h-0，那是内部滚动时代的产物）；
   * 行的落点是 row.start - scrollMargin 而不是 row.start。
   *
   * jsdom 里行高由 __tests__/virtualLayout 的桩给（真实高 40、估值 64），所以总高是
   * 「已量行 × 40 + 未量行 × 64」的混合值，不是纯估值。真实浏览器里同样是这个混合形态。
   */
  it('长列表只渲染虚拟窗口内的行，页面按总高滚动', async () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `r${index}`)
    const mounted = await mountList(ids.map(id => resource({ id })))
    try {
      expect(mounted.rows.length).toBeGreaterThan(0)
      expect(mounted.rows.length).toBeLessThan(100)

      // 滚动元素是 window，容器不再承担滚动职责
      const container = mounted.container!
      expect(container.className).not.toContain('overflow-y-auto')
      expect(container.className).not.toContain('min-h-0')

      // 撑总高的内层 = 已量到的行按真实高度 + 还没量到的行按估值。
      // 不去数「量到了几行」：overscan 让窗口外几行也已挂载并被量到，DOM 行数与已量行数
      // 不是一回事，数错会得到一个看起来合理但对不上的期望值。改为直接读包裹层高度，
      // 断言它落在「全估值」与「全真实」之间——真实行高确实进来了，且没有把未量到的行
      // 误算成真实高度。
      const sizer = container.firstElementChild as HTMLElement
      const total = Number(sizer.style.height.replace('px', ''))
      const allEstimate = 1000 * ROW_ESTIMATE
      const allMeasured = 1000 * ROW_HEIGHT
      expect(total).toBeLessThan(allEstimate)
      expect(total).toBeGreaterThan(allMeasured)

      // 行按 row.start - scrollMargin 定位。jsdom 的 rect 恒为 0，listOffset 也就是 0，
      // 于是这一项等于 row.start——但减法必须在模板里，写错了这里也看不出来，所以另外
      // 用「行位确实按测量出的高度递进」这一点做实质检查。
      const tops = mounted.rows.map(row => (row.parentElement as HTMLElement).style.transform)
      expect(tops[0]).toBe('translateY(0px)')
      expect(tops[1]).toBe(`translateY(${ROW_HEIGHT}px)`)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 无障碍：aria-setsize / aria-posinset 报的是**完整列表**，不是窗口内的行数。
   *
   * 虚拟化之后 DOM 里只有十几行，不补这两个属性的话读屏会把列表长度念成十几，屏幕阅读器
   * 用户会以为整个资源库就这么大（W3C APG 要求动态加载的集合补齐）。
   */
  it('行报出完整列表的条数与位置，而不是窗口内的行数', async () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `r${index}`)
    const mounted = await mountList(ids.map(id => resource({ id })))
    try {
      expect(mounted.container!.getAttribute('role')).toBe('list')
      for (const row of mounted.rows) {
        expect(row.getAttribute('role')).toBe('listitem')
        expect(row.getAttribute('aria-setsize')).toBe('1000')
        // posinset 从 1 起，与 index 对齐
        expect(row.getAttribute('aria-posinset')).toBe(String(Number(row.getAttribute('data-resource-index')) + 1))
      }
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 撑总高的内层 div 承载全部列表语义，不能标 aria-hidden：那会把行一起对读屏隐去，
   * 上面刚补的 role / aria-setsize / aria-posinset 全部传达不出去，外层的 role="list"
   * 变成一个「0 项的列表」。
   *
   * 只查自己的子树：宿主 web-ui-context-menu 内部有 web-ui-spinner，它自带
   * aria-hidden="true"，与本组件无关。
   */
  it('列表语义没有被 aria-hidden 遮住', async () => {
    const mounted = await mountList(['a', 'b'].map(id => resource({ id })))
    try {
      const list = mounted.container!
      const sizer = list.firstElementChild as HTMLElement
      expect(list.hasAttribute('aria-hidden')).toBe(false)
      expect(sizer.hasAttribute('aria-hidden')).toBe(false)
      // 逐个祖先查，不整片扫：宿主 web-ui-context-menu 里有 web-ui-spinner，它自带
      // aria-hidden="true"，与本组件无关。
      for (let node: HTMLElement | null = sizer; node && node !== mounted.host; node = node.parentElement) {
        expect(node.hasAttribute('aria-hidden')).toBe(false)
      }
      // 行本身可达：role 与 aria-setsize 没有被任何一层遮掉
      for (const row of mounted.rows) {
        expect(row.closest('[aria-hidden="true"]')).toBeNull()
      }
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：useCachedMeasurements 必须保持关闭。
   *
   * virtual-core 的这个选项看起来正好能防「列表被抽屉开合隐藏时 ResizeObserver 把所有项
   * 报 0」，但它同时让默认 measureElement 只返回
   * `itemSizeCache.get(key) ?? estimateSize(index)`，永远读不到真实高度。首次测量返回
   * 估值 → 与估值无 delta → itemSizeCache 始终为空 → 每次都回落估值，真实行高一次也进不去，
   * 总高永远是「条数 × 估值」。
   *
   * 这条用断言直接钉住那个坏结果本身：开着它时可见行也按估值计入，总高恰等于
   * 条数 × 估值，真实行高一点都进不来。桩里的 ResizeObserver 是有实现的（见
   * __tests__/virtualLayout），行高确实量得到，所以开着与关着的差别是可观测的：
   * 关着时总高落在（条数 × 真实行高, 条数 × 估值）区间内，开着时恰好等于上界。
   */
  it('useCachedMeasurements 保持关闭：真实行高必须进得了虚拟窗口', async () => {
    const ids = Array.from({ length: 50 }, (_, index) => `r${index}`)
    const mounted = await mountList(ids.map(id => resource({ id })))
    try {
      const sizer = mounted.container!.firstElementChild as HTMLElement
      const measured = mounted.rows.length
      expect(measured).toBeGreaterThan(0)
      expect(measured).toBeLessThan(50)

      // 选项开着时 bug 的形态：可见行也按估值计入，总高 = 条数 × 估值，一行都不少。
      // 关着时已量到的行按真实高度计入，总高严格小于纯估值——这个差值就是真实行高进来了
      // 的证据，也正是那个选项会抹掉的东西。
      const total = Number(sizer.style.height.replace('px', ''))
      expect(total).toBeLessThan(ids.length * ROW_ESTIMATE)
      expect(total).toBeGreaterThan(ids.length * ROW_HEIGHT)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * roving tabindex：列表在 Tab 序列里只占一个 tab stop，活动行是唯一可 Tab 到的行。
   *
   * 虚拟化之前每行 tabindex="0"，Tab 能逐行走完整个资源库。虚拟化之后只有窗口内的行在
   * DOM 里，每行各自是 tab stop 就成了陷阱：Tab 会在窗口边界直接跳出列表，而视觉上还
   * 剩几百行没滚过，键盘用户会以为列表就这么长。W3C APG 的做法是容器单一 tab stop +
   * 行内 roving，方向键在行间移动活动行。
   *
   * 活动行仍然要落在页面级 focus 环的命中范围内（那条规则命中
   * [tabindex]:not([tabindex='-1'])），否则键盘用户看不见自己在哪一行。环的颜色与粗细
   * 由浏览器取证，jsdom 里 Tailwind 不生效。
   */
  it('列表只占一个 tab stop，活动行是唯一可 Tab 到的行', async () => {
    const mounted = await mountList(['a', 'b', 'c'].map(id => resource({ id })))
    try {
      const container = mounted.container!
      expect(container.getAttribute('tabindex')).toBe('0')
      // 默认活动行是首行
      expect(mounted.rows.map(row => row.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
      // 页面级 focus 环只画在活动行与容器上
      expect(container.matches("[tabindex]:not([tabindex='-1'])")).toBe(true)
      expect(mounted.rows[0]!.matches("[tabindex]:not([tabindex='-1'])")).toBe(true)
      expect(mounted.rows[1]!.matches("[tabindex]:not([tabindex='-1'])")).toBe(false)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * roving 随焦点走：方向键把活动行挪到第 2 行之后，tabindex 也要跟着换，否则 Tab 序列
   * 会回到第 1 行——用户已经移到第 2 行，按 Tab 却回到起点。
   */
  it('方向键移动焦点时 roving tabindex 跟着换行', async () => {
    const mounted = await mountList(['a', 'b', 'c'].map(id => resource({ id })))
    try {
      ;(mounted.rows[0] as HTMLElement).focus()
      keydown(mounted.rows[0]!, { key: 'ArrowDown' })
      await nextTick()
      await nextTick()

      expect(mounted.rows.map(row => row.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：行是 tab stop，而页面级 focus 环（assets/global.css）画的是 outline。Tailwind 的
   * transition-colors 把 outline-color 一起过渡了，它的初始计算值是 currentcolor——从祖先继承
   * 来的近黑文字色。留着它，Tab 过去时环会从近黑补间 100ms 到目标浅蓝，表现为边缘先黑一下
   * 再变蓝（与 AppNav 的 navItemClass 同一个坑，那次修复没留下测试）。
   *
   * 钉住 transition 相关的整个 token 列表而不是只钉「不含 transition-colors」：往后有人给行
   * 加过渡属性时，无论加的是 transition-all 还是 transition-[color,outline-color]，这个断言都
   * 会先红一次，逼着改动显式说明新增的属性。jsdom 里 Tailwind 不生效，但类名字符串读得到，
   * 所以这层守得住「过渡属性列表」，颜色与粗细仍由浏览器取证。
   */
  it('行的过渡只列 background-color，不带上 outline-color', async () => {
    const mounted = await mountList(['a'].map(id => resource({ id })))
    try {
      const row = mounted.rows[0]
      const transitionTokens = [...row.classList].filter(token => token.startsWith('transition'))
      expect(transitionTokens).toEqual(['transition-[background-color]'])
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

  /*
   * 方向键在行间移动焦点，Home / End 到首尾。
   *
   * 全部按数据下标算，边界是 resources.length 而不是「已渲染了几行」。虚拟化之后这两者
   * 差着一整屏——旧实现按 querySelectorAll 拿到的行数组取末位，End 只会跳到最后一个已
   * 渲染行，而不是最后一条资源。
   */
  it('方向键在行间移动焦点，Home / End 到首尾', async () => {
    const mounted = await mountList(['a', 'b', 'c'].map(id => resource({ id })))
    try {
      const [a, b, c] = mounted.rows as HTMLElement[]
      a.focus()

      keydown(a, { key: 'ArrowDown' })
      await nextTick()
      expect(document.activeElement).toBe(b)

      keydown(b, { key: 'ArrowDown' })
      await nextTick()
      expect(document.activeElement).toBe(c)

      keydown(c, { key: 'Home' })
      await nextTick()
      expect(document.activeElement).toBe(a)

      keydown(a, { key: 'End' })
      await nextTick()
      expect(document.activeElement).toBe(c)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：End 必须到**最后一条资源**，不是最后一个已渲染行。
   *
   * 虚拟窗口一次只渲染十几行，但列表可能有上千条。旧实现对 querySelectorAll 的结果取
   * length - 1，虚拟化之后那个下标落在窗口末尾，End 按十几次就到头了——列表剩下几百行
   * 根本到不了。这里用 1000 条把窗口撑开，再断言活动下标真的到了 999。
   *
   * 断言读的是容器上的 data-active-index 而不是 DOM：目标行此时还在虚拟窗口之外，
   * 根本没有对应的行元素，roving tabindex 也无从体现。真实滚动到位与焦点落点由浏览器
   * 验证取证。
   */
  it('End 到最后一条资源而不是最后一个已渲染行', async () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `r${index}`)
    const mounted = await mountList(ids.map(id => resource({ id })))
    try {
      // 先确认窗口确实被撑开：渲染行数远小于总数，否则这条用例什么也没证明
      expect(mounted.rows.length).toBeGreaterThan(0)
      expect(mounted.rows.length).toBeLessThan(100)

      const first = mounted.rows[0] as HTMLElement
      first.focus()
      keydown(first, { key: 'End' })
      await nextTick()

      expect(mounted.container!.dataset.activeIndex).toBe('999')
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 回归：方向键要能穿过虚拟窗口边界，不能在窗口底卡住。
   *
   * 旧实现把 indexOf 打在「已渲染行数组」上，ArrowDown 走到数组末尾 next === index 就
   * return，焦点锁死在窗口底——长按方向键走不出那一屏。现在按数据下标算，只要还有下一条
   * 资源就继续往下。
   *
   * 判据是「下标持续递增直到列表末尾」，因为 jsdom 里的 window.scrollTo 是真实现
   * （见 __tests__/virtualLayout），窗口会跟着 scrollToIndex 滚动并渲染出后续行。
   * 旧实现在这个场景下会停在首个越界的窗口底，第二个循环体就取不到元素而抛错。
   *
   * 按 End 而不是逐格按到底：End 内部同样走 focusIndex + scrollToIndex，是同一条路径，
   * 但把 998 次按键与渲染压成一次。并用 ArrowDown 单独验「越界那一次仍推进、仍吃掉按键」，
   * 那是旧实现会 return 的地方。
   */
  it('方向键穿过虚拟窗口边界继续移动，不在窗口底卡住', async () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `r${index}`)
    const mounted = await mountList(ids.map(id => resource({ id })))
    try {
      const first = mounted.rows[0] as HTMLElement
      first.focus()

      // 从第 0 行按 End 跨过整个虚拟窗口到第 999 行：中间几百行从未进入过 DOM。
      // 旧实现在窗口底 next === index 直接 return，活动下标会停在窗口末行。
      const endEvent = keydown(first, { key: 'End' })
      await flushRenders()
      expect(mounted.container!.dataset.activeIndex).toBe('999')
      expect(endEvent.defaultPrevented).toBe(true)

      // 越界那一次仍要推进：ArrowDown 落在窗口末行上时，目标行此刻还在窗口外。
      // 现在它已在视口内（End 刚把它滚进来），所以从它身上再按一次走到边界。
      const last =
        mounted.host.querySelector<HTMLElement>('[data-resource-index="999"]') ??
        [...mounted.host.querySelectorAll<HTMLElement>('[data-resource-row]')].at(-1)!
      const homeEvent = keydown(last, { key: 'Home' })
      await flushRenders()
      expect(mounted.container!.dataset.activeIndex).toBe('0')
      expect(homeEvent.defaultPrevented).toBe(true)

      // 回到窗口底附近再连按两次 ArrowDown，确认下标是「+1」而不是被钉住。
      keydown(mounted.host.querySelector<HTMLElement>('[data-resource-index="0"]')!, { key: 'ArrowDown' })
      await flushRenders()
      expect(mounted.container!.dataset.activeIndex).toBe('1')
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
      const container = mounted.container!
      container.focus()
      keydown(container, { key: 'Enter' })
      await flushRenders()

      expect(document.activeElement).toBe(mounted.rows[1])
    } finally {
      mounted.unmount()
    }
  })

  it('没有活动行时，容器上 ArrowDown 把焦点交给首行', async () => {
    const mounted = await mountList(['a', 'b'].map(id => resource({ id })))
    try {
      const container = mounted.container!
      container.focus()
      keydown(container, { key: 'ArrowDown' })
      await flushRenders()

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
      const container = mounted.container!
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

/*
 * 虚拟化特有的失效路径：虚拟化之前全部行常驻，行的卸载不可能发生，所以下面几条
 * 都是虚拟化之后才出现的行为。
 */
describe('ResourceList：编辑态与虚拟窗口的关系', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /*
   * B1 的核心。编辑中的行被滚出窗口 → 行卸载 → editable-text 走 disconnectedCallback，
   * 而它只释放按键与 autosize，不提交也不取消；提交只有 _onBlur 与 Enter/Escape 两条，
   * 都要求焦点还在那个 textarea 上。DOM 被摘掉时两条都不走，草稿就此静默丢失，
   * editingNameKey 还留在一个没有行的下标上，滚回来只会渲染出一个空编辑器。
   */
  /*
   * 第一道防线单独的可观测场景：视口为 0 时夹取放弃，并入是唯一防线。
   *
   * 正常情况下两道防线互相掩盖——夹取把编辑行拉进视口，虚拟窗口就自然会渲染它，所以
   * 「行还在 DOM 里」单靠夹取也成立，删掉并入照样绿。要单独验并入，得让夹取确实动不了：
   * 页面被隐藏（innerHeight 0，抽屉/标签页切走、或浏览器最小化）时 clampEditingRowIntoView
   * 在 !viewport 处直接 return，这时编辑行若不在渲染窗口内就会被卸载，草稿丢失。
   *
   * 这不是构造出来的边角：editable-text 的 disconnectedCallback 不提交也不取消，
   * 行一被摘掉，用户输入的草稿就没了。
   */
  it('视口为 0、夹取动不了时，编辑行仍靠并入留在 DOM 里', async () => {
    const resources = Array.from({ length: 1000 }, (_, i) => resource({ id: `r${i}`, title: `资源 ${i}` }))
    const mounted = await mountList(resources, [], { editingNameKey: 'r900' })
    const setViewport = (height: number) =>
      Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => height })
    try {
      await flushRenders()
      // 视口归零：夹取在 !viewport 处 return，不会把编辑行拉回来
      setViewport(0)
      window.scrollTo({ top: 20_000 })
      await flushRenders()

      // 视口为 0 时「在不在视口内」已无意义，判据落回 DOM：行与编辑器都还在
      const editingRow = mounted.host.querySelector('[data-resource-id="r900"]')
      expect(editingRow).not.toBeNull()
      expect(editingRow!.querySelector('web-ui-editable-text')).not.toBeNull()

      // 对照组：同样远离窗口、没进编辑态的行不在 DOM。并排才能说明「编辑行在」是因为
      // 并入，而不是因为它恰好被渲染出来。
      expect(mounted.host.querySelector('[data-resource-id="r950"]')).toBeNull()
    } finally {
      mounted.unmount()
    }
  })

  /*
   * pin 走的是夹取而不是 scrollToIndex：越界时只把边界收到刚好装得下这一行，窗口内的
   * 滚动一个字节都不动。用 scrollToIndex 会把人从当前看的位置拽到行首。
   * 目标行取 r900——它在 1000 行的尾部，mount 时远在视口之外，只有夹取会把它拉进来。
   * window 模式下滚动位置读 window.scrollY。
   */
  it('编辑行远在视口之外时夹回视口，而不是重置滚动位置', async () => {
    const resources = Array.from({ length: 1000 }, (_, i) => resource({ id: `r${i}`, title: `资源 ${i}` }))
    const mounted = await mountList(resources, [], { editingNameKey: 'r900' })
    try {
      await flushRenders()
      // 尾部行要滚到接近底部才装得下：视口 600px、行高 40px
      expect(currentScrollY()).toBeGreaterThan(0)
      expect(mounted.host.querySelector('[data-resource-id="r900"]')).not.toBeNull()
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 夹取而不是 scrollToIndex——两者在「越界时」的表现不同，要分两处验。
   *
   * 这里验「视口内时一个字节都不动」：编辑行取 r500，进入编辑态时夹取已把它拉到能看见
   * 的高度。此刻再往下滚一点点（不越出视口），滚动位置必须原样保留。
   * scrollToIndex 在这里会把位置重置到行首——那是它与夹取的分界。
   *
   * 注意不能滚太远：滚出行高之外视口，pin 的第二道防线会把它夹回来（那是「越界时」的
   * 行为，由下面两条用例负责），这里只管视口内。
   */
  it('编辑行本来就在视口内时滚动位置不动', async () => {
    const resources = Array.from({ length: 1000 }, (_, i) => resource({ id: `r${i}`, title: `资源 ${i}` }))
    const mounted = await mountList(resources, [], { editingNameKey: 'r500' })
    try {
      await flushRenders()
      // 夹取先把它拉到能看见的位置：它在中段，落点必然远离列表开头
      const clamped = currentScrollY()
      expect(clamped).toBeGreaterThan(1000)

      // 行已在视口内，滚一个远小于视口高度的量（200 < 600），仍在同一屏内
      window.scrollTo({ top: clamped + 200 })
      await flushRenders()

      expect(currentScrollY()).toBe(clamped + 200)
      // 不该被重置到行首附近（scrollToIndex 的行为）
      expect(currentScrollY()).not.toBeLessThan(1000)
    } finally {
      mounted.unmount()
    }
  })

  /*
   * 编辑期间用户随手把列表滚走时，编辑行要被夹回视野——否则行还在 DOM 里（草稿没丢），
   * 但用户正对着一个看不见的编辑器继续打字。滚到底把编辑行彻底推出视口。
   */
  it('编辑期间滚走列表会把编辑行夹回视野', async () => {
    const resources = Array.from({ length: 1000 }, (_, i) => resource({ id: `r${i}`, title: `资源 ${i}` }))
    const editingNameKey = ref<string | null>('r2')
    const host = document.createElement('div')
    document.body.append(host)
    const restoreLayout = stubLayout()
    const app = createApp({
      render: () =>
        h(ResourceList, {
          resources,
          activeResourceId: null,
          checkedIds: [],
          selectionMode: false,
          editingNameKey: editingNameKey.value,
          editorRef: () => () => {},
          loading: false,
          runtimeAvailable: true,
          emptyDescription: '',
          mediaUrlFor: () => null
        })
    })
    app.mount(host)
    await flushRenders()
    try {
      const container = host.querySelector<HTMLElement>('[role="list"]')!
      expect(currentScrollY()).toBe(0)

      // 滚到 20000，把第 2 行彻底甩出视口。window 模式下滚动的是页面，位置读 scrollY。
      window.scrollTo({ top: 20_000 })
      await flushRenders()

      const editingRow = host.querySelector('[data-resource-id="r2"]')
      expect(editingRow).not.toBeNull()
      // 夹回之后编辑行仍在视口内：它的起点不小于 scrollY，底也不超出视口下沿。
      // 行的 transform 是 row.start - listOffset，jsdom 里 rect 恒为 0 故 listOffset 为 0。
      const offsetTop = Number(editingRow!.parentElement!.style.transform.match(/translateY\((-?\d+)px\)/)?.[1] ?? 0)
      expect(currentScrollY()).toBeLessThanOrEqual(offsetTop)
      expect(offsetTop + ROW_HEIGHT).toBeLessThanOrEqual(currentScrollY() + VIEWPORT_HEIGHT)
    } finally {
      app.unmount()
      host.remove()
      restoreLayout()
    }
  })
})

/*
 * S1：getItemKey 用资源 id，itemSizeCache 按 key 持久，setOptions 只在 anchorTo === 'end'
 * 时做 key 变化检测。顺序变了之后每条资源的缓存高度跟着 id 走，行位必须跟着资源走。
 */
describe('ResourceList：顺序变化后的行位', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('反转顺序后行仍按新下标定位，不按旧缓存错位', async () => {
    const resources = Array.from({ length: 40 }, (_, i) => resource({ id: `r${i}` }))
    const host = document.createElement('div')
    document.body.append(host)
    const restoreLayout = stubLayout()
    const order = ref(resources)
    const app = createApp({
      render: () =>
        h(ResourceList, {
          resources: order.value,
          activeResourceId: null,
          checkedIds: [],
          selectionMode: false,
          editingNameKey: null,
          editorRef: () => () => {},
          loading: false,
          runtimeAvailable: true,
          emptyDescription: '',
          mediaUrlFor: () => null
        })
    })
    app.mount(host)
    await flushRenders()
    try {
      const before = [...host.querySelectorAll('[data-resource-row]')].map(node =>
        node.getAttribute('data-resource-index')
      )
      expect(before.length).toBeGreaterThan(0)

      order.value = [...resources].reverse()
      await flushRenders()

      // 反转之后第 0 行是原来的最后一条。行位跟着资源走，断言的是下标与 id 对得上，
      // 不是 DOM 顺序本身——DOM 顺序由虚拟窗口的排序保证。
      const rows = [...host.querySelectorAll('[data-resource-row]')]
      for (const node of rows) {
        const index = Number(node.getAttribute('data-resource-index'))
        const id = node.getAttribute('data-resource-id')
        expect(id).toBe(`r${39 - index}`)
      }
      const indices = rows.map(node => Number(node.getAttribute('data-resource-index')))
      expect(indices).toEqual([...indices].sort((a, b) => a - b))
    } finally {
      app.unmount()
      host.remove()
      restoreLayout()
    }
  })
})

/*
 * S2：落焦轮询原本没有取消机制，方向键连按时先发的那一轮可能在后一轮落焦之后才等到
 * 目标行，把焦点从用户已经移开的行拽回去；组件卸载后还会一路空转到超时上限。
 */
describe('ResourceList：连按方向键与卸载后的落焦', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /*
   * 竞态的形状：先按 End 落焦到第 999 行，那一行此刻还没挂载，轮询在等；不等它落定又按
   * 一下方向键，第二次请求把焦点交给第 1 行。第一轮醒来时如果没有请求号可核对，就会把
   * 焦点从第 1 行拽回第 999 行——方向键连按（最常见的键盘用法）最忌讳这个。
   */
  it('连按方向键时，先发的那一轮不会把焦点拽回它自己的目标', async () => {
    const resources = Array.from({ length: 1000 }, (_, i) => resource({ id: `r${i}` }))
    const mounted = await mountList(resources)
    try {
      const container = mounted.container!
      container.focus()
      keydown(container, { key: 'Enter' })
      await flushRenders()
      const firstRow = mounted.rows[0]!
      expect(document.activeElement).toBe(firstRow)

      keydown(firstRow, { key: 'End' })
      // 不等第一轮落定就再按一下：此时焦点仍在第 0 行，第二次请求的目标是第 1 行
      keydown(firstRow, { key: 'ArrowDown' })
      // 放行足够长的时间让第一轮轮询醒来（16ms 一跳）
      await new Promise(resolve => setTimeout(resolve, 120))
      await flushRenders()

      expect(document.activeElement?.getAttribute('data-resource-index')).toBe('1')
    } finally {
      mounted.unmount()
    }
  })

  it('卸载之后落焦轮询不再空转', async () => {
    const resources = ['a', 'b', 'c'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    const container = mounted.container!
    container.focus()
    // End 要滚过整段列表才落焦，轮询在目标行出现之前会先排上好几跳
    keydown(container, { key: 'End' })
    await flushRenders()

    // 假定时器：把已排出去的跳握在手里，逐个唤醒，看它还排不排新的
    const scheduled: (() => void)[] = []
    const originalSetTimeout = globalThis.setTimeout
    globalThis.setTimeout = ((fn: () => void) => {
      scheduled.push(fn)
      return 0
    }) as unknown as typeof setTimeout
    let drained = 0
    try {
      mounted.unmount()
      // 唤醒全部已排的跳，直到不再有新跳。没有取消机制时这会一直排到 1000ms 上限。
      while (scheduled.length) {
        const fn = scheduled.shift()!
        drained++
        if (drained > 200) break
        fn()
      }
      expect(drained).toBeLessThanOrEqual(1)
    } finally {
      globalThis.setTimeout = originalSetTimeout
    }
  })
})
