import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/dropdown-item'
import { cleanupElement, getMenuPanels, pollUntil } from '@/shared/test-utils'
import { realTouchPress } from '@/shared/test-utils/real-gesture'

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
    const panel = getMenuPanels('上下文菜单')[0]
    return Boolean(panel && panel.style.left && panel.style.top)
  }, 'Expected the context menu to open and be positioned')
  await el.updateComplete
  const panel = getMenuPanels('上下文菜单')[0]
  if (!panel) throw new Error('Expected the context menu to be open')
  return panel
}

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 250))
}

describe('context-menu 长按（真实触控管线）', () => {
  /*
   * R9（新契约）：触屏长按**从按下的位置向下展开，水平居中于按点**。
   *
   * 契约反转过三次，这里记清楚当前这一版，免得下一轮又照着旧描述写断言：
   * 1. 最初「锚定在按下落点」。
   * 2. 改成「垂直贴视口下缘」—— 真机反馈那是错的：菜单跑到屏幕最底部，和手指按下的
   *    位置完全脱节，看起来像弹出了另一个菜单。
   * 3. 垂直改成「面板上缘对齐按点 y、向下展开」；放不下才翻转到按点上方（见下一条 R7）。
   * 4. 水平从「左缘对齐按点 x」改成**居中于按点 x**（`placement: 'bottom'`）：
   *    手指按的是「这块内容在这里」，菜单在它正下方居中展开才是 iOS/Android 原生形态；
   *    左对齐会让菜单整体偏到手指右侧，看起来像弹在了别的东西上面。
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

    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)
    expect(el.isOpen).toBe(true)

    // 垂直：上缘对齐按点、向下长。transform-origin 取在 top 一侧，scale 不影响上缘，
    // 因此 style.top 与 rect.top 应当一致。
    expect(Math.abs(Number.parseFloat(panel.style.top) - pressY)).toBeLessThanOrEqual(1)
    const panelRect = panel.getBoundingClientRect()
    expect(Math.abs(panelRect.top - pressY)).toBeLessThanOrEqual(1)
    expect(panelRect.bottom).toBeGreaterThan(pressY)

    // 完整可见：不越视口上下（面板 overflow-y: hidden，越界即末项点不到）。
    expect(panelRect.top).toBeGreaterThanOrEqual(0)
    expect(panelRect.bottom).toBeLessThanOrEqual(window.innerHeight)

    // 水平：**中心**对齐按点 x（placement 不带 `-start`，Floating UI 的默认对齐量就是居中）。
    expect(Math.abs((panelRect.left + panelRect.right) / 2 - pressX)).toBeLessThanOrEqual(1)
    // 反向：左缘**不**落在按点上。这一条才排除掉「左对齐也碰巧过上面的等式」——
    // 左对齐时中心会偏出面板宽度的一半，上面那条必红，这里只把差异钉得更明确。
    expect(Math.abs(panelRect.left - pressX)).toBeGreaterThan(1)
    cleanupElement(el)
  })

  /*
   * R9 的边界对面：按点贴视口右缘时**居中必须让位给完整可见**。
   *
   * 这不是缺陷而是取舍，flip / shift 的组合天然给出这个结果：按点 x 太靠边，居中算出的
   * 面板会横向溢出视口，shift 的交叉轴钳制把它推回来，于是面板不再居中但完整可见。
   * 反过来硬保居中就会让面板右侧跑出屏幕，而面板 overflow 不裁，末项直接点不到。
   *
   * 钉两件事，缺一不可：
   * 1. 完整可见（钳制的目的）；
   * 2. 中心确实偏到了按点**左侧**（钳制的确发生了，而不是碰巧居中）。
   */
  it('按点贴视口右缘时居中让位给夹取：面板完整可见但中心偏到按点左侧', async () => {
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

    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)
    await settle()

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
   * 翻转后那一侧仍放不下 → 兜底夹取把面板下缘钉在 `maxBottom`。
   * 判据取行为约束不钉像素：下缘到视口下缘必须**大于**安全区，且只多出一个
   * VIEWPORT_PADDING(8px)。与 viewport-fit 同一取舍：钉死 padding 会让日后调它变成改测试。
   */
  it('按点低到放不下时翻转到按点上方，且面板下缘让出安全区、末项完整可见', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    el.style.setProperty('--wui-context-menu-safe-area-bottom', '34px')
    await el.updateComplete

    target.style.position = 'fixed'
    target.style.left = '0'
    target.style.bottom = '0'
    target.style.width = '240px'
    target.style.height = '40px'

    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)
    await settle()

    // 先确认注入真的生效，否则下面全是恒真断言。
    const safeArea = Number.parseFloat(getComputedStyle(el).getPropertyValue('--wui-context-menu-safe-area-bottom'))
    expect(safeArea).toBe(34)

    const pressY = target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
    const panelRect = panel.getBoundingClientRect()

    // 翻转生效：面板整体在按点上方，不再向下压出视口。
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
   *    的直接机制）。这里刻意不要求「命中的必须**是** scrim」：新契约下面板从按点向下展开、
   *    水平居中于按点，按点恰好落在面板上缘，命中到面板本身是正确结果。要守的是
   *    「下层目标不在命中链上」，不是「scrim 必须亲自挡在那个坐标」。
   * 2. 行为：下层目标的 click 计数为 0。
   * 3. 菜单自身：补发 click 也不该把刚开的菜单关掉（`_isLongPressFollowUp` 那道闸）。
   */
  it('抬手补发的 compat click 不穿透到下层目标，也不关掉刚开的菜单', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    let rowClicks = 0
    target.addEventListener('click', () => rowClicks++)

    const point = target.getBoundingClientRect()
    const pressX = point.left + point.width / 2
    const pressY = point.top + point.height / 2

    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)
    expect(el.isOpen).toBe(true)

    // 补发 click 在 touchEnd 后才到，等它真的派发完再断言。
    await settle()
    await settle()

    // (1) 命中测试：落点被模态 scrim 子树占据，下层目标不在命中链上。
    const scrim = document.querySelector<HTMLElement>('dialog[data-wui-menu-scrim]')
    expect(scrim).toBeTruthy()
    const hit = document.elementFromPoint(pressX, pressY)
    expect(hit === scrim || scrim!.contains(hit)).toBe(true)
    expect(hit === target || target.contains(hit)).toBe(false)

    // (2) 行为：下层目标零激活。
    expect(rowClicks).toBe(0)

    // (3) 菜单没被补发 click 关掉。
    expect(el.isOpen).toBe(true)
    expect(getMenuPanels('上下文菜单')).toHaveLength(1)
    expect(panel.isConnected).toBe(true)
    cleanupElement(el)
  })

  /*
   * 吸收窗口的两相，必须放在**同一条用例**里：它们断言的是同一个状态机的两相。
   * 拆成两条就丢掉了「窗内 / 窗外由同一条 `performance.now()` 比较切分」这个事实，
   * 两条可以各自独立地假绿。
   *
   * 这条原来只活在 jsdom 里（`long-press.spec.ts` 的「吸收窗口过期后，真实点击照常
   * light-dismiss」），靠 `document.body.dispatchEvent(click)` 触发。那在模态下**不可能**
   * 发生 —— scrim 开着时下层收不到命中，而 jsdom 没有 top layer，合成事件照样派发，
   * 于是它把一条已被模态契约关掉的通道当成了契约。迁到这里用真实命中重写。
   *
   * 点 scrim 而不是点宿主：宿主上的 pointerdown 会把 `_longPressOpenedAt` 清成 null
   * （`_onPointerDown` 第一行，那正是「下一次按下结束上一次补发窗口」的边界），
   * 拿宿主当靶子等于每次点击都自己把窗口重开，两相都测不到。scrim 是 body 下的
   * 兄弟节点，不在宿主子树里，它的 pointerdown 到不了那个监听器 —— 窗口因此保持原样，
   * 才真的由时间切分。
   */
  it('吸收窗口内的点击被吞，窗口过后同一次菜单上的真实点击照常 dismiss', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    await realTouchPress(target, { holdMs: 700 })
    await waitForMenu(el)
    expect(el.isOpen).toBe(true)

    const scrim = document.querySelector<HTMLElement>('dialog[data-wui-menu-scrim]')
    expect(scrim).toBeTruthy()

    // 第一相：距长按打开还远不到 LONG_PRESS_FOLLOW_UP_WINDOW_MS(1000ms)，这次点击属于
    // 上一次长按的补发意图，必须被吞掉 —— 菜单不能关。
    await realTouchPress(scrim!, { holdMs: 50 })
    expect(el.isOpen).toBe(true)
    expect(getMenuPanels('上下文菜单')).toHaveLength(1)

    // 第二相：越过窗口。同一条 scrim、同一种真实点击，这次必须生效。
    await new Promise(resolve => setTimeout(resolve, 1400))
    await realTouchPress(scrim!, { holdMs: 50 })
    await el.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
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

  it('短按不打开菜单', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    await realTouchPress(target, { holdMs: 150 })
    await settle()

    expect(el.isOpen).toBe(false)
    // `toHaveLength(0)` 只证明「查不到面板」，而查不到也可能是
    // 查找器坏了；补一条直接证据：模态 scrim 根本没被创建。
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeNull()
    cleanupElement(el)
  })

  it('按住期间位移超出阈值视为滚动，取消长按', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    await realTouchPress(target, { holdMs: 700, moveBy: 60, moveAfterMs: 200 })
    await settle()

    expect(el.isOpen).toBe(false)
    // `toHaveLength(0)` 只证明「查不到面板」，而查不到也可能是查找器坏了；
    // 补一条直接证据：模态 scrim 根本没被创建。
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeNull()
    cleanupElement(el)
  })

  it('未启用 long-press 时同样的真实长按不开菜单（opt-in）', async () => {
    const { el, target } = createMenu()
    await el.updateComplete

    await realTouchPress(target, { holdMs: 700 })
    await settle()

    // 用与上面「触屏长按打开菜单」完全相同的手势，唯一差别是没有 long-press 属性。
    // headless 下 CDP 触控不产生原生 contextmenu（已用事件序列确认），所以这里能干净地
    // 证明打开菜单的只有本组件的长按计时器，而它被属性 gate 住了。
    expect(el.isOpen).toBe(false)
    // `toHaveLength(0)` 只证明「查不到面板」，而查不到也可能是查找器坏了；
    // 补一条直接证据：模态 scrim 根本没被创建。
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeNull()
    cleanupElement(el)
  })
})
