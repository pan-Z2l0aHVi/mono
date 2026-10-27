import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser-playwright/context'

import { pollUntil, waitForSettledLayout } from '@/shared/test-utils'
import { expectInsideViewport } from '@/shared/test-utils/viewport'

import type { DrawerPlacement, WebUiDrawer } from '..'

/*
 * 上下 placement 的 header / footer **整块**是拖拽起手区（A6 的反向修法）。
 *
 * 缺陷形态：A6 把 drag zone 让开 header（`top: var(--wui-internal-drawer-header-inset)`）修对了
 * 「drag zone 压住 header button」，代价是整条 header 不再可拖。实测 390×844 / placement=bottom /
 * 56px header：端头 drag edge [0,12]、drag zone [60,92]，**中间 48px 完全不可拖**，用户反馈
 * 「header 面积太小，很难拖动到」。
 *
 * 修法形状：header / footer 自己接手势，靠**逐个控件**在事件层让开（不靠几何切割）。
 * 几何切割要测量每个控件的位置、控件一改就失效；逐个控件让开是结构性的。
 *
 * 判据分两类，缺一不可：
 * - **命中层判据**（几何）：从指针落点反查顶层元素，落在 header 盒内的点必须解析到
 *   一个可拖表面。只断言「元素存在」会漏掉压在上面挡着的透明层——那正是 A6 的病根。
 * - **行为判据**（真实输入）：用 CDP 派真实鼠标事件。合成 PointerEvent 不走命中测试，
 *   在一个「控件被 drag zone 盖住」的缺陷下照样绿，是上一轮翻车的写法之一。
 *
 * 命中测试一律走 `shadowRoot.elementFromPoint`：`document.elementFromPoint` 穿透
 * shadow root 只返回宿主，会把真实重叠测成 0%。
 */

interface CdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>
}

const EPS = 0.5

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function query(el: WebUiDrawer, selector: string): HTMLElement {
  return el.shadowRoot?.querySelector(selector) as HTMLElement
}

/** 命中测试：必须在 shadowRoot 上做，document 级只返回宿主。 */
function hitAt(el: WebUiDrawer, x: number, y: number): Element | null {
  return el.shadowRoot?.elementFromPoint(x, y) ?? null
}

function insideRect(point: { x: number; y: number }, rect: DOMRect, margin = 0): boolean {
  return (
    point.x >= rect.left - margin &&
    point.x <= rect.right + margin &&
    point.y >= rect.top - margin &&
    point.y <= rect.bottom + margin
  )
}

/** iframe client 坐标 → 主 frame 视口坐标（CDP 的输入用的是后者）。 */
function toViewportPoint(x: number, y: number) {
  const frame = window.frameElement as HTMLElement | null
  const rect = frame?.getBoundingClientRect()
  if (!rect || !rect.width || !rect.height) return { x, y }
  const scaleX = rect.width / window.innerWidth
  const scaleY = rect.height / window.innerHeight
  return { x: rect.left + x * scaleX, y: rect.top + y * scaleY }
}

interface ControlLog {
  rename: number
  act: number
  pick: number
  closed: number
}

async function mountDrawer(options: {
  placement: DrawerPlacement
  header?: boolean
  footer?: boolean
}): Promise<{ el: WebUiDrawer; log: ControlLog }> {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.placement = options.placement
  el.draggable = true
  el.closable = true
  el.innerHTML = [
    options.header
      ? `<div slot="header" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
           <h2 id="title" style="margin:0;font:inherit">详情</h2>
           <div style="display:flex;align-items:center;gap:8px">
             <input id="rename" type="text" value="旧名" style="width:72px;height:24px;padding:0 4px" />
             <button id="act" type="button" style="height:24px">改名</button>
             <span id="pick" role="checkbox" aria-checked="false" tabindex="0"
                   style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px">✓</span>
           </div>
         </div>`
      : '',
    options.footer
      ? `<div slot="footer" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
           <span id="fTitle" style="font:inherit">操作</span>
           <button id="fAct" type="button" style="height:24px">提交</button>
         </div>`
      : '',
    '<div style="width:200px;height:180px">正文</div>'
  ].join('')
  document.body.appendChild(el)
  el.open = true
  await el.updateComplete
  await pollUntil(() => getDialog(el).classList.contains('is-visible'), 'drawer did not become visible')
  await settleGeometry(el)

  const log: ControlLog = { rename: 0, act: 0, pick: 0, closed: 0 }
  el.querySelector('#rename')?.addEventListener('click', () => (log.rename += 1))
  el.querySelector('#act')?.addEventListener('click', () => (log.act += 1))
  el.querySelector('#pick')?.addEventListener('click', () => {
    log.pick += 1
    el.querySelector('#pick')?.setAttribute('aria-checked', 'true')
  })
  el.querySelector('#fAct')?.addEventListener('click', () => (log.act += 1))
  el.addEventListener('open-change', e => {
    if ((e as CustomEvent<{ open: boolean }>).detail.open === false) log.closed += 1
  })
  return { el, log }
}

/**
 * 等拖拽面的几何定版再取样——命中测试的前提。
 *
 * 旧写法只等比 dialog 矩形两次相等，两个方向都不够：
 * - 进场过渡的进度只在渲染步进里推进，`getBoundingClientRect()` 的强制重算不推它，
 *   于是「相等」也可以意味着过渡还没起跑：量到的是过渡前那一帧的矩形。
 * - 让位量由 ResizeObserver 写回宿主样式，移动的是 drag zone/drag edge 而不是 dialog 矩形，
 *   等 dialog 矩形稳定推不出 drag zone 已到位。
 * 共享 helper 把这两件事都变成因果条件（过渡跑完 + RO 抽干），收尾再验矩形真的定版。
 * 这也取代了原先手写的 `settleFrames(3)`：那条是按帧数等，本质是赌让位量在几帧内
 * 落定；抽干 ResizeObserver 等的是尺寸回调真的派发过。
 */
async function settleGeometry(el: WebUiDrawer) {
  const targets = [getDialog(el), query(el, '.wui-drawer-drag-zone'), query(el, '.wui-drawer-body')]
  // 期待驱动：命中测试的前提是「这些盒子已经落在视口内」。少了这条，
  // `elementFromPoint` 返回 null 与「drag zone 没盖住 header」在读数上完全一样。
  await waitForSettledLayout(targets, { expect: expectInsideViewport(targets) })
}

async function realPressAt(x: number, y: number): Promise<void> {
  const client = cdp() as unknown as CdpSession
  const p = toViewportPoint(x, y)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: p.x,
    y: p.y,
    button: 'none',
    buttons: 0
  })
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: p.x,
    y: p.y,
    button: 'left',
    clickCount: 1,
    buttons: 1
  })
}

async function realMoveTo(x: number, y: number, holding = true): Promise<void> {
  const client = cdp() as unknown as CdpSession
  const p = toViewportPoint(x, y)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: p.x,
    y: p.y,
    button: holding ? 'left' : 'none',
    buttons: holding ? 1 : 0
  })
}

async function realReleaseAt(x: number, y: number): Promise<void> {
  const client = cdp() as unknown as CdpSession
  const p = toViewportPoint(x, y)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: p.x,
    y: p.y,
    button: 'left',
    clickCount: 1,
    buttons: 0
  })
}

/** 真实单击（走命中测试与真实 click 派发）。 */
async function realClickAt(x: number, y: number): Promise<void> {
  await realPressAt(x, y)
  await realReleaseAt(x, y)
}

/**
 * 从某点起手做一次**真实拖拽**，拖一小段再原路返回后松手，返回拖拽期间的 panel 位移。
 *
 * 原路返回是必要的：CDP 派发的相邻 move 之间几乎无耗时，松手瞬间的净速度会远超
 * `DRAG_FLICK_VELOCITY`（500px/s），几 px 位移就够判成甩动而把 drawer 关掉。回到起点让
 * 净位移归零，既能观测到「手势真的活着」，又不会把 drawer 误关。
 *
 * 位移读**按压后第 steps 步**而不是松手时：手势层在首个 pointermove 把零点重置
 * （`calibrateOnFirstMove`），只发一步 move 时净位移恒为 0——那种写法在拖拽确实挂上了
 * 的情况下也读出「没动」，判据会静默失效。故至少发 2 步再读。
 */
async function probeDrag(
  el: WebUiDrawer,
  x: number,
  y: number,
  delta: { x: number; y: number },
  steps = 4
): Promise<number> {
  const before = getDialog(el).getBoundingClientRect()
  await realPressAt(x, y)
  for (let step = 1; step <= steps; step++) {
    await realMoveTo(x + (delta.x * step) / steps, y + (delta.y * step) / steps)
  }
  const after = getDialog(el).getBoundingClientRect()
  const displacement = Math.hypot(after.left - before.left, after.top - before.top)
  for (let step = steps - 1; step >= 0; step--) {
    await realMoveTo(x + (delta.x * step) / steps, y + (delta.y * step) / steps)
  }
  await realReleaseAt(x, y)
  return displacement
}

/**
 * 合成事件直达元素、绕过命中测试：嵌套下层时真实指针会被上层模态层截走，到不了下层 header。
 * 这里只问「事件层还接不接手势」——判据同样是 panel 的实际位移。手势用 pointercancel 收尾，
 * 避免补发 click 或触发关闭。
 */
async function syntheticDragDisplacement(
  el: WebUiDrawer,
  target: Element,
  delta: { x: number; y: number },
  steps = 4
): Promise<number> {
  const rect = target.getBoundingClientRect()
  const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  const before = getDialog(el).getBoundingClientRect()
  const dispatch = (type: string, x: number, y: number) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        clientX: x,
        clientY: y
      })
    )

  dispatch('pointerdown', start.x, start.y)
  await el.updateComplete
  for (let step = 1; step <= steps; step += 1) {
    dispatch('pointermove', start.x + (delta.x * step) / steps, start.y + (delta.y * step) / steps)
    await el.updateComplete
  }
  const after = getDialog(el).getBoundingClientRect()
  dispatch('pointercancel', start.x + delta.x, start.y + delta.y)
  await el.updateComplete
  return Math.hypot(after.left - before.left, after.top - before.top)
}

/** 落点是否被已知的拖拽命中面（drag zone / 端头 drag edge）盖住——这两条本身就是拖拽面，不算遮挡。 */
function coveredByDragSurface(el: WebUiDrawer, point: { x: number; y: number }): boolean {
  const hit = hitAt(el, point.x, point.y)
  return hit?.matches('.wui-drawer-drag-edge, .wui-drawer-drag-zone') ?? false
}

/**
 * 在矩形内找一个真正的空点：不在排除区（控件）里，也不在拖拽面底下。
 *
 * 不能用固定比例取点：header 是 `space-between` 布局，窄 panel 下控件会一路排到左边，
 * `width * 0.2` 这种「看起来是空白」的位置实测正好落在改名 input 上——那条断言于是
 * 在测「控件让开」，与「空白处可拖」无关。
 */
function findEmptyPoint(el: WebUiDrawer, rect: DOMRect, excluded: DOMRect[]): { x: number; y: number } {
  for (const fy of [0.06, 0.18, 0.32, 0.5, 0.68, 0.82, 0.94]) {
    for (const fx of [0.03, 0.12, 0.26, 0.4, 0.55, 0.7, 0.85, 0.97]) {
      const point = { x: rect.left + rect.width * fx, y: rect.top + rect.height * fy }
      if (excluded.some(r => insideRect(point, r, 1))) continue
      if (coveredByDragSurface(el, point)) continue
      return point
    }
  }
  throw new Error('findEmptyPoint: 矩形内找不到空点')
}

function center(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer header / footer 整块可拖（浏览器）', () => {
  it('探针自证：shadowRoot.elementFromPoint 能解析到 shadow 内的控件', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    const close = query(el, '.wui-drawer-close')
    const rect = close.getBoundingClientRect()
    expect(rect.width, '内置关闭 button 没有布局盒').toBeGreaterThan(0)

    // 必然命中的点：读不懂 shadow 内部时这条会红（退化成返回 host），
    // 后面所有「落点不是 drag zone」类断言都会跟着失去证伪能力。
    const hit = hitAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(hit, '命中测试没有解析到关闭 button').not.toBeNull()
    expect(close.contains(hit) || hit === close, `命中的是 ${hit?.tagName ?? 'null'}`).toBe(true)
  })

  it('R1 行为：标题与 header 空白处的真实按下都能进入拖拽', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header')
    const rect = header.getBoundingClientRect()
    const controls = ['#rename', '#act', '#pick'].map(sel => el.querySelector(sel)!.getBoundingClientRect())
    const points = [center(el.querySelector('#title')!.getBoundingClientRect()), findEmptyPoint(el, rect, controls)]

    for (const point of points) {
      const displacement = await probeDrag(el, point.x, point.y, { x: 0, y: 12 })
      expect(
        displacement,
        `(${point.x.toFixed(1)},${point.y.toFixed(1)}) 按下后 panel 没有位移，手势没有真正挂上`
      ).toBeGreaterThan(1)
    }
    expect(el.open, '拖拽把 drawer 关掉了（净位移应归零）').toBe(true)
  })

  it('R2 top + footer：footer 空白处的真实按下同样进入拖拽', async () => {
    const { el } = await mountDrawer({ placement: 'top', footer: true })
    const footer = query(el, '.wui-drawer-footer')
    const rect = footer.getBoundingClientRect()
    const control = el.querySelector('#fAct')!.getBoundingClientRect()

    const point = findEmptyPoint(el, rect, [control])
    const displacement = await probeDrag(el, point.x, point.y, { x: 0, y: -12 })
    expect(displacement, 'footer 空白处按下后 panel 没有位移').toBeGreaterThan(1)
  })

  /*
   * 让位量的另一端：没有 header/footer 时，drag zone 必须回到 panel 端头（让位量为 0）。
   *
   * 上面 R1/R2/R3 都在「有那一节」的前提下成立，这一格是它们的补集：让位量是
   * 「该节高度 + 间距」，那一节不存在时必须整体归零，否则 drag zone 会平白往 panel 里缩一截，
   * 端头上那条最好按的带子凭空变窄。
   *
   * 判据是**关系**（drag zone 端边与 panel 同边的差 ≤ 容差），不是「让位量等于某个像素值」，
   * 也不是读 `--wui-internal-drawer-*-inset` 的计算值。
   */
  it('R2 没有 header/footer 时 drag zone 回到 panel 端头（让位量为 0）', async () => {
    for (const placement of ['bottom', 'top'] as const) {
      const { el } = await mountDrawer({ placement })
      const dialog = getDialog(el).getBoundingClientRect()
      const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()

      const yieldAmount = placement === 'bottom' ? zone.top - dialog.top : dialog.bottom - zone.bottom
      expect(Math.abs(yieldAmount), `${placement} 无头尾时让位=${yieldAmount}`).toBeLessThanOrEqual(EPS)
      el.remove()
    }
  })

  it('R3 header 里的可点控件仍可点（input / 行内 button / 勾选框）', async () => {
    const { el, log } = await mountDrawer({ placement: 'bottom', header: true })

    for (const sel of ['#rename', '#act', '#pick']) {
      const node = el.querySelector(sel)!
      const rect = node.getBoundingClientRect()
      const hit = hitAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
      // 顶层落点必须**就是控件本身或其后代**：被任何透明层压住时这条会红。
      // 不能写成「不是可拖表面」——沿扁平树上行必然走到 .wui-drawer-header，
      // 那样每个控件都会被误判成「被盖住」，判据反而恒假。
      expect(node.contains(hit) || hit === node, `${sel} 顶层落点是 ${hit?.tagName ?? 'null'}，控件被盖住了`).toBe(true)
      await realClickAt(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    expect(log.rename, 'input 没收到真实点击').toBe(1)
    expect(log.act, '行内 button 没收到真实点击').toBe(1)
    expect(log.pick, '勾选框没收到真实点击').toBe(1)
    expect(el.querySelector('#pick')!.getAttribute('aria-checked')).toBe('true')
    expect(el.open).toBe(true)
  })

  it('R3 在控件上起手拖拽不会把控件拖走', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    for (const sel of ['#rename', '#act', '#pick']) {
      const rect = el.querySelector(sel)!.getBoundingClientRect()
      const displacement = await probeDrag(el, rect.left + rect.width / 2, rect.top + rect.height / 2, { x: 0, y: 12 })
      expect(displacement, `从 ${sel} 起手把 drawer 拖动了 ${displacement}px`).toBeLessThanOrEqual(EPS)
    }
    // 原路返回的按压-抬起会派发原生 click（控件让开时这是浏览器的正常行为，
    // 与「控件被拖走」无关），所以这里不拿 click 计数当判据。
    expect(el.open).toBe(true)
  })

  it('R3 内置关闭 button 仍可点并关闭 drawer', async () => {
    const { el, log } = await mountDrawer({ placement: 'bottom', header: true })
    const close = query(el, '.wui-drawer-close')
    const rect = close.getBoundingClientRect()
    const hit = hitAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(close.contains(hit) || hit === close, `内置关闭 button 顶层落点是 ${hit?.tagName ?? 'null'}，被盖住了`).toBe(
      true
    )

    await realClickAt(rect.left + rect.width / 2, rect.top + rect.height / 2)
    await pollUntil(() => !el.open, 'close button click did not close the drawer')
    expect(log.closed).toBe(1)
  })

  it('R4 左右 placement：header 不接手势', async () => {
    for (const placement of ['right', 'left'] as const) {
      const { el } = await mountDrawer({ placement, header: true, footer: true })

      // 左右 placement 的拖拽轴是 x，header 不该起手。判据是沿拖拽轴移动时 panel
      // 没有位移，不是 drag zone 的宽高 —— 后者是精确几何（政策第 6 条）。
      const rect = query(el, '.wui-drawer-header').getBoundingClientRect()
      const point = { x: rect.left + rect.width * 0.2, y: rect.top + rect.height / 2 }
      const closing = placement === 'right' ? 12 : -12
      const displacement = await probeDrag(el, point.x, point.y, { x: closing, y: 0 })
      expect(displacement, `${placement} 的 header 错误地接了手势`).toBeLessThanOrEqual(EPS)
      el.remove()
    }
  })

  /*
   * 嵌套下层时 header 的手势闸同步退场。
   *
   * 判据只取事件层：下层 drawer 被上层盖住后那里的 header 拖不动，起手后 panel 不应位移。
   * 真实指针会被上层模态层截走、根本到不了下层 header，所以这里用合成事件直达元素；
   * 判据仍是**位移**，不是内部状态类。`cursor` / `touch-action` 的计算值是观感与实现细节，
   * 不作断言。
   */
  it('嵌套下层时 header 的手势闸关闭：下层起手不进拖拽', async () => {
    // 正控制用另一个 drawer：与 parent 同处一层的 control 不会被标成下层，
    // 因此它能证明「独立时确实接手势」，又不干扰 parent 保持打开。
    const control = document.createElement('web-ui-drawer') as WebUiDrawer
    control.placement = 'bottom'
    control.draggable = true
    control.heading = '独立层'
    document.body.append(control)
    control.open = true
    await control.updateComplete
    await pollUntil(() => getDialog(control).classList.contains('is-visible'), 'control did not become visible')

    const soloHeader = query(control, '.wui-drawer-header')
    const soloDisplacement = await syntheticDragDisplacement(control, soloHeader, { x: 0, y: 12 })
    expect(soloDisplacement, '正控制：非下层时 header 起手没有拖动 panel').toBeGreaterThan(1)
    control.remove()

    const parent = document.createElement('web-ui-drawer') as WebUiDrawer
    parent.placement = 'bottom'
    parent.draggable = true
    parent.heading = '下层'
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.placement = 'bottom'
    child.draggable = true
    child.heading = '上层'
    parent.append(child)
    document.body.append(parent)
    await parent.updateComplete
    parent.open = true
    await parent.updateComplete
    await pollUntil(() => getDialog(parent).classList.contains('is-visible'), 'parent did not become visible')

    // 开上层 → parent 变成下层。
    child.open = true
    await child.updateComplete
    await pollUntil(() => getDialog(parent).classList.contains('is-nested-lower'), 'lower layer not marked')
    // 让位过渡还在跑时读拖拽位移，会把过渡本身算进手的位移里。等动画清空，而不是睡固定时长。
    await pollUntil(
      () => getDialog(parent).getAnimations().length === 0,
      () => `下层切换的过渡未结束，仍有 ${getDialog(parent).getAnimations().length} 条在跑`
    )

    // 下层起手不进拖拽：那里拖不动，吞下手势只会让用户以为 panel 失灵。
    const lowerHeader = query(parent, '.wui-drawer-header')
    const lowerDisplacement = await syntheticDragDisplacement(parent, lowerHeader, { x: 0, y: 12 })
    expect(lowerDisplacement, '下层 drawer 的 header 起手仍拖动了 panel').toBeLessThanOrEqual(EPS)
  })

  it('断开期间清空 footer，重连后 drag zone 让位量归零', async () => {
    // footer 是 `top` placement 的对位：`bottom` 贴顶边让开 header，`top` 贴底边让开 footer。
    const { el } = await mountDrawer({ placement: 'top', footer: true })
    const dialog = getDialog(el)
    // 让位量相对**panel**量，与本文件既有用例同一口径：bottom placement 是下沿锚定的，
    // panel 自身长度会变，拿视口绝对坐标会把「让位归零」与「panel 动了」混成同一现象。
    const avoid = () =>
      dialog.getBoundingClientRect().bottom - query(el, '.wui-drawer-drag-zone').getBoundingClientRect().bottom
    // 前置判据同样钉关系：让位量至少要大于 footer 自身的高度（多的那截是间距）。
    // 写成 "> 64" 那类魔数会把断言绑死在某个 mountDrawer 的 footer 高度上，换个 helper 就假红。
    const footerHeight = query(el, '.wui-drawer-footer').getBoundingClientRect().height
    const withFooter = avoid()
    expect(withFooter, `有 footer 时让位=${withFooter}，footer 高=${footerHeight}`).toBeGreaterThan(footerHeight)

    el.remove()
    el.querySelector('[slot="footer"]')!.remove()
    document.body.append(el)
    await el.updateComplete
    await pollUntil(() => getDialog(el).classList.contains('is-visible'), 'drawer did not become visible after remount')
    await settleGeometry(el)

    /*
     * 判据是**关系**：重连后的让位量与「从来没有 footer」是同一几何（同本文件 R2
     * 「没有 header/footer 时 drag zone 回到 panel 端头」的终点），而不是钉某个像素值。让位量取自
     * offsetHeight，浏览器实测 32px 的空节也会让位——正是本缺陷用户可感知的那条死带。
     */
    expect(Math.abs(avoid()), `重连后让位=${avoid()}`).toBeLessThanOrEqual(EPS)
  })
})
