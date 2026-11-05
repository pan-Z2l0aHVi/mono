import '@/components/context-menu'
import '@/components/dropdown'
import '@/components/dropdown-item'
import '@/components/popover'
import '@/components/tooltip'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { getMenuPanels, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

/**
 * `open-change` 的共享契约矩阵。
 *
 * 带 trigger 的 overlay 统一遵循两条通道：
 *
 * - **声明式静默**：直接写 `open` 属性只改状态，不派发事件；消费者经属性回写即可闭环。
 * - **命令式与手势通知**：`show()` / `hide()` 以及用户手势各派发一次，
 *   `detail.open` 是变更后的值。
 *
 * 同值重复施加任一通道都不派发。context-menu 没有 trigger 与声明式 `open`，
 * `openAt()` / `close()` 保持其文档契约（静默），只覆盖它的用户手势。
 */

type Openable = HTMLElement & { updateComplete: Promise<unknown>; isOpen: boolean; open: boolean }

/** 公开方法的类型收窄，避免在矩阵表里写长交叉类型。 */
type Showable = { show: () => void; hide: () => void }
type Anchorable = { openAt: (x: number, y: number) => void; close: () => void }

interface TriggerOpenChangeSpec {
  name: string
  create: () => Openable
  declarativeOpen: (el: Openable) => void
  declarativeClose: (el: Openable) => void
  imperativeOpen: (el: Openable) => void
  imperativeClose: (el: Openable) => void
  userOpen: (el: Openable) => void
  userClose: (el: Openable) => void
  /** 「已打开」的可观察后果（panel 已挂载且非 `hidden`）。 */
  openedConsequence: (el: Openable) => boolean
}

function mount(tag: string, attrs: Record<string, string> = {}): Openable {
  const el = document.createElement(tag) as Openable
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  document.body.appendChild(el)
  return el
}

const COVERS: ReadonlyArray<TriggerOpenChangeSpec> = [
  {
    name: 'web-ui-popover',
    create: () => {
      const el = mount('web-ui-popover')
      el.innerHTML = '<button slot="trigger">T</button><div>C</div>'
      return el
    },
    declarativeOpen: el => (el.open = true),
    declarativeClose: el => (el.open = false),
    imperativeOpen: el => (el as unknown as Showable).show(),
    imperativeClose: el => (el as unknown as Showable).hide(),
    userOpen: el => el.querySelector<HTMLElement>('[slot="trigger"]')?.click(),
    userClose: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
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
    declarativeOpen: el => (el.open = true),
    declarativeClose: el => (el.open = false),
    imperativeOpen: el => (el as unknown as Showable).show(),
    imperativeClose: el => (el as unknown as Showable).hide(),
    userOpen: el => el.dispatchEvent(new PointerEvent('pointerenter')),
    userClose: el => el.dispatchEvent(new PointerEvent('pointerleave')),
    openedConsequence: el => {
      const panel = queryA11y(el, '[role="tooltip"]')
      return panel !== null && !panel.hasAttribute('hidden')
    }
  },
  {
    name: 'web-ui-dropdown',
    create: () => {
      const el = mount('web-ui-dropdown')
      el.innerHTML =
        '<button slot="trigger">M</button><web-ui-dropdown-item>a</web-ui-dropdown-item><web-ui-dropdown-item>b</web-ui-dropdown-item>'
      return el
    },
    declarativeOpen: el => (el.open = true),
    declarativeClose: el => (el.open = false),
    imperativeOpen: el => (el as unknown as Showable).show(),
    imperativeClose: el => (el as unknown as Showable).hide(),
    userOpen: el => el.querySelector<HTMLElement>('[slot="trigger"]')?.click(),
    userClose: el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    openedConsequence: () => getMenuPanels().length > 0
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

describe('open-change 契约（声明式静默，命令式与手势通知）', () => {
  for (const spec of COVERS) {
    describe(`${spec.name}`, () => {
      it('声明式打开不派发 open-change', async () => {
        const el = spec.create()
        await settle(el)
        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

        spec.declarativeOpen(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(true)
        expect(events).toHaveLength(0)

        detach()
      })

      it('声明式关闭不派发 open-change', async () => {
        const el = spec.create()
        await settle(el)
        spec.declarativeOpen(el)
        await settle(el)
        expect(spec.openedConsequence(el)).toBe(true)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.declarativeClose(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(false)
        expect(events).toHaveLength(0)

        detach()
      })

      it('命令式打开派发一次 open-change，detail.open 为 true', async () => {
        const el = spec.create()
        await settle(el)
        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

        spec.imperativeOpen(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(true)
        expect(events.map(event => event.detail?.open)).toEqual([true])

        detach()
      })

      it('命令式关闭派发一次 open-change，detail.open 为 false', async () => {
        const el = spec.create()
        await settle(el)
        spec.imperativeOpen(el)
        await settle(el)
        expect(spec.openedConsequence(el)).toBe(true)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.imperativeClose(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(false)
        expect(events.map(event => event.detail?.open)).toEqual([false])

        detach()
      })

      it('用户手势打开派发一次 open-change，detail.open 为 true', async () => {
        const el = spec.create()
        await settle(el)
        expect(spec.openedConsequence(el)).toBe(false)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.userOpen(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(true)
        expect(events.map(event => event.detail?.open)).toEqual([true])

        detach()
      })

      it('用户手势关闭派发一次 open-change，detail.open 为 false', async () => {
        const el = spec.create()
        await settle(el)
        spec.userOpen(el)
        await settle(el)
        expect(spec.openedConsequence(el)).toBe(true)

        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')
        spec.userClose(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(false)
        expect(events.map(event => event.detail?.open)).toEqual([false])

        detach()
      })

      it('命令式重复施加同一目标状态不补发 open-change', async () => {
        const el = spec.create()
        await settle(el)
        const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

        spec.imperativeOpen(el)
        await settle(el)
        expect(spec.openedConsequence(el)).toBe(true)
        const before = events.length

        // 以**同一入口**再次施加同一目标状态：状态不变，也不得补发通知。
        spec.imperativeOpen(el)
        await settle(el)

        expect(spec.openedConsequence(el)).toBe(true)
        expect(events.length).toBe(before)

        detach()
      })
    })
  }
})

describe('open-change 契约：context-menu（无 trigger、无声明式 open）', () => {
  const create = () => {
    const el = mount('web-ui-context-menu')
    el.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item><web-ui-dropdown-item>复制</web-ui-dropdown-item>'
    return el
  }
  const opened = () => getMenuPanels().length > 0

  it('openAt() / close() 按其文档保持静默', async () => {
    const el = create()
    await settle(el)
    const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

    ;(el as unknown as Anchorable).openAt(100, 100)
    await settle(el)
    expect(opened()).toBe(true)
    expect(events).toHaveLength(0)

    ;(el as unknown as Anchorable).close()
    await settle(el)
    expect(opened()).toBe(false)
    expect(events).toHaveLength(0)

    detach()
  })

  it('用户手势打开与关闭各派发一次 open-change', async () => {
    const el = create()
    await settle(el)
    const [events, detach] = spyEvents<CustomEvent>(el, 'open-change')

    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await settle(el)
    expect(opened()).toBe(true)
    expect(events.map(event => event.detail?.open)).toEqual([true])

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle(el)
    expect(opened()).toBe(false)
    expect(events.map(event => event.detail?.open)).toEqual([true, false])

    detach()
  })
})

// jsdom 未实现原生 dialog 的 modal 语义，这里局部补足 showModal/close 对 open 的影响。
// 本文件在 jsdom 下驱动 context-menu（模态 scrim 走 `showModal()`），缺这两个方法会直接抛错，
// menu 根本开不起来，下面所有 open-change 断言会连带失败 —— 那是环境缺陷，不是契约缺陷。
// 刻意不做成 test-helper 里的全局 shim，理由见 test-helper.ts 末尾。
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}
