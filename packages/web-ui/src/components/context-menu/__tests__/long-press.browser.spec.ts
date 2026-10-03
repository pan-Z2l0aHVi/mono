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
   * R9：触屏长按打开的菜单**垂直贴视口下缘**，水平仍锚定长按落点（Q10 选 b）。
   *
   * 这条断言替换了原「锚定在按下落点」——后者断言的是反转前的行为：面板贴着长按点展开。
   * 契约反转后垂直方向必须贴底，原断言必然变红（实测 pressY=80 而 panel.top=848）。
   *
   * 边距按实现的夹取算术反推：`_positionMenuAtViewportBottom` 取
   * `y = innerHeight - height - safeArea - VIEWPORT_PADDING`，所以面板下缘到视口下缘
   * 恰好是一个 `VIEWPORT_PADDING`（8px，安全区在测试环境为 0）。留 1px 容差给子像素。
   */
  it('触屏长按打开菜单：垂直贴视口下缘、完整可见，水平仍锚定长按点', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    const point = target.getBoundingClientRect()
    const pressX = point.left + point.width / 2
    const pressY = point.top + point.height / 2

    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)
    expect(el.isOpen).toBe(true)

    const panelRect = panel.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    // 垂直：贴下缘，且下缘到视口下缘正好一个 VIEWPORT_PADDING。
    expect(viewportHeight - panelRect.bottom).toBeGreaterThan(0)
    expect(viewportHeight - panelRect.bottom).toBeLessThanOrEqual(9)

    // 完整可见：上缘不得越出视口上，最下面一项要能被点到（面板 overflow-y: hidden）。
    expect(panelRect.top).toBeGreaterThanOrEqual(0)
    expect(panelRect.height).toBeGreaterThan(0)

    // 水平：仍锚定长按落点（贴底只改垂直方向）。
    expect(pressX).toBeGreaterThanOrEqual(panelRect.left - 1)
    expect(pressX).toBeLessThanOrEqual(panelRect.right + 1)

    // 与长按落点的垂直关系已反转：面板整体在落点下方，不再罩住落点。
    expect(panelRect.top).toBeGreaterThanOrEqual(pressY)
    cleanupElement(el)
  })

  /*
   * R7 的安全区部分：iPhone 底部 home indicator 那一条不能被菜单压住。
   *
   * 测试环境里 `env(safe-area-inset-bottom)` 恒为 0，所以上面那条 R9 用例证明不了
   * 安全区被真正读进夹取算术。这里覆盖自定义属性注入非零值 —— 实现读的是宿主的
   * `--wui-context-menu-safe-area-bottom`（声明值是 `env(safe-area-inset-bottom, 0px)`），
   * 覆盖它即等价于「真机上有 34px 安全区」。
   *
   * 判据取行为约束不钉像素：下缘到视口下缘必须**大于**安全区，且只多出一个
   * VIEWPORT_PADDING（8px，实现常量）。与 viewport-fit 同一取舍：钉死 padding
   * 会让日后调它变成改测试。
   */
  it('安全区非零时面板下缘让出 env(safe-area-inset-bottom)，且末项完整可见', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    el.style.setProperty('--wui-context-menu-safe-area-bottom', '34px')
    await el.updateComplete

    const point = target.getBoundingClientRect()
    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)
    await settle()

    // 先确认注入真的生效，否则下面全是恒真断言。
    const safeArea = Number.parseFloat(getComputedStyle(el).getPropertyValue('--wui-context-menu-safe-area-bottom'))
    expect(safeArea).toBe(34)

    const panelRect = panel.getBoundingClientRect()
    const gap = window.innerHeight - panelRect.bottom
    expect(gap).toBeGreaterThan(safeArea)
    expect(gap).toBeLessThanOrEqual(safeArea + 9)

    // 完整可见不被裁：面板上缘不越视口上，末项整条落在安全区之上（用户点得到的实际后果）。
    expect(panelRect.top).toBeGreaterThanOrEqual(0)
    const items = panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')
    const last = items[items.length - 1]
    expect(last).toBeTruthy()
    const lastRect = last.getBoundingClientRect()
    expect(lastRect.bottom).toBeLessThanOrEqual(window.innerHeight - safeArea)
    expect(lastRect.top).toBeGreaterThanOrEqual(0)

    // 长按落点仍在面板上方：安全区不得把面板顶到落点之上。
    expect(panelRect.top).toBeGreaterThanOrEqual(point.top)
    cleanupElement(el)
  })

  /*
   * R3（核心）：抬手后浏览器补发的 compat click **不穿透**到下层目标。
   *
   * 为什么这条只能用真实触控管线测：compat click 的 target 由**派发那一刻**对触点做命中
   * 测试决定，而不是 pointerdown 的 target。合成 `PointerEvent` / `dispatchEvent` 根本不会
   * 有「补发 click」这一步，所以合成事件下这条断言恒绿——它守不住任何东西。
   *
   * 断言分三层，缺一层就可能被另一种实现蒙过去：
   * 1. 命中测试：落点此刻解析到 scrim，不是下层目标（这是「为什么会穿透」的直接机制）。
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

    // (1) 命中测试：落点被 scrim 占据。
    const scrim = document.querySelector<HTMLElement>('dialog[data-wui-menu-scrim]')
    expect(scrim).toBeTruthy()
    expect(document.elementFromPoint(pressX, pressY)).toBe(scrim)

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
    // R20：`toHaveLength(0)` 单独用是弱断言 —— 它只证明「查不到面板」，而查不到也可能是
    // 查找器坏了。补一条直接证据：模态 scrim 根本没被创建。查找器坏掉时 `toHaveLength(0)`
    // 会假绿，这条不会。
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
    // R20：`toHaveLength(0)` 单独用是弱断言 —— 它只证明「查不到面板」，而查不到也可能是
    // 查找器坏了。补一条直接证据：模态 scrim 根本没被创建。查找器坏掉时 `toHaveLength(0)`
    // 会假绿，这条不会。
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
    // R20：`toHaveLength(0)` 单独用是弱断言 —— 它只证明「查不到面板」，而查不到也可能是
    // 查找器坏了。补一条直接证据：模态 scrim 根本没被创建。查找器坏掉时 `toHaveLength(0)`
    // 会假绿，这条不会。
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    expect(document.querySelector('dialog[data-wui-menu-scrim]')).toBeNull()
    cleanupElement(el)
  })
})
