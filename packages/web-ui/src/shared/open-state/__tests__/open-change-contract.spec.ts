import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '@/components/context-menu'
import '@/components/dropdown'
import '@/components/popover'
import '@/components/tooltip'
import { getMenuPanels, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

/**
 * `open-change` 的共享契约矩阵。
 *
 * `shared/open-state` 是浮层族 `open-change` 的唯一致出点，模块注释写明了它的
 * **notification 语义**：组件总是自行变更 `open`，事件只作通知（与 dialog / drawer /
 * layout 的 request 语义相对）。由此可得一条跨组件恒定的契约：
 *
 * **程序式变更（属性或公开方法）静默；只有用户手势才派发 `open-change`，
 * 且 `detail.open` 是变更后的值。**
 *
 * 本矩阵把这条契约收敛到一处（原先在 popover / tooltip / dropdown / context-menu
 * 四个 spec 里各自重写一遍）。各组件 spec 只保留自身特有的触发路径与边界，
 * 例如 popover 的「hover 重入不让后续命令式关闭派发残留事件」。
 */

type Openable = HTMLElement & { updateComplete: Promise<unknown>; isOpen: boolean; open: boolean }

interface OpenChangeSpec {
  name: string
  /** 建宿主并挂到文档上 */
  create: () => Openable
  /** 程序式打开：属性或公开方法 */
  programOpen: (el: Openable) => void
  /** 程序式关闭：属性或公开方法 */
  programClose: (el: Openable) => void
  /** 用户手势打开 */
  userOpen: (el: Openable) => void
  /** 用户手势关闭 */
  userClose: (el: Openable) => void
  /**
   * 再次以程序式施加**同一目标状态**（幂等通道），且**复用 `programOpen` 的同一入口**。
   *
   * 与 `programOpen` 的区别只在「值没有变化」：原 popover spec 的 `相同值不重复触发`
   * 断言的就是这条 —— 冗余的同值写入既不该改变状态，也不该补发通知。
   */
  programRepeat: (el: Openable) => void
  /**
   * 当 `programOpen` 走的是公开**方法**（`show()` / `openMenu()`）时，属性面
   * `el.open = true` 是与它并列的另一个程序式入口，需单独覆盖；`open` 即
   * `programOpen` 的通道时省略。
   */
  programOpenByProperty?: (el: Openable) => void
  /**
   * 「已打开」的**可观察后果**（面板已挂载且非 `hidden`），供属性面用例做状态断言。
   *
   * 属性面用例不能断言 `el.open`：它是 `@property({ reflect: true })` 的公开属性，
   * 赋值后自读恒为 true（`isOpen` 也只是 `() => this.open` 的别名），断言它属同义反复、
   * 对回归零保护。改断言面板真的被挂出来了。
   */
  openedConsequence?: (el: Openable) => boolean
}

function mount(tag: string, attrs: Record<string, string> = {}): Openable {
  const el = document.createElement(tag) as Openable
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  document.body.appendChild(el)
  return el
}

/** 公开方法的类型收窄，避免在矩阵表里写长交叉类型。 */
type Showable = { show: () => void; close: () => void }
type Menuable = { openMenu: () => void; closeAll: () => void }
type Anchorable = { openAt: (x: number, y: number) => void; close: () => void }

const COVERS: ReadonlyArray<OpenChangeSpec> = [
  {
    name: 'web-ui-popover',
    create: () => {
      const el = mount('web-ui-popover')
      el.innerHTML = '<button slot="trigger">T</button><div>C</div>'
      return el
    },
    programOpen: el => (el as unknown as Showable).show(),
    programClose: el => (el as unknown as Showable).close(),
    userOpen: el => el.querySelector<HTMLElement>('[slot="trigger"]')?.click(),
    userClose: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
    programRepeat: el => (el as unknown as Showable).show(),
    programOpenByProperty: el => (el.open = true),
    openedConsequence: el => {
      const panel = queryA11y(el, '[role="dialog"]')
      return panel !== null && !panel.hasAttribute('hidden')
    }
  },
  {
    name: 'web-ui-tooltip',
    create: () => {
      const el = mount('web-ui-tooltip', { 'show-delay': '0', 'hide-delay': '0', content: '提示' })
      el.innerHTML = '<button>T</button>'
      return el
    },
    programOpen: el => (el.open = true),
    programClose: el => (el.open = false),
    userOpen: el => el.dispatchEvent(new PointerEvent('pointerenter')),
    userClose: el => el.dispatchEvent(new PointerEvent('pointerleave')),
    // tooltip 的程序式入口本身就是 open 属性，属性面无需另立一列。
    programRepeat: el => (el.open = true)
  },
  {
    name: 'web-ui-dropdown',
    create: () => {
      const el = mount('web-ui-dropdown')
      el.innerHTML =
        '<button slot="trigger">M</button><web-ui-dropdown-item>a</web-ui-dropdown-item><web-ui-dropdown-item>b</web-ui-dropdown-item>'
      return el
    },
    programOpen: el => (el as unknown as Menuable).openMenu(),
    programClose: el => (el as unknown as Menuable).closeAll(),
    userOpen: el => el.querySelector<HTMLElement>('[slot="trigger"]')?.click(),
    userClose: el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    programRepeat: el => (el as unknown as Menuable).openMenu(),
    programOpenByProperty: el => (el.open = true),
    openedConsequence: () => getMenuPanels().length > 0
  },
  {
    name: 'web-ui-context-menu',
    create: () => {
      const el = mount('web-ui-context-menu')
      el.innerHTML =
        '<web-ui-dropdown-item>编辑</web-ui-dropdown-item><web-ui-dropdown-item>复制</web-ui-dropdown-item>'
      return el
    },
    programOpen: el => (el as unknown as Anchorable).openAt(100, 100),
    programClose: el => (el as unknown as Anchorable).close(),
    userOpen: el =>
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 })),
    userClose: el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    // context-menu 没有公开 `open` 属性（只有 openAt()/close()），同值通道即重复定位到同一坐标。
    programRepeat: el => (el as unknown as Anchorable).openAt(100, 100)
  }
]

/**
 * 推进到稳定态。本套件启用全量 fake 定时器（**含 requestAnimationFrame**），
 * 故打开/关闭事务的帧回调与 show/hide 延时都用 `advanceTimersByTime` 消费，
 * 不能用真实帧等待（会挂死）。
 */
async function settle(el: Openable): Promise<void> {
  await waitForUpdate(el)
  vi.advanceTimersByTime(600)
  await waitForUpdate(el)
  vi.advanceTimersByTime(600)
  await waitForUpdate(el)
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('open-change 契约（notification 语义：程序式静默，用户手势通知）', () => {
  for (const spec of COVERS) {
    describe(`${spec.name}`, () => {
      it('程序式打开不派发 open-change', async () => {
        const el = spec.create()
        await settle(el)
        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

        spec.programOpen(el)
        await settle(el)

        expect(el.isOpen, '程序式打开应生效').toBe(true)
        expect(events, '程序式变更不是用户手势').toHaveLength(0)

        detach()
      })

      it('程序式关闭不派发 open-change', async () => {
        const el = spec.create()
        await settle(el)
        spec.programOpen(el)
        await settle(el)
        expect(el.isOpen).toBe(true)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.programClose(el)
        await settle(el)

        expect(el.isOpen, '程序式关闭应生效').toBe(false)
        expect(events, '程序式变更不是用户手势').toHaveLength(0)

        detach()
      })

      it('用户手势打开派发一次 open-change，detail.open 为 true', async () => {
        const el = spec.create()
        await settle(el)
        expect(el.isOpen).toBe(false)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.userOpen(el)
        await settle(el)

        expect(el.isOpen).toBe(true)
        expect(events, '用户手势应通知一次').toHaveLength(1)
        expect(events[0]?.detail?.open).toBe(true)

        detach()
      })

      it('用户手势关闭派发一次 open-change，detail.open 为 false', async () => {
        const el = spec.create()
        await settle(el)
        spec.userOpen(el)
        await settle(el)
        expect(el.isOpen).toBe(true)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.userClose(el)
        await settle(el)

        expect(el.isOpen).toBe(false)
        expect(events, '用户手势应通知一次').toHaveLength(1)
        expect(events[0]?.detail?.open).toBe(false)

        detach()
      })

      it('程序式重复施加同一目标状态（同一入口）不派发 open-change', async () => {
        const el = spec.create()
        await settle(el)
        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

        spec.programOpen(el)
        await settle(el)
        expect(el.isOpen, '前置：程序式打开应已生效').toBe(true)

        // 以**同一入口**再次施加同一目标状态：状态不变，也不得补发通知。
        // （context-menu 无公开 `open` 属性，其同值通道即重复定位到同一坐标。）
        spec.programRepeat(el)
        await settle(el)

        expect(el.isOpen, '重复施加同一目标状态不应改变状态').toBe(true)
        expect(events, '程序式重复施加不是用户手势').toHaveLength(0)

        detach()
      })
    })
  }

  // 属性面与公开方法面并列：`programOpen` 走方法的组件，`el.open = true` 这条入口要单独覆盖
  // （原 popover spec 的 `程序打开不触发` 断言的正是属性面）。
  for (const spec of COVERS.filter(candidate => candidate.programOpenByProperty !== undefined)) {
    describe(`${spec.name}`, () => {
      it('程序式属性变更（open 属性）不派发 open-change', async () => {
        const openByProperty = spec.programOpenByProperty as (el: Openable) => void
        const opened = spec.openedConsequence as (el: Openable) => boolean
        const el = spec.create()
        await settle(el)
        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

        openByProperty(el)
        await settle(el)

        // 不断言 `el.open`（reflect 属性自读恒真）；断言面板真的挂出来且非 hidden。
        expect(opened(el), '属性面程序式打开应真的挂出面板').toBe(true)
        expect(events, '程序式变更不是用户手势').toHaveLength(0)

        detach()
      })
    })
  }
})
