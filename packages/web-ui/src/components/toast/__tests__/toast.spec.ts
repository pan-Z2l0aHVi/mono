import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { queryA11y } from '@/shared/test-utils'

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

// 定位器（非断言）：容器以 data 属性标识 position，不用 class 名单（§12 C3）。
function getToastContainer(position: ToastPosition): HTMLElement | null {
  return getFallbackOverlayRoot()?.querySelector<HTMLElement>(`[data-wui-toast-position="${position}"]`) ?? null
}

// 公开观察面：overlay root 里实际挂载的 web-ui-toast 元素（取代内部测试钩子 toast._visibleCount()）。
function mountedToasts(): WebUiToast[] {
  return Array.from(getToasts())
}

// 等待 toast 完成挂载和动画（批量挂载微任务 + el.show() 的 rAF）
async function waitForToastMounted(): Promise<void> {
  // flushBatch 是 Promise.resolve().then 排的微任务；show() 在 mountToast 的 rAF 里
  await Promise.resolve()
  vi.advanceTimersToNextFrame()
  await Promise.resolve()
}

beforeEach(() => {
  document.body.innerHTML = ''
  toast._reset()
  // 全量 fake 定时器（含 requestAnimationFrame）；duration 与 dismiss fallback 由 advance 精确推进
  vi.useFakeTimers()
})

afterEach(() => {
  toast._reset()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('WebUiToast 组件', () => {
  describe('属性：type', () => {
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

  describe('属性：visible', () => {
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

  describe('属性：noCloseButton', () => {
    it('默认渲染带无障碍名的关闭按钮', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.noCloseButton).toBe(false)
      expect(el.hasAttribute('no-close-button')).toBe(false)
      // 关闭按钮是"指针可达"的公开控件，按 a11y 名定位而不是内部 class（§12 C3）
      expect(queryA11y(el, '[aria-label="关闭"]')).not.toBeNull()
      el.remove()
    })

    it('no-close-button 反射到 host 且不渲染关闭按钮', async () => {
      const el = createToastElement()
      el.setAttribute('no-close-button', '')
      await el.updateComplete
      expect(el.noCloseButton).toBe(true)
      expect(el.hasAttribute('no-close-button')).toBe(true)
      expect(queryA11y(el, '[aria-label="关闭"]')).toBeNull()
      el.remove()
    })
  })

  describe('无障碍：播报语义', () => {
    it('非 error 类型为礼貌播报，error 提升为 alert（assertive）', async () => {
      const info = createToastElement({ type: 'info' })
      await info.updateComplete
      const infoPanel = queryA11y(info, '[aria-live]')
      expect(infoPanel?.getAttribute('aria-live')).toBe('polite')
      expect(infoPanel?.getAttribute('aria-atomic')).toBe('true')
      // 非 error 不设 role：交给容器的 role="log" 以 polite 播报
      expect(infoPanel?.hasAttribute('role')).toBe(false)
      info.remove()

      const error = createToastElement({ type: 'error' })
      await error.updateComplete
      const errorPanel = queryA11y(error, '[aria-live]')
      expect(errorPanel?.getAttribute('aria-live')).toBe('assertive')
      expect(errorPanel?.getAttribute('role')).toBe('alert')
      error.remove()
    })
  })

  describe('属性：duration', () => {
    it('默认值为 3000', async () => {
      const el = createToastElement()
      await el.updateComplete
      expect(el.duration).toBe(3000)
      el.remove()
    })
  })

  describe('属性：position', () => {
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

  describe('方法：show()', () => {
    it('show() 设置 visible 为 true', async () => {
      const el = createToastElement()
      await el.updateComplete
      el.show()
      await el.updateComplete
      expect(el.visible).toBe(true)
      el.remove()
    })
  })

  describe('方法：dismiss()', () => {
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
      vi.advanceTimersByTime(240)

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail
      expect(detail.reason).toBe('manual')
      el.remove()
    })
  })

  describe('指针暂停', () => {
    it('pointerenter 暂停自动关闭', async () => {
      const el = createToastElement()
      el.duration = 500
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      // enter 清掉 duration timer，推进远超 duration 也不应关闭
      vi.advanceTimersByTime(600)

      expect(el.visible).toBe(true)
      el.dismiss()
      vi.advanceTimersByTime(240)
      el.remove()
    })

    it('pointerleave 续跑剩余时间，而不是重启满时长', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      vi.advanceTimersByTime(900)
      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
      // 续跑剩余 100ms：若是「离开重启满时长」，这里要 1000 + 240 才够
      vi.advanceTimersByTime(100 + 240)

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('漏掉 pointerleave 时由 document pointerover 兜底恢复', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      // 悬停多久都不关，也没有任何兜底上限
      vi.advanceTimersByTime(5000)
      expect(el.visible).toBe(true)

      // 指针落到别的元素上：pointerover 冒泡到 document，路径不含 toast
      document.body.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
      vi.advanceTimersByTime(1000 + 240)

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('指针移出窗口时由 relatedTarget 为空的 pointerout 兜底恢复', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      vi.advanceTimersByTime(5000)
      expect(el.visible).toBe(true)

      // 元素间移动的 pointerout 带 relatedTarget，只有离开窗口/目标消失才是 null
      document.body.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }))
      vi.advanceTimersByTime(1000 + 240)

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('指针移出文档时由 document pointerleave 兜底恢复', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      vi.advanceTimersByTime(5000)
      expect(el.visible).toBe(true)

      document.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(1000 + 240)

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('悬停暂停期间搬迁节点不吞掉剩余时间', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      // 降级路径的 pause/resume 成对出现：悬停未结束时 resume 不点火
      el.pauseAutoClose()
      el.resumeAutoClose()
      vi.advanceTimersByTime(1000 + 240)
      expect(el.visible).toBe(true)

      el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
      vi.advanceTimersByTime(1000 + 240)

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('悬停期间把 duration 改成 0：恢复后不自动关闭', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      el.setDuration(0)
      el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
      vi.advanceTimersByTime(5000)

      expect(el.visible).toBe(true)
      expect(el.dismissing).toBe(false)
      el.dismiss()
      vi.advanceTimersByTime(240)
      el.remove()
    })

    it('悬停期间 upsert 显式 duration 不点火', async () => {
      const id = toast.info('第一条', { id: 'hover-duration', duration: 1000 })
      await waitForToastMounted()
      const el = mountedToasts()[0]
      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
      vi.advanceTimersByTime(3000)
      expect(el.visible).toBe(true)

      toast.info('第二条', { id, duration: 1000 })
      await el.updateComplete
      vi.advanceTimersByTime(3000)
      expect(el.visible).toBe(true)

      el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
      vi.advanceTimersByTime(1000 + 240)

      expect(el.visible).toBe(false)
    })

    it('touch pointerenter 不暂停自动关闭', async () => {
      const el = createToastElement()
      el.duration = 200
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.dispatchEvent(touchPointerEvent('pointerenter'))
      // touch 指针不清 timer，duration(200) 后自动关闭 + fallback(240)
      vi.advanceTimersByTime(440)

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

      // duration(200) 触发 dismiss + fallback(240) 完成退场
      vi.advanceTimersByTime(440)

      expect(el.visible).toBe(false)
      el.remove()
    })

    it('duration 为 0 时不自动关闭', async () => {
      const el = createToastElement()
      el.duration = 0
      await el.updateComplete
      el.show()
      await el.updateComplete

      vi.advanceTimersByTime(200)

      expect(el.visible).toBe(true)
      el.dismiss()
      vi.advanceTimersByTime(240)
      el.remove()
    })
  })

  describe('自动关闭：暂停与续跑', () => {
    /*
     * 「没有计时器」与「已到期」必须分开表达：搬迁节点走 pause/resume 降级时会先清掉
     * duration 回调，若两者共用同一个 0，正好在「deadline 已过、回调还没执行」的窗口里
     * 搬迁，这条 toast 就再也不会自动关闭。
     */
    it('暂停时已到期：续跑立即退场，而不是永不关闭', async () => {
      const el = createToastElement()
      el.duration = 1000
      await el.updateComplete
      el.show()
      await el.updateComplete

      // 只拨时钟、不推进定时器队列：造出「到期但回调还没跑」的窗口
      // （advanceTimersByTime 会顺手把回调跑掉，复现不出这个窗口）。
      vi.setSystemTime(Date.now() + 2000)

      el.pauseAutoClose()
      el.resumeAutoClose()

      expect(el.dismissing).toBe(true)
      vi.advanceTimersByTime(240)
      expect(el.visible).toBe(false)
      el.remove()
    })

    it('暂停时本就没有计时器（duration 为 0）：续跑不启动倒计时', async () => {
      const el = createToastElement()
      el.duration = 0
      await el.updateComplete
      el.show()
      await el.updateComplete

      el.pauseAutoClose()
      el.resumeAutoClose()
      vi.advanceTimersByTime(5000)

      expect(el.visible).toBe(true)
      expect(el.dismissing).toBe(false)
      el.remove()
    })
  })
})

describe('toast 命令式 API', () => {
  describe('命令式 API：toast.success()', () => {
    it('创建 success 类型 toast', async () => {
      const id = toast.success('成功')
      expect(id).toBeTruthy()
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(1)
    })

    it('返回唯一 id', async () => {
      const id1 = toast.success('消息1')
      const id2 = toast.success('消息2')
      await waitForToastMounted()
      expect(id1).not.toBe(id2)
    })
  })

  describe('命令式 API：toast.info()', () => {
    it('创建 info 类型 toast', async () => {
      toast.info('提示')
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(1)
    })
  })

  describe('命令式 API：toast.warning()', () => {
    it('创建 warning 类型 toast', async () => {
      toast.warning('警告')
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(1)
    })
  })

  describe('命令式 API：toast.error()', () => {
    it('创建 error 类型 toast', async () => {
      toast.error('错误')
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(1)
    })
  })

  describe('命令式 API：upsert 语义（同 id 复用同一条 toast）', () => {
    it('同 tick 内重复 id 只挂载一条，内容以后一次为准', async () => {
      const first = toast({ message: '1', id: 'dup' })
      const second = toast({ message: '2', id: 'dup' })
      await waitForToastMounted()

      expect(second).toBe(first)
      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].message).toBe('2')
    })

    it('已挂载后重复 id 更新 message，不传 type 时保留原类型', async () => {
      const id = toast.info('上传中 0%', { id: 'upload', duration: 0 })
      await waitForToastMounted()

      toast({ id, message: '上传中 60%' })
      await waitForToastMounted()

      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].message).toBe('上传中 60%')
      expect(mountedToasts()[0].type).toBe('info')
    })

    it('已挂载后重复 id 可切换 type 与 heading', async () => {
      const id = toast.info('上传中 0%', { id: 'upload', duration: 0 })
      await waitForToastMounted()

      toast.success('上传完成', { id, heading: '完成' })
      await waitForToastMounted()

      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].type).toBe('success')
      expect(mountedToasts()[0].heading).toBe('完成')
    })

    it('省略 duration 时不重启倒计时，自关闭时点不变', async () => {
      const id = toast.info('倒计时', { id: 'timer', duration: 1000 })
      await waitForToastMounted()

      vi.advanceTimersByTime(600)
      toast({ id, message: '倒计时' })
      // 剩余约 400ms 后自关闭 + 退场；若 patch 重启了计时，此时仍应可见。
      vi.advanceTimersByTime(400 + 240)

      expect(mountedToasts()).toHaveLength(0)
    })

    it('显式传 duration 时重新开始计时', async () => {
      const id = toast.info('倒计时', { id: 'timer', duration: 1000 })
      await waitForToastMounted()

      vi.advanceTimersByTime(600)
      toast({ id, message: '重新计时', duration: 1000 })
      // 旧计时在 1000ms 处就该关掉它；重启后此时仍在。
      vi.advanceTimersByTime(400 + 240)
      expect(mountedToasts()).toHaveLength(1)

      vi.advanceTimersByTime(600 + 240)
      expect(mountedToasts()).toHaveLength(0)
    })

    /*
     * `toast.error` 的 5000 默认值只在挂载时兜底，不进 options：否则 upsert 每次都判定为
     * 「显式传入 duration」而重启倒计时，与 README 写明的「只有显式传入才重启」直接矛盾。
     */
    it('toast.error 未显式传 duration 时不重启倒计时', async () => {
      const id = toast.info('倒计时', { id: 'timer', duration: 1000 })
      await waitForToastMounted()

      vi.advanceTimersByTime(600)
      toast.error('重试失败', { id })
      // 原计时点在 1000ms 处；若 shortcut 注入了隐式 duration，此刻这条应当仍在。
      vi.advanceTimersByTime(400 + 240)

      expect(mountedToasts()).toHaveLength(0)
    })

    it('error 的默认 duration 是 5000，通用形式同样兜底', async () => {
      const shortcut = toast.error('连接中断')
      const generic = toast({ message: '通用形式', type: 'error' })
      await waitForToastMounted()

      // 只看仍在计时的元素：默认值若仍是 3000，此刻两条都已进入退场（仍在 DOM，但 dismissing）
      vi.advanceTimersByTime(3000)
      expect(
        mountedToasts()
          .filter(el => !el.dismissing)
          .map(el => el.toastId)
      ).toEqual([shortcut, generic])

      vi.advanceTimersByTime(2000 + 240)
      expect(mountedToasts()).toHaveLength(0)
    })

    it('position 变化时搬进新容器、清理空容器并保住剩余计时', async () => {
      const id = toast.info('搬家中', { id: 'move', position: 'top-right', duration: 1000 })
      await waitForToastMounted()

      vi.advanceTimersByTime(400)
      toast({ id, message: '搬家中', position: 'bottom-left' })

      const el = mountedToasts()[0]
      expect(el.position).toBe('bottom-left')
      expect(getToastContainer('bottom-left')?.contains(el)).toBe(true)
      expect(getToastContainer('top-right')).toBeNull()

      // 搬运不应清掉自动关闭计时：剩余约 600ms 后自关闭 + 退场。
      vi.advanceTimersByTime(600 + 240)
      expect(mountedToasts()).toHaveLength(0)
    })

    it('计时已到期但回调尚未执行时搬迁 position，仍会退场而不是永久滞留', async () => {
      const id = toast.info('滞留', { id: 'stuck', position: 'top-right', duration: 1000 })
      await waitForToastMounted()

      // 只拨时钟、不推进定时器队列：造出「deadline 已过、duration 回调还排在队列里没跑」的窗口。
      vi.setSystemTime(Date.now() + 2000)

      toast({ id, message: '滞留', position: 'bottom-left' })

      // 剩余时间按「已到期」处理：立刻退场；若被当成「本来就没有计时器」，它会一直挂在页面上。
      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].dismissing).toBe(true)

      vi.advanceTimersByTime(240)
      expect(mountedToasts()).toHaveLength(0)
    })

    it('关闭后重传同 id 新建一条', async () => {
      const id = toast.info('第一轮', { id: 'cycle', duration: 0 })
      await waitForToastMounted()

      toast.close(id)
      vi.advanceTimersByTime(240)
      expect(mountedToasts()).toHaveLength(0)

      const again = toast.info('第二轮', { id: 'cycle', duration: 0 })
      await waitForToastMounted()

      expect(again).toBe(id)
      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].message).toBe('第二轮')
    })

    it('close() 能收走不在管理器内的同 id 残留元素', async () => {
      toast.info('占位', { duration: 0 })
      await waitForToastMounted()

      const container = getToastContainer('top-right')!
      const stray = document.createElement('web-ui-toast')
      stray.toastId = 'stray'
      container.appendChild(stray)

      toast.close('stray')

      const remaining = Array.from(getToasts()).map(el => el.toastId)
      expect(remaining).not.toContain('stray')
    })

    /*
     * 退场窗口：`close()` 只把 visible 置 false，元素要等退场结束、toast-close 派发后才解除映射。
     * 这段窗口内元素仍连接、仍被映射持有，但**不再接受更新**——若复用同一条，补丁会写进一条
     * 正在消失的元素，退场结束后通知彻底丢失，而返回值仍是同一个 id，调用方无从区分。
     */
    it('退场窗口内重传同 id 立刻新建一条可见 toast', async () => {
      const id = toast.info('第一轮', { id: 'cycle', duration: 0 })
      await waitForToastMounted()

      toast.close(id)
      // 不推进退场计时：此刻元素仍在 DOM、仍被映射持有
      expect(mountedToasts()[0].dismissing).toBe(true)

      const again = toast({ id, message: '第二轮' })
      await waitForToastMounted()

      expect(again).toBe(id)
      const visible = mountedToasts().filter(el => !el.dismissing)
      expect(visible).toHaveLength(1)
      expect(visible[0].message).toBe('第二轮')
    })

    it('退场中的旧元素收尾时不会删掉同 id 的新元素', async () => {
      const id = toast.info('第一轮', { id: 'cycle', duration: 0 })
      await waitForToastMounted()

      toast.close(id)
      toast({ id, message: '第二轮' })
      await waitForToastMounted()

      // 推进到旧元素的退场兜底定时器之后：它的 toast-close 按元素身份解绑，不应波及新元素
      vi.advanceTimersByTime(240)

      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].message).toBe('第二轮')
      expect(mountedToasts()[0].dismissing).toBe(false)
    })

    it('元素被宿主摘出 DOM 后重传同 id 新建一条', async () => {
      const id = toast.info('第一轮', { id: 'cycle', duration: 0 })
      await waitForToastMounted()

      // 宿主（框架卸载、容器被替换等）直接移出节点：disconnectedCallback 只清计时器
      mountedToasts()[0].remove()

      toast({ id, message: '第二轮' })
      await waitForToastMounted()

      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].message).toBe('第二轮')
    })
  })

  describe('命令式 API：toast.close()', () => {
    it('按 id 关闭 toast', async () => {
      const id = toast.info('待关闭')
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(1)

      toast.close(id)
      vi.advanceTimersByTime(240)

      expect(mountedToasts()).toHaveLength(0)
    })

    it('关闭不存在的 id 无副作用', () => {
      toast.close('nonexistent')
      expect(mountedToasts()).toHaveLength(0)
    })

    /*
     * 「还没开始显示」有两种状态，都能被 close() 取消；否则调用方以为关掉了，元素照常出现。
     */
    it('close() 能取消同 tick 仍在待挂载队列里的条目', async () => {
      const id = toast.info('还没出现', { id: 'queued' })
      toast.close(id)
      await waitForToastMounted()

      expect(mountedToasts()).toHaveLength(0)
      // 队列被取消后连容器都不该建出来
      expect(getToastContainer('top-right')).toBeNull()
    })

    it('close() 能收走已挂载但 show() 还没跑的 toast，且只派发一次 toast-close', async () => {
      const id = toast.info('还没显示', { id: 'pre-show' })
      // 只冲微任务：flushBatch 已挂载，rAF 里的 show() 还没跑
      await Promise.resolve()
      expect(mountedToasts()).toHaveLength(1)
      expect(mountedToasts()[0].visible).toBe(false)

      const handler = vi.fn<(e: Event) => void>()
      document.addEventListener('toast-close', handler)

      toast.close(id)
      await waitForToastMounted()

      expect(mountedToasts()).toHaveLength(0)
      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ id, reason: 'programmatic' })

      document.removeEventListener('toast-close', handler)
    })
  })

  describe('命令式 API：toast.clear()', () => {
    it('清除所有 toast', async () => {
      toast.info('1')
      toast.info('2')
      toast.info('3')
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(3)

      toast.clear()
      vi.advanceTimersByTime(240)

      expect(mountedToasts()).toHaveLength(0)
    })

    it('clear() 能取消同 tick 仍在待挂载队列里的条目', async () => {
      toast.info('队列一', { id: 'q1' })
      toast.info('队列二', { id: 'q2' })
      toast.clear()
      await waitForToastMounted()

      expect(mountedToasts()).toHaveLength(0)
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
      vi.advanceTimersByTime(240)

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
      vi.advanceTimersByTime(240)

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
      vi.advanceTimersByTime(240)

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

      expect(getFallbackOverlayRoot()?.querySelectorAll('[data-wui-toast-position="top-left"]').length).toBe(1)
    })

    it('position 容器承担礼貌播报语义', async () => {
      toast.info('test')
      await waitForToastMounted()
      const container = getToastContainer('top-right')
      expect(container).toBeTruthy()
      // 原用例断言的是容器 class 名单（`wui-toast-container`，§2 D2 内部 class），已删；
      // 容器对 AT 的公开语义保留：礼貌播报的日志区，新增条目被播报。
      expect(container?.getAttribute('role')).toBe('log')
      expect(container?.getAttribute('aria-live')).toBe('polite')
      expect(container?.getAttribute('aria-relevant')).toBe('additions')
    })
  })

  describe('连续调用', () => {
    it('大量连续调用不报错', async () => {
      for (let i = 0; i < 10; i++) {
        toast.info(`消息 ${i}`)
      }
      await waitForToastMounted()
      expect(mountedToasts()).toHaveLength(10)

      toast.clear()
      vi.advanceTimersByTime(240)
      expect(mountedToasts()).toHaveLength(0)
    })
  })
})
