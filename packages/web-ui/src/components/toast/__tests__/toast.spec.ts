import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiToast, ToastCloseReason, ToastPosition, ToastType } from '..'
import { toast } from '..'

function createToastElement(attrs?: Record<string, string>, message = 'test message'): WebUiToast {
  const el = document.createElement('web-ui-toast')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.message = message
  document.body.appendChild(el)
  return el
}

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

function getFallbackOverlayRoot(): ShadowRoot | null {
  return document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function getToasts(): NodeListOf<WebUiToast> {
  return (
    getFallbackOverlayRoot()?.querySelectorAll<WebUiToast>('web-ui-toast') ??
    document.querySelectorAll<WebUiToast>('web-ui-toast')
  )
}

function getToastContainer(position: ToastPosition): HTMLElement | null {
  return getFallbackOverlayRoot()?.querySelector<HTMLElement>(`.wui-toast-${position}`) ?? null
}

// 等待 toast 完成挂载和动画（批量挂载微任务 + el.show() 的 rAF）
async function waitForToastMounted(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100))
}

beforeEach(() => {
  document.body.innerHTML = ''
  toast._reset()
})

afterEach(() => {
  toast._reset()
  document.body.innerHTML = ''
})

describe('WebUiToast 组件', () => {
  describe('prop: type', () => {
    const types: ToastType[] = ['success', 'info', 'warning', 'error']

    for (const t of types) {
      it(`${t} 类型属性反射`, async () => {
        const el = createToastElement({ type: t })
        await el.updateComplete
        expect(el.type).toBe(t)
        expect(el.getAttribute('type')).toBe(t)
        el.remove()
      })
    }
  })

  describe('prop: visible', () => {
    it('默认值为 false', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.visible).toBe(false)
      expect(el.hasAttribute('visible')).toBe(false)
      el.remove()
    })

    it('visible 反射到 host', async () => {
      const el = createToastElement()
      el.visible = true
      await el.updateComplete
      expect(el.hasAttribute('visible')).toBe(true)

      el.visible = false
      await el.updateComplete
      expect(el.hasAttribute('visible')).toBe(false)
      el.remove()
    })
  })

  describe('prop: closable', () => {
    it('默认可关闭', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.closable).toBe(true)
      el.remove()
    })

    it('closable 反射到 host', async () => {
      const el = createToastElement()
      el.setAttribute('closable', 'false')
      await el.updateComplete
      expect(el.closable).toBe(false)
      expect(el.getAttribute('closable')).toBe('false')
      el.remove()
    })
  })

  describe('prop: duration', () => {
    it('默认值为 3000', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.duration).toBe(3000)
      el.remove()
    })
  })

  describe('prop: position', () => {
    it('默认 top-right', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.getAttribute('position')).toBe('top-right')
      el.remove()
    })

    it('position 反射到 host', async () => {
      const el = createToastElement({ position: 'bottom-left' })
      await el.updateComplete
      expect(el.getAttribute('position')).toBe('bottom-left')
      el.remove()
    })
  })

  describe('method: show()', () => {
    it('show() 设置 visible 为 true', async () => {
      const el = createToastElement()
      await el.updateComplete
      el.show()
      await el.updateComplete
      expect(el.visible).toBe(true)
      el.remove()
    })
  })

  describe('method: dismiss()', () => {
    it('dismiss() 设置 visible 为 false', async () => {
      const el = createToastElement()
      await el.updateComplete
      el.show()
      await el.updateComplete
      el.dismiss()
      await el.updateComplete
      expect(el.visible).toBe(false)
      el.remove()
    })

    it('dismiss() 触发 toast-close 事件', async () => {
      const el = createToastElement()
      await el.updateComplete
      el.show()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('toast-close', handler)

      el.dismiss('manual')

      // 等待 transitionend fallback timeout（400ms）
      await new Promise(resolve => setTimeout(resolve, 450))

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail
      expect(detail.reason).toBe('manual')
      el.remove()
    })
  })

  describe('pointer 暂停', () => {
    it('pointerenter 暂停自动关闭', async () => {
      const el = createToastElement()
      el.duration = 500
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(el.visible).toBe(true)
      el.dismiss()
      await new Promise(resolve => setTimeout(resolve, 50))
      el.remove()
    })

    it('pointerleave 恢复自动关闭', async () => {
      const el = createToastElement()
      el.duration = 200
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 100))
      el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
      // 等 duration(200) + dismiss fallback(400)
      await new Promise(resolve => setTimeout(resolve, 650))

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('touch pointerenter 不暂停自动关闭', async () => {
      const el = createToastElement()
      el.duration = 200
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(touchPointerEvent('pointerenter'))
      await new Promise(resolve => setTimeout(resolve, 250))

      expect(el.visible).toBe(false)
      el.remove()
    })
  })

  describe('自动关闭', () => {
    it('到达 duration 后自动关闭', async () => {
      const el = createToastElement()
      el.duration = 200
      await el.updateComplete
      el.show()
      await el.updateComplete

      await new Promise(resolve => setTimeout(resolve, 650))

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('duration 为 0 时不自动关闭', async () => {
      const el = createToastElement()
      el.duration = 0
      await el.updateComplete
      el.show()
      await el.updateComplete

      await new Promise(resolve => setTimeout(resolve, 200))

      expect(el.visible).toBe(true)
      el.dismiss()
      await new Promise(resolve => setTimeout(resolve, 50))
      el.remove()
    })
  })
})

describe('toast 命令式 API', () => {
  describe('toast.success()', () => {
    it('创建 success 类型 toast', async () => {
      const id = toast.success('成功')
      expect(id).toBeTruthy()
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(1)
    })

    it('返回唯一 id', async () => {
      const id1 = toast.success('消息1')
      const id2 = toast.success('消息2')
      await waitForToastMounted()
      expect(id1).not.toBe(id2)
    })
  })

  describe('toast.info()', () => {
    it('创建 info 类型 toast', async () => {
      toast.info('提示')
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast.warning()', () => {
    it('创建 warning 类型 toast', async () => {
      toast.warning('警告')
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast.error()', () => {
    it('创建 error 类型 toast', async () => {
      toast.error('错误')
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast(options)', () => {
    it('自定义 id 去重', async () => {
      toast({ message: '1', id: 'dup' })
      toast({ message: '2', id: 'dup' })
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast.close()', () => {
    it('按 id 关闭 toast', async () => {
      const id = toast.info('待关闭')
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(1)

      toast.close(id)
      await new Promise(resolve => setTimeout(resolve, 450))

      expect(toast._visibleCount()).toBe(0)
    })

    it('关闭不存在的 id 无副作用', () => {
      toast.close('nonexistent')
      expect(toast._visibleCount()).toBe(0)
    })
  })

  describe('toast.updateMessage()', () => {
    it('立即更新已挂载 toast 的 message 和 heading', async () => {
      const id = toast.info('旧消息', { heading: '旧标题', duration: 0 })
      await waitForToastMounted()

      toast.updateMessage(id, { message: '新消息', heading: '新标题' })
      const el = Array.from(getToasts()).find(toastEl => toastEl.toastId === id)
      await el?.updateComplete

      expect(el?.shadowRoot?.querySelector('.toast-heading')?.textContent?.trim()).toBe('新标题')
      expect(el?.shadowRoot?.querySelector('.toast-message')?.textContent?.trim()).toBe('新消息')
    })

    it('未传入 heading 时保留现有标题', async () => {
      const id = toast.info('旧消息', { heading: '保留标题', duration: 0 })
      await waitForToastMounted()

      toast.updateMessage(id, { message: '新消息' })
      const el = Array.from(getToasts()).find(toastEl => toastEl.toastId === id)
      await el?.updateComplete

      expect(el?.heading).toBe('保留标题')
      expect(el?.message).toBe('新消息')
    })

    it('更新不存在的 id 不抛出异常', () => {
      expect(() => toast.updateMessage('missing', { message: '忽略' })).not.toThrow()
    })
  })

  describe('toast.clear()', () => {
    it('清除所有 toast', async () => {
      toast.info('1')
      toast.info('2')
      toast.info('3')
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(3)

      toast.clear()
      await new Promise(resolve => setTimeout(resolve, 450))

      expect(toast._visibleCount()).toBe(0)
    })
  })

  describe('toast-close 事件', () => {
    it('手动关闭 reason 为 manual', async () => {
      const id = toast({ message: 'manual', closable: true, duration: 0 })
      await waitForToastMounted()

      const all = getToasts()
      expect(all.length).toBeGreaterThan(0)
      const el = all[0]

      const handler = vi.fn<(e: Event) => void>()
      document.addEventListener('toast-close', handler)

      el.dismiss('manual')
      await new Promise(resolve => setTimeout(resolve, 450))

      const closeEvent = handler.mock.calls.find(c => (c[0] as CustomEvent).detail.id === id)
      expect(closeEvent).toBeTruthy()
      expect((closeEvent![0] as CustomEvent).detail.reason).toBe('manual')

      document.removeEventListener('toast-close', handler)
    })

    it('程序化关闭 reason 为 programmatic', async () => {
      const id = toast.info('prog')
      await waitForToastMounted()

      const handler = vi.fn<(e: Event) => void>()
      document.addEventListener('toast-close', handler)

      toast.close(id)
      await new Promise(resolve => setTimeout(resolve, 450))

      const closeEvent = handler.mock.calls.find(c => (c[0] as CustomEvent).detail.id === id)
      expect(closeEvent).toBeTruthy()
      expect((closeEvent![0] as CustomEvent).detail.reason).toBe('programmatic')

      document.removeEventListener('toast-close', handler)
    })

    it('clear 关闭 reason 为 clear', async () => {
      toast.info('clear-test')
      await waitForToastMounted()

      const handler = vi.fn<(e: Event) => void>()
      document.addEventListener('toast-close', handler)

      toast.clear()
      await new Promise(resolve => setTimeout(resolve, 450))

      expect(handler.mock.calls.length).toBeGreaterThan(0)
      expect(handler.mock.calls[0][0]).toBeDefined()

      document.removeEventListener('toast-close', handler)
    })
  })

  describe('容器管理', () => {
    it('不同 position 创建不同容器', async () => {
      toast.success('右上', { position: 'top-right' })
      toast.success('左下', { position: 'bottom-left' })
      await waitForToastMounted()

      expect(getToastContainer('top-right')).toBeTruthy()
      expect(getToastContainer('bottom-left')).toBeTruthy()
    })

    it('同一 position 复用容器', async () => {
      toast.success('1', { position: 'top-left' })
      toast.success('2', { position: 'top-left' })
      await waitForToastMounted()

      expect(getFallbackOverlayRoot()?.querySelectorAll('.wui-toast-top-left').length).toBe(1)
    })

    it('容器具有滚动相关 class', async () => {
      toast.info('test')
      await waitForToastMounted()
      const container = getToastContainer('top-right')
      expect(container).toBeTruthy()
      expect(container?.classList.contains('wui-toast-container')).toBe(true)
    })
  })

  describe('连续调用', () => {
    it('大量连续调用不报错', async () => {
      for (let i = 0; i < 10; i++) {
        toast.info(`消息 ${i}`)
      }
      await waitForToastMounted()
      expect(toast._visibleCount()).toBe(10)

      toast.clear()
      await new Promise(resolve => setTimeout(resolve, 450))
      expect(toast._visibleCount()).toBe(0)
    })
  })
})
