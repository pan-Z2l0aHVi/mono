import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiToast, ToastType, ToastCloseReason } from '..'
import { toast } from '..'

function createToastElement(attrs?: Record<string, string>, message = 'test message'): WebUiToast {
  const el = document.createElement('web-ui-toast') as WebUiToast
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.message = message
  document.body.appendChild(el)
  return el
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
  describe('基础渲染', () => {
    it('渲染消息内容', async () => {
      const el = createToastElement({}, 'Hello World')
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.toast-message')?.textContent).toBe('Hello World')
      el.remove()
    })

    it('默认类型为 info', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.type).toBe('info')
      expect(el.getAttribute('type')).toBe('info')
      el.remove()
    })

    it('默认可关闭', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.closable).toBe(true)
      expect(el.shadowRoot?.querySelector('.toast-close-btn')).toBeTruthy()
      el.remove()
    })

    it('默认 visible 为 false', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.visible).toBe(false)
      el.remove()
    })

    it('默认 duration 为 3000', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.duration).toBe(3000)
      el.remove()
    })

    it('渲染 heading', async () => {
      const el = createToastElement()
      el.heading = '标题'
      el.message = '内容'
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.toast-heading')?.textContent).toBe('标题')
      expect(el.shadowRoot?.querySelector('.toast-message')?.textContent).toBe('内容')
      el.remove()
    })

    it('无 heading 时不渲染标题元素', async () => {
      const el = createToastElement()
      el.heading = ''
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.toast-heading')).toBeNull()
      el.remove()
    })
  })

  describe('prop: type', () => {
    const types: ToastType[] = ['success', 'info', 'warning', 'error']

    for (const t of types) {
      it(`${t} 类型设置正确`, async () => {
        const el = createToastElement({ type: t })
        await el.updateComplete
        expect(el.type).toBe(t)
        expect(el.getAttribute('type')).toBe(t)
        expect(el.shadowRoot?.querySelector(`.toast.${t}`)).toBeTruthy()
        el.remove()
      })
    }
  })

  describe('prop: closable', () => {
    it('closable 时显示关闭按钮', async () => {
      const el = createToastElement({ closable: '' }, '可关闭')
      el.closable = true
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.toast-close-btn')).toBeTruthy()
      el.remove()
    })

    it('closable=false 时无关闭按钮', async () => {
      const el = createToastElement({}, '不可关闭')
      el.closable = false
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.toast-close-btn')).toBeNull()
      el.remove()
    })
  })

  describe('prop: visible', () => {
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

  describe('prop: position 滑动方向', () => {
    it('top-right 设置 slide-x=20px, slide-y=-20px', async () => {
      const el = createToastElement()
      el.position = 'top-right'
      await el.updateComplete
      expect(el.style.getPropertyValue('--toast-slide-x')).toBe('20px')
      expect(el.style.getPropertyValue('--toast-slide-y')).toBe('-20px')
      el.remove()
    })

    it('bottom-left 设置 slide-x=-20px, slide-y=20px', async () => {
      const el = createToastElement()
      el.position = 'bottom-left'
      await el.updateComplete
      expect(el.style.getPropertyValue('--toast-slide-x')).toBe('-20px')
      expect(el.style.getPropertyValue('--toast-slide-y')).toBe('20px')
      el.remove()
    })

    it('top-center 只设置 slide-y=-20px', async () => {
      const el = createToastElement()
      el.position = 'top-center'
      await el.updateComplete
      expect(el.style.getPropertyValue('--toast-slide-x')).toBe('0px')
      expect(el.style.getPropertyValue('--toast-slide-y')).toBe('-20px')
      el.remove()
    })
  })

  describe('无障碍', () => {
    it('非 error 类型使用 aria-live=polite', async () => {
      const el = createToastElement({ type: 'info' })
      await el.updateComplete
      const alert = el.shadowRoot?.querySelector('[role="alert"]')
      expect(alert?.getAttribute('aria-live')).toBe('polite')
      el.remove()
    })

    it('error 类型使用 aria-live=assertive', async () => {
      const el = createToastElement({ type: 'error' })
      await el.updateComplete
      const alert = el.shadowRoot?.querySelector('[role="alert"]')
      expect(alert?.getAttribute('aria-live')).toBe('assertive')
      el.remove()
    })

    it('设置 role="alert"', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('[role="alert"]')).toBeTruthy()
      el.remove()
    })

    it('设置 aria-atomic="true"', async () => {
      const el = createToastElement()
      await el.updateComplete
      const alert = el.shadowRoot?.querySelector('[role="alert"]')
      expect(alert?.getAttribute('aria-atomic')).toBe('true')
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

  describe('hover 暂停', () => {
    it('鼠标进入暂停自动关闭', async () => {
      const el = createToastElement()
      el.duration = 500
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(el.visible).toBe(true)
      el.dismiss()
      await new Promise(resolve => setTimeout(resolve, 50))
      el.remove()
    })

    it('鼠标离开恢复自动关闭', async () => {
      const el = createToastElement()
      el.duration = 200
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 100))
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      // 等 duration(200) + dismiss fallback(400)
      await new Promise(resolve => setTimeout(resolve, 650))

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

      // 等 duration(200) + dismiss fallback(400) + buffer
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
      // 微任务批量挂载，等待挂载完成
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(1)
    })

    it('返回唯一 id', async () => {
      const id1 = toast.success('消息1')
      const id2 = toast.success('消息2')
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(id1).not.toBe(id2)
    })
  })

  describe('toast.info()', () => {
    it('创建 info 类型 toast', async () => {
      const id = toast.info('提示')
      expect(id).toBeTruthy()
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast.warning()', () => {
    it('创建 warning 类型 toast', async () => {
      const id = toast.warning('警告')
      expect(id).toBeTruthy()
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast.error()', () => {
    it('创建 error 类型 toast', async () => {
      const id = toast.error('错误')
      expect(id).toBeTruthy()
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(1)
    })

    it('error 默认 duration 为 5000', async () => {
      toast.error('错误')
      await new Promise(resolve => requestAnimationFrame(resolve))
      const all = document.body.querySelectorAll('web-ui-toast')
      expect(all.length).toBeGreaterThan(0)
      const el = all[0] as WebUiToast
      expect(el.duration).toBe(5000)
    })
  })

  describe('toast(options)', () => {
    it('完整 options 创建 toast', async () => {
      const id = toast({
        message: '自定义',
        type: 'warning',
        duration: 2000,
        closable: false,
        id: 'custom-id'
      })
      expect(id).toBe('custom-id')
      await new Promise(resolve => requestAnimationFrame(resolve))
      const all = document.body.querySelectorAll('web-ui-toast')
      expect(all.length).toBeGreaterThan(0)
      const el = all[0] as WebUiToast
      expect(el.type).toBe('warning')
      expect(el.duration).toBe(2000)
      expect(el.closable).toBe(false)
    })

    it('自定义 id 去重', async () => {
      toast({ message: '1', id: 'dup' })
      toast({ message: '2', id: 'dup' })
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(1)
    })
  })

  describe('toast.close()', () => {
    it('按 id 关闭 toast', async () => {
      const id = toast.info('待关闭')
      await new Promise(resolve => requestAnimationFrame(resolve))
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

  describe('toast.clear()', () => {
    it('清除所有 toast', async () => {
      toast.info('1')
      toast.info('2')
      toast.info('3')
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(3)

      toast.clear()
      await new Promise(resolve => setTimeout(resolve, 450))

      expect(toast._visibleCount()).toBe(0)
    })
  })

  describe('toast-close 事件 reason', () => {
    it('自动关闭 reason 为 auto', async () => {
      const id = toast({ message: 'auto', duration: 100 })

      // 等 duration(100) + dismiss fallback(400) + buffer
      await new Promise(resolve => setTimeout(resolve, 600))

      const el = document.querySelector(`web-ui-toast[toast-id="${id}"]`)
      expect(el).toBeNull()
    })

    it('手动关闭 reason 为 manual', async () => {
      const id = toast({ message: 'manual', closable: true })
      await new Promise(resolve => requestAnimationFrame(resolve))
      const all = document.body.querySelectorAll('web-ui-toast')
      expect(all.length).toBeGreaterThan(0)
      const el = all[0] as WebUiToast

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
      await new Promise(resolve => requestAnimationFrame(resolve))

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
      await new Promise(resolve => requestAnimationFrame(resolve))

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
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(document.querySelector('.wui-toast-top-right')).toBeTruthy()
      expect(document.querySelector('.wui-toast-bottom-left')).toBeTruthy()
    })

    it('同一 position 复用容器', async () => {
      toast.success('1', { position: 'top-left' })
      toast.success('2', { position: 'top-left' })
      await new Promise(resolve => requestAnimationFrame(resolve))

      const containers = document.querySelectorAll('.wui-toast-top-left')
      expect(containers.length).toBe(1)
    })

    it('容器具有滚动相关 class', async () => {
      toast.info('test')
      await new Promise(resolve => requestAnimationFrame(resolve))
      const container = document.querySelector('.wui-toast-top-right')
      expect(container).toBeTruthy()
      expect(container?.classList.contains('wui-toast-container')).toBe(true)
    })
  })

  describe('连续调用无限制', () => {
    it('超过 5 个时全部挂载，不受 MAX_VISIBLE 限制', async () => {
      for (let i = 0; i < 10; i++) {
        toast.info(`消息 ${i}`)
      }
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(10)
    })

    it('快速连续调用不报错', async () => {
      for (let i = 0; i < 20; i++) {
        toast.info(`快速 ${i}`)
      }
      await new Promise(resolve => requestAnimationFrame(resolve))
      expect(toast._visibleCount()).toBe(20)

      toast.clear()
      await new Promise(resolve => setTimeout(resolve, 450))
      expect(toast._visibleCount()).toBe(0)
    })
  })
})
