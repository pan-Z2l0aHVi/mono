import '..'
import '@/components/dropdown-item'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { cleanupElement, getMenuPanels, pollUntil, waitForSettledLayout } from '@/shared/test-utils'
import { realTouchPress } from '@/shared/test-utils/real-gesture'
import { expectInsideViewport } from '@/shared/test-utils/viewport'

import type { WebUiContextMenu } from '..'

const ITEMS = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'

afterEach(() => document.body.replaceChildren())

function createMenu(attrs: Record<string, string> = {}): {
  el: WebUiContextMenu
  target: HTMLElement
} {
  const el = document.createElement('web-ui-context-menu')
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  el.innerHTML = `<div id="press-area" style="width: 240px; height: 160px"></div>${ITEMS}`
  document.body.append(el)
  return { el, target: el.querySelector('#press-area') as HTMLElement }
}

async function waitForMenu(el: WebUiContextMenu): Promise<HTMLElement> {
  await pollUntil(() => {
    const panel = getMenuPanels('Context menu')[0]
    return Boolean(panel && panel.style.left && panel.style.top)
  }, 'Expected the context menu to open and be positioned')
  await el.updateComplete
  const panel = getMenuPanels('Context menu')[0]
  if (!panel) throw new Error('Expected the context menu to be open')
  return panel
}

/*
 * 组件侧「同一次手势的补发事件」吸收窗（context-menu/index.ts:63 的私有常量；导出它属改
 * 源码，这里按字面镜像并点名出处）。它给出负向断言该观察多久：补发只可能在窗口内被当成
 * 用户意图，越过整窗还看不到就是没来——所以等待由它推导，而不是挑一个看着够用的毫秒数。
 */
const FOLLOW_UP_WINDOW_MS = 1000
/** 计时器与调度漂移余量，不参与任何断言。 */
const WINDOW_SLACK_MS = 300
const OUTSIDE_FOLLOW_UP_WINDOW_MS = FOLLOW_UP_WINDOW_MS + WINDOW_SLACK_MS

/** 越过吸收窗口后的固定观察窗：用于「没有发生 X」，窗口本身不是判据。 */
async function settle(ms = OUTSIDE_FOLLOW_UP_WINDOW_MS): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

/*
 * 量 panel 几何前的等待。
 *
 * 与 `settle()` 的整窗观察不同，这里等的是**因果条件**：panel 的位置由
 * Floating UI 的 promise 异步写回，高度由 menu item（Lit 异步渲染）决定，
 * 两者都可能在上一次测量之后才落定。等它连续几帧不再变化，再用
 * `getBoundingClientRect()` 量到的才是终态几何。
 */
async function settlePanel(panel: HTMLElement) {
  // 期待驱动：量出来的坐标要落在视口内才算数。少了这条，「按点上方 / 视口外」
  // 与「panel 还没落位」在读数上完全一样，而后者只是进场过渡尚未落定。
  await waitForSettledLayout([panel], { expect: expectInsideViewport([panel]) })
}

describe('context-menu 长按（真实触控管线）', () => {
  /*
   * R9（契约）：触屏长按**从按下的位置向下展开，水平居中于按点**。
   *
   * 契约要点：
   * 1. 垂直贴视口下缘是错的：真机反馈——menu 跑到屏幕最底部，和手指按下的位置完全脱节，
   *    看起来像弹出了另一个 menu。
   * 2. 垂直：「panel 上缘对齐按点 y、向下展开」；放不下才翻转到按点上方（见下一条 R7）。
   * 3. 水平：**居中于按点 x**（`placement: 'bottom'`）—— 手指按的是「这块内容在这里」，
   *    menu 在它正下方居中展开才是 iOS/Android 原生形态；左对齐会让 menu 整体偏到手指
   *    右侧，看起来像弹在了别的东西上面。
   *
   * 精确坐标取 `style.top`（不受进场 scale 污染），可见性取 rect —— 两者都要，
   * 只看 rect 会被动画时刻骗过，只看 style 则证明不了用户真的看得见。
   */
  it('触屏长按从按下的位置向下展开：上缘对齐按点、水平居中于按点、完整可见', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    const point = target.getBoundingClientRect()
    const pressX = point.left + point.width / 2
    const pressY = point.top + point.height / 2

    await realTouchPress(target, { holdMs: 700, endWithCancel: true })
    const panel = await waitForMenu(el)
    expect(el.isOpen).toBe(true)
    await settlePanel(panel)

    // 垂直：上缘对齐按点、向下长。transform-origin 取在 top 一侧，scale 不影响上缘，
    // 因此 style.top 与 rect.top 应当一致。
    expect(Math.abs(Number.parseFloat(panel.style.top) - pressY)).toBeLessThanOrEqual(1)
    const panelRect = panel.getBoundingClientRect()
    expect(Math.abs(panelRect.top - pressY)).toBeLessThanOrEqual(1)
    expect(panelRect.bottom).toBeGreaterThan(pressY)

    // 完整可见：不越视口上下（panel overflow-y: hidden，越界即末项点不到）。
    expect(panelRect.top).toBeGreaterThanOrEqual(0)
    expect(panelRect.bottom).toBeLessThanOrEqual(window.innerHeight)

    // 水平：**中心**对齐按点 x（placement 不带 `-start`，Floating UI 的默认对齐量就是居中）。
    expect(Math.abs((panelRect.left + panelRect.right) / 2 - pressX)).toBeLessThanOrEqual(1)
    // 反向：左缘**不**落在按点上。这一条才排除掉「左对齐也碰巧过上面的等式」——
    // 左对齐时中心会偏出 panel 宽度的一半，上面那条必红，这里只把差异钉得更明确。
    expect(Math.abs(panelRect.left - pressX)).toBeGreaterThan(1)
    cleanupElement(el)
  })

  /*
   * R9 的边界对面：按点贴视口右缘时**居中必须让位给完整可见**。
   *
   * 这不是缺陷而是取舍，flip / shift 的组合天然给出这个结果：按点 x 太靠边，居中算出的
   * panel 会横向溢出视口，shift 的交叉轴钳制把它推回来，于是 panel 不再居中但完整可见。
   * 反过来硬保居中就会让 panel 右侧跑出屏幕，而 panel overflow 不裁，末项直接点不到。
   *
   * 钉两件事，缺一不可：
   * 1. 完整可见（钳制的目的）；
   * 2. 中心确实偏到了按点**左侧**（钳制的确发生了，而不是碰巧居中）。
   */
  it('按点贴视口右缘时居中让位给夹取：panel 完整可见但中心偏到按点左侧', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    target.style.position = 'fixed'
    target.style.right = '0'
    target.style.top = '0'
    target.style.width = '40px'
    target.style.height = '160px'

    const rect = target.getBoundingClientRect()
    const pressX = rect.left + rect.width / 2
    const pressY = rect.top + rect.height / 2

    await realTouchPress(target, { holdMs: 700, endWithCancel: true })
    const panel = await waitForMenu(el)
    await settlePanel(panel)

    const panelRect = panel.getBoundingClientRect()

    // 钳制的目的：完整可见。
    expect(panelRect.left).toBeGreaterThanOrEqual(0)
    expect(panelRect.right).toBeLessThanOrEqual(window.innerWidth)

    // 钳制的确发生了：中心被推到按点左侧，不再居中于按点。
    expect((panelRect.left + panelRect.right) / 2).toBeLessThan(pressX)

    // 垂直方向不受水平钳制牵连：仍然上缘对齐按点、向下展开。
    expect(Math.abs(panelRect.top - pressY)).toBeLessThanOrEqual(1)
    cleanupElement(el)
  })

  /*
   * R7（新契约）：按点低到放不下时**翻转到按点上方**，并让开安全区。
   *
   * 测试环境里 `env(safe-area-inset-bottom)` 恒为 0，证明不了安全区进了夹取算术，
   * 所以覆盖宿主的 `--wui-context-menu-safe-area-bottom`（声明值是
   * `env(safe-area-inset-bottom, 0px)`），等价于「真机上有 34px 安全区」。
   *
   * 构造方式：把按点压到视口最底部，于是「向下展开」必然放不下 → 翻转 →
   * 翻转后那一侧仍放不下 → 兜底夹取把 panel 下缘钉在 `maxBottom`。
   * 判据取行为约束不钉像素：下缘到视口下缘必须**大于**安全区，且只多出一个
   * VIEWPORT_PADDING(8px)。与 viewport-fit 同一取舍：钉死 padding 会让日后调它变成改测试。
   */
  it('按点低到放不下时翻转到按点上方，且 panel 下缘让出安全区、末项完整可见', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    el.style.setProperty('--wui-context-menu-safe-area-bottom', '34px')
    await el.updateComplete

    target.style.position = 'fixed'
    target.style.left = '0'
    target.style.bottom = '0'
    target.style.width = '240px'
    target.style.height = '40px'

    await realTouchPress(target, { holdMs: 700, endWithCancel: true })
    const panel = await waitForMenu(el)
    await settlePanel(panel)

    // 先确认注入真的生效，否则下面全是恒真断言。
    const safeArea = Number.parseFloat(getComputedStyle(el).getPropertyValue('--wui-context-menu-safe-area-bottom'))
    expect(safeArea).toBe(34)

    const pressY = target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
    const panelRect = panel.getBoundingClientRect()

    // 翻转生效：panel 整体在按点上方，不再向下压出视口。
    expect(panelRect.bottom).toBeLessThanOrEqual(pressY + 1)
    expect(panelRect.top).toBeGreaterThanOrEqual(0)

    // 安全区确实进了夹取算术：下缘让开 safeArea + 一个 VIEWPORT_PADDING。
    const gap = window.innerHeight - panelRect.bottom
    expect(gap).toBeGreaterThan(safeArea)
    expect(gap).toBeLessThanOrEqual(safeArea + 9)

    // 末项整条落在安全区之上（用户点得到的实际后果）。
    const items = panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')
    const last = items[items.length - 1]
    expect(last).toBeTruthy()
    const lastRect = last.getBoundingClientRect()
    expect(lastRect.bottom).toBeLessThanOrEqual(window.innerHeight - safeArea + 1)
    expect(lastRect.top).toBeGreaterThanOrEqual(0)
    cleanupElement(el)
  })

  /*
   * 抬手后浏览器补发的 compat click **不穿透**到下层目标。
   *
   * 为什么这条只能用真实触控管线测：compat click 的 target 由**派发那一刻**对触点做命中
   * 测试决定，而不是 pointerdown 的 target。合成 `PointerEvent` / `dispatchEvent` 根本不会
   * 有「补发 click」这一步，所以合成事件下这条断言恒绿——它守不住任何东西。
   *
   * 断言分三层，缺一层就可能被另一种实现蒙过去：
   * 1. 命中测试：落点此刻解析到 **scrim 子树**里的东西，不是下层目标（这是「为什么会穿透」
   *    的直接机制）。这里刻意不要求「命中的必须**是** scrim」：新契约下 panel 从按点向下展开、
   *    水平居中于按点，按点恰好落在 panel 上缘，命中到 panel 本身是正确结果。要守的是
   *    「下层目标不在命中链上」，不是「scrim 必须亲自挡在那个坐标」。
   * 2. 行为：下层目标的 click 计数为 0。
   * 3. menu 自身：补发 click 也不该把刚开的 menu 关掉（`_isLongPressFollowUp` 那道闸）。
   */
  it('抬手补发的 compat click 不穿透到下层目标，也不关掉刚开的 menu', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    let rowClicks = 0
    target.addEventListener('click', () => rowClicks++)
    // 补发 click 的到达时刻由浏览器任务队列决定（负载下可能晚到 1s 以上），
    // 用「真的收到了一次 click」作为观测点，而不是睡固定时长后再断言「没收到」。
    let windowClicks = 0
    const recordClick = () => windowClicks++
    window.addEventListener('click', recordClick, { capture: true })

    const point = target.getBoundingClientRect()
    const pressX = point.left + point.width / 2
    const pressY = point.top + point.height / 2

    try {
      await realTouchPress(target, { holdMs: 700 })
      const panel = await waitForMenu(el)
      expect(el.isOpen).toBe(true)

      await pollUntil(() => windowClicks > 0, 'touchend 后浏览器没有补发 compat click')

      // (1) 命中测试：落点被模态 scrim 子树占据，下层目标不在命中链上。
      const scrim = document.querySelector<HTMLElement>('dialog[data-wui-menu-scrim]')
      expect(scrim).toBeTruthy()
      const hit = document.elementFromPoint(pressX, pressY)
      expect(hit === scrim || scrim!.contains(hit)).toBe(true)
      expect(hit === target || target.contains(hit)).toBe(false)

      // (2) 行为：下层目标零激活。
      expect(rowClicks).toBe(0)

      // (3) menu 没被补发 click 关掉。
      expect(el.isOpen).toBe(true)
      expect(getMenuPanels('Context menu')).toHaveLength(1)
      expect(panel.isConnected).toBe(true)
    } finally {
      window.removeEventListener('click', recordClick, { capture: true })
      cleanupElement(el)
    }
  })

  // 只控制状态机读取的时钟；CDP 输入、渲染、timer 与 Date 时钟保持真实。
  // 点击必须真正命中 modal scrim，再分别验证窗口末点和越界一毫秒后的行为。
  it('吸收窗口内的点击被吞，窗口过后同一次 menu 上的真实点击照常 dismiss', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete
    let now = 0
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now)
    let removeClickListener = () => {}
    let clicks = 0
    const record = (event: Event) => {
      if (event.target === event.currentTarget) clicks++
    }
    try {
      await realTouchPress(target, { holdMs: 700 })
      await vi.waitFor(() => {
        expect(document.querySelector('dialog[data-wui-menu-scrim]')).not.toBeNull()
      })
      const targetScrim = document.querySelector<HTMLElement>('dialog[data-wui-menu-scrim]')!
      const rect = targetScrim.getBoundingClientRect()
      expect(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(targetScrim)
      targetScrim.addEventListener('click', record, { capture: true })
      removeClickListener = () => targetScrim.removeEventListener('click', record, { capture: true })

      now = FOLLOW_UP_WINDOW_MS
      await realTouchPress(targetScrim, { holdMs: 50 })
      await vi.waitFor(() => expect(clicks).toBe(1))
      expect(el.isOpen).toBe(true)
      expect(getMenuPanels('Context menu')).toHaveLength(1)

      now += 1
      await realTouchPress(targetScrim, { holdMs: 50 })
      await vi.waitFor(() => {
        expect(clicks).toBe(2)
        expect(el.isOpen).toBe(false)
      })
    } finally {
      removeClickListener()
      clock.mockRestore()
      cleanupElement(el)
    }
  })

  it('长按只派发一次 open，不因浏览器补发的 contextmenu 双开', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    const events: CustomEvent<{ open: boolean }>[] = []
    el.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))

    await realTouchPress(target, { holdMs: 900 })
    await waitForMenu(el)
    await settle()

    const opened = events.filter(event => event.detail.open)
    expect(opened).toHaveLength(1)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('未启用 long-press 时同样的真实长按不开 menu（opt-in）', async () => {
    const { el, target } = createMenu()
    await el.updateComplete

    await realTouchPress(target, { holdMs: 700 })
    await settle()

    // 用与上面「触屏长按打开 menu」完全相同的手势，唯一差别是没有 long-press 属性。
    // headless 下 CDP 触控不产生原生 contextmenu（已用事件序列确认），所以这里能干净地
    // 证明打开 menu 的只有本组件的长按计时器，而它被属性 gate 住了。
    expect(el.isOpen).toBe(false)
    // `toHaveLength(0)` 只证明「查不到 panel」，而查不到也可能是查找器坏了；
    // 补一条直接证据：模态 scrim 根本没被创建。
    expect(getMenuPanels('Context menu')).toHaveLength(0)
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeNull()
    cleanupElement(el)
  })
})
