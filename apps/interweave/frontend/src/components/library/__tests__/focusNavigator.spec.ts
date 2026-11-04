import type { Mock } from 'vite-plus/test'
import { describe, expect, it, vi } from 'vite-plus/test'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import { FOCUS_POLL_INTERVAL_MS, FOCUS_WAIT_TIMEOUT_MS, FocusNavigator, rowFocusTarget } from '../focusNavigator'

/*
 * 只测落焦状态机，不 mount 组件：资源解析、activate、渲染等待、滚动与行查询全用手工桩，
 * 轮询等待用手工队列推进，时间行为完全确定。
 */

function resource(id: string): ResourceView {
  return {
    id,
    title: id,
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [],
    preferred: null,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 0
  }
}

interface FocusHarness {
  navigator: FocusNavigator
  activate: Mock<(resource: ResourceView) => void>
  afterRender: Mock<() => Promise<void>>
  scrollIndexIntoView: Mock<(index: number) => void>
  rowElementAt: Mock<(index: number) => { focus(): void } | null>
  /** 已排上的轮询等待；逐个放行以驱动轮询。 */
  pendingSleeps: (() => void)[]
  /** 放行一次轮询等待并让微任务落定。 */
  advance: () => Promise<void>
}

function createNavigator(rows: Record<number, { focus(): void } | null> = {}): FocusHarness {
  const harness: FocusHarness = {
    navigator: null as unknown as FocusNavigator,
    activate: vi.fn<(resource: ResourceView) => void>(),
    afterRender: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    scrollIndexIntoView: vi.fn<(index: number) => void>(),
    rowElementAt: vi.fn<(index: number) => { focus(): void } | null>(index => rows[index] ?? null),
    pendingSleeps: [],
    advance: async () => {
      const resolve = harness.pendingSleeps.shift()
      resolve?.()
      await Promise.resolve()
      await Promise.resolve()
    }
  }
  harness.navigator = new FocusNavigator({
    resourceAt: index => (index >= 0 && index < 10 ? resource(`r${index}`) : null),
    activate: harness.activate,
    afterRender: harness.afterRender,
    scrollIndexIntoView: harness.scrollIndexIntoView,
    rowElementAt: index => harness.rowElementAt(index),
    sleep: () => new Promise<void>(resolve => harness.pendingSleeps.push(resolve))
  })
  return harness
}

describe('FocusNavigator：navigateToIndex', () => {
  it('先请求 activate，等一轮渲染，再滚动并落焦', async () => {
    const harness = createNavigator({ 2: { focus: vi.fn<() => void>() } })
    const order: string[] = []
    harness.activate.mockImplementation(() => order.push('activate'))
    harness.afterRender.mockImplementation(async () => {
      order.push('afterRender')
    })
    harness.scrollIndexIntoView.mockImplementation(() => order.push('scroll'))

    await harness.navigator.navigateToIndex(2)

    expect(harness.activate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'r2' }))
    expect(order).toEqual(['activate', 'afterRender', 'scroll'])
    expect(harness.rowElementAt).toHaveBeenCalledWith(2)
  })

  it('下标越界时不请求 activate、不滚动', async () => {
    const harness = createNavigator()
    await harness.navigator.navigateToIndex(42)
    expect(harness.activate).not.toHaveBeenCalled()
    expect(harness.scrollIndexIntoView).not.toHaveBeenCalled()
  })

  it('目标行已在窗口内时立即落焦，不进入轮询', async () => {
    const row = { focus: vi.fn<() => void>() }
    const harness = createNavigator({ 1: row })
    await harness.navigator.navigateToIndex(1)
    expect(row.focus).toHaveBeenCalledTimes(1)
    expect(harness.pendingSleeps).toHaveLength(0)
  })
})

describe('FocusNavigator：focusIndex', () => {
  it('只滚动落焦，不请求 activate', async () => {
    const row = { focus: vi.fn<() => void>() }
    const harness = createNavigator({ 0: row })
    await harness.navigator.focusIndex(0)
    expect(harness.activate).not.toHaveBeenCalled()
    expect(harness.scrollIndexIntoView).toHaveBeenCalledExactlyOnceWith(0)
    expect(row.focus).toHaveBeenCalledTimes(1)
  })
})

describe('FocusNavigator：行未挂载时的轮询', () => {
  it('行挂载后落焦，轮询按 16ms 间隔推进', async () => {
    const row = { focus: vi.fn<() => void>() }
    const harness = createNavigator({})
    const promise = harness.navigator.navigateToIndex(3)
    await harness.advance()
    expect(harness.rowElementAt).toHaveBeenNthCalledWith(1, 3)
    // 首轮醒来还没有行：排下一次等待
    expect(harness.pendingSleeps).toHaveLength(1)

    harness.rowElementAt.mockReturnValue(row)
    await harness.advance()
    await promise

    expect(row.focus).toHaveBeenCalledTimes(1)
    expect(harness.pendingSleeps).toHaveLength(0)
  })

  it('行一直不挂载时，轮询在超时上限内停住且不落焦', async () => {
    const harness = createNavigator({})
    const promise = harness.navigator.focusIndex(4)
    // 上限是 FOCUS_WAIT_TIMEOUT_MS，每轮推进 FOCUS_POLL_INTERVAL_MS：
    // waited = 0, 16, ..., 992 共 (1000/16 向上取整) 轮，每轮恰一次等待。
    const expectedPolls = Math.ceil(FOCUS_WAIT_TIMEOUT_MS / FOCUS_POLL_INTERVAL_MS)
    for (let i = 0; i < expectedPolls; i++) await harness.advance()

    expect(harness.pendingSleeps).toHaveLength(0)
    expect(harness.rowElementAt).toHaveBeenCalledTimes(expectedPolls)
    // 超时后不应还有等待在途，promise 落定且没有 focus 过任何元素
    await promise
    expect(harness.scrollIndexIntoView).toHaveBeenCalledTimes(1)
  })

  it('连按方向键：后发的请求作废先发的那一轮，焦点不闪回', async () => {
    const targetRow = { focus: vi.fn<() => void>() }
    const harness = createNavigator({})
    const first = harness.navigator.navigateToIndex(2)
    await harness.advance() // 先发请求进入轮询

    // 第二次请求的目标行已在窗口内：立即落焦
    harness.rowElementAt.mockImplementation(index => (index === 1 ? targetRow : null))
    const second = harness.navigator.navigateToIndex(1)
    await second

    // 先发请求的等待此刻才醒来：请求号已不是它的，不得把焦点拽回自己的目标
    harness.rowElementAt.mockReturnValue({ focus: vi.fn<() => void>() })
    await harness.advance()
    await first

    expect(targetRow.focus).toHaveBeenCalledTimes(1)
    expect(harness.pendingSleeps).toHaveLength(0)
  })

  it('cancel 作废在途轮询：不再等待、不再落焦', async () => {
    const harness = createNavigator({})
    const promise = harness.navigator.focusIndex(2)
    await harness.advance()
    expect(harness.pendingSleeps).toHaveLength(1)

    harness.navigator.cancel()
    harness.rowElementAt.mockReturnValue({ focus: vi.fn<() => void>() })
    await harness.advance()
    await promise

    expect(harness.pendingSleeps).toHaveLength(0)
  })
})

describe('rowFocusTarget', () => {
  const last = 9

  it.each([
    ['ArrowDown 在中段', 'ArrowDown', 4, 5],
    ['ArrowDown 到不了末尾之外', 'ArrowDown', last, last],
    ['ArrowUp 在中段', 'ArrowUp', 4, 3],
    ['ArrowUp 到不了首行之前', 'ArrowUp', 0, 0],
    ['Home 到首行', 'Home', 7, 0],
    ['End 到最后一条资源', 'End', 0, last]
  ])('%s', (_label, key, index, expected) => {
    expect(rowFocusTarget(key as string, index as number, last)).toBe(expected)
  })

  it('导航键之外的 key 原样返回当前下标（不移动）', () => {
    expect(rowFocusTarget('a', 4, last)).toBe(4)
  })

  it('已在目标位置时返回相同下标：列表不是环，调用方据此不吞键', () => {
    expect(rowFocusTarget('ArrowDown', last, last)).toBe(last)
    expect(rowFocusTarget('ArrowUp', 0, last)).toBe(0)
  })
})
