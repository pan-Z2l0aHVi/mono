import '..'
import '@/components/dropdown-item'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getMenuPanels, waitForUpdate } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

/*
 * submenu 的开合方向必须按 panel**未缩放**的宽度决定（浏览器）。
 *
 * 缺陷形态：`_positionSubmenu` 用 `submenu.panel.getBoundingClientRect().width` 判断
 * `canOpenRight`，而本方法总在 `showOverlayPresence` **之前**调用（`_openSubmenu` 的两条分支
 * 都是「先 `_positionSubmenu`、再 `showOverlayPresence`」）。此刻 panel 的 presence 要么是
 * `createMenuPortalOverlay` 建出来就带的 `entering`（新建 panel），要么是复用 closing 缓存时留下的
 * `closing`，而 `assets/overlay-motion.css` 对这两个状态**用同一条规则**施加
 * `transform: scale(var(--wui-scale-enter, 0.9))`。rect 含 transform，宽度读到的是过渡当前帧的
 * 缩放值，判据随之偏向「右侧放得下」。
 *
 * 两条路径都走这一行，所以两条都测：新建 panel（首次打开，常态路径）与复用 closing 缓存里的 panel
 * （同帧关闭→重开）。
 *
 * 位置本身不受影响：该分支的落位走 `computePosition`，Floating UI 量的是布局尺寸，transform 不进
 * 它的读数。**受影响的只有开合方向这一次判断**，所以后果是「submenu 开到不该开的一侧」——越界由
 * shift 兜底，不会表现为 panel 越出视口。
 *
 * 必须 browser mode：缺陷的全部内容就是 transform 污染 rect 读数，jsdom 既无布局也无过渡。
 *
 * 两处放大让这条窄缺陷变得可稳定观测，都是本仓既有手法（同 overlay-in-dialog 用
 * `--wui-duration-float-exit: 2000ms` 拉宽时序窗口）：
 *
 * 1. `--wui-scale-enter: 0.2` 把缩放从 0.9 压到 0.2，缺陷窗口从「0.1 倍 panel 宽」拉宽到
 *    「0.8 倍 panel 宽」（见 `openMenuInDefectWindow` 的窗口推导），落点不必卡在几像素的边界上。
 * 2. `--wui-duration-float-exit` 拉到 1.5s：重开必须落在 closing 窗口内才会命中缓存复用
 *    （复用才走到复用那条用例）。窗口够长即可——判据只要求重开时 rect ≤ 0.6 倍 panel 宽，而
 *    `EXIT_PROGRESS_RATIO` 取 0.4：出场把 scale 从 1 拉到 0.2，走到 0.4 只走完四分之三的行程
 *    （这条缓动在时间进度约 40% 处），远早于过渡结束。再拉长只是吃掉默认 5s 的用例超时余量，
 *    把确定变成 flake 风险。
 */
const SCALE_ENTER = 0.2
const EXIT_MS = 1500
/** 出场推进到 rect ≤ 0.4 倍 panel 宽再重开：窗口要求 ≤ 0.6，两侧各留 0.2 倍余量。 */
const EXIT_PROGRESS_RATIO = 0.4
const EDGE_PADDING = 8

const SUBMENU_HTML =
  '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>下载为 PDF</web-ui-dropdown-item></web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'

afterEach(() => {
  document.documentElement.style.removeProperty('--wui-scale-enter')
  document.documentElement.style.removeProperty('--wui-duration-float-exit')
  document.body.replaceChildren()
})

async function nextFrame(): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

async function waitFor<T>(
  poll: () => T | null | undefined,
  ready: (value: T) => boolean,
  message: string,
  deadlineMs = 6000
): Promise<T> {
  const deadline = performance.now() + deadlineMs
  while (performance.now() < deadline) {
    const value = poll()
    if (value !== null && value !== undefined && ready(value)) return value
    await nextFrame()
  }
  throw new Error(message)
}

async function openMenuAt(
  x: number
): Promise<{ menu: WebUiContextMenu; parentItem: HTMLElement; mainPanel: HTMLElement }> {
  const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
  menu.innerHTML = SUBMENU_HTML
  document.body.append(menu)
  await waitForUpdate(menu)
  menu.openAt(x, Math.round(window.innerHeight / 2))
  await waitForUpdate(menu)

  // 必须等入场过渡落定再量：presence 翻到 'open' 只发生在下一帧，此刻 transform 仍在
  // 从 SCALE_ENTER 回到 1 的路上，量到的 rect 只是真实宽度的一部分（本文件把 SCALE_ENTER 压到
  // 0.2，偏差最大时 rect 只有真实宽的 1/5）。
  const mainPanel = await waitFor(
    () => getMenuPanels('Context menu')[0],
    panel =>
      Boolean(
        panel?.style.left &&
        panel?.style.top &&
        panel?.dataset.wuiPresence === 'open' &&
        panel.getAnimations().length === 0
      ),
    '根 menu 未定位'
  )
  const parentItem = mainPanel.querySelector<HTMLElement>('web-ui-dropdown-item')
  if (!parentItem) throw new Error('未找到submenu 父项')
  return { menu, parentItem, mainPanel }
}

/** submenu 走 hover 路径打开（200ms 延时），全程不依赖焦点。 */
async function openSubmenu(parentItem: HTMLElement): Promise<HTMLElement> {
  parentItem.dispatchEvent(new PointerEvent('pointerenter'))
  return waitFor(
    () => getMenuPanels('submenu')[0],
    panel => Boolean(panel && panel.dataset.wuiPresence === 'open' && panel.getAnimations().length === 0),
    'submenu 未完成入场'
  )
}

/**
 * 把submenu 触发项的右缘摆到「右侧刚好放不下submenu」的窗口正中，返回打开submenu 前的现场。
 *
 * 设视口宽 I、submenu 真实宽 W、边距 p。触发项右缘为 r 时：
 * - 正确读数：`r + W + p > I` → 右侧放不下 → 向左开；
 * - 缺陷读数：`r + SCALE_ENTER × W + p ≤ I` → 判成放得下 → 向右开。
 *
 * 于是窗口是 `r ∈ (I − p − W, I − p − SCALE_ENTER × W]`，宽度 `(1 − SCALE_ENTER) × W`。
 * 取正中 `r = I − p − (1 + SCALE_ENTER) / 2 × W`，两侧各留 `(1 − SCALE_ENTER) / 2 × W`
 * 余量 —— 这正是把缩放压到 0.2 的收益：余量从 5% panel 宽变成 40% panel 宽。
 */
async function openMenuInDefectWindow(): Promise<{
  parentItem: HTMLElement
  mainPanel: HTMLElement
  itemRect: DOMRect
}> {
  // 阶段一：量出两个不能写死的量 —— submenu 真实宽度，以及「触发项右缘相对锚点 x 的偏移」。
  const probe = await openMenuAt(100)
  const probeSubmenu = await openSubmenu(probe.parentItem)
  const submenuWidth = probeSubmenu.offsetWidth
  const itemRightOffset = probe.parentItem.getBoundingClientRect().right - 100
  probe.menu.remove()
  await nextFrame()

  // 阶段二：按窗口正中落点重开一张 menu。
  const innerWidth = window.innerWidth
  const targetItemRight = innerWidth - EDGE_PADDING - ((1 + SCALE_ENTER) / 2) * submenuWidth
  const { parentItem, mainPanel } = await openMenuAt(Math.round(targetItemRight - itemRightOffset))

  const itemRect = parentItem.getBoundingClientRect()
  // 前置条件：落点确实在窗口内。几何若因视口过窄而漂移，这里显式失败，而不是让断言失去判别力。
  expect(
    itemRect.right,
    `触发项右缘 ${itemRect.right} 不在缺陷窗口内（视口 ${innerWidth}，panel 宽 ${submenuWidth}）`
  ).toBeGreaterThan(innerWidth - EDGE_PADDING - submenuWidth)
  expect(itemRect.right).toBeLessThanOrEqual(innerWidth - EDGE_PADDING - SCALE_ENTER * submenuWidth)

  return { parentItem, mainPanel, itemRect }
}

/**
 * 判据：右侧放不下 → panel 必须落在触发项左侧。缺陷态下开合方向被假宽度带偏，panel 会落到触发项
 * 右侧（`left ≈ I − p − W`，被 shift 夹回视口内），与触发项左缘差出半个 panel 宽。
 */
function expectOpenedLeft(submenu: HTMLElement, itemRect: DOMRect): void {
  const panelRect = submenu.getBoundingClientRect()
  expect(
    panelRect.left,
    `panelLeft=${panelRect.left} itemLeft=${itemRect.left} itemRight=${itemRect.right} panelWidth=${submenu.offsetWidth}`
  ).toBeLessThanOrEqual(itemRect.left + 2)
}

describe('WebUiContextMenu submenu 开合方向的宽度来源（浏览器）', () => {
  it('首次打开（panel 为 entering）时，按未缩放宽度判断右侧放不下，向左开', async () => {
    document.documentElement.style.setProperty('--wui-scale-enter', String(SCALE_ENTER))

    const { parentItem, mainPanel, itemRect } = await openMenuInDefectWindow()
    const submenu = await openSubmenu(parentItem)

    // 先决条件：缩放 token 必须真的到达 panel。整条窗口推导都假定 SCALE_ENTER 生效，而 `:host` 上的
    // 定义会盖掉 documentElement 的继承值（theme/style.css 在 `:host` 定义 --wui-scale-enter）；
    // 夹具日后被包进 <web-ui-theme> 之类的作用域，这条用例会静默变成假绿。
    expect(getComputedStyle(submenu).getPropertyValue('--wui-scale-enter').trim()).toBe(String(SCALE_ENTER))

    expectOpenedLeft(submenu, itemRect)
    expect(getMenuPanels('submenu')[0]).toBe(submenu)
    expect(mainPanel.dataset.wuiPresence).toBe('open')
  })

  it('经 closing 缓存复用重开时，同样按未缩放宽度判断，向左开', async () => {
    document.documentElement.style.setProperty('--wui-scale-enter', String(SCALE_ENTER))
    document.documentElement.style.setProperty('--wui-duration-float-exit', `${EXIT_MS}ms`)

    const { parentItem, mainPanel, itemRect } = await openMenuInDefectWindow()
    const submenu = await openSubmenu(parentItem)

    const sibling = mainPanel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')[1]
    if (!sibling) throw new Error('未找到叶子项')

    // 悬停叶子项关闭submenu（非即时 → 进 closing 缓存），等出场缩放推进到位再悬停回父项重开。
    sibling.dispatchEvent(new PointerEvent('pointerenter'))
    await waitFor(
      () => submenu,
      panel =>
        panel.dataset.wuiPresence === 'closing' &&
        panel.getBoundingClientRect().width <= panel.offsetWidth * EXIT_PROGRESS_RATIO,
      'submenu 未进入 closing，或出场缩放未推进到位'
    )

    parentItem.dispatchEvent(new PointerEvent('pointerenter'))
    await waitFor(
      () => submenu,
      panel =>
        Boolean(
          panel.style.left &&
          panel.style.top &&
          panel.dataset.wuiPresence === 'open' &&
          panel.getAnimations().length === 0
        ),
      '重开的submenu 未落位'
    )

    // 负向对照：panel 身份必须仍是同一个。换成新 panel 说明 closing 缓存没命中，本用例就退化成与
    // 「首次打开」那条重复 —— 复用路径本身没被覆盖到；方向断言仍然有效，所以这不会自己暴露。
    expect(getMenuPanels('submenu')[0], '重开未复用 closing 缓存里的 panel，本用例的竞态前提不成立').toBe(submenu)

    expectOpenedLeft(submenu, itemRect)
  })
})
