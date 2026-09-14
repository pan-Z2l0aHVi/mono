import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

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

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

function dispatchTransformTransitionEnd(dialog: HTMLDialogElement) {
  const event = new Event('transitionend')
  Object.defineProperty(event, 'propertyName', { value: 'transform' })
  dialog.dispatchEvent(event)
}

function dispatchEscapeKey(target: EventTarget) {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    composed: true,
    cancelable: true
  })
  target.dispatchEvent(event)
  return event
}

describe('WebUiDrawer 组件', () => {
  describe('属性：open', () => {
    it('open 属性反射到 host 元素', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：placement', () => {
    it('默认 placement 为 right', async () => {
      const el = createDrawer()
      await waitForUpdate(el)
      expect(el.placement).toBe('right')
      expect(el.hasAttribute('placement')).toBe(true)
      expect(el.getAttribute('placement')).toBe('right')
      cleanupElement(el)
    })

    it('placement 反映到 host 属性', async () => {
      const el = createDrawer()
      el.placement = 'left'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('left')

      el.placement = 'top'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('top')

      el.placement = 'bottom'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('bottom')

      cleanupElement(el)
    })

    it('非法 placement 回退到默认值 right', async () => {
      const el = createDrawer()
      el.placement = 'invalid' as 'right'
      await waitForUpdate(el)
      expect(el.placement).toBe('right')
      expect(el.getAttribute('placement')).toBe('right')
      cleanupElement(el)
    })
  })

  describe('属性：no-scroll-lock', () => {
    it('默认打开时锁定页面滚动', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('fixed')
      cleanupElement(el)
    })

    it('no-scroll-lock 为 true 时不锁定页面滚动', async () => {
      const el = createDrawer()
      el.setAttribute('no-scroll-lock', '')
      el.open = true
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('打开期间切换 no-scroll-lock 立即恢复页面滚动', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      el.setAttribute('no-scroll-lock', '')
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })
  })

  describe('属性：heading', () => {
    it('heading 可通过属性设置', async () => {
      const el = createDrawer()
      el.heading = '我的标题'
      await waitForUpdate(el)
      expect(el.heading).toBe('我的标题')
      cleanupElement(el)
    })
  })

  describe('属性：headless', () => {
    it('dialog-label 提供 headless dialog 的可访问名称', async () => {
      const el = createDrawer()
      el.headless = true
      el.dialogLabel = '主导航'
      await waitForUpdate(el)

      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      expect(dialog.getAttribute('aria-label')).toBe('主导航')
      expect(dialog.hasAttribute('aria-labelledby')).toBe(false)
      cleanupElement(el)
    })

    it('打开期间切换 headless 时保留同一个处于 top layer 的 dialog', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      expect(dialog.open).toBe(true)
      expect(el.shadowRoot?.querySelector('.wui-drawer-body')).toBeTruthy()

      el.headless = true
      await waitForUpdate(el)

      expect(el.shadowRoot?.querySelector('dialog')).toBe(dialog)
      expect(dialog.open).toBe(true)
      expect(el.shadowRoot?.querySelector('.wui-drawer-body')).toBeFalsy()
      cleanupElement(el)
    })
  })

  describe('属性：controlled', () => {
    it('用户通过 Escape 或遮罩关闭时仅请求 open=false，不自行修改 open', async () => {
      const el = createDrawer()
      el.controlled = true
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      dispatchEscapeKey(dialog)
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events.map(event => event.detail.open)).toEqual([false])

      dialog.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events.map(event => event.detail.open)).toEqual([false, false])
      cleanupElement(el)
    })

    it('内置关闭按钮仅请求关闭，不自行修改 open', async () => {
      const el = createDrawer()
      el.closable = true
      el.controlled = true
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      const closeButton = el.shadowRoot?.querySelector('.wui-drawer-close') as HTMLElement
      closeButton.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events.map(event => event.detail.open)).toEqual([false])
      cleanupElement(el)
    })
  })

  describe('属性：closable', () => {
    it('默认 closable 为 false', async () => {
      const el = createDrawer()
      await waitForUpdate(el)
      expect(el.closable).toBe(false)
      expect(el.hasAttribute('closable')).toBe(false)
      cleanupElement(el)
    })

    it('closable 为 true 时反映到 host 属性', async () => {
      const el = createDrawer()
      el.closable = true
      await waitForUpdate(el)
      expect(el.hasAttribute('closable')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('事件：open-change', () => {
    it('程序设置 open 不触发 open-change', async () => {
      const el = createDrawer()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('程序关闭不触发 open-change', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = false
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('open 值不变时不触发', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.open = true
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('点击内置关闭按钮时派发 open-change', async () => {
      const el = createDrawer()
      el.closable = true
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      const closeButton = el.shadowRoot?.querySelector('web-ui-button')
      closeButton?.shadowRoot?.querySelector('button')?.click()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(false)
      cleanupElement(el)
    })
  })

  describe('命令：show()', () => {
    it('设置 open=true 但不触发 open-change', async () => {
      const el = createDrawer()
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.show()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('已打开时再次调用不重复触发', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.show()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('命令：close()', () => {
    it('关闭过渡完成前保持 dialog 在 top layer，完成后关闭', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)
      const dialog = el.shadowRoot?.querySelector('dialog')

      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      el.close()
      await waitForUpdate(el)
      expect(el.open).toBe(false)
      expect(dialog?.open).toBe(true)

      if (dialog) dispatchTransformTransitionEnd(dialog)
      expect(el.open).toBe(false)
      expect(events).toHaveLength(0)
      expect(dialog?.open).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })

    it('关闭过程中重新打开会取消关闭和 fallback', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)
      const dialog = el.shadowRoot?.querySelector('dialog')

      el.close()
      await waitForUpdate(el)
      expect(dialog?.open).toBe(true)

      el.show()
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)
      expect(el.open).toBe(true)
      expect(dialog?.open).toBe(true)

      if (dialog) dispatchTransformTransitionEnd(dialog)
      await vi.advanceTimersByTimeAsync(400)
      expect(dialog?.open).toBe(true)

      vi.useRealTimers()
      cleanupElement(el)
    })

    it('transitionend 缺失时 fallback 会完成关闭', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)
      const dialog = el.shadowRoot?.querySelector('dialog')

      el.close()
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(400)

      expect(dialog?.open).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })
  })

  describe('键盘：Escape', () => {
    // 「footer 内按钮获得焦点时按 Escape」的行为依赖真实 UA 的 top layer 键盘
    // 路由（焦点在 shadow 内 light DOM 时，Esc 仍派发到 top layer 的 dialog），
    // jsdom 无此机制（composed keydown 不经过 dialog，handler 不会触发），
    // 该场景由 nested.browser.spec.ts 的浏览器用例覆盖。

    it('no-backdrop-close 存在时 cancel 仍通过关闭过渡退出', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.setAttribute('no-backdrop-close', '')
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)
      const dialog = el.shadowRoot?.querySelector('dialog')

      const event = new Event('cancel', { cancelable: true })
      dialog?.dispatchEvent(event)
      await waitForUpdate(el)

      expect(event.defaultPrevented).toBe(true)
      expect(el.open).toBe(false)
      expect(dialog?.open).toBe(true)

      if (dialog) dispatchTransformTransitionEnd(dialog)
      expect(dialog?.open).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })
  })

  describe('原生 dialog 关闭', () => {
    it('controlled 时恢复 native dialog 并仅请求关闭', async () => {
      const el = createDrawer()
      el.controlled = true
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      dialog.close()
      dialog.dispatchEvent(new Event('close'))
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(dialog.open).toBe(true)
      expect(events.map(event => event.detail.open)).toEqual([false])
      cleanupElement(el)
    })

    it('原生关闭后同步 open 并允许再次 show', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      dialog?.close()
      dialog?.dispatchEvent(new Event('close'))
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(false)

      el.show()
      await waitForUpdate(el)
      expect(el.open).toBe(true)
      expect(dialog?.open).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：noBackdropClose', () => {
    it('默认允许点击遮罩关闭抽屉', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('no-backdrop-close 存在时点击遮罩不关闭', async () => {
      const el = createDrawer()
      el.setAttribute('no-backdrop-close', '')
      el.open = true
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog')

      expect(el.noBackdropClose).toBe(true)
      dialog?.click()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：draggable', () => {
    it('默认 draggable 为 false 且不反射', async () => {
      const el = createDrawer()
      await waitForUpdate(el)
      expect(el.draggable).toBe(false)
      expect(el.hasAttribute('draggable')).toBe(false)
      cleanupElement(el)
    })

    it('draggable 反射到 host 属性', async () => {
      const el = createDrawer()
      el.draggable = true
      await waitForUpdate(el)
      expect(el.hasAttribute('draggable')).toBe(true)

      el.draggable = false
      await waitForUpdate(el)
      expect(el.hasAttribute('draggable')).toBe(false)
      cleanupElement(el)
    })

    it('draggable 时渲染 drag bar 热区；关闭后仍保留（同一 dialog 实例）', async () => {
      const el = createDrawer()
      el.draggable = true
      el.open = true
      await waitForUpdate(el)

      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone')
      expect(dragZone).toBeTruthy()

      el.open = false
      await waitForUpdate(el)
      expect(el.shadowRoot?.querySelector('.wui-drawer-drag-zone')).toBe(dragZone)
      expect(dialog.classList.contains('is-dragging')).toBe(false)
      cleanupElement(el)
    })

    it('未启用 draggable 时不渲染 drag bar', async () => {
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      expect(el.shadowRoot?.querySelector('.wui-drawer-drag-zone')).toBeFalsy()
      cleanupElement(el)
    })

    it('拖拽进行中 Escape 被抑制且不派发 open-change', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.draggable = true
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)

      const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      // 模拟拖拽开始（is-visible 已添加，允许进入拖拽态）
      dragZone.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300 })
      )
      await waitForUpdate(el)
      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      expect(dialog.classList.contains('is-dragging')).toBe(true)

      dispatchEscapeKey(dialog)
      await waitForUpdate(el)
      expect(events).toHaveLength(0)
      expect(el.open).toBe(true)

      // 松手（小位移弹回）后 ESC 恢复正常关闭
      dragZone.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300 })
      )
      await waitForUpdate(el)
      dispatchEscapeKey(dialog)
      await waitForUpdate(el)
      expect(events).toHaveLength(1)
      expect(el.open).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })

    it('controlled 下拖拽松手只派发 open-change 请求，不修改 open', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.draggable = true
      el.controlled = true
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)

      const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

      dragZone.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300 })
      )
      await waitForUpdate(el)
      // 右侧抽屉闭合方向为向右拖；位移 220px 超过默认宽度 320px 的 1/3 阈值
      dragZone.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 520 })
      )
      await waitForUpdate(el)
      dragZone.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 520 })
      )
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(events.map(event => event.detail.open)).toEqual([false])

      vi.useRealTimers()
      cleanupElement(el)
    })

    it('弹回 onfinish 覆写内联为打开态终值并保留：cancel 后无跳变窗口', async () => {
      vi.useFakeTimers()
      const order: string[] = []
      const originalSetProperty = CSSStyleDeclaration.prototype.setProperty
      const setPropertySpy = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty').mockImplementation(function (
        this: CSSStyleDeclaration,
        property: string,
        value: string | null
      ) {
        order.push(`set:${property}=${String(value)}`)
        return originalSetProperty.call(this, property, value)
      })
      const originalRemoveProperty = CSSStyleDeclaration.prototype.removeProperty
      const removePropertySpy = vi.spyOn(CSSStyleDeclaration.prototype, 'removeProperty').mockImplementation(function (
        this: CSSStyleDeclaration,
        property: string
      ) {
        order.push(`remove:${property}`)
        return originalRemoveProperty.call(this, property)
      })
      const originalAnimate = HTMLDialogElement.prototype.animate

      let dialog: HTMLDialogElement | null = null
      let transformAtCancel = ''
      const cancelSpy = vi.fn<() => void>(() => {
        transformAtCancel = dialog?.style.transform ?? ''
        order.push('cancel')
      })
      const fakeAnimation = { cancel: cancelSpy, onfinish: null as (() => void) | null }
      const proto = HTMLDialogElement.prototype as unknown as { animate?: unknown }
      // jsdom 未实现 Element.animate：无条件覆写为可控 fake，让弹簧走动画分支。
      proto.animate = function () {
        return fakeAnimation
      }

      const el = createDrawer()
      try {
        el.draggable = true
        el.open = true
        await waitForUpdate(el)
        await vi.advanceTimersByTimeAsync(16)

        dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
        // jsdom 无布局：offsetWidth 为 0 会让任何正向位移都超过关闭阈值（0/3），
        // 永远走 _springToClose。补一个尺寸让 30px 位移落在弹回区间（< 320/3）；
        // 用 getter 记录 finishRebound 强制重算读取 offsetWidth 时的 is-dragging 状态。
        const reflowIsDraggingAtRead: boolean[] = []
        Object.defineProperty(dialog, 'offsetWidth', {
          configurable: true,
          get() {
            reflowIsDraggingAtRead.push(dialog?.classList.contains('is-dragging') ?? false)
            order.push('reflow')
            return 320
          }
        })
        Object.defineProperty(dialog, 'offsetHeight', { configurable: true, value: 320 })
        const dragZone = dialog.querySelector('.wui-drawer-drag-zone') as HTMLElement

        dragZone.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
        )
        await waitForUpdate(el)
        dragZone.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
        )
        await waitForUpdate(el)
        dragZone.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
        )
        await waitForUpdate(el)

        expect(fakeAnimation.onfinish).toBeTruthy()
        fakeAnimation.onfinish!()

        // Safari 不采信 fill 覆盖的 before-change style：onfinish 同步边界上
        // computed 存在 -offset→0 的真实变化，任何内联处理顺序都绕不开；唯一可靠
        // 的抑制是保持 is-dragging（transition:none），同时把内联覆写为打开态终值
        // （transform 0 + backdrop 1）并取消动画。
        expect(transformAtCancel).toBe('translateX(0px)')
        expect(dialog.style.transform).toBe('translateX(0px)')
        expect(dialog.style.getPropertyValue('--wui-internal-drag-backdrop-opacity')).toBe('1')
        // 内联终值保留到关闭管线：不调用 removeProperty。
        expect(removePropertySpy).not.toHaveBeenCalled()

        // 收尾顺序必须为「覆写内联 → 强制重算读取 offsetWidth → cancel」：
        // backdrop 覆写先于重算，重算先于 cancel。
        const cancelIndex = order.indexOf('cancel')
        const reflowIndex = order.lastIndexOf('reflow')
        expect(cancelIndex).toBeGreaterThanOrEqual(0)
        expect(reflowIndex).toBeGreaterThanOrEqual(0)
        expect(order.indexOf('set:--wui-internal-drag-backdrop-opacity=1')).toBeLessThan(reflowIndex)
        expect(reflowIndex).toBeLessThan(cancelIndex)
        // 重算读取发生在 is-dragging 移除之前（读取瞬间类仍保留、transition 仍被
        // 抑制）：这次被抑制的重算把 0 烘焙进 Safari 的 transition 参考值。
        expect(reflowIsDraggingAtRead[reflowIsDraggingAtRead.length - 1]).toBe(true)
        // 重算后同步移除 is-dragging（0→0 无过渡），无需 rAF。
        expect(dialog.classList.contains('is-dragging')).toBe(false)
      } finally {
        setPropertySpy.mockRestore()
        removePropertySpy.mockRestore()
        if (originalAnimate === undefined) delete (proto as Record<string, unknown>).animate
        else proto.animate = originalAnimate
        vi.useRealTimers()
        cleanupElement(el)
      }
    })

    it('tap 拖拽区收尾移除内联拖拽样式：不残留 translateX(0px) 盖住后续开关过渡', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.draggable = true
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)

      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      const dragZone = dialog.querySelector('.wui-drawer-drag-zone') as HTMLElement

      // 无位移 tap：pointerdown + pointerup，走 _springRebound(0) 的无动画收尾。
      dragZone.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
      )
      await waitForUpdate(el)
      dragZone.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
      )
      await waitForUpdate(el)

      // 根因锁：tap 收尾必须移除内联拖拽样式。残留 translateX(0px) 会盖住闭合态
      // CSS transform，之后用按钮/遮罩/Esc 关闭时开与关都失去过渡动画（快速连点
      // 后「后续开关丢失过渡」的根因）。
      expect(dialog.style.transform).toBe('')
      expect(dialog.style.getPropertyValue('--wui-internal-drag-backdrop-opacity')).toBe('')
      expect(dialog.classList.contains('is-dragging')).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })

    it('重开后到达的过期 close 事件不误关刚重开的 drawer；真实外部关闭仍生效', async () => {
      vi.useFakeTimers()
      const el = createDrawer()
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)

      const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
      expect(dialog.classList.contains('is-visible')).toBe(true)

      // 关闭：jsdom 的 dialog.close() 不派发 close 事件，finishClosing 置位
      // self-close 标志后事件永远「在路上」——等价于真实浏览器中异步 close 事件
      // 尚未送达的状态。等待 fallback 计时器触发 finishClosing → dialog.close()。
      el.open = false
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(500)
      expect(dialog.open).toBe(false)

      // 快速重开：真实浏览器中上一会话排队的 close 事件可能在此之后才到达。
      el.open = true
      await waitForUpdate(el)
      await vi.advanceTimersByTimeAsync(16)
      expect(dialog.open).toBe(true)
      expect(dialog.classList.contains('is-visible')).toBe(true)

      // 模拟上一会话的过期 close 事件此刻才到达：不得把刚重开的 drawer 误关
      // （否则重开即被误关，表现为连续开关丢失过渡动画——真机「快速连点后后续
      // drawer 开关丢失过渡」的根因之一）。
      dialog.dispatchEvent(new Event('close'))
      await waitForUpdate(el)
      expect(el.open).toBe(true)
      expect(dialog.open).toBe(true)
      expect(dialog.classList.contains('is-visible')).toBe(true)

      // self-close 标志已被上一步消费：真实外部关闭（如表单 method="dialog"）
      // 仍走正常关闭管线。
      dialog.dispatchEvent(new Event('close'))
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      vi.useRealTimers()
      cleanupElement(el)
    })

    it('关闭 onfinish 先写终态再 cancel：cancel 时内联已处于闭合位', async () => {
      vi.useFakeTimers()
      const removePropertySpy = vi.spyOn(CSSStyleDeclaration.prototype, 'removeProperty')
      const originalAnimate = HTMLDialogElement.prototype.animate

      let dialog: HTMLDialogElement | null = null
      let transformAtCancel = ''
      const cancelSpy = vi.fn<() => void>(() => {
        transformAtCancel = dialog?.style.transform ?? ''
      })
      const fakeAnimation = { cancel: cancelSpy, onfinish: null as (() => void) | null }
      const proto = HTMLDialogElement.prototype as unknown as { animate?: unknown }
      proto.animate = function () {
        return fakeAnimation
      }

      const el = createDrawer()
      try {
        el.draggable = true
        el.controlled = true
        el.open = true
        await waitForUpdate(el)
        await vi.advanceTimersByTimeAsync(16)

        dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
        Object.defineProperty(dialog, 'offsetWidth', { configurable: true, value: 320 })
        Object.defineProperty(dialog, 'offsetHeight', { configurable: true, value: 320 })
        const dragZone = dialog.querySelector('.wui-drawer-drag-zone') as HTMLElement

        dragZone.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
        )
        await waitForUpdate(el)
        // 220px 位移 > 320/3 阈值：走关闭弹簧。
        dragZone.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 320, clientY: 300 })
        )
        await waitForUpdate(el)
        dragZone.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 320, clientY: 300 })
        )
        await waitForUpdate(el)

        expect(fakeAnimation.onfinish).toBeTruthy()
        fakeAnimation.onfinish!()

        // finishClose（controlled）先写入闭合位内联 transform，cancel 时内联已是终态；
        // 若反序，cancel 会让 computed 先回落到拖拽残留再被终态纠正，Safari 会捕获该跳变。
        expect(cancelSpy).toHaveBeenCalledTimes(1)
        expect(transformAtCancel).toMatch(/translate/)
        expect(removePropertySpy).not.toHaveBeenCalled()
      } finally {
        removePropertySpy.mockRestore()
        if (originalAnimate === undefined) delete (proto as Record<string, unknown>).animate
        else proto.animate = originalAnimate
        vi.useRealTimers()
        cleanupElement(el)
      }
    })
  })
})
