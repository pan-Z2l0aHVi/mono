import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { observeToastTopOffset, TOAST_TOP_OFFSET_PROPERTY, toastTopOffsetValue } from '../toast-offset'

describe('toast top offset 几何', () => {
  it('header 底边向上取整，缺失或负值归零', () => {
    expect(toastTopOffsetValue(undefined)).toBe('0px')
    expect(toastTopOffsetValue(null)).toBe('0px')
    expect(toastTopOffsetValue(0)).toBe('0px')
    expect(toastTopOffsetValue(12)).toBe('12px')
    expect(toastTopOffsetValue(12.2)).toBe('13px')
    expect(toastTopOffsetValue(63.01)).toBe('64px')
    expect(toastTopOffsetValue(-4)).toBe('0px')
  })
})

/** 只替身 observer 真正用到的 DOM 面：document 的 inline style、window 监听、rAF 与 ResizeObserver。 */
function stubShell() {
  const styleValues = new Map<string, string>()
  let setCalls = 0
  vi.stubGlobal('document', {
    documentElement: {
      style: {
        getPropertyValue: (name: string) => styleValues.get(name) ?? '',
        setProperty: (name: string, value: string) => {
          setCalls += 1
          styleValues.set(name, value)
        },
        removeProperty: (name: string) => styleValues.delete(name)
      }
    }
  })

  const added: string[] = []
  const removed: string[] = []
  vi.stubGlobal('window', {
    addEventListener: (type: string, _listener: unknown, options?: AddEventListenerOptions) => {
      added.push(options?.capture ? `${type}:capture` : type)
    },
    removeEventListener: (type: string, _listener: unknown, options?: EventListenerOptions) => {
      removed.push(options?.capture ? `${type}:capture` : type)
    }
  })

  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 1
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })

  const observed: Element[] = []
  let disconnects = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(target: Element) {
        observed.push(target)
      }
      disconnect() {
        disconnects += 1
      }
    }
  )

  return {
    styleValues,
    setCalls: () => setCalls,
    added,
    removed,
    frames,
    observed,
    disconnects: () => disconnects,
    flushFrames: () => {
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(0)
    }
  }
}

function fakeLayout(bottom: number | (() => number), withBanner = false) {
  const readBottom = typeof bottom === 'function' ? bottom : () => bottom
  const header = { getBoundingClientRect: () => ({ bottom: readBottom() }) } as unknown as Element
  const banner = {} as unknown as Element
  const layout = {
    querySelector(selector: string) {
      if (selector === '[slot="header"]') return header
      if (selector === '[slot="banner"]') return withBanner ? banner : null
      return null
    }
  } as unknown as Element
  return { layout, header, banner }
}

describe('toast top offset 观测', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('初始测量写入取整后的 header 底边，并观察 layout、banner 与 header', () => {
    const shell = stubShell()
    const { layout, header, banner } = fakeLayout(63.5, true)

    const handle = observeToastTopOffset(() => layout)

    expect(shell.styleValues.get(TOAST_TOP_OFFSET_PROPERTY)).toBe('64px')
    expect(shell.observed).toEqual([layout, banner, header])
    expect(shell.added).toEqual(['resize', 'scroll:capture'])
    handle.stop()
  })

  it('banner 缺失时只观察 layout 与 header；refresh 重挂目标，重复调用只排一帧', () => {
    const shell = stubShell()
    const { layout, header } = fakeLayout(63.5)

    const handle = observeToastTopOffset(() => layout)
    expect(shell.observed).toEqual([layout, header])

    shell.observed.length = 0
    handle.refresh()
    expect(shell.observed).toEqual([layout, header])
    expect(shell.frames.size).toBe(1)

    // 重复 refresh 会重挂观察目标，但测量仍然只排一帧。
    shell.observed.length = 0
    handle.refresh()
    expect(shell.observed).toEqual([layout, header])
    expect(shell.frames.size).toBe(1)

    // 高度没变时补测那一帧不重复写属性。
    shell.flushFrames()
    expect(shell.setCalls()).toBe(1)
    handle.stop()
  })

  it('refresh 后重新读取 header 高度（banner 换行、语种切换）', () => {
    const shell = stubShell()
    let bottom = 40
    const { layout } = fakeLayout(() => bottom)

    const handle = observeToastTopOffset(() => layout)
    expect(shell.styleValues.get(TOAST_TOP_OFFSET_PROPERTY)).toBe('40px')

    bottom = 80.2
    handle.refresh()
    shell.flushFrames()
    expect(shell.styleValues.get(TOAST_TOP_OFFSET_PROPERTY)).toBe('81px')
    expect(shell.setCalls()).toBe(2)
    handle.stop()
  })

  it('stop 撤销帧、断开观察、清掉属性并摘下监听', () => {
    const shell = stubShell()
    const { layout } = fakeLayout(10)

    const handle = observeToastTopOffset(() => layout)
    handle.refresh()
    expect(shell.frames.size).toBe(1)

    handle.stop()

    expect(shell.frames.size).toBe(0)
    expect(shell.styleValues.has(TOAST_TOP_OFFSET_PROPERTY)).toBe(false)
    expect(shell.removed).toEqual(['resize', 'scroll:capture'])
    // 初始重挂 + refresh 重挂 + stop 断开。
    expect(shell.disconnects()).toBe(3)
  })

  it('stop 之后再 refresh 不排帧、不重挂、也不把属性写回去', () => {
    const shell = stubShell()
    const { layout } = fakeLayout(10)

    const handle = observeToastTopOffset(() => layout)
    handle.stop()
    const { setCalls } = shell
    const written = setCalls()
    const observed = shell.observed.length
    const disconnects = shell.disconnects()

    handle.refresh()

    expect(shell.frames.size).toBe(0)
    expect(shell.observed.length).toBe(observed)
    expect(shell.disconnects()).toBe(disconnects)
    expect(setCalls()).toBe(written)
    expect(shell.styleValues.has(TOAST_TOP_OFFSET_PROPERTY)).toBe(false)
    // 监听已经摘下，refresh 不该重新安装。
    expect(shell.added).toEqual(['resize', 'scroll:capture'])
  })
})
