import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineAnchoredPanel, type AnchoredPanelApi } from '../anchored-panel'
import { defineOpenOverlay, type OpenOverlay } from '../open-overlay'

/*
 * 退场第三态「可见但暂缓仲裁」（issue #138）。
 *
 * jsdom 不计算 CSS transition，`hideOverlayPresence` 会立刻 resolve；这里给面板写一条
 * inline transition-duration，让退场真的进入等待，再用合成 transitionend 收尾——与
 * native-dialog-presence.spec.ts 同一手法。
 */

const EXIT_DURATION = '160ms'

interface Harness {
  api: AnchoredPanelApi
  panel: HTMLElement
  requestClose: ReturnType<typeof vi.fn<() => void>>
}

afterEach(() => {
  document.body.replaceChildren()
})

/** 建一套 anchored panel；嵌套场景把 anchor 与面板都挂进父级面板。 */
function makePanel(parent: HTMLElement = document.body): Harness {
  const requestClose = vi.fn<() => void>()
  const host = document.createElement('div')
  const anchor = document.createElement('div')
  const panel = document.createElement('div')
  panel.style.transitionDuration = EXIT_DURATION
  parent.append(anchor, panel)
  document.body.append(host)

  const openOverlay: OpenOverlay = defineOpenOverlay().make({
    requestClose,
    isConnected: () => host.isConnected
  })
  const api = defineAnchoredPanel().make({
    getAnchor: () => anchor,
    getLocalPanel: () => panel,
    getPositioning: () => ({}),
    isPortal: () => false,
    createPortal: () => {
      throw new Error('本套件不走 portal')
    },
    openOverlay
  })
  return { api, panel, requestClose }
}

function pressEscape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

/** 过渡真的结束：presence 只认 opacity / transform 的 transitionend。 */
function finishExit(panel: HTMLElement): void {
  const event = new Event('transitionend', { bubbles: true })
  Object.defineProperty(event, 'propertyName', { value: 'opacity' })
  panel.dispatchEvent(event)
}

describe('anchored panel 的退场第三态', () => {
  it('退场等待期间登记不撤：Escape 由这个看得见的面板接住，且不重复关闭', async () => {
    const { api, panel, requestClose } = makePanel()
    api.open()
    const closing = api.close(() => false)

    // 退场在等过渡：面板仍在场，只是暂缓仲裁。
    expect(__openOverlayLayerCount()).toBe(1)
    const event = pressEscape()

    expect(event.defaultPrevented).toBe(true)
    expect(requestClose).not.toHaveBeenCalled()

    finishExit(panel)
    expect(await closing).toBe(true)
    expect(__openOverlayLayerCount()).toBe(0)
  })

  it('退场中途重新 open()：新会话接管，旧 close() 报告未关闭', async () => {
    const { api, requestClose } = makePanel()
    api.open()
    const closing = api.close(() => false)

    api.open()

    expect(await closing).toBe(false)
    expect(__openOverlayLayerCount()).toBe(1)
    // 新会话恒不暂缓：退场被打断后面板重新可关闭。
    pressEscape()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('退场被中断后立刻按 Escape：关的是这个面板，不是外层', async () => {
    const outer = makePanel()
    const inner = makePanel(outer.panel)
    outer.api.open()
    inner.api.open()
    const closing = inner.api.close(() => false)

    inner.api.open()
    expect(await closing).toBe(false)

    pressEscape()
    expect(inner.requestClose).toHaveBeenCalledTimes(1)
    expect(outer.requestClose).not.toHaveBeenCalled()
  })

  it('退场播完后撤销：紧接着的 Escape 归属外层（issue #120 无回归）', async () => {
    const outer = makePanel()
    const inner = makePanel(outer.panel)
    outer.api.open()
    inner.api.open()
    const closing = inner.api.close(() => false)

    finishExit(inner.panel)
    expect(await closing).toBe(true)
    expect(__openOverlayLayerCount()).toBe(1)

    pressEscape()
    expect(outer.requestClose).toHaveBeenCalledTimes(1)
    expect(inner.requestClose).not.toHaveBeenCalled()
  })

  it('退场等待期间外层仍在场：Escape 归属外层，不被退场动画吞掉', async () => {
    const outer = makePanel()
    const inner = makePanel(outer.panel)
    outer.api.open()
    inner.api.open()
    const closing = inner.api.close(() => false)

    // 暂缓层只是兜底候选：这一条是「第三态不等同于继续占住最内层名额」的判别锁。
    pressEscape()
    expect(outer.requestClose).toHaveBeenCalledTimes(1)
    expect(inner.requestClose).not.toHaveBeenCalled()

    finishExit(inner.panel)
    expect(await closing).toBe(true)
  })

  it('宿主仍认为开着时保留在场会话：不把面板留在未登记状态', async () => {
    const { api, panel } = makePanel()
    api.open()
    const closing = api.close(() => true)

    finishExit(panel)
    expect(await closing).toBe(false)
    expect(__openOverlayLayerCount()).toBe(1)
    expect(api.getHandle()).not.toBeNull()
  })

  /*
   * 上一格状态的另一面：退场已播完（面板 hidden）而宿主仍认为开着时，层交还仲裁。
   * 第三态的前提是「面板可见」；看不见的面板继续暂缓会无限吞掉 Escape，用户再也没有
   * 按键路径把这个不一致的状态收敛掉。交还后 Escape 走宿主的关闭入口。
   */
  it('退场播完但宿主仍认为开着：Escape 走宿主关闭入口，不再被无限吞掉', async () => {
    const { api, panel, requestClose } = makePanel()
    api.open()
    const closing = api.close(() => true)

    finishExit(panel)
    expect(await closing).toBe(false)

    const event = pressEscape()

    expect(event.defaultPrevented).toBe(true)
    expect(requestClose).toHaveBeenCalledTimes(1)
    expect(__openOverlayLayerCount()).toBe(1)
  })
})
