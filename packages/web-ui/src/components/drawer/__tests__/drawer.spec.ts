import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

// jsdom 没有原生 dialog 的 modal 语义。**逐 spec 局部**补足 showModal/close 对 open 的
// 影响 —— 装全局 shim 会让其它共享 presence 的 spec 里 `showModal?.()` 真正执行，
// 改变那些 spec 既有的观察点。
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

/*
 * 真实浏览器的「点遮罩关闭」是一条 pointerdown（起点在遮罩上）+ 近静止 click 的
 * 指针链路。`dialog.click()` 的 detail 为 0、不来自指针，组件会忽略它（对齐
 * image-preview 的守卫，防止程序化 click 消费上一次指针交互的残留记录），所以
 * 测试遮罩关闭语义必须派发完整的指针链路。
 */
function clickBackdrop(dialog: HTMLDialogElement, clientX = 20, clientY = 20) {
  dialog.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX, clientY })
  )
  dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX, clientY }))
}

/** 定位器（非断言）：拖拽热区没有公开 role/aria，只能用内部 class 拿到它来派发指针事件。 */
function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

function openChangeEvents(el: WebUiDrawer): CustomEvent<{ open: boolean }>[] {
  const events: CustomEvent<{ open: boolean }>[] = []
  el.addEventListener('open-change', event => events.push(event as CustomEvent<{ open: boolean }>))
  return events
}

afterEach(() => document.body.replaceChildren())

/*
 * 属性契约。
 *
 * 属性反射本身是公开契约（消费方按 `[placement=...]` 写样式，也按属性驱动组件），
 * 因此反射留下来了；但「非法值回退」与「默认值」合成一条，不各占一条用例。
 */
describe('WebUiDrawer 属性', () => {
  it('open 反射到 host，并随赋值来回切换', async () => {
    const el = createDrawer()

    el.open = true
    await waitForUpdate(el)
    expect(el.hasAttribute('open')).toBe(true)

    el.open = false
    await waitForUpdate(el)
    expect(el.hasAttribute('open')).toBe(false)

    cleanupElement(el)
  })

  it('placement 默认 right；非法值回退到默认值', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    expect(el.getAttribute('placement')).toBe('right')
    expect(el.placement).toBe('right')

    // 非法值必须落到默认档而不是照单全收 —— 照单全收会让面板停在一个不存在的
    // placement 上，样式全部失配且用户无从察觉。
    el.placement = 'invalid' as 'right'
    await waitForUpdate(el)
    expect(el.placement).toBe('right')
    expect(el.getAttribute('placement')).toBe('right')

    cleanupElement(el)
  })

  it('placement 反映到 host 属性', async () => {
    const el = createDrawer()

    for (const placement of ['left', 'top', 'bottom'] as const) {
      el.placement = placement
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe(placement)
    }

    cleanupElement(el)
  })

  it('closable 默认关闭，为 true 时反射到 host 并渲染关闭入口', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    expect(el.closable).toBe(false)
    expect(queryA11y(el, '[aria-label="关闭"]')).toBeNull()

    el.closable = true
    await waitForUpdate(el)
    expect(el.hasAttribute('closable')).toBe(true)
    expect(queryA11y(el, '[aria-label="关闭"]')).toBeTruthy()

    cleanupElement(el)
  })

  it('draggable 默认关闭且不反射，为 true 时反射', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    expect(el.draggable).toBe(false)
    expect(el.hasAttribute('draggable')).toBe(false)

    el.draggable = true
    await waitForUpdate(el)
    expect(el.hasAttribute('draggable')).toBe(true)

    cleanupElement(el)
  })

  it('heading 设置可访问名称来源', async () => {
    const el = createDrawer()
    el.heading = '我的标题'
    await waitForUpdate(el)
    expect(el.heading).toBe('我的标题')
    cleanupElement(el)
  })

  it('headless：dialog-label 提供可访问名称', async () => {
    const el = createDrawer()
    el.headless = true
    el.dialogLabel = '主导航'
    await waitForUpdate(el)

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    // 可访问名称是硬契约（政策第 3 条）：headless 抽屉没有可见标题，
    // 名称只能来自 dialog-label，丢了它屏幕阅读器只报「对话框」。
    expect(dialog.getAttribute('aria-label')).toBe('主导航')
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false)
    cleanupElement(el)
  })

  it('打开期间切换 headless：保留同一个处于 top layer 的 dialog', async () => {
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)

    // 换掉 dialog 元素会让面板退出 top layer：用户看到遮罩与面板分离，
    // 键盘路由与滚动锁都跟着断。
    el.headless = true
    await waitForUpdate(el)

    expect(el.shadowRoot?.querySelector('dialog')).toBe(dialog)
    expect(dialog.open).toBe(true)
    cleanupElement(el)
  })
})

/*
 * 滚动锁。
 *
 * 锁定期间页面不能被滚走 —— 这正是抽屉打开时用户依赖的行为；两实例时先释放的那个
 * 不能把锁一起解开（抽屉叠抽屉，内层关掉后外层仍开着，页面必须继续锁着）。
 */
describe('WebUiDrawer 滚动锁', () => {
  it('默认打开时锁定页面滚动', async () => {
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)

    expect(document.documentElement.style.overflow).toBe('hidden')
    cleanupElement(el)
  })

  it('no-scroll-lock 为 true 时不锁定页面滚动', async () => {
    const el = createDrawer()
    el.setAttribute('no-scroll-lock', '')
    el.open = true
    await waitForUpdate(el)

    expect(document.documentElement.style.overflow).toBe('')
    cleanupElement(el)
  })

  it('打开期间切换 no-scroll-lock 立即恢复页面滚动', async () => {
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)

    el.setAttribute('no-scroll-lock', '')
    await waitForUpdate(el)

    expect(document.documentElement.style.overflow).toBe('')
    cleanupElement(el)
  })
})

describe('WebUiDrawer 事件：open-change', () => {
  it('程序开合都不派发 open-change（它只报告用户意图）', async () => {
    const el = createDrawer()
    const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

    el.open = true
    await waitForUpdate(el)
    el.open = false
    await waitForUpdate(el)
    // 重复赋同一个值同样不派发：消费方据事件驱动副作用，噪声事件会重复触发。
    el.open = true
    await waitForUpdate(el)

    expect(events).toHaveLength(0)
    cleanupElement(el)
  })

  it('show() 设置 open 但不派发 open-change', async () => {
    const el = createDrawer()
    const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

    el.show()
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    // 已打开时重复 show 也不派发。
    el.show()
    await waitForUpdate(el)
    expect(events).toHaveLength(0)
    cleanupElement(el)
  })

  it('点击内置关闭按钮：关闭抽屉并派发一次 open-change(false)', async () => {
    const el = createDrawer()
    el.closable = true
    el.open = true
    await waitForUpdate(el)

    const events = openChangeEvents(el)
    ;(queryA11y(el, '[aria-label="关闭"]') as HTMLElement).click()
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    expect(events.map(event => event.detail.open)).toEqual([false])
    cleanupElement(el)
  })
})

/*
 * controlled 语义：用户动作只**请求**关闭，open 归消费方写回。
 *
 * 抽屉自改 open 会让受控用法彻底失效（消费方拿到的事件与它自己的状态对不上），
 * 而 native dialog 的关闭请求又必须被真正撤销 —— 两头都要断。
 */
describe('WebUiDrawer controlled', () => {
  it('Escape 与遮罩点击都只请求 open=false，不自行修改 open', async () => {
    const el = createDrawer()
    el.controlled = true
    el.open = true
    await waitForUpdate(el)

    const events = openChangeEvents(el)
    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    dispatchEscapeKey(dialog)
    await waitForUpdate(el)

    expect(el.open).toBe(true)
    expect(events.map(event => event.detail.open)).toEqual([false])

    clickBackdrop(dialog)
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

    const events = openChangeEvents(el)
    ;(queryA11y(el, '[aria-label="关闭"]') as HTMLElement).click()
    await waitForUpdate(el)

    expect(el.open).toBe(true)
    expect(events.map(event => event.detail.open)).toEqual([false])
    cleanupElement(el)
  })

  it('controlled 消费方回写 open=false 后，抽屉真正关闭', async () => {
    const el = createDrawer()
    el.controlled = true
    el.open = true
    await waitForUpdate(el)

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    el.addEventListener('open-change', event => {
      if (!(event as CustomEvent<{ open: boolean }>).detail.open) el.open = false
    })

    dispatchEscapeKey(dialog)
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    dispatchTransformTransitionEnd(dialog)
    await waitForUpdate(el)
    expect(dialog.open).toBe(false)
    cleanupElement(el)
  })
})

/*
 * 关闭过渡与 top layer。
 *
 * 抽屉关闭时必须播完退出动画才真正离开 top layer：dialog 提前 `close()` 会让遮罩先
 * 消失而面板还在原地滑出，用户看到的是「遮罩先没了」。`transitionend` 缺失时（用户
 * 在动画播完前就切走标签页、或 reduced motion 下过渡根本没跑）由兜底定时器收尾，
 * 否则抽屉永久卡在打开态。
 */
describe('WebUiDrawer 关闭生命周期', () => {
  it('关闭过渡完成前 dialog 留在 top layer，完成后关闭', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)
    const dialog = el.shadowRoot?.querySelector('dialog')

    const events = openChangeEvents(el)

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

  it('transitionend 缺失时兜底定时器完成关闭', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)
    const dialog = el.shadowRoot?.querySelector('dialog')

    // 不派发 transitionend（reduced motion 下过渡不跑）：抽屉必须仍能收尾，
    // 否则它永远停在「open=false 但 dialog 仍开着」的卡死态。
    el.close()
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(400)

    expect(dialog?.open).toBe(false)

    vi.useRealTimers()
    cleanupElement(el)
  })

  it('关闭过程中重新打开会取消关闭与兜底定时器', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)
    const dialog = el.shadowRoot?.querySelector('dialog')

    el.close()
    await waitForUpdate(el)
    expect(dialog?.open).toBe(true)

    // 快速连点：关闭后立刻重开。兜底定时器若没被取消，它会在重开后把抽屉关掉 ——
    // 表现为「快速连点后抽屉开了又自己消失」。
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

  it('重开后到达的过期 close 事件不误关刚重开的 drawer；真实外部关闭仍生效', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement

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

    // 模拟上一会话的过期 close 事件此刻才到达：不得把刚重开的 drawer 误关
    // （否则重开即被误关，表现为连续开关丢失过渡动画——真机「快速连点后后续
    // drawer 开关丢失过渡」的根因之一）。
    dialog.dispatchEvent(new Event('close'))
    await waitForUpdate(el)
    expect(el.open).toBe(true)
    expect(dialog.open).toBe(true)

    // self-close 标志已被上一步消费：真实外部关闭（如表单 method="dialog"）
    // 仍走正常关闭管线。
    dialog.dispatchEvent(new Event('close'))
    await waitForUpdate(el)
    expect(el.open).toBe(false)

    vi.useRealTimers()
    cleanupElement(el)
  })
})

/*
 * Escape 与遮罩的关闭语义。
 *
 * 两者的默认值相反（Escape 关、遮罩也关），`no-backdrop-close` 只改后者：
 * 带上该属性后用户仍有 Escape 这条键盘出口，同时点遮罩不再误关。
 */
describe('WebUiDrawer Escape 与遮罩', () => {
  it('默认点遮罩关闭抽屉', async () => {
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)

    clickBackdrop(el.shadowRoot?.querySelector('dialog') as HTMLDialogElement)
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    cleanupElement(el)
  })

  it('no-backdrop-close：点遮罩不关闭', async () => {
    const el = createDrawer()
    el.setAttribute('no-backdrop-close', '')
    el.open = true
    await waitForUpdate(el)

    expect(el.noBackdropClose).toBe(true)
    clickBackdrop(el.shadowRoot?.querySelector('dialog') as HTMLDialogElement)
    await waitForUpdate(el)

    expect(el.open).toBe(true)
    cleanupElement(el)
  })

  it('no-backdrop-close 时 Escape 仍通过关闭过渡退出', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.setAttribute('no-backdrop-close', '')
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)
    const dialog = el.shadowRoot?.querySelector('dialog')

    // Escape 不能被 no-backdrop-close 一起挡掉 —— 它只该管遮罩点击。
    // 若这条被误挡，用户在没有鼠标的场景下就彻底关不掉抽屉。
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

/*
 * 原生 dialog 的关闭请求。
 *
 * 表单 `method="dialog"` 与宿主程序化 `dialog.close()` 都会真的把 dialog 关掉。
 * 组件必须把它当成用户关闭处理（同步 open、派发 open-change），否则抽屉的
 * `open` 会与真实 dialog 状态脱节，后续 show() 直接失灵。
 */
describe('WebUiDrawer 原生 dialog 关闭', () => {
  it('controlled 时恢复 native dialog 并仅请求关闭', async () => {
    const el = createDrawer()
    el.controlled = true
    el.open = true
    await waitForUpdate(el)
    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    const events = openChangeEvents(el)

    dialog.close()
    dialog.dispatchEvent(new Event('close'))
    await waitForUpdate(el)

    // 受控下组件替宿主把 dialog 拉回打开态，面板不会凭空消失。
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
    const events = openChangeEvents(el)

    dialog?.close()
    dialog?.dispatchEvent(new Event('close'))
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    expect(events.map(event => event.detail.open)).toEqual([false])

    // 同步之后必须还能重开：状态不同步时 show() 会被当成「已经开着」而空转。
    el.show()
    await waitForUpdate(el)
    expect(el.open).toBe(true)
    expect(dialog?.open).toBe(true)

    cleanupElement(el)
  })
})

/*
 * 拖拽关闭（手势与状态转换）。
 *
 * 判据只留阈值行为（拖过阈值 → open=false + 一次 open-change）与归宿（open、原生
 * dialog、事件次数）。拖动过程中的 transform 位移、遮罩 opacity 与 `is-dragging`
 * 等内部状态类不留 —— 定位热区用内部 class 只是为了派发事件，断言仍落在公开面上。
 */
describe('WebUiDrawer 拖拽关闭', () => {
  /** 沿闭合方向（默认 right → 向右）拖过阈值后松手。首段 move 只用于校准判定零点。 */
  async function dragToClose(el: WebUiDrawer, from = 300, to = 520) {
    const zone = getDragZone(el)
    zone.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: from }))
    await waitForUpdate(el)
    zone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: from + 40 })
    )
    await waitForUpdate(el)
    zone.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: to }))
    await waitForUpdate(el)
    zone.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: to }))
    await waitForUpdate(el)
    // 释放后的收尾已交还 CSS transition（issue #123）：jsdom 不运行过渡、也不派发
    // transitionend，收尾由兜底定时器完成，这里把时间推过它。
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
  }

  it('draggable 时拖过阈值走关闭管线', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)

    const events = openChangeEvents(el)
    await dragToClose(el)

    // 用户手势关闭与点击关闭按钮同语义：派发一次 open-change(false)
    expect(el.open).toBe(false)
    expect(events.map(event => event.detail.open)).toEqual([false])

    vi.useRealTimers()
    cleanupElement(el)
  })

  it('未启用 draggable 时，同样的指针序列既不关闭也不派发 open-change', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)

    const events = openChangeEvents(el)
    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement

    dialog.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300 })
    )
    await waitForUpdate(el)
    dialog.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 520 })
    )
    await waitForUpdate(el)
    dialog.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 520 }))
    await waitForUpdate(el)

    // 面板内容上落手不该触发拖拽关闭：正文可滚动、可选中，只有热区才是起手区。
    expect(el.open).toBe(true)
    expect(events).toHaveLength(0)

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

    const events = openChangeEvents(el)
    await dragToClose(el)

    expect(el.open).toBe(true)
    expect(events.map(event => event.detail.open)).toEqual([false])

    vi.useRealTimers()
    cleanupElement(el)
  })

  it('拖拽进行中 Escape 被抑制；手势结束后 Escape 恢复关闭', async () => {
    vi.useFakeTimers()
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await waitForUpdate(el)
    await vi.advanceTimersByTimeAsync(16)

    const dragZone = getDragZone(el)
    const events = openChangeEvents(el)

    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300 })
    )
    await waitForUpdate(el)
    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement

    // 按住拖拽时按 Escape 会把面板「关一半」——它留在原地，用户无从恢复。
    dispatchEscapeKey(dialog)
    await waitForUpdate(el)
    expect(events).toHaveLength(0)
    expect(el.open).toBe(true)

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
})
