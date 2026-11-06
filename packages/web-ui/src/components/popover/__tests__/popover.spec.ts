import '..'

import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

import { cleanupElement, contractReflection, queryA11y, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiPopover } from '..'

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type)
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

const createPopover = (triggerHtml = '', panelHtml = '', attrs?: Record<string, string>): WebUiPopover => {
  const el = document.createElement('web-ui-popover')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = `
    <button slot="trigger">${triggerHtml}</button>
    <div>${panelHtml}</div>
  `
  document.body.appendChild(el)
  return el
}

const clickTrigger = (el: WebUiPopover) => {
  const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')
  trigger?.click()
}

beforeEach(() => {
  document.body.innerHTML = ''
  // 全量 fake 定时器（含 requestAnimationFrame）；组件内部 rAF 与 setTimeout
  // 均由 advanceTimersToNextFrame / advanceTimersByTime 精确推进
  vi.useFakeTimers()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('WebUiPopover 组件', () => {
  describe('属性：trigger', () => {
    // trigger 是空格或逗号分隔的手势集合：取值规范化走共享的 normalizeTriggerSet，
    // 各手势的实际接线由下面的触发方式分组按行为覆盖。
    it('设置为 hover', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      expect(el.trigger).toBe('hover')

      cleanupElement(el)
    })

    it('旧字面量 manual 不生效，回退到默认 click', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'manual' })
      await waitForUpdate(el)

      expect(el.trigger).toBe('click')

      cleanupElement(el)
    })

    it('非法值回退到 click', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'invalid' })
      await waitForUpdate(el)

      expect(el.trigger).toBe('click')

      cleanupElement(el)
    })

    // 空格分隔的集合：每种手势独立接线，组合不是「只认第一种」；读回为逗号规范串。
    it('空格分隔的集合成立', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover focus' })
      await waitForUpdate(el)

      expect(el.trigger).toBe('hover,focus')

      cleanupElement(el)
    })

    it('非字符串取值回退到默认', () => {
      const el = createPopover('Btn', 'Content')
      el.trigger = ['hover', 'click'] as unknown as string

      expect(el.trigger).toBe('click')

      cleanupElement(el)
    })

    it('旧字面量 manual 作为未知 token 被丢弃', () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover manual' })

      expect(el.trigger).toBe('hover')

      cleanupElement(el)
    })
  })

  describe('属性：open', () => {
    contractReflection('open 反射到 host attribute', () => createPopover('Btn', 'Content'), [
      ['open', true, 'open', '']
    ])

    it('默认不挂出 panel', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)
      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).not.toBe(false)

      cleanupElement(el)
    })

    // toggle panel 是 popover 的核心契约：panel 真的挂出 / 真的隐藏，且不是把 el.open 自读一遍。
    it('open 翻转真的挂出与隐藏 panel', async () => {
      const el = createPopover('Btn', 'Content')

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).toBe(false)

      el.open = false
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).not.toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：portal', () => {
    contractReflection('portal 反射到 host attribute', () => createPopover('Btn', 'Content'), [
      ['portal', true, 'portal', '']
    ])
  })

  describe('属性：disabled', () => {
    it('禁用时点击不打开', async () => {
      const el = createPopover('Btn', 'Content', { disabled: '' })
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('禁用时 show() 不打开', async () => {
      const el = createPopover('Btn', 'Content')
      el.disabled = true
      await waitForUpdate(el)

      el.show()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    contractReflection('disabled 反射到 host attribute', () => createPopover('Btn', 'Content'), [
      ['disabled', true, 'disabled', '']
    ])
  })

  describe('内容门控', () => {
    const createEmptyPopover = () => {
      const el = document.createElement('web-ui-popover')
      el.innerHTML = '<button slot="trigger">B</button>'
      document.body.appendChild(el)
      return el
    }

    it('没有 panel 内容时点击不打开', async () => {
      const el = createEmptyPopover()
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('关闭态新增内容不自动打开', async () => {
      const el = createEmptyPopover()
      await waitForUpdate(el)

      el.append(document.createElement('div'))
      await Promise.resolve()
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('show() 可以空开；内容从有到无才收起', async () => {
      const el = createEmptyPopover()
      await waitForUpdate(el)

      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      const content = document.createElement('div')
      content.textContent = 'Content'
      el.append(content)
      await Promise.resolve()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      content.remove()
      await Promise.resolve()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性：placement', () => {
    contractReflection('placement 反射到 host attribute', () => createPopover('Btn', 'Content'), [
      ['placement', 'left', 'placement', 'left']
    ])

    it('非法值时回退到默认值', async () => {
      const el = createPopover('Btn', 'Content')
      ;(el as any).placement = 'invalid'
      await waitForUpdate(el)
      expect(el.placement).toBe('bottom')

      cleanupElement(el)
    })
  })

  describe('属性：offset / placement', () => {
    /*
     * 打开态改定位参数属于状态转换（政策 §3）：panel 必须仍然可见，不能因为重定位
     * 被重新隐藏。两条各开一个元素——共用一条会让失败时说不清是哪个参数触发的。
     *
     * 顺序是「先开后改」：反过来（先改后开）测的是打开流程读到了新值，与这里要守的
     * 「已打开的 panel 被重定位后不消失」不是同一件事，判别力差一层。
     */
    it('打开态修改 offset 后 panel 仍可见', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).toBe(false)

      el.offset = 16
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).toBe(false)
      cleanupElement(el)
    })

    it('打开态修改 placement 后 panel 仍可见', async () => {
      const el = createPopover('Btn', 'Content')
      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).toBe(false)

      el.placement = 'top'
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')).toBe(false)
      cleanupElement(el)
    })

    // 越界回退是公开 token 的取值边界：offset 下限 0，上限 100。
    it('负值与过大值回退到边界内', async () => {
      const el = createPopover('Btn', 'Content')

      el.offset = -10
      await waitForUpdate(el)
      expect(el.offset).toBe(0)

      el.offset = 999
      await waitForUpdate(el)
      expect(el.offset).toBe(100)

      cleanupElement(el)
    })
  })

  describe('触发方式：click', () => {
    it('点击 trigger 切换打开', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      clickTrigger(el)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('再次点击 trigger 关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      clickTrigger(el)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击外部关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('Escape 键关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击 panel 内部不关闭', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      const panel = queryA11y(el, '[role="dialog"]')
      panel?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('触发方式：hover', () => {
    it('pointerenter 打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('pointerleave 关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new PointerEvent('pointerleave'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    /*
     * keep-alive 登记在断连时被撤销，重连必须重新绑上：只绑 `firstUpdated` 的话，元素被
     * 临时移出文档再挂回之后，移入 panel 不再取消「离开宿主」排下的关闭计时，hover 会
     * 在鼠标还停在 panel 上时自己关掉。
     */
    it('断开重连后移入 panel 仍取消关闭计时', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.remove()
      document.body.append(el)
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new PointerEvent('pointerleave'))
      queryA11y(el, '[role="dialog"]')?.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(1000)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('touch pointerenter 不打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(touchPointerEvent('pointerenter'))
      vi.advanceTimersByTime(100)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('hover 模式下点击外部关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    // Escape 的归属由 overlay 仲裁决定，不看手势集合：只有 none 会把它接住。
    it('hover 集合下 Escape 关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('hover 集合下点击 trigger 不切换', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('disabled 时不响应 hover', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover', disabled: '' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('触发方式：click hover 组合', () => {
    it('悬停与点击各自都能打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'click hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      clickTrigger(el)
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('悬停打开后点击 panel 外关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'click hover' })
      await waitForUpdate(el)

      el.dispatchEvent(new PointerEvent('pointerenter'))
      vi.advanceTimersByTime(200)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('触发方式：focus', () => {
    // focusin 打开由 `:focus-visible` 决定，需要真实引擎，见同目录 popover.browser.spec.ts。
    // 这里钉 focus 集合独有的两条：点击不接管、外点照常关闭。
    it('focus 集合下点击 trigger 不打开，外点关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'focus' })
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('focus 集合下失焦关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'focus' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('hover 集合下失焦也关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('触发方式：none', () => {
    it('点击 trigger 不打开', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'none' })
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击外部不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'none' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('Escape 不关闭', async () => {
      const el = createPopover('Btn', 'Content', { trigger: 'none' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('portal 变更后 Escape 仍不关闭：reconfigure 换会话不得丢掉 none 惰性', async () => {
      // portal 变更只登记一帧 rAF；fake timers 下这条路径走不到 reconfigure，必须用真实帧。
      vi.useRealTimers()

      const el = createPopover('Btn', 'Content', { trigger: 'none' })
      await waitForUpdate(el)

      el.open = true
      await el.updateComplete
      await waitForFrame()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      // reconfigure 会 dispose 并按需重建 portal，也就是重新 claim —— 新会话的 inert
      // 恒为 false，组件必须按当前 trigger 重推，否则 none 的契约被 Escape 破坏。
      // 本行承重（非备份）：popover 的 reconfigure 不引发渲染，摘掉这行本用例立刻转红。
      el.portal = true
      await el.updateComplete
      await waitForFrame()
      await waitForFrame()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  // 注：`open-change` 的 notification 语义（命令式派发、声明式静默、用户手势通知、detail.open 为变更后值）
  // 已由共享矩阵 `shared/open-state/__tests__/open-change-contract.spec.ts` 在 4 个 overlay 组件上统一覆盖。
  // 下方仅保留 popover 特有的「hover 重入」边界，其余等价用例按 D4 删除、存活覆盖指向该矩阵。
  describe('事件：open-change', () => {
    it('hover 重入后命令式关闭只派发关闭事件', async () => {
      vi.useFakeTimers()
      const el = createPopover('Btn', 'Content', { trigger: 'hover' })
      el.show()
      await waitForUpdate(el)

      const handler = vi.fn<(event: Event) => void>()
      el.addEventListener('open-change', handler)
      el.dispatchEvent(new PointerEvent('pointerenter'))
      await vi.advanceTimersByTimeAsync(100)
      el.hide()
      await waitForUpdate(el)

      expect(handler).toHaveBeenCalledTimes(1)
      const [[event]] = handler.mock.calls
      expect((event as CustomEvent<{ open: boolean }>).detail.open).toBe(false)
      vi.useRealTimers()
      cleanupElement(el)
    })
  })

  describe('公开 API', () => {
    // 命令式 API 与 open 属性走同一条状态机，唯一独立的东西是「命令序列本身能驱动
    // panel 挂出与隐藏」。合进一条：三条各开一个元素的重复用例会让同一契约可被整体删除。
    //
    // 这一条也是命令式入口的存活覆盖：show()/hide()/toggle() 不读 trigger（源码里它们只写
    // open），所以 none 分组下那条「仅由公开 API 或 open prop 控制」的副本判的是同一件事，
    // 已按等价重复删除。none 特有的语义留在上面那组：手势一律不触发。
    it('show() / toggle() / hide() 驱动 panel 挂出与隐藏', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)
      const panel = () => queryA11y(el, '[role="dialog"]')?.hasAttribute('hidden')

      el.show()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      expect(panel()).toBe(false)

      el.hide()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      expect(panel()).not.toBe(false)

      el.toggle()
      await el.updateComplete
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    // panel role 与 trigger 上的 ARIA 回写合并成一条：它们描述的是同一屏里
    // 「弹层是什么 + trigger 当前指向什么」这一组对外语义，分成三条会让整组可被删掉而不被发现。
    it('panel 暴露 role=dialog，trigger 承载 aria-expanded 与 aria-controls', async () => {
      const el = createPopover('Btn', 'Content')
      await waitForUpdate(el)

      const panel = queryA11y(el, '[role="dialog"]')
      expect(panel?.getAttribute('role')).toBe('dialog')

      // 回写落在 trigger slot 的 assigned element 上（不是 shadow 里的包装层）：
      // 包装层不可聚焦，AT 读不到它的 ARIA 状态。
      const trigger = el.querySelector<HTMLElement>('[slot="trigger"]')!
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
      expect(trigger.getAttribute('aria-controls')).toBe(panel?.id)

      clickTrigger(el)
      await waitForUpdate(el)
      vi.advanceTimersToNextFrame()
      await waitForUpdate(el)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })
  })
})
