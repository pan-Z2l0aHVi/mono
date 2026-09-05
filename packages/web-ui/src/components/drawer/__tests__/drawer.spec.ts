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
  })
})
