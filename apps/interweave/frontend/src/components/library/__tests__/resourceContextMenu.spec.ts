// @vitest-environment jsdom
import type { WebUiContextMenu } from '@greypan/web-ui'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView, ResourceView } from '../../../stores/library'
import {
  CONTEXT_MENU_LONG_PRESS_MS,
  createResourceContextMenu,
  type ResourceContextMenuHost,
  type ResourceContextMenuTimers
} from '../resourceContextMenu'

const source: ResourceSourceView = {
  id: 'source-1',
  type: 'file',
  location: '/tmp/file.txt',
  available: true,
  isPreferred: true,
  orderIndex: 0,
  mediaUrl: null,
  thumbnailUrl: null,
  metadata: null
}

function resource(id: string): ResourceView {
  return {
    id,
    title: `Resource ${id}`,
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [source],
    preferred: source,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindFile,
    sizeBytes: null
  }
}

const resources = [resource('first'), resource('second')]

const hosts: HTMLElement[] = []
const disposers: (() => void)[] = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const host of hosts.splice(0)) host.remove()
})

function createRow(resourceId: string) {
  const row = document.createElement('div')
  row.dataset.resourceRow = ''
  row.dataset.resourceId = resourceId
  row.tabIndex = 0
  const child = document.createElement('span')
  row.append(child)
  document.body.append(row)
  hosts.push(row)
  return { row, child }
}

/** 手动推进的超时与帧：记录挂起时的 delay（供阈值断言用），再按需触发。 */
function createTimers() {
  let nextId = 0
  const timeouts = new Map<number, { callback: () => void; delay: number }>()
  const frames: (() => void)[] = []
  const timers: ResourceContextMenuTimers = {
    setTimeout(callback, delayMs) {
      const id = ++nextId
      timeouts.set(id, { callback, delay: delayMs })
      return id as unknown as ReturnType<typeof setTimeout>
    },
    clearTimeout(handle) {
      timeouts.delete(handle as unknown as number)
    },
    requestFrame(callback) {
      frames.push(callback)
    }
  }
  return {
    timers,
    pendingTimeouts: () => timeouts.size,
    /** 仍在挂起的计时器 delay 序列（sweepScroll.spec.ts 的 timer.delay 模式）。 */
    pendingTimeoutDelays: () => [...timeouts.values()].map(entry => entry.delay),
    pendingFrames: () => frames.length,
    tickTimeouts() {
      const callbacks = [...timeouts.values()]
      timeouts.clear()
      for (const entry of callbacks) entry.callback()
    },
    flushFrames() {
      const callbacks = frames.splice(0)
      for (const callback of callbacks) callback()
    }
  }
}

function createAnchor() {
  return {
    openAt: vi.fn<(x: number, y: number) => void>(),
    close: vi.fn<() => void>()
  }
}

function createController(overrides: Partial<ResourceContextMenuHost> = {}) {
  const rows = document.createElement('div')
  rows.tabIndex = 0
  document.body.append(rows)
  hosts.push(rows)
  const anchor = createAnchor()
  const runtime = createTimers()
  const host: ResourceContextMenuHost = {
    rowsElement: () => rows,
    resolveForRow: row => resources.find(item => item.id === row.dataset.resourceId) ?? null,
    activate: vi.fn<(resource: ResourceView) => void>(),
    resolveDefaultOpenWith: vi.fn<(resource: ResourceView | null) => Promise<string>>(async () => ''),
    anchor: () => anchor as unknown as WebUiContextMenu,
    rowAnchor: vi.fn<(index: number) => HTMLElement | null>(() => rows),
    navigateToIndex: vi.fn<(index: number) => Promise<void>>(async () => {}),
    focusIndex: vi.fn<(index: number) => void>(),
    activeIndex: () => 0,
    activeResource: () => resources[0] ?? null,
    activeResourceId: () => resources[0]?.id ?? null,
    suppressed: () => false,
    resources: () => resources,
    ...overrides
  }
  const controller = createResourceContextMenu(host, { timers: runtime.timers })
  const dispose = controller.bindWindowSpaceMachine()
  disposers.push(dispose)
  return { host, anchor, runtime, controller, rows, dispose }
}

function contextMenuEvent() {
  const event = new MouseEvent('contextmenu', { clientX: 24, clientY: 48, bubbles: true, cancelable: true })
  const prevent = vi.spyOn(event, 'preventDefault')
  const stop = vi.spyOn(event, 'stopPropagation')
  return { event, prevent, stop }
}

describe('resource context menu controller', () => {
  it('行上的 contextmenu 激活该行、写入 contextResource，并在下一帧按坐标打开', async () => {
    const { controller, host, anchor, runtime } = createController()
    const { event, prevent, stop } = contextMenuEvent()

    await controller.openFromRow(resources[1]!, event)

    expect(prevent).toHaveBeenCalled()
    expect(stop).toHaveBeenCalled()
    expect(host.activate).toHaveBeenCalledWith(resources[1])
    expect(controller.contextResource.value?.id).toBe('second')
    expect(runtime.pendingFrames()).toBe(1)
    expect(anchor.openAt).not.toHaveBeenCalled()

    runtime.flushFrames()
    expect(anchor.openAt).toHaveBeenCalledWith(24, 48)
  })

  it('连续右键时只有最后一次请求能打开菜单', async () => {
    const { controller, anchor, runtime } = createController()

    await controller.openFromRow(resources[0]!, contextMenuEvent().event)
    await controller.openFromRow(resources[1]!, contextMenuEvent().event)
    runtime.flushFrames()

    expect(anchor.openAt).toHaveBeenCalledTimes(1)
    expect(controller.contextResource.value?.id).toBe('second')
  })

  it('扫选抑制时只拦下系统 contextmenu，不改身份也不打开菜单', async () => {
    const { controller, host, anchor, runtime } = createController({ suppressed: () => true })
    const { event, prevent, stop } = contextMenuEvent()

    await controller.openFromRow(resources[0]!, event)

    expect(prevent).toHaveBeenCalled()
    expect(stop).not.toHaveBeenCalled()
    expect(host.activate).not.toHaveBeenCalled()
    runtime.flushFrames()
    expect(anchor.openAt).not.toHaveBeenCalled()
  })

  it('行内 focusin 解析所属资源，焦点落到容器时清空', () => {
    const { controller, rows } = createController()
    const { row, child } = createRow('second')

    controller.onRowsFocusin({ target: child } as unknown as FocusEvent)
    expect(controller.contextResource.value?.id).toBe('second')

    controller.onRowsFocusin({ target: rows } as unknown as FocusEvent)
    expect(controller.contextResource.value).toBeNull()
    expect(row.dataset.resourceId).toBe('second')
  })

  it('触屏 pointerdown 落定身份，鼠标指针不动它', () => {
    const { controller, rows } = createController()
    const { row, child } = createRow('first')

    controller.onTouchPointerDown({ pointerType: 'mouse', target: child } as unknown as PointerEvent)
    expect(controller.contextResource.value).toBeNull()

    controller.onTouchPointerDown({ pointerType: 'touch', target: child } as unknown as PointerEvent)
    expect(controller.contextResource.value?.id).toBe('first')
    expect(row.dataset.resourceId).toBe('first')

    controller.onTouchPointerDown({ pointerType: 'touch', target: rows } as unknown as PointerEvent)
    expect(controller.contextResource.value).toBeNull()
  })

  it('容器长按 Space 到阈值后聚焦活动行并派发 ContextMenu 键', async () => {
    const { controller, rows, runtime, host } = createController()
    rows.focus()
    const received: string[] = []
    rows.addEventListener('keydown', event => received.push(event.key))

    rows.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(runtime.pendingTimeouts()).toBe(1)

    runtime.tickTimeouts()
    await vi.waitFor(() => expect(received).toContain('ContextMenu'))

    expect(host.navigateToIndex).toHaveBeenCalledWith(0)
    expect(controller.contextResource.value?.id).toBe('first')
    expect(runtime.pendingTimeouts()).toBe(0)
  })

  it('长按期间与菜单打开后的 repeat 被吞掉，keyup 复位', async () => {
    const { controller, rows, runtime } = createController()
    rows.focus()

    const press = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    const repeat = new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true })
    const repeatPrevent = vi.spyOn(repeat, 'preventDefault')
    rows.dispatchEvent(press)
    rows.dispatchEvent(repeat)

    expect(repeatPrevent).toHaveBeenCalled()
    expect(runtime.pendingTimeouts()).toBe(1)

    runtime.tickTimeouts()
    await vi.waitFor(() => expect(controller.contextResource.value?.id).toBe('first'))
    rows.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }))

    rows.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }))
    // 菜单已复位：下一次长按会重新起计时器。
    rows.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(runtime.pendingTimeouts()).toBe(1)
  })

  it('短按 Space 取消长按计时并把焦点交给活动行', () => {
    const { rows, runtime, host } = createController({ activeResourceId: () => 'second' })
    rows.focus()

    rows.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    rows.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }))

    expect(runtime.pendingTimeouts()).toBe(0)
    expect(host.focusIndex).toHaveBeenCalledWith(1)
    expect(host.navigateToIndex).not.toHaveBeenCalled()
  })

  it('长按计时器按 CONTEXT_MENU_LONG_PRESS_MS 起跳', () => {
    const { rows, runtime } = createController()
    rows.focus()

    // 阈值不再钉「常量等于 500」的字面值（那是接线级自指），改为断言行为真的用了这枚
    // 常量：Space 起跳的长按计时器，挂起 delay 就是它。
    rows.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(runtime.pendingTimeoutDelays()).toEqual([CONTEXT_MENU_LONG_PRESS_MS])
  })

  it('「打开方式」名字按请求序号作废旧结果', async () => {
    const first = Promise.withResolvers<string>()
    const second = Promise.withResolvers<string>()
    const { controller } = createController({
      resolveDefaultOpenWith: vi.fn<(resource: ResourceView | null) => Promise<string>>(async item =>
        item?.id === 'second' ? second.promise : first.promise
      )
    })

    controller.contextResource.value = resources[0]!
    await nextTick()
    controller.contextResource.value = resources[1]!
    await nextTick()
    first.resolve('旧应用')
    await first.promise
    await nextTick()
    expect(controller.defaultOpenWithName.value).toBe('')
    second.resolve('新应用')
    await second.promise
    await nextTick()
    expect(controller.defaultOpenWithName.value).toBe('新应用')
  })

  it('卸载后 window 上的 Space 状态机不再响应', () => {
    const { rows, runtime, dispose } = createController()
    rows.focus()
    dispose()
    rows.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(runtime.pendingTimeouts()).toBe(0)
  })
})
