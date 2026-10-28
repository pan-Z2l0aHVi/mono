import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil, waitForFrame, waitForSettledLayout } from '@/shared/test-utils'
import { expectInsideViewport } from '@/shared/test-utils/viewport'

import type { DrawerPlacement, WebUiDrawer } from '..'

/*
 * 拖拽 drag bar（胶囊）与命中层的**可交互**契约。
 *
 * 胶囊本身是纯视觉件（`pointer-events: none`），真正被按下的是命中层。两者在结构上解耦；
 * 下面全部从**胶囊坐标**与**控件坐标**出发经真实命中测试与真实输入验证，而不是量像素。
 *
 * 删掉的是精确几何断言：drag edge 与胶囊的像素对齐、宽度相等、厚度矩阵下的相交面积
 * （政策第 6 条：精确像素尺寸）。留下的是它们的**可判定后果** —— 胶囊那个位置上
 * 真的能起手、hover 真的点亮、拖过阈值真的进确认态、控件真的没被吃掉。
 *
 * 「drag edge 比胶囊宽」这类内部结构断言一并删掉：它是实现手段，用户碰到的是 drag edge 覆盖的
 * 那片区域能不能按。
 */

const PLACEMENTS: DrawerPlacement[] = ['right', 'left', 'top', 'bottom']
/** 上下 placement 才有端头 drag edge；左右 placement 的胶囊本就落在 drag zone 内。 */
const EDGE_PLACEMENTS: DrawerPlacement[] = ['top', 'bottom']

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragBar(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-bar') as HTMLElement
}

function getDragEdge(el: WebUiDrawer): HTMLElement | null {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-edge') ?? null
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

/**
 * 问浏览器「这个坐标上到底是谁」，走真实命中测试。
 *
 * 必须从 shadowRoot 上问：`document.elementFromPoint` 会把结果重定向到 shadow host，
 * 问出来的 className 恒为空字符串 —— 那种问法在缺陷存在时照样绿，是恒真断言。
 */
function hitTestAt(el: WebUiDrawer, x: number, y: number): HTMLElement | null {
  return (el.shadowRoot?.elementFromPoint(x, y) as HTMLElement | null) ?? null
}

/** 胶囊中心在视口坐标上的位置。 */
function capsuleCenter(el: WebUiDrawer): { x: number; y: number } {
  const rect = getDragBar(el).getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** 是不是「按下去会开始拖拽」的命中层（端头 drag edge 或让开量 drag zone）。 */
function isDragSurface(el: WebUiDrawer, node: HTMLElement | null): boolean {
  return !!node && (node === getDragEdge(el) || node === getDragZone(el))
}

/**
 * 等拖拽面的几何定版再取样——命中测试的前提。
 *
 * 只等比 dialog 矩形两次相等，两个方向都不够：
 * - 进场过渡的进度只在渲染步进里推进，`getBoundingClientRect()` 的强制重算不推它，
 *   于是「相等」也可以意味着过渡还没起跑：量到的是闭合位矩形，胶囊整个在视口外，
 *   `elementFromPoint` 返回 null（CI 上 `drag bar 加厚…仍可起手` 的 flaky 正是如此）。
 * - 让位量由 ResizeObserver 写回宿主样式，移动的是 drag zone/drag edge 而不是 dialog 矩形，
 *   等 dialog 矩形稳定推不出 drag zone 已到位。
 * 共享 helper 把这两件事都变成因果条件（过渡跑完 + RO 抽干），收尾再验矩形真的定版。
 */
async function settleGeometry(el: WebUiDrawer) {
  const targets = [getDialog(el), getDragZone(el), getDragEdge(el), getDragBar(el)]
  // 期待驱动：命中测试的前提是「胶囊中心那个坐标落在视口内」。少了这条，
  // `elementFromPoint` 返回 null 与「drag edge 没盖住胶囊」在读数上完全一样，
  // 而前者只是进场过渡尚未落定。带上读数后两者在等待阶段就分开了。
  await waitForSettledLayout(targets, { expect: expectInsideViewport(targets) })
}

/**
 * drawer 刻意做小，把关闭阈值（尺寸的一半，下限 10px）压到能用手势稳定跨过的量级；
 * 位移取 panel 在拖拽轴上的尺寸本身，因此对任意尺寸都稳压过阈值。
 */
async function mountDrawer(options: {
  placement: DrawerPlacement
  header?: boolean
  footer?: boolean
  /** 胶囊厚度：厚 drag bar 是可访问性场景下的自然选择，也是 README 记录的 token。 */
  thickness?: number
}): Promise<WebUiDrawer> {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.placement = options.placement
  el.draggable = true
  el.closable = true
  // panel 做窄，让 header 的两端离 drag bar 中心足够远 —— 「控件是否落在 drag bar 跨度内」
  // 由 token 与布局共同决定，这里固定布局、只让被测的 token 变。
  el.style.setProperty('--wui-drawer-width', '320px')
  el.style.setProperty('--wui-drawer-height', '320px')
  if (options.thickness !== undefined) {
    el.style.setProperty('--wui-drawer-drag-bar-thickness', `${options.thickness}px`)
  }
  el.innerHTML = [
    options.header
      ? [
          '<div slot="header" style="height:56px;display:flex;width:100%;align-items:center;gap:8px;padding:0 16px">',
          '<button type="button" data-role="consumer-action" data-side="start"',
          ' style="flex:none;width:28px;height:28px">A</button>',
          '<h2 style="margin:0;flex:1;text-align:center">标题</h2>',
          '<button type="button" data-role="consumer-action" data-side="end"',
          ' style="flex:none;width:28px;height:28px">B</button>',
          '</div>'
        ].join('')
      : '',
    options.footer
      ? '<div slot="footer" style="height:64px;display:flex;align-items:center"><button type="button">操作</button></div>'
      : '',
    '<div style="width:120px;height:60px">正文</div>'
  ].join('')
  document.body.appendChild(el)
  el.open = true
  await el.updateComplete
  await pollUntil(() => getDialog(el).classList.contains('is-visible'), 'drawer did not become visible')
  await settleGeometry(el)
  return el
}

/**
 * **从胶囊坐标起手**、经过真实命中测试的拖拽，拖过关闭阈值后停住不松手
 * （拖拽态在松手时就结束，确认态必须在手势仍按住时读）。
 *
 * 合成事件若直接派发到 drag zone 元素上，就绕过了命中测试 —— 于是「胶囊已经落到
 * drag zone 之外、按不动的死装饰」这种形态照样全绿。这里先问浏览器那个坐标上是谁，
 * 再在**它**身上派发。
 *
 * 判据是 panel 在拖拽轴上的实际位移，不是内部状态类：手势没挂上时位移为零，
 * 与「类名加上了但没跟手」是两件事。
 */
async function pressDragFromCapsule(el: WebUiDrawer, placement: DrawerPlacement) {
  const { x: startX, y: startY } = capsuleCenter(el)
  const hit = hitTestAt(el, startX, startY)
  if (!isDragSurface(el, hit)) {
    throw new Error(
      `胶囊坐标 (${startX}, ${startY}) 命中的是 ${hit?.className || hit?.tagName || 'null'}，` +
        '不是 drag edge/drag zone——胶囊在 placement 之外是死装饰'
    )
  }
  const target = hit as HTMLElement
  const delta = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1] }[placement]
  const axisSize =
    placement === 'left' || placement === 'right' ? getDialog(el).offsetWidth : getDialog(el).offsetHeight
  const before = getDialog(el).getBoundingClientRect()

  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      pointerId: 1,
      isPrimary: true,
      clientX: startX,
      clientY: startY
    })
  )
  await el.updateComplete
  for (let step = 1; step <= 10; step += 1) {
    target.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        clientX: startX + (delta[0] * axisSize * step) / 10,
        clientY: startY + (delta[1] * axisSize * step) / 10
      })
    )
    await waitForFrame()
  }
  await el.updateComplete
  const after = getDialog(el).getBoundingClientRect()
  return { displacement: Math.hypot(after.left - before.left, after.top - before.top), target }
}

/** 在**起手时命中的那个元素**上松手：手势层只认收到 pointerdown 的目标。 */
function releaseDrag(target: HTMLElement) {
  target.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      composed: true,
      pointerId: 1,
      isPrimary: true,
      clientX: 400,
      clientY: 300
    })
  )
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer drag bar 命中（浏览器）', () => {
  /*
   * 结构解耦让胶囊与 drag zone 不再互相位移，但没有解决**命中**：胶囊落到让开区里就成了
   * 按不下去、悬停不亮的死装饰。端头 drag edge 补的就是这一段。四条覆盖同时钉住
   * 「胶囊坐标上真的有命中层」与「从那里起手真的能拖」——单看命中会漏掉命中层
   * 存在却没接手势，单看起手则会因派发目标写死而恒真。
   */
  it('四个 placement 下从胶囊坐标起手都能进入拖拽并越过阈值', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const { displacement, target } = await pressDragFromCapsule(el, placement)
      expect(displacement, `${placement} 从胶囊坐标按下后 panel 没有位移（命中 ${target?.className}）`).toBeGreaterThan(
        1
      )
      releaseDrag(target)
      // 越过关闭阈值的可观察后果：松手后 drawer 真的关闭。
      await pollUntil(() => !el.open, `${placement} 越过阈值松手后 drawer 没有关闭`)
      el.remove()
    }
  })

  it('胶囊中心命中的是拖拽面，不是 header / footer', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const { x, y } = capsuleCenter(el)
      const hit = hitTestAt(el, x, y)
      // 命中落在 header/footer 上时，用户看着 drag bar 却按不动 —— 视觉承诺与实际不符。
      expect(isDragSurface(el, hit), `${placement} 胶囊中心命中 ${hit?.className || hit?.tagName}`).toBe(true)
      el.remove()
    }
  })

  it('左右 placement 不渲染端头 drag edge（胶囊本就落在 drag zone 内）', async () => {
    for (const placement of ['right', 'left'] as DrawerPlacement[]) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      expect(getDragEdge(el), `${placement} 多渲染了端头 drag edge`).toBeNull()
      const { x, y } = capsuleCenter(el)
      expect(hitTestAt(el, x, y), `${placement} 胶囊中心没有命中层`).toBe(getDragZone(el))
      el.remove()
    }
  })

  /*
   * 厚 drag bar（可访问性场景的自然选择，也是 README token 表里的一档）下，命中层必须
   * 跟着变厚而不是停在默认厚度 —— 否则厚 drag bar 下沿那一截没有命中层，又变回死装饰。
   */
  it('drag bar 加厚到端头 drag edge 之外时，胶囊所在的位置仍可起手', async () => {
    for (const placement of EDGE_PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true, thickness: 40 })
      const { displacement, target } = await pressDragFromCapsule(el, placement)
      expect(displacement, `${placement}/thickness=40 从胶囊坐标按下后 panel 没有位移`).toBeGreaterThan(1)
      releaseDrag(target)
      el.remove()
    }
  })
})

/*
 * 控件可点性：满宽的 drag edge 会横扫 header 整个宽度，实测内置关闭 button 与消费侧
 * 左右 button 各被吃 40%、更厚时各被吃 100%。判据是**真实点击真的落到控件自己身上**
 * （命中 + 真实 click 计数），不是「相交面积为 0」那种精确几何。
 */
describe('WebUiDrawer drag bar 不劫持控件（浏览器）', () => {
  /** 内置关闭 button 画在 shadow 里，消费侧 button 在 light DOM —— 两边的查询方式不同。 */
  function queryControl(el: WebUiDrawer, selector: string): HTMLElement {
    return (
      selector === '.wui-drawer-close' ? el.shadowRoot!.querySelector(selector) : el.querySelector(selector)
    ) as HTMLElement
  }

  it('常规厚度下 header 里的每个控件仍能被真实点击', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true, thickness: 16 })
    const selectors = [
      '[data-role="consumer-action"][data-side="start"]',
      '[data-role="consumer-action"][data-side="end"]',
      '.wui-drawer-close'
    ]
    const clicks: string[] = []
    for (const selector of selectors) {
      const control = queryControl(el, selector)
      control.addEventListener('click', () => clicks.push(selector))
    }

    // 先逐个验命中，再逐个真点：内置关闭 button 是真会关 drawer 的，放在循环末尾，
    // 否则它一点就把后续控件连同整个 panel 一起带走。
    for (const selector of selectors) {
      const control = queryControl(el, selector)
      const rect = control.getBoundingClientRect()
      expect(rect.width * rect.height, `${selector} 没有实际尺寸，测不到东西`).toBeGreaterThan(0)
      const hit = hitTestAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
      expect(
        hit === control || control.contains(hit!),
        `${selector} 中心命中的是 ${hit?.className || hit?.tagName}`
      ).toBe(true)
    }

    for (const selector of selectors) {
      await userEvent.click(queryControl(el, selector))
    }

    expect(clicks).toEqual(selectors)
    el.remove()
  })

  /*
   * README 记录的已知边界：drag bar 画在哪儿，命中层就得覆盖哪儿 —— 落在这条跨度内、
   * 顶边又落在 drag edge 高度之内的控件，上部会被拖拽面盖住。抬 z-index 没用（Chromium
   * 里 drag edge 始终压在 slotted 内容之上），可测量的杠杆是缩短 drag bar。
   *
   * 钉住两件事：边界确实还在（否则会以「已经修好了」的形态留在代码里），以及 README
   * 写下的建议（缩短 `--wui-drawer-drag-bar-length`）真的有效。
   */
  it('drag bar 跨度内的控件让不开，缩短 drag bar 是唯一可测的杠杆', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true, thickness: 40 })
    const title = el.querySelector('[slot="header"] h2') as HTMLElement

    // 正控制：跨度内的标题默认确实被 drag edge 压住（这条若失效，说明本用例失去前提）。
    const titleRect = title.getBoundingClientRect()
    const before = hitTestAt(el, titleRect.left + titleRect.width / 2, titleRect.top + titleRect.height / 2)
    expect(before, 'drag bar 跨度内的控件默认仍可点，说明本用例的前提不成立').toBe(getDragEdge(el))

    // 杠杆：同一个 token 同时缩短 drag bar 与 drag edge，把中线让出来。
    el.style.setProperty('--wui-drawer-drag-bar-length', '0px')
    await settleGeometry(el)

    const after = hitTestAt(el, titleRect.left + titleRect.width / 2, titleRect.top + titleRect.height / 2)
    expect(
      after === title || title.contains(after!),
      `缩短 length 之后命中的是 ${after?.className || after?.tagName}`
    ).toBe(true)
    el.remove()
  })

  it('footer 侧的控件不被 drag bar 劫持（对称）', async () => {
    const el = await mountDrawer({ placement: 'top', footer: true, thickness: 16 })
    const button = el.querySelector('div[slot="footer"] button') as HTMLElement
    let clicked = false
    button.addEventListener('click', () => (clicked = true))

    const rect = button.getBoundingClientRect()
    const hit = hitTestAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(
      hit === button || button.contains(hit!),
      `footer button 中心命中的是 ${hit?.className || hit?.tagName}`
    ).toBe(true)
    expect(getDragBar(el).contains(hit!), 'footer 控件命中了胶囊').toBe(false)

    await userEvent.click(button)
    expect(clicked).toBe(true)
    el.remove()
  })

  /*
   * 胶囊是纯视觉件：`pointer-events: none`。它一旦被摘掉，落在 footer 盒上的那个
   * 点就会命中胶囊而不是端头 drag edge —— 判据是命中对象，不读 CSS 值。
   */
  it('footer 区域压在 drag bar 带上的那个点命中的是拖拽面，不是胶囊', async () => {
    const el = await mountDrawer({ placement: 'top', footer: true })
    const footer = el.shadowRoot!.querySelector('.wui-drawer-footer') as HTMLElement
    const barRect = getDragBar(el).getBoundingClientRect()
    const footerRect = footer.getBoundingClientRect()

    const overlapTop = Math.max(barRect.top, footerRect.top)
    const overlapBottom = Math.min(barRect.bottom, footerRect.bottom)
    expect(overlapBottom - overlapTop, 'drag bar 带与 footer 盒没有纵向重叠，本用例失去前提').toBeGreaterThan(0)
    const x = (Math.max(barRect.left, footerRect.left) + Math.min(barRect.right, footerRect.right)) / 2
    const y = (overlapTop + overlapBottom) / 2

    const hit = hitTestAt(el, x, y)
    expect(hit, `footer 区域 (${Math.round(x)}, ${Math.round(y)}) 处命中 ${hit?.className || hit?.tagName}`).not.toBe(
      getDragBar(el)
    )
    el.remove()
  })
})

describe('WebUiDrawer drag bar 配色状态（浏览器）', () => {
  /*
   * 配色必须用真实指针验：合成事件不触发 `:hover`（Chrome 只对真实输入设置该原生
   * 状态）。用内部配色值的「变了 / 没变」判定，不钉具体色值（政策第 6 条）。
   */
  it('悬停 drag bar 所在的位置点亮 drag bar，四个 placement 一致', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const rest = getComputedStyle(getDragBar(el)).backgroundColor

      // 悬停目标取「那个坐标上真正的命中层」，于是判据语义就是「悬停 drag bar 被画出来
      // 的那个位置」。
      const surface = getDragEdge(el) ?? getDragZone(el)
      await userEvent.hover(surface)
      expect(surface.matches(':hover'), `${placement} 真实指针未落在拖拽面上`).toBe(true)

      const hovered = getComputedStyle(getDragBar(el)).backgroundColor
      expect(hovered, `${placement} 悬停 drag bar 位置 drag bar 不变色（rest=${rest}）`).not.toBe(rest)
      el.remove()
    }
  })

  it('拖到关闭阈值时 drag bar 进入确认态', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement })
      const rest = getComputedStyle(getDragBar(el)).backgroundColor

      const { displacement, target } = await pressDragFromCapsule(el, placement)
      expect(displacement, `${placement} 按下后 panel 没有位移`).toBeGreaterThan(1)
      const confirmed = getComputedStyle(getDragBar(el)).backgroundColor
      expect(confirmed, `${placement} 松手会关闭，但 drag bar 没有换成确认态配色（rest=${rest}）`).not.toBe(rest)

      releaseDrag(target)
      // 颜色变化的语义由「松手真的关闭」钉住：没越过阈值的拖拽不会换配色。
      await pollUntil(() => !el.open, `${placement} 确认态下松手没有关闭 drawer`)
      el.remove()
    }
  })

  /*
   * 悬停与确认态同时成立时确认态必须压过 hover，否则用户悬停 drag bar 拖到阈值处会看到
   * drag bar「暗回去」，读作松手会撤销。
   */
  it('悬停与确认态同时成立时确认态胜出', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement })
      const { x, y } = capsuleCenter(el)
      const surface = hitTestAt(el, x, y)!
      await userEvent.hover(surface)
      expect(surface.matches(':hover'), `${placement} 真实指针未落在拖拽面上`).toBe(true)

      const hovered = getComputedStyle(getDragBar(el)).backgroundColor

      // 悬停之后在同一处起手拖过阈值：合成 move 不移动真实指针，hover 于是仍在原位，
      // 与确认态在同一帧里同时成立。
      const { displacement, target } = await pressDragFromCapsule(el, placement)
      expect(displacement, `${placement} 按下后 panel 没有位移`).toBeGreaterThan(1)
      expect(surface.matches(':hover'), `${placement} 拖拽期间 hover 已丢失，本用例前提不成立`).toBe(true)
      const confirmed = getComputedStyle(getDragBar(el)).backgroundColor

      expect(confirmed, `${placement} 确认态未压过悬停态（两者同为 ${hovered}）`).not.toBe(hovered)
      releaseDrag(target)
      await pollUntil(() => !el.open, `${placement} 确认态下松手没有关闭 drawer`)
      el.remove()
    }
  })

  /*
   * 下层 drawer（被上层盖成 `is-nested-lower`）的 drag bar 与端头 drag edge 必须一起退场：
   * 悬空胶囊是看得见的死装饰，而悬空 drag edge 更糟 —— 它还会吃掉那里的触摸手势
   *（`touch-action: none`），而那里拖不动。
   *
   * 正控制在前：还是独立的下层时提示面确实在，否定断言才有意义。
   */
  it('嵌套下层时 drag bar 与端头 drag edge 一起退场，不再吃事件', async () => {
    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.placement = 'bottom'
    parent.draggable = true
    parent.heading = 'parent'
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.placement = 'bottom'
    child.draggable = true
    child.heading = 'child'
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete
    parent.open = true
    await parent.updateComplete
    await pollUntil(() => getDialog(parent).classList.contains('is-visible'), 'parent did not become visible')

    // 正控制：独立的下层时提示面在。
    expect(getComputedStyle(getDragBar(parent)).opacity).not.toBe('0')

    child.open = true
    await child.updateComplete
    await pollUntil(() => getDialog(parent).classList.contains('is-nested-lower'), 'lower layer not marked')

    const bar = getDragBar(parent)
    const edge = getDragEdge(parent)!
    await pollUntil(
      () => getComputedStyle(bar).opacity === '0' && getComputedStyle(edge).opacity === '0',
      () =>
        `下层 drawer 的 drag bar 和端头 drag edge 未完成退场 ` +
        `(bar=${getComputedStyle(bar).opacity}, edge=${getComputedStyle(edge).opacity})`
    )
    expect(getComputedStyle(bar).opacity, '下层 drawer 的 drag bar 没有退场').toBe('0')
    expect(getComputedStyle(edge).opacity, '下层 drawer 的端头 drag edge 没有退场').toBe('0')
    expect(getComputedStyle(edge).pointerEvents, '下层 drawer 的端头 drag edge 仍吃事件').toBe('none')
  })
})
