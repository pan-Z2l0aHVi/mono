import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTriggerGestures, isEventInsideHost, type TriggerGesturePolicy } from '@/shared/overlay/trigger-gestures'

function pointerEvent(type: string, pointerType = 'mouse'): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

interface Recording {
  host: HTMLElement
  opened: { source: string; instant: boolean }[]
  closed: string[]
  controller: ReturnType<typeof defineTriggerGestures>
  setOpen: (open: boolean) => void
}

function setup(overrides: Partial<TriggerGesturePolicy> = {}): Recording {
  const host = document.createElement('div')
  document.body.append(host)
  const opened: { source: string; instant: boolean }[] = []
  const closed: string[] = []
  let open = false
  const policy: TriggerGesturePolicy = {
    host,
    hasMode: () => true,
    isDisabled: () => false,
    isOpen: () => open,
    hoverShowDelay: () => 200,
    hoverOpensInstantly: () => false,
    hoverHideDelay: () => 100,
    cancelPendingHideOnFocusEnter: () => true,
    isInsidePanel: () => false,
    requestOpen: (source, options) => opened.push({ source, instant: options.instant }),
    requestClose: source => closed.push(source),
    ...overrides
  }
  const controller = defineTriggerGestures(policy)
  controller.connect()
  return { host, opened, closed, controller, setOpen: value => (open = value) }
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('shared/overlay/trigger-gestures', () => {
  describe('hover 手势', () => {
    it('pointerenter 按延迟打开，instant 取决于 hoverOpensInstantly', () => {
      const { host, opened } = setup()
      host.dispatchEvent(pointerEvent('pointerenter'))
      expect(opened).toEqual([])
      vi.advanceTimersByTime(199)
      expect(opened).toEqual([])
      vi.advanceTimersByTime(1)
      expect(opened).toEqual([{ source: 'hover', instant: false }])
    })

    it('hoverOpensInstantly 为真时零延迟打开', () => {
      const { host, opened } = setup({ hoverOpensInstantly: () => true })
      host.dispatchEvent(pointerEvent('pointerenter'))
      vi.advanceTimersByTime(0)
      expect(opened).toEqual([{ source: 'hover', instant: true }])
    })

    it('touch 指针不触发', () => {
      const { host, opened } = setup()
      host.dispatchEvent(pointerEvent('pointerenter', 'touch'))
      host.dispatchEvent(pointerEvent('pointerleave', 'touch'))
      vi.advanceTimersByTime(1000)
      expect(opened).toEqual([])
    })

    it('disabled 与无 hover mode 都不触发', () => {
      const disabled = setup({ isDisabled: () => true })
      disabled.host.dispatchEvent(pointerEvent('pointerenter'))
      vi.advanceTimersByTime(1000)
      expect(disabled.opened).toEqual([])

      const modeless = setup({ hasMode: mode => mode !== 'hover' })
      modeless.host.dispatchEvent(pointerEvent('pointerenter'))
      vi.advanceTimersByTime(1000)
      expect(modeless.opened).toEqual([])
    })

    it('pointerleave 取消挂起的打开并按延迟收起', () => {
      const { host, opened, closed } = setup()
      host.dispatchEvent(pointerEvent('pointerenter'))
      host.dispatchEvent(pointerEvent('pointerleave'))
      vi.advanceTimersByTime(1000)
      expect(opened).toEqual([])
      expect(closed).toEqual(['hover'])
    })

    it('已开启时离开才收起：requestClose 收到的只有离开来源', () => {
      const recording = setup()
      recording.setOpen(true)
      recording.host.dispatchEvent(pointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      // stub 无 open 守卫，requestOpen 重复记录不在此 spec 的断言范围
      recording.host.dispatchEvent(pointerEvent('pointerleave'))
      vi.advanceTimersByTime(100)
      expect(recording.closed).toEqual(['hover'])
    })
  })

  describe('outside-click', () => {
    it('panel 内不收起（isInsidePanel 命中）', () => {
      const insidePanel = setup({ isOpen: () => true, isInsidePanel: () => true })
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(insidePanel.closed).toEqual([])
    })

    it('宿主外点击收起（jsdom 的 composedPath 为空，宿主内路径由 browser spec 覆盖）', () => {
      const outside = setup({ isOpen: () => true })
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(outside.closed).toEqual(['outside-click'])
    })

    it('未开启或无 click mode 时不动', () => {
      const closedState = setup()
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(closedState.closed).toEqual([])

      const modeless = setup({ isOpen: () => true, hasMode: mode => mode !== 'click' })
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(modeless.closed).toEqual([])
    })
  })

  describe('isEventInsideHost', () => {
    // 该 jsdom 环境的 composedPath() 恒为空数组，无法经真实派发验证判定；
    // 用 stub 事件直接钉判定逻辑，真实路径行为由 tooltip / popover browser spec 覆盖。
    function eventWithPath(path: EventTarget[]): MouseEvent {
      return { composedPath: () => path } as unknown as MouseEvent
    }

    it('路径含宿主为真', () => {
      const { host } = setup()
      expect(isEventInsideHost(host, eventWithPath([host, document.body]))).toBe(true)
    })

    it('路径含宿主 shadow root 或其内节点为真', () => {
      const { host } = setup()
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
      const inner = document.createElement('span')
      shadow.append(inner)
      expect(isEventInsideHost(host, eventWithPath([shadow, host, document.body]))).toBe(true)
      expect(isEventInsideHost(host, eventWithPath([inner, shadow, host]))).toBe(true)
    })

    it('路径不含宿主侧节点为假', () => {
      const { host } = setup()
      const stranger = document.createElement('section')
      document.body.append(stranger)
      expect(isEventInsideHost(host, eventWithPath([stranger, document.body]))).toBe(false)
      expect(isEventInsideHost(host, eventWithPath([]))).toBe(false)
    })
  })

  describe('计时簿记', () => {
    it('cancelPending 清空挂起的打开', () => {
      const { host, opened, controller } = setup()
      host.dispatchEvent(pointerEvent('pointerenter'))
      controller.cancelPending()
      vi.advanceTimersByTime(1000)
      expect(opened).toEqual([])
    })

    it('syncTriggerChange 清空挂起的收起', () => {
      const { host, closed, controller } = setup()
      controller.syncTriggerChange()
      host.dispatchEvent(pointerEvent('pointerenter'))
      host.dispatchEvent(pointerEvent('pointerleave'))
      controller.syncTriggerChange()
      vi.advanceTimersByTime(1000)
      expect(closed).toEqual([])
    })

    it('disconnect 清空计时并解绑 document click', () => {
      const { host, opened, closed, controller } = setup()
      controller.disconnect()
      host.dispatchEvent(pointerEvent('pointerenter'))
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      vi.advanceTimersByTime(1000)
      expect(opened).toEqual([])
      expect(closed).toEqual([])
    })
  })

  describe('panel keep-alive', () => {
    it('panel 内悬停不收起，离开按延迟收起', () => {
      const { host, closed, controller } = setup()
      const panel = document.createElement('div')
      document.body.append(panel)
      const dispose = controller.bindPanelKeepAlive(panel)

      host.dispatchEvent(pointerEvent('pointerenter'))
      host.dispatchEvent(pointerEvent('pointerleave'))
      // panel leave 先于 trigger hide timer 到点：重新计时，原始收起被覆盖
      panel.dispatchEvent(pointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      expect(closed).toEqual([])

      panel.dispatchEvent(pointerEvent('pointerleave'))
      vi.advanceTimersByTime(100)
      expect(closed).toEqual(['panel-leave'])
      dispose()
    })

    it('解绑后 panel 事件不再影响计时', () => {
      const { host, closed, controller } = setup()
      const panel = document.createElement('div')
      document.body.append(panel)
      const dispose = controller.bindPanelKeepAlive(panel)
      dispose()

      host.dispatchEvent(pointerEvent('pointerenter'))
      host.dispatchEvent(pointerEvent('pointerleave'))
      panel.dispatchEvent(pointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      expect(closed).toEqual(['hover'])
    })
  })

  describe('focus-out 缺省策略', () => {
    it('focus 手势下焦点离开立即收起', () => {
      const { host, closed } = setup()
      host.dispatchEvent(new FocusEvent('focusout'))
      expect(closed).toEqual(['focus-out'])
    })

    it('无 focus mode 时不动', () => {
      const modeless = setup({ hasMode: mode => mode !== 'focus' })
      modeless.host.dispatchEvent(new FocusEvent('focusout'))
      expect(modeless.closed).toEqual([])
    })
  })
})
