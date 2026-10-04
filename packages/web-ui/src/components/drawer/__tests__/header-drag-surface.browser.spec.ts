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

/**
 * 落点顶层元素是否属于 header / footer 的**扁平树**。
 *
 * 沿扁平树上行：slotted 的 light DOM 节点要用 `assignedSlot` 才爬得到 shadow 包装元素，
 * 只用 `parentElement` 会在 `<slot>` 处断掉，把「命中 header 里的标题」误判成「不属于」。
 *
 * 这里**只回答归属，不回答「会不会起手」**：起手与否由行为判据（真实拖拽）证明。
 * 若把「在 header 里」直接当成「可起手」，这条断言就恒真——修之前 header 里本来就
 * 没有任何东西可拖，恒真断言比没有断言更坏（看起来在守着 A6，实际什么都证伪不了）。
 */
function isHeaderFlatTreeNode(node: Element | null): boolean {
  if (!node) return false
  let current: Element | null = node
  while (current) {
    if (current.matches('.wui-drawer-header, .wui-drawer-footer')) return true
    // 两个分支的显式类型是必需的：current 由这里的赋值决定类型，不标注就成了自引用推断。
    const assigned: HTMLSlotElement | null = (current as HTMLElement).assignedSlot
    const next: Element | null = assigned ? assigned.parentElement : current.parentElement
    current = next
  }
  return false
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
  edgeSize?: string
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
  if (options.edgeSize !== undefined) {
    el.style.setProperty('--wui-drawer-drag-edge-size', options.edgeSize)
  }
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

/**
 * 再等 n 帧。
 *
 * 让位量不来自布局本身，而来自 ResizeObserver 回调写回的自定义属性：那一节被重新隐藏后，
 * 观察者要等一次尺寸回调才把让位量归零。`settleGeometry` 量的是 dialog 矩形，收敛时那一节
 * 可能刚好已隐藏、属性却还没回写，所以这里再跨几帧把这条链路走完。按帧等而不是 sleep：
 * 高负载下帧变慢，等待随之拉长而不是提前落空。
 */
async function settleFrames(frames: number) {
  for (let i = 0; i < frames; i++) await new Promise(resolve => requestAnimationFrame(resolve))
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

  it('R1 bottom + header：header 盒内非控件落点只被已知拖拽面覆盖', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    const header = query(el, '.wui-drawer-header')
    const rect = header.getBoundingClientRect()
    // 内置关闭按钮压在同一行盒内（top 16px + 26px 高），它同样是显式让开的控件，
    // 必须一起排除，否则「整块可拖」的采样点会落在它身上。
    const controls = [
      ...['#rename', '#act', '#pick'].map(sel => el.querySelector(sel)!.getBoundingClientRect()),
      query(el, '.wui-drawer-close').getBoundingClientRect()
    ]

    const samples: Array<{ x: number; y: number }> = []
    for (const fx of [0.08, 0.35, 0.5, 0.65, 0.92]) {
      for (const fy of [0.25, 0.5, 0.75]) {
        samples.push({ x: rect.left + rect.width * fx, y: rect.top + rect.height * fy })
      }
    }
    samples.push(center(el.querySelector('#title')!.getBoundingClientRect()))

    let checked = 0
    for (const point of samples) {
      if (controls.some(c => insideRect(point, c, 1))) continue
      checked += 1
      const hit = hitAt(el, point.x, point.y)
      // 顶层落点必须是 header 本身，或已知的拖拽命中面。把「让 header 可拖」实现成
      // 「把热区铺到 header 上」的朴素修法会让这里命中 .wui-drawer-drag-zone 而变红——
      // 这正是要防的回归：整块可拖靠 header 自己接手势，不靠加一层透明命中区。
      const covered = hit?.matches('.wui-drawer-drag-edge, .wui-drawer-drag-zone') ?? false
      expect(
        covered || isHeaderFlatTreeNode(hit),
        `header 内 (${point.x.toFixed(1)},${point.y.toFixed(1)}) 命中 ${hit?.tagName ?? 'null'}，既不在 header 上也不是拖拽面`
      ).toBe(true)
    }
    expect(checked, '采样点全被控件排除，判据落空').toBeGreaterThan(6)
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

  it('R2 top + footer：对称成立', async () => {
    const { el } = await mountDrawer({ placement: 'top', footer: true })
    const footer = query(el, '.wui-drawer-footer')
    const rect = footer.getBoundingClientRect()
    const control = el.querySelector('#fAct')!.getBoundingClientRect()

    const samples: Array<{ x: number; y: number }> = []
    for (const fx of [0.08, 0.35, 0.5, 0.92]) {
      for (const fy of [0.25, 0.5, 0.75]) {
        samples.push({ x: rect.left + rect.width * fx, y: rect.top + rect.height * fy })
      }
    }
    let checked = 0
    for (const point of samples) {
      if (insideRect(point, control, 1)) continue
      checked += 1
      const hit = hitAt(el, point.x, point.y)
      const covered = hit?.matches('.wui-drawer-drag-edge, .wui-drawer-drag-zone') ?? false
      expect(
        covered || isHeaderFlatTreeNode(hit),
        `footer 内 (${point.x.toFixed(1)},${point.y.toFixed(1)}) 命中 ${hit?.tagName ?? 'null'}，既不在 footer 上也不是拖拽面`
      ).toBe(true)
    }
    expect(checked).toBeGreaterThan(6)

    const point = findEmptyPoint(el, rect, [control])
    await realPressAt(point.x, point.y)
    const dragging = getDialog(el).classList.contains('is-dragging')
    await realReleaseAt(point.x, point.y)
    expect(dragging, 'footer 空白处按下未进入拖拽').toBe(true)
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

  it('R6 端头热边加厚、胶囊带仍被包含、且仍由 token 控制', async () => {
    const { el } = await mountDrawer({ placement: 'bottom', header: true })
    const edgeRect = query(el, '.wui-drawer-drag-edge').getBoundingClientRect()
    const barRect = query(el, '.wui-drawer-drag-bar').getBoundingClientRect()
    const dialogTop = getDialog(el).getBoundingClientRect().top

    // 旧值是 `中线 + 半个胶囊厚度` = 10 + 2 = 12px，加厚后必须严格大于它。
    const legacy = 10 + 4 / 2
    expect(edgeRect.height, `端头热边厚度=${edgeRect.height}`).toBeGreaterThan(legacy)
    // 胶囊带必须仍被热边带包含（包含关系由 token 定义推出，不是约定维持的）。
    expect(barRect.top - dialogTop, '胶囊近侧跑出热边').toBeGreaterThanOrEqual(edgeRect.top - dialogTop - EPS)
    expect(edgeRect.bottom - dialogTop, '胶囊远侧跑出热边').toBeGreaterThanOrEqual(barRect.bottom - dialogTop - EPS)
    // 仍贴住可抓取边缘。
    expect(Math.abs(edgeRect.top - dialogTop)).toBeLessThanOrEqual(EPS)
    el.remove()

    const widened = await mountDrawer({ placement: 'bottom', header: true, edgeSize: '40px' })
    const wide = query(widened.el, '.wui-drawer-drag-edge').getBoundingClientRect()
    expect(Math.abs(wide.height - 40), `token 覆盖后厚度=${wide.height}`).toBeLessThanOrEqual(EPS)
  })

  it('R4 左右 placement：header 不接手势，热区几何不变', async () => {
    for (const placement of ['right', 'left'] as const) {
      const { el } = await mountDrawer({ placement, header: true, footer: true })
      const dialog = getDialog(el).getBoundingClientRect()
      const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()
      expect(Math.abs(zone.height - dialog.height), `${placement} 热区高=${zone.height}`).toBeLessThanOrEqual(EPS)
      expect(Math.abs(zone.width - 20), `${placement} 热区宽=${zone.width}`).toBeLessThanOrEqual(EPS)

      // 左右 placement 的拖拽轴是 x，header 不该起手。
      const rect = query(el, '.wui-drawer-header').getBoundingClientRect()
      const point = { x: rect.left + rect.width * 0.2, y: rect.top + rect.height / 2 }
      await realPressAt(point.x, point.y)
      const dragging = getDialog(el).classList.contains('is-dragging')
      await realReleaseAt(point.x, point.y)
      expect(dragging, `${placement} 的 header 错误地接了手势`).toBe(false)
      el.remove()
    }
  })

  it('R5 无 header / footer 时热区几何不变', async () => {
    for (const placement of ['bottom', 'top'] as const) {
      const { el } = await mountDrawer({ placement })
      const dialog = getDialog(el).getBoundingClientRect()
      const zone = query(el, '.wui-drawer-drag-zone').getBoundingClientRect()
      const offset = placement === 'bottom' ? zone.top - dialog.top : dialog.bottom - zone.bottom
      expect(Math.abs(offset), `${placement} 无头尾时让位=${offset}`).toBeLessThanOrEqual(EPS)
      el.remove()
    }
  })

  it('断开期间清空 footer，重连后热区让位量归零', async () => {
    // footer 是 `top` placement 的对位：`bottom` 贴顶边让开 header，`top` 贴底边让开 footer。
    const { el } = await mountDrawer({ placement: 'top', footer: true })
    const dialog = getDialog(el)
    // 让位量相对**面板**量，与本文件既有用例同一口径：bottom placement 是下沿锚定的，
    // 面板自身长度会变，拿视口绝对坐标会把「让位归零」与「面板动了」混成同一现象。
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
    await settleFrames(3)

    /*
     * 判据是**关系**：重连后的让位量与「从来没有 footer」是同一几何（同为本文件紧挨着的
     * 那条用例的终点），而不是钉某个像素值。让位量取自 offsetHeight，浏览器实测 32px 的空节
     * 也会让位——正是本缺陷用户可感知的那条死带。
     */
    expect(Math.abs(avoid()), `重连后让位=${avoid()}`).toBeLessThanOrEqual(EPS)
  })

  it('嵌套下层时 header 的手势提示与 JS 闸同步退场（不夺触摸手势、不骗光标）', async () => {
    /*
     * 同一 drawer 做 A/B：先是独立的下层（提示面在），被上层盖成 is-nested-lower 后
     * 提示面必须一起退。正控制在前，否定断言才有意义——否则「下层不是 grab」这条在
     * 提示面压根没生效时也会绿。
     *
     * `touch-action` 沿命中链求交，所以这条不是纯观感：下层 header 若还留着
     * `touch-action: none`，那里的触摸滚动是被真的夺走的，而那里拖不动。
     */
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

    // 正控制：还没被标成下层时，提示面确实在。
    const soloHeader = query(parent, '.wui-drawer-header')
    expect(getComputedStyle(soloHeader).cursor, '正控制：非下层时 header 不是 grab').toBe('grab')
    expect(getComputedStyle(soloHeader).touchAction, '正控制：非下层时 header 没有夺走触摸手势').toBe('none')

    // 开上层 → parent 被标成 is-nested-lower。
    child.open = true
    await child.updateComplete
    await pollUntil(() => getDialog(parent).classList.contains('is-nested-lower'), 'lower layer not marked')
    await new Promise(resolve => setTimeout(resolve, 250))

    const lowerHeader = query(parent, '.wui-drawer-header')
    const lowerStyle = getComputedStyle(lowerHeader)
    expect(lowerStyle.cursor, '下层抽屉的 header 仍在暗示可拖').not.toBe('grab')
    expect(lowerStyle.touchAction, '下层抽屉的 header 仍夺走触摸手势').not.toBe('none')

    // 与事件层闸门判同一条：下层起手不进拖拽。
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
