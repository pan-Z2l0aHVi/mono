import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser-playwright/context'

import '..'
import { pollUntil } from '@/shared/test-utils'

import type { DrawerPlacement, WebUiDrawer } from '..'

/*
 * 上下 placement 的 header / footer **整块**是拖拽起手区（A6 的反向修法）。
 *
 * 缺陷形态：A6 把热区让开 header（`top: var(--wui-internal-drawer-header-inset)`）修对了
 * 「热区压住 header 按钮」，代价是整条 header 不再可拖。实测 390×844 / placement=bottom /
 * 56px header：端头热边 [0,12]、热区 [60,92]，**中间 48px 完全不可拖**，用户反馈
 * 「header 面积太小，很难拖动到」。
 *
 * 修法形状：header / footer 自己接手势，靠**逐个控件**在事件层让开（不靠几何切割）。
 * 几何切割要测量每个控件的位置、控件一改就失效；逐个控件让开是结构性的。
 *
 * 判据分两类，缺一不可：
 * - **命中层判据**（几何）：从指针落点反查顶层元素，落在 header 盒内的点必须解析到
 *   一个可拖表面。只断言「元素存在」会漏掉压在上面挡着的透明层——那正是 A6 的病根。
 * - **行为判据**（真实输入）：用 CDP 派真实鼠标事件。合成 PointerEvent 不走命中测试，
 *   在一个「控件被热区盖住」的缺陷下照样绿，是上一轮翻车的写法之一。
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

/** 等打开过渡收敛到终态几何（进场动画中量到的是中间帧）。 */
async function settleGeometry(el: WebUiDrawer, timeoutMs = 5000) {
  const dialog = getDialog(el)
  const start = performance.now()
  let previous = dialog.getBoundingClientRect()
  let stable = 0
  while (stable < 2) {
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => setTimeout(resolve, 32))
    const current = dialog.getBoundingClientRect()
    stable =
      Math.abs(current.top - previous.top) < 0.01 &&
      Math.abs(current.bottom - previous.bottom) < 0.01 &&
      Math.abs(current.left - previous.left) < 0.01 &&
      Math.abs(current.right - previous.right) < 0.01
        ? stable + 1
        : 0
    previous = current
    if (performance.now() - start > timeoutMs) throw new Error('drawer geometry did not settle')
  }
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
 * 从某点起手做一次**真实拖拽**，拖一小段再原路返回后松手，返回过程中的可观测结果。
 *
 * 原路返回是必要的：CDP 派发的相邻 move 之间几乎无耗时，松手瞬间的净速度会远超
 * `DRAG_FLICK_VELOCITY`（500px/s），几 px 位移就够判成甩动而把抽屉关掉。回到起点让
 * 净位移归零，既能观测到「手势真的活着」，又不会把抽屉误关。
 *
 * 位移读**按压后第 steps 步**而不是松手时：手势层在首个 pointermove 把零点重置
 * （`calibrateOnFirstMove`），只发一步 move 时净位移恒为 0——那种写法在拖拽确实挂上了
 * 的情况下也读出「没动」，判据会静默失效。故至少发 2 步再读。
 */
async function probeDrag(
  el: WebUiDrawer,
  x: number,
  y: number,
  deltaY: number,
  steps = 4
): Promise<{ dragging: boolean; displacement: number }> {
  const before = getDialog(el).getBoundingClientRect().top
  await realPressAt(x, y)
  for (let step = 1; step <= steps; step++) await realMoveTo(x, y + (deltaY * step) / steps)
  const dragging = getDialog(el).classList.contains('is-dragging')
  const displacement = getDialog(el).getBoundingClientRect().top - before
  for (let step = steps - 1; step >= 0; step--) await realMoveTo(x, y + (deltaY * step) / steps)
  await realReleaseAt(x, y)
  return { dragging, displacement }
}

/** 落点是否被已知的拖拽命中面（热区 / 端头热边）盖住——这两条本身就是拖拽面，不算遮挡。 */
function coveredByDragSurface(el: WebUiDrawer, point: { x: number; y: number }): boolean {
  const hit = hitAt(el, point.x, point.y)
  return hit?.matches('.wui-drawer-drag-edge, .wui-drawer-drag-zone') ?? false
}

/**
 * 在矩形内找一个真正的空点：不在排除区（控件）里，也不在拖拽面底下。
 *
 * 不能用固定比例取点：header 是 `space-between` 布局，窄面板下控件会一路排到左边，
 * `width * 0.2` 这种「看起来是空白」的位置实测正好落在改名输入框上——那条断言于是
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
    expect(rect.width, '内置关闭按钮没有布局盒').toBeGreaterThan(0)

    // 必然命中的点：读不懂 shadow 内部时这条会红（退化成返回 host），
    // 后面所有「落点不是热区」类断言都会跟着失去证伪能力。
    const hit = hitAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(hit, '命中测试没有解析到关闭按钮').not.toBeNull()
    expect(close.contains(hit) || hit === close, `命中的是 ${hit?.tagName ?? 'null'}`).toBe(true)
  })

  it('R1 行为：标题与 header 空白处的真实按下都能进入拖拽', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header')
    const rect = header.getBoundingClientRect()
    const controls = ['#rename', '#act', '#pick'].map(sel => el.querySelector(sel)!.getBoundingClientRect())
    const points = [center(el.querySelector('#title')!.getBoundingClientRect()), findEmptyPoint(el, rect, controls)]

    for (const point of points) {
      const { dragging, displacement } = await probeDrag(el, point.x, point.y, 12)
      expect(dragging, `(${point.x.toFixed(1)},${point.y.toFixed(1)}) 按下未进入拖拽`).toBe(true)
      expect(Math.abs(displacement), '拖动期间面板没有位移，手势没有真正挂上').toBeGreaterThan(1)
    }
    expect(el.open, '拖拽把抽屉关掉了（净位移应归零）').toBe(true)
  })

  it('R2 top + footer：footer 空白处的真实按下同样进入拖拽', async () => {
    const { el } = await mountDrawer({ placement: 'top', footer: true })
    const footer = query(el, '.wui-drawer-footer')
    const rect = footer.getBoundingClientRect()
    const control = el.querySelector('#fAct')!.getBoundingClientRect()

    const point = findEmptyPoint(el, rect, [control])
    await realPressAt(point.x, point.y)
    const dragging = getDialog(el).classList.contains('is-dragging')
    await realReleaseAt(point.x, point.y)
    expect(dragging, 'footer 空白处按下未进入拖拽').toBe(true)
  })

  /*
   * 让位量的另一端：没有 header/footer 时，热区必须回到面板端头（让位量为 0）。
   *
   * 上面 R1/R2/R3 都在「有那一节」的前提下成立，这一格是它们的补集：让位量是
   * 「该节高度 + 间距」，那一节不存在时必须整体归零，否则热区会平白往面板里缩一截，
   * 端头上那条最好按的带子凭空变窄。
   *
   * 判据是**关系**（热区端边与面板同边的差 ≤ 容差），不是「让位量等于某个像素值」，
   * 也不是读 `--wui-internal-drawer-*-inset` 的计算值。
   */
  it('R2 没有 header/footer 时热区回到面板端头（让位量为 0）', async () => {
    for (const placement of ['bottom', 'top'] as const) {
      const { el } = await mountDrawer({ placement })
      const dialog = getDialog(el).getBoundingClientRect()
      const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()

      const yieldAmount = placement === 'bottom' ? zone.top - dialog.top : dialog.bottom - zone.bottom
      expect(Math.abs(yieldAmount), `${placement} 无头尾时让位=${yieldAmount}`).toBeLessThanOrEqual(EPS)
      el.remove()
    }
  })

  it('R3 header 里的可点控件仍可点（输入框 / 行内按钮 / 勾选框）', async () => {
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

    expect(log.rename, '输入框没收到真实点击').toBe(1)
    expect(log.act, '行内按钮没收到真实点击').toBe(1)
    expect(log.pick, '勾选框没收到真实点击').toBe(1)
    expect(el.querySelector('#pick')!.getAttribute('aria-checked')).toBe('true')
    expect(getDialog(el).classList.contains('is-dragging'), '点击控件时误入了拖拽').toBe(false)
    expect(el.open).toBe(true)
  })

  it('R3 在控件上起手拖拽不会把控件拖走', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    for (const sel of ['#rename', '#act', '#pick']) {
      const rect = el.querySelector(sel)!.getBoundingClientRect()
      const { dragging, displacement } = await probeDrag(el, rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
      expect(dragging, `在 ${sel} 上起手进入了拖拽`).toBe(false)
      expect(Math.abs(displacement), `从 ${sel} 起手把抽屉拖动了 ${displacement}`).toBeLessThanOrEqual(EPS)
    }
    // 原路返回的按压-抬起会派发原生 click（控件让开时这是浏览器的正常行为，
    // 与「控件被拖走」无关），所以这里不拿 click 计数当判据。
    expect(el.open).toBe(true)
  })

  it('R3 内置关闭按钮仍可点并关闭抽屉', async () => {
    const { el, log } = await mountDrawer({ placement: 'bottom', header: true })
    const close = query(el, '.wui-drawer-close')
    const rect = close.getBoundingClientRect()
    const hit = hitAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(close.contains(hit) || hit === close, `内置关闭按钮顶层落点是 ${hit?.tagName ?? 'null'}，被盖住了`).toBe(
      true
    )

    await realClickAt(rect.left + rect.width / 2, rect.top + rect.height / 2)
    await pollUntil(() => !el.open, 'close button click did not close the drawer')
    expect(log.closed).toBe(1)
  })

  it('R4 左右 placement：header 不接手势', async () => {
    for (const placement of ['right', 'left'] as const) {
      const { el } = await mountDrawer({ placement, header: true, footer: true })

      // 左右 placement 的拖拽轴是 x，header 不该起手。判据是「按下没进入拖拽」，
      // 不是热区的宽高 —— 后者是精确几何（政策第 6 条）。
      const rect = query(el, '.wui-drawer-header').getBoundingClientRect()
      const point = { x: rect.left + rect.width * 0.2, y: rect.top + rect.height / 2 }
      await realPressAt(point.x, point.y)
      const dragging = getDialog(el).classList.contains('is-dragging')
      await realReleaseAt(point.x, point.y)
      expect(dragging, `${placement} 的 header 错误地接了手势`).toBe(false)
      el.remove()
    }
  })

  /*
   * 嵌套下层时 header 的手势闸同步退场。
   *
   * 判据只取事件层：下层抽屉被上层盖住后那里的 header 拖不动，起手必须被拒绝。
   * `cursor` / `touch-action` 的计算值是观感与实现细节，不作断言 —— 但闸门本身
   * 关不关得住，事件层是唯一可判定的那一面（且它才是真正吃手势的地方）。
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
    const soloRect = soloHeader.getBoundingClientRect()
    soloHeader.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        clientX: soloRect.left + soloRect.width / 2,
        clientY: soloRect.top + soloRect.height / 2
      })
    )
    await control.updateComplete
    expect(getDialog(control).classList.contains('is-dragging'), '正控制：非下层时 header 起手没有进入拖拽').toBe(true)
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
    await new Promise(resolve => setTimeout(resolve, 250))

    // 下层起手不进拖拽：那里拖不动，吞下手势只会让用户以为面板失灵。
    const lowerHeader = query(parent, '.wui-drawer-header')
    const rect = lowerHeader.getBoundingClientRect()
    lowerHeader.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      })
    )
    await parent.updateComplete
    expect(getDialog(parent).classList.contains('is-dragging'), '下层抽屉的 header 起手仍进入了拖拽').toBe(false)
  })
})
