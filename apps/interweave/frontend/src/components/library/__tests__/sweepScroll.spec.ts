// @vitest-environment jsdom

import type { Mock } from 'vite-plus/test'
import { describe, expect, it, vi } from 'vite-plus/test'

import {
  SWEEP_EDGE_ZONE,
  SWEEP_MAX_SPEED,
  SWEEP_TOUCH_HOLD_MS,
  SWEEP_TOUCH_SLOP,
  type SweepBlockerTarget,
  SweepScrollController,
  type SweepGestureTarget
} from '../sweepScroll'

/*
 * 只测 controller 的状态机与物理，不 mount 组件：行命中、勾选、滚动面与时间源全部用
 * 手工桩替换。事件对象也用手工对象——controller 只读那几个字段，jsdom 没有 PointerEvent。
 */

type Listener = (event: unknown) => void

function fakeTarget() {
  const listeners = new Map<string, Listener[]>()
  return {
    listeners,
    addEventListener(type: string, listener: Listener) {
      const list = listeners.get(type) ?? []
      list.push(listener)
      listeners.set(type, list)
    },
    removeEventListener(type: string, listener: Listener) {
      const list = listeners.get(type) ?? []
      listeners.set(
        type,
        list.filter(item => item !== listener)
      )
    },
    count(type: string) {
      return (listeners.get(type) ?? []).length
    },
    dispatch(type: string, event: unknown) {
      // 先取快照再派发：监听器可能自行解绑，边迭代活数组边删会跳步。
      const snapshot = [...(listeners.get(type) ?? [])]
      for (const listener of snapshot) listener(event)
    }
  }
}

interface SweepHarness {
  controller: SweepScrollController
  setChecked: Mock<(resourceId: string, checked: boolean) => void>
  hitTest: Mock<(x: number, y: number) => string | null>
  scrollY: { value: number }
  frames: FrameRequestCallback[]
  timers: { callback: () => void; delay: number; cleared: boolean }[]
  gesture: ReturnType<typeof fakeTarget>
  blocker: ReturnType<typeof fakeTarget>
  runFrame: () => void
  fireHoldTimer: () => void
}

function createSweep(
  options: {
    enabled?: boolean
    checkedIds?: string[]
    innerHeight?: number
    maxScrollY?: number
    hitAt?: (x: number, y: number) => string | null
  } = {}
): SweepHarness {
  const scrollY = { value: 0 }
  const frames: FrameRequestCallback[] = []
  const timers: SweepHarness['timers'] = []
  const gesture = fakeTarget()
  const blocker = fakeTarget()
  const harness: SweepHarness = {
    setChecked: vi.fn<(resourceId: string, checked: boolean) => void>(),
    hitTest: vi.fn<(x: number, y: number) => string | null>(options.hitAt ?? (() => null)),
    scrollY,
    frames,
    timers,
    gesture,
    blocker,
    controller: null as unknown as SweepScrollController,
    runFrame() {
      const callback = frames.shift()
      callback?.(0)
    },
    fireHoldTimer() {
      for (const timer of timers) if (!timer.cleared) timer.callback()
    }
  }
  harness.controller = new SweepScrollController({
    isEnabled: () => options.enabled ?? true,
    hitTest: (x, y) => harness.hitTest(x, y),
    isRowChecked: id => (options.checkedIds ?? []).includes(id),
    setChecked: harness.setChecked,
    viewport: {
      innerHeight: () => options.innerHeight ?? 600,
      scrollY: () => scrollY.value,
      maxScrollY: () => options.maxScrollY ?? 10_000,
      scrollTo: top => {
        scrollY.value = top
      }
    },
    scheduler: {
      requestFrame: callback => {
        frames.push(callback)
        return frames.length - 1
      },
      cancelFrame: () => {
        frames.length = 0
      },
      setTimeout: (callback, delay) => {
        const timer = { callback, delay, cleared: false }
        timers.push(timer)
        return timer
      },
      clearTimeout: timer => {
        ;(timer as { cleared: boolean }).cleared = true
      }
    },
    gestureTarget: gesture as unknown as SweepGestureTarget,
    blockerTarget: blocker as unknown as SweepBlockerTarget
  })
  return harness
}

function rowElement(id: string) {
  const row = document.createElement('div')
  row.setAttribute('data-resource-row', '')
  row.dataset.resourceId = id
  return row
}

/**
 * 手工事件桩：controller 只读 pointerType / button / isPrimary / clientX / clientY / target，
 * jsdom 没有 PointerEvent，按最小字段面声明一次，调用点无需逐个 cast。
 * move 事件从 window 级监听进来，target 用 null。
 */
function pointerEvent(target: Element | null, init: Record<string, unknown> = {}, pointerType = 'mouse') {
  return {
    pointerType,
    button: 0,
    isPrimary: true,
    clientX: 0,
    clientY: 0,
    target,
    ...init
  } as unknown as PointerEvent
}

function touchMove(clientY: number, touches = [{ clientX: 0, clientY }]) {
  return { touches, preventDefault: vi.fn<() => void>() }
}

describe('SweepScrollController：鼠标扫选', () => {
  it('主键按下即武装，方向按按下行的当前状态定死', () => {
    const harness = createSweep({ checkedIds: [] })
    const row = rowElement('a')
    harness.controller.handlePointerDown(pointerEvent(row))
    expect(harness.setChecked).toHaveBeenCalledExactlyOnceWith('a', true)

    const onCheckedRow = createSweep({ checkedIds: ['b'] })
    onCheckedRow.controller.handlePointerDown(pointerEvent(rowElement('b')))
    expect(onCheckedRow.setChecked).toHaveBeenCalledExactlyOnceWith('b', false)
  })

  it('划过的行逐个应用，同一行不重复应用；划回去可以再次应用', () => {
    const rows = new Map(['a', 'b', 'c'].map(id => [id, rowElement(id)]))
    const harness = createSweep({
      hitAt: (_x, y) => (y === 1 ? 'a' : y === 2 ? 'b' : y === 3 ? 'b' : 'c')
    })
    harness.controller.handlePointerDown(pointerEvent(rows.get('a')!))
    expect(harness.setChecked).toHaveBeenCalledExactlyOnceWith('a', true)

    // move 只能从 window 级监听进来
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 2 }))
    expect(harness.setChecked).toHaveBeenLastCalledWith('b', true)

    // 同一行连续两次 move 不重复应用
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 3 }))
    expect(harness.setChecked).toHaveBeenCalledTimes(2)

    // 划回 a：lastId 已不是 a，允许再次应用（状态语义，不是翻状态）
    harness.hitTest.mockReturnValue('a')
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 1 }))
    expect(harness.setChecked).toHaveBeenLastCalledWith('a', true)
  })

  it('非选择模式不启动扫选', () => {
    const harness = createSweep({ enabled: false })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))
    expect(harness.setChecked).not.toHaveBeenCalled()
    expect(harness.gesture.count('pointermove')).toBe(0)
    expect(harness.gesture.count('pointerup')).toBe(0)
  })

  it.each([
    ['右键按下', { button: 2 }],
    ['非主键（多点触控的第二根手指）', { isPrimary: false }]
  ])('%s 不启动扫选', (_label, init) => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), init))
    expect(harness.setChecked).not.toHaveBeenCalled()
    // window 级 move/up/cancel 监听只在手势真正开始后注册
    expect(harness.gesture.count('pointermove')).toBe(0)
    expect(harness.gesture.count('pointerup')).toBe(0)
  })

  it('勾选框和行内编辑器上的按下不参与扫选', () => {
    const harness = createSweep()
    const row = rowElement('a')
    const checkbox = document.createElement('web-ui-checkbox')
    row.append(checkbox)

    harness.controller.handlePointerDown(pointerEvent(checkbox))
    expect(harness.setChecked).not.toHaveBeenCalled()

    const editor = document.createElement('web-ui-editable-text')
    row.append(editor)
    harness.controller.handlePointerDown(pointerEvent(editor))
    expect(harness.setChecked).not.toHaveBeenCalled()
  })

  it('按下不落在任何行上时不启动扫选', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(document.createElement('div')))
    expect(harness.setChecked).not.toHaveBeenCalled()
  })

  it('手势激活后收尾：补发 click 被吃掉且只吃一次', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))
    harness.gesture.dispatch('pointerup', {})

    expect(harness.controller.consumeRowClick()).toBe(true)
    expect(harness.controller.consumeRowClick()).toBe(false)
  })

  it('没有激活过的手势不吃 click', () => {
    const harness = createSweep()
    expect(harness.controller.consumeRowClick()).toBe(false)
  })

  it('收尾后摘掉 window 级手势监听，后续 move 不再应用', () => {
    const harness = createSweep({ hitAt: () => 'b' })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))
    harness.gesture.dispatch('pointerup', {})
    const applied = harness.setChecked.mock.calls.length
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 1 }))
    expect(harness.setChecked.mock.calls.length).toBe(applied)
    expect(harness.gesture.count('pointermove')).toBe(0)
    expect(harness.gesture.count('pointerup')).toBe(0)
    expect(harness.gesture.count('pointercancel')).toBe(0)
  })
})

describe('SweepScrollController：触摸长按确认', () => {
  it('长按到阈值才武装并勾上首行，同时压住系统 contextmenu', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), {}, 'touch'))
    expect(harness.setChecked).not.toHaveBeenCalled()

    harness.fireHoldTimer()
    expect(harness.setChecked).toHaveBeenCalledExactlyOnceWith('a', true)
    expect(harness.controller.isContextMenuSuppressed()).toBe(true)
  })

  it('长按计时器按 320ms 起跳', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), {}, 'touch'))
    expect(harness.timers.map(timer => timer.delay)).toEqual([SWEEP_TOUCH_HOLD_MS])
  })

  it('确认前移动超过 slop 判定为滚动，放弃扫选', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), { clientX: 100, clientY: 100 }, 'touch'))
    harness.gesture.dispatch(
      'pointermove',
      pointerEvent(null, { clientX: 100 + SWEEP_TOUCH_SLOP + 1, clientY: 100, pointerType: 'touch' })
    )

    harness.fireHoldTimer()
    expect(harness.setChecked).not.toHaveBeenCalled()
    expect(harness.controller.isContextMenuSuppressed()).toBe(false)
  })

  it('确认前移动未超 slop 不放弃，到阈值照常武装', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), { clientX: 100, clientY: 100 }, 'touch'))
    harness.gesture.dispatch(
      'pointermove',
      pointerEvent(null, { clientX: 100 + SWEEP_TOUCH_SLOP, clientY: 100, pointerType: 'touch' })
    )
    harness.fireHoldTimer()
    expect(harness.setChecked).toHaveBeenCalledExactlyOnceWith('a', true)
  })

  it('抬手取消长按计时，之后到点也不武装', () => {
    const harness = createSweep()
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), {}, 'touch'))
    harness.gesture.dispatch('pointerup', {})

    harness.fireHoldTimer()
    expect(harness.setChecked).not.toHaveBeenCalled()
    expect(harness.controller.isContextMenuSuppressed()).toBe(false)
  })
})

describe('SweepScrollController：边缘自动滚', () => {
  it('指针贴底边时按帧向下滚，越贴边越快', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))

    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 600 - 1 }))
    harness.runFrame()
    const atEdge = harness.scrollY.value

    harness.scrollY.value = 0
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 600 - SWEEP_EDGE_ZONE / 2 }))
    harness.runFrame()
    const midEdge = harness.scrollY.value

    expect(atEdge).toBeGreaterThan(0)
    expect(midEdge).toBeGreaterThan(0)
    // 贴边（distance=1）的速度是上限的 (1 - 1/ZONE)，带内靠里（distance=ZONE/2）恰为一半：
    // 梯度方向错了（某一支的 distance 写反）这两个数会互换或倒挂
    expect(atEdge).toBeCloseTo(SWEEP_MAX_SPEED * (1 - 1 / SWEEP_EDGE_ZONE), 5)
    expect(midEdge).toBeCloseTo(SWEEP_MAX_SPEED / 2, 5)
    expect(midEdge).toBeLessThan(atEdge)
  })

  it('指针拖到视口外很远时单帧位移仍不超过速度上限', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))

    // 不钳的话 (1 - d/ZONE) 会随 d 线性无界增长
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 600 + 1000 }))
    harness.runFrame()
    expect(harness.scrollY.value).toBeLessThanOrEqual(SWEEP_MAX_SPEED)
    expect(harness.scrollY.value).toBeGreaterThan(0)

    harness.scrollY.value = 100
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: -1000 }))
    harness.runFrame()
    // 顶边那支：速度向上且被钳在 -SWEEP_MAX_SPEED，再被 maxScrollY/0 下限夹住
    expect(harness.scrollY.value).toBeGreaterThanOrEqual(0)
    expect(100 - harness.scrollY.value).toBeLessThanOrEqual(SWEEP_MAX_SPEED)
  })

  it('指针在边缘带之外时速度为 0，不排帧也不滚动', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))

    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 300 }))
    expect(harness.frames).toHaveLength(0)
    harness.runFrame()
    expect(harness.scrollY.value).toBe(0)
  })

  it('滚到可滚上限后停住，不再排帧', () => {
    const harness = createSweep({ innerHeight: 600, maxScrollY: 100 })
    harness.scrollY.value = 95
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 600 - 1 }))

    harness.runFrame()
    expect(harness.scrollY.value).toBe(100)

    // 下一帧已排上（上一帧滚完会自续），但 next === scrollY，不再继续
    harness.runFrame()
    expect(harness.scrollY.value).toBe(100)
    expect(harness.frames).toHaveLength(0)
  })

  it('滚动后指针没动也要按指针位置现查勾选', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientX: 2, clientY: 600 - 1 }))
    harness.hitTest.mockReturnValue('c')

    harness.runFrame()
    expect(harness.setChecked).toHaveBeenLastCalledWith('c', true)
  })

  it('抬手后停掉自续的滚动循环，不再滚', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a')))
    harness.gesture.dispatch('pointermove', pointerEvent(null, { clientY: 600 - 1 }))

    harness.gesture.dispatch('pointerup', {})
    expect(harness.frames).toHaveLength(0)
    const stopped = harness.scrollY.value
    harness.runFrame()
    expect(harness.scrollY.value).toBe(stopped)
  })
})

describe('SweepScrollController：touchmove 拦截', () => {
  it('手势未激活时不拦', () => {
    const harness = createSweep()
    const event = touchMove(300)
    harness.blocker.dispatch('touchmove', event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('激活后：带外拦住，边缘带内放行，没有触点信息时保守拦住', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), {}, 'touch'))
    harness.fireHoldTimer()

    const outside = touchMove(300)
    harness.blocker.dispatch('touchmove', outside)
    expect(outside.preventDefault).toHaveBeenCalledTimes(1)

    const inZone = touchMove(600 - 8)
    harness.blocker.dispatch('touchmove', inZone)
    expect(inZone.preventDefault).not.toHaveBeenCalled()

    const noTouch = touchMove(300, [])
    harness.blocker.dispatch('touchmove', noTouch)
    expect(noTouch.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('收尾后摘掉 touchmove 拦截', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), {}, 'touch'))
    harness.fireHoldTimer()
    harness.gesture.dispatch('pointerup', {})

    const event = touchMove(300)
    harness.blocker.dispatch('touchmove', event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(harness.blocker.count('touchmove')).toBe(0)
  })
})

describe('SweepScrollController：生命周期', () => {
  it('dispose 摘掉全部监听并清掉在途计时', () => {
    const harness = createSweep({ innerHeight: 600 })
    harness.controller.handlePointerDown(pointerEvent(rowElement('a'), {}, 'touch'))
    // 长按尚未到期就卸载：计时器要被清掉
    harness.controller.dispose()
    harness.fireHoldTimer()

    expect(harness.setChecked).not.toHaveBeenCalled()
    expect(harness.gesture.count('pointermove')).toBe(0)
    expect(harness.gesture.count('pointerup')).toBe(0)
    expect(harness.gesture.count('pointercancel')).toBe(0)
    expect(harness.blocker.count('touchmove')).toBe(0)
    expect(harness.controller.isContextMenuSuppressed()).toBe(false)
  })
})
