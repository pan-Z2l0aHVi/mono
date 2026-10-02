import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '..'
import { pollUntil } from '@/shared/test-utils'

import type { DrawerPlacement, WebUiDrawer } from '..'

/*
 * 胶囊与热区解耦后的几何与配色契约。
 *
 * 缺陷形态（A6 的副作用）：胶囊曾是热区的后代，而 `placement=bottom` 的热区要让开 header
 * （top: --wui-internal-drawer-header-inset = 60px）。胶囊的 `top` 相对热区算，于是连带继承
 * 那份让位量——实测胶囊距面板上边缘 68px，而不是中线应有的 8px。
 *
 * 修法是结构解耦：两者都成为 dialog 的直接子节点，胶囊相对 dialog 定位、恒贴可抓取边缘，
 * 热区独自承担让开量。判据全部取**几何关系**与**实际生效的计算样式**，不读 CSS 变量——
 * 变量是实现手段，读它等于把断言抄回实现；jsdom 无布局，这类断言只能在浏览器跑。
 */

const PLACEMENTS: DrawerPlacement[] = ['right', 'left', 'top', 'bottom']

/** 视口与 inset 在 CI 上可能是分数值，断言留半个像素容差。 */
const EPS = 0.5

/**
 * 胶囊距可抓取边缘的允许上限。默认 content padding 下实测为 8px（中线 10px − 半个胶囊 2px）。
 * 上限取 16px 而不是钉死 8px：这条要区分的是「贴边」与「被 header/footer 推走」，
 * 前者是 8px、后者是 68px，取中间值既能咬住缺陷又不会被亚像素抖动误伤。
 */
const EDGE_INSET_MAX = 16

/** 抽屉刻意做小，把关闭阈值（尺寸的一半，下限 10px）压到能用手势稳定跨过的量级。 */
const SMALL_SIDE = '160px'
/**
 * 单次合成拖拽的位移，需要同时满足两个约束：
 *   - 够大：判定零点在首个 pointermove 校准，实际位移只有 DRAG_DISTANCE 的 9/10，
 *     仍须越过关闭阈值（SMALL_SIDE / 2 = 80px）。
 *   - 够小：拖拽期间面板跟手平移，位移过大时热区会被带出视口，后面重新落回热区做
 *     级联取证就无从下手。SMALL_SIDE - 热区厚度 即该方向的上限（约 140px）。
 * 取 110 落在 (89, 140) 区间内，两侧都留了余量。
 */
const DRAG_DISTANCE = 110

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragBar(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-bar') as HTMLElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

/** 端头热边，只在上下 placement 渲染（见 index.ts）。左右 placement 恒为 null。 */
function getDragEdge(el: WebUiDrawer): HTMLElement | null {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-edge') ?? null
}

/**
 * 问浏览器「这个坐标上到底是谁」，走真实命中测试。
 *
 * 必须从 shadowRoot 上问：`document.elementFromPoint` 会把结果重定向到 shadow host
 * （`<web-ui-drawer>`），问出来的 className 恒为空字符串，看着像「什么都没命中」——
 * 这个坑我第一版探针就踩了，得到的 `hitAtBarCenter=""` 是假阴性。
 */
function hitTestAt(el: WebUiDrawer, x: number, y: number): HTMLElement | null {
  return (el.shadowRoot?.elementFromPoint(x, y) as HTMLElement | null) ?? null
}

/** 胶囊中心在视口坐标上的位置。 */
function capsuleCenter(el: WebUiDrawer): { x: number; y: number } {
  const rect = getDragBar(el).getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** 是否是「按下去会开始拖拽」的命中层（端头热边或让开量热区）。 */
function isDragSurface(el: WebUiDrawer, node: HTMLElement | null): boolean {
  return !!node && (node === getDragEdge(el) || node === getDragZone(el))
}

/**
 * **从胶囊坐标起手**、经过真实命中测试的拖拽。
 *
 * 早前这版的拖拽把合成事件直接派发到热区元素上，绕过了命中测试——于是「胶囊已经落到
 * 热区之外、按不动的死装饰」这种形态照样全绿，一路绿灯放过了 Reviewer 判的 Block。
 * 这里改成先问浏览器那个坐标上是谁，再在**它**身上派发：胶囊位置若没有命中层，
 * 问出来的就是 header / footer，断言当场红。
 */
async function pressDragFromCapsule(el: WebUiDrawer, placement: DrawerPlacement) {
  const { x: startX, y: startY } = capsuleCenter(el)
  const target = hitTestAt(el, startX, startY)
  if (!isDragSurface(el, target)) {
    throw new Error(
      `胶囊坐标 (${startX}, ${startY}) 命中的是 ${target?.className || target?.tagName || 'null'}，` +
        '不是热边/热区——胶囊在 placement 之外是死装饰'
    )
  }
  const delta = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1] }[placement]
  /*
   * 位移取**面板在拖拽轴上的尺寸本身**，而不是一个写死的常数：关闭阈值是尺寸的一半，
   * 而实测位移只有全程的 9/10（判定零点在首个 pointermove 校准），`0.9 × 尺寸` 因此
   * 对任意尺寸都稳压过 `0.5 × 尺寸`。写死常数就得跟着「挂了 header/footer 之后面板
   * 从 160px 长到 284px、阈值跟着翻倍」这件事调——而那正是这条用例要覆盖的场景本身。
   */
  const dialog = getDialog(el)
  const axisSize = placement === 'left' || placement === 'right' ? dialog.offsetWidth : dialog.offsetHeight
  target!.dispatchEvent(
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
  const enteredDragging = getDialog(el).classList.contains('is-dragging')
  for (let step = 1; step <= 10; step += 1) {
    target!.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        clientX: startX + (delta[0] * axisSize * step) / 10,
        clientY: startY + (delta[1] * axisSize * step) / 10
      })
    )
    await new Promise(resolve => setTimeout(resolve, 32))
  }
  await el.updateComplete
  return { enteredDragging, target }
}

async function settleGeometry(el: WebUiDrawer, timeoutMs = 5000) {
  const dialog = getDialog(el)
  const start = performance.now()
  let previous = dialog.getBoundingClientRect()
  let stableSamples = 0
  while (stableSamples < 2) {
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => setTimeout(resolve, 32))
    const current = dialog.getBoundingClientRect()
    stableSamples =
      Math.abs(current.top - previous.top) < 0.01 &&
      Math.abs(current.bottom - previous.bottom) < 0.01 &&
      Math.abs(current.left - previous.left) < 0.01 &&
      Math.abs(current.right - previous.right) < 0.01
        ? stableSamples + 1
        : 0
    previous = current
    if (performance.now() - start > timeoutMs) throw new Error('drawer geometry did not settle')
  }
}

async function mountDrawer(options: {
  placement: DrawerPlacement
  header?: boolean
  footer?: boolean
  /**
   * 公开 token 覆盖。两条都在 README 的 token 表里，consumer 会调；
   * 只用默认值写的断言恒为真，等于没有断言（第二轮就是这么漏掉的）。
   */
  thickness?: number
  space4?: number
  length?: number
}): Promise<WebUiDrawer> {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.placement = options.placement
  el.draggable = true
  // 关掉它就测不到「端头热边有没有压住抽屉自带的关闭按钮」——那正是 A6 保护的东西。
  el.closable = true
  el.style.setProperty('--wui-drawer-width', SMALL_SIDE)
  el.style.setProperty('--wui-drawer-height', SMALL_SIDE)
  if (options.thickness !== undefined) {
    el.style.setProperty('--wui-drawer-drag-bar-thickness', `${options.thickness}px`)
  }
  if (options.length !== undefined) {
    el.style.setProperty('--wui-drawer-drag-bar-length', `${options.length}px`)
  }
  if (options.space4 !== undefined) {
    // space-4 同时喂给 header padding 与 close top，二者一起动才覆盖到真实的联动。
    el.style.setProperty('--wui-space-4', `${options.space4}px`)
  }
  el.innerHTML = [
    /*
     * 结构照 PreviewDrawer 的窄屏 header 写（flex + items-center + 标题 flex-1），并额外放两个
     * 消费侧按钮：**只盯内置关闭按钮是不够的**，端头热边早前是满宽的，凡是落在那条带里的
     * 东西一律被吃，关按钮并不特殊（实测两者被吃的比例一致）。这两个按钮站在真实位置上
     * ——header 的两端——而把手占据的是中线那一段。
     */
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
 * 两个矩形**相交部分的面积**。
 *
 * 不用网格采样算比例：第一版探针用 5x5 采样，在 thickness 16 上把真实 14% 的重叠
 * 报成了 0%——采样点恰好落在重叠区外一列，于是「没被吃」成立、「被吃了 14%」不成立。
 * 采样既能漏报也能多报，不适合当判据；矩形相交是解析式的，没有采样点可漏。
 */
function overlapArea(a: DOMRect, b: DOMRect): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

/** 控件被热边压掉的面积占比，四舍五入到千分之一，好让失败信息直接可读。 */
function eatenFraction(edge: DOMRect, control: DOMRect): number {
  const total = control.width * control.height
  return total === 0 ? 0 : Math.round((overlapArea(edge, control) / total) * 1000) / 1000
}

/** `--wui-drawer-drag-bar-thickness` 是公开 token，粗把手是可访问性场景下的自然选择。 */
const THICKNESS_MATRIX = [4, 16, 24, 40]
/** `--wui-space-4` 同时决定 header padding 与 close top，压缩它会压缩按钮的上移量。 */
const SPACE_4_MATRIX = [16, 8, 4]

/**
 * 面板内缘到胶囊**近侧**的距离。负值表示胶囊有一截落在面板之外（dialog 是 overflow: visible）。
 */
function insetFromGrabEdge(placement: DrawerPlacement, bar: DOMRect, dialog: DOMRect): number {
  switch (placement) {
    case 'right':
      return bar.left - dialog.left
    case 'left':
      return dialog.right - bar.right
    case 'top':
      return dialog.bottom - bar.bottom
    case 'bottom':
      return bar.top - dialog.top
  }
}

/**
 * 读胶囊背景的不透明度。`color-mix` 的计算值在 Chromium 上序列化为 `color(srgb r g b / a)`，
 * 其余引擎走 `rgba(...)`，两种都收。认不出时返回 NaN，由上层用一条显式断言挡住，
 * 而不是悄悄跳过档位比较——那会让「确认态压过 hover」这条判据在解析失败时无声消失。
 */
function barOpacity(el: WebUiDrawer): number {
  const value = getComputedStyle(getDragBar(el)).backgroundColor
  const alpha = value.match(/\/\s*([\d.]+)\s*\)/) ?? value.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/)
  return alpha ? Number.parseFloat(alpha[1]) : Number.NaN
}

/**
 * 按下热区并拖过关闭阈值，**不松手**——`is-drag-close` 在 onEnd 里就被摘掉，
 * 断言确认态必须在手势仍然按住时读。合成事件直接派发到热区，只有相对位移参与判定。
 *
 * 分 10 段走：判定零点在首个 pointermove 校准，单次 move 的整程位移会被它整体吸收。
 */
async function pressAndDragPastThreshold(el: WebUiDrawer, placement: DrawerPlacement) {
  const zone = getDragZone(el)
  const startX = 400
  const startY = 300
  // 位移正方向 = 闭合方向（见 index.ts 的 _dragCloseSign）。
  const delta = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1] }[placement]
  const fire = (x: number, y: number) =>
    zone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
    )

  zone.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      clientX: startX,
      clientY: startY
    })
  )
  await el.updateComplete
  for (let step = 1; step <= 10; step += 1) {
    fire(startX + (delta[0] * DRAG_DISTANCE * step) / 10, startY + (delta[1] * DRAG_DISTANCE * step) / 10)
    await new Promise(resolve => setTimeout(resolve, 32))
  }
  await el.updateComplete
}

function releaseDrag(el: WebUiDrawer) {
  getDragZone(el).dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 400, clientY: 300 })
  )
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer 胶囊贴边（浏览器）', () => {
  it('bottom placement + header：胶囊贴回面板上边缘，热区仍让开 header（核心判据）', async () => {
    const el = await mountDrawer({ placement: 'bottom', header: true })
    const dialog = getDialog(el).getBoundingClientRect()
    const bar = getDragBar(el).getBoundingClientRect()
    const header = el.shadowRoot?.querySelector('.wui-drawer-header')?.getBoundingClientRect()
    const zone = getDragZone(el).getBoundingClientRect()

    const inset = insetFromGrabEdge('bottom', bar, dialog)
    expect(inset, `胶囊距面板上边缘 ${inset}px（dialog.top=${dialog.top} bar.top=${bar.top}）`).toBeLessThanOrEqual(
      EDGE_INSET_MAX
    )
    // 两个约束必须**同时**成立，这正是不能靠调数值解决的那一对。
    expect(zone.top, `热区 top=${zone.top} header bottom=${header?.bottom}`).toBeGreaterThanOrEqual(
      header!.bottom - EPS
    )
  })

  it('top placement + footer：胶囊贴回面板下边缘', async () => {
    const el = await mountDrawer({ placement: 'top', footer: true })
    const dialog = getDialog(el).getBoundingClientRect()
    const bar = getDragBar(el).getBoundingClientRect()

    const inset = insetFromGrabEdge('top', bar, dialog)
    expect(
      inset,
      `胶囊距面板下边缘 ${inset}px（dialog.bottom=${dialog.bottom} bar.bottom=${bar.bottom}）`
    ).toBeLessThanOrEqual(EDGE_INSET_MAX)
  })

  it('top placement + footer：胶囊不劫持 footer 区域的命中', async () => {
    const el = await mountDrawer({ placement: 'top', footer: true })
    const bar = getDragBar(el)
    const edge = getDragEdge(el)!
    const footer = el.shadowRoot!.querySelector('.wui-drawer-footer') as HTMLElement
    const footerRect = footer.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()

    // 「避开 footer」只能在命中层面成立：footer 的盒子按构造就顶到面板边缘
    // （flex 列布局的最后一项），胶囊贴边必然落在它上面。真正要保的是 footer 的控件可点，
    // 与 A6 保护热区的那条判据同源。
    expect(getComputedStyle(bar).pointerEvents, '胶囊必须不参与命中测试').toBe('none')

    /*
     * 探针取**胶囊带与 footer 盒的交集**里的一点，不是 footer 中线——中线不在那条带上，
     * 在那里问只会问到一个与胶囊无关的元素，断言与胶囊无关地成立。
     *
     * 早前这版还有第二重恒真：它用 `document.elementFromPoint`，而本文件头就写着
     * 那种问法会把结果重定向到 shadow host（问出来的 className 恒为空字符串），
     * 于是「footer 中线处仍命中胶囊」在胶囊实实在在压住 footer 时照样绿。
     * 两层都是同一个错——**断言在缺陷存在时仍然通过**。
     *
     * 现在问的是「footer 区域里真正压在那条带上的东西」：必须是端头热边，不能是胶囊。
     * 胶囊的 pointer-events 一旦不是 none，同一个点立刻返回 `.wui-drawer-drag-bar`。
     */
    const overlapTop = Math.max(barRect.top, footerRect.top)
    const overlapBottom = Math.min(barRect.bottom, footerRect.bottom)
    // 前提要**两轴同证**：胶囊带在水平方向不与 footer 盒相交、纵向仍相交时，
    // x 的算式会落到两者之外，问到的是胶囊带旁边某个无辜元素。
    // 它**仍然会红**——热边与胶囊的水平跨度逐字相同（同一个 left 算式、同一个 width，
    // 见 style.css 里这两条规则），x 既然出了胶囊带就必然出了热边带，`toBe(edge)`
    // 一定不成立。这里要换的不是「会不会红」，而是红在哪：
    // 不加横向守卫就红在命中判据上、信息指向一个无辜元素；加了才红在
    // 「前提本就不成立」上，并把两轴数值留在失败信息里作诊断。
    expect(
      overlapArea(barRect, footerRect),
      `胶囊带与 footer 盒没有两轴重叠，本用例失去前提（纵向 ${overlapBottom - overlapTop}px，横向 ${Math.min(barRect.right, footerRect.right) - Math.max(barRect.left, footerRect.left)}px）`
    ).toBeGreaterThan(0)
    const x = (Math.max(barRect.left, footerRect.left) + Math.min(barRect.right, footerRect.right)) / 2
    const y = (overlapTop + overlapBottom) / 2

    const hit = hitTestAt(el, x, y)
    expect(
      hit,
      `footer 区域 (${Math.round(x)}, ${Math.round(y)}) 处命中的是 ${hit?.className || hit?.tagName}，不是端头热边`
    ).toBe(edge)
  })

  it('胶囊排在所有热区之后，通用兄弟选择器在四个 placement 上都成立', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const bar = getDragBar(el)
      // 三条配色规则全部挂在 `~` 上；一旦热区排在胶囊之后，hover/active/确认态会静默失效。
      // 端头热边插在中间（上下 placement 才有），`+` 在这里已经不成立，必须靠 `~`。
      for (const surface of [getDragEdge(el), getDragZone(el)]) {
        if (!surface) continue
        expect(
          bar.matches(`.${surface.className.split(' ')[0]} ~ .wui-drawer-drag-bar`),
          `${placement} ${surface.className} 到胶囊的通用兄弟选择器不匹配`
        ).toBe(true)
        expect(
          surface.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING,
          `${placement} ${surface.className} 没有排在胶囊之前`
        ).toBeTruthy()
      }
      expect(getDragZone(el).nextElementSibling, `${placement} 胶囊未紧跟让开量热区`).toBe(bar)
      // 胶囊是最后一个拖拽节点：`~` 因此从两条热区都能走到它，且不会被后续节点插断。
      expect(bar.nextElementSibling, `${placement} 胶囊后面还有节点，通用兄弟选择器不再覆盖后续节点`).toBeNull()
      el.remove()
    }
  })
})

describe('WebUiDrawer 胶囊配色状态（浏览器）', () => {
  it('悬停热区点亮胶囊', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement })
      const rest = getComputedStyle(getDragBar(el)).backgroundColor
      // 必须真实指针：合成事件不触发 :hover（Chrome 只对真实输入设置该原生状态）。
      await userEvent.hover(getDragZone(el))
      expect(getDragZone(el).matches(':hover'), `${placement} 真实指针未落在热区上，hover 判据无法成立`).toBe(true)
      const hovered = getComputedStyle(getDragBar(el)).backgroundColor
      expect(hovered, `${placement} 悬停热区胶囊不变色（rest=${rest}）`).not.toBe(rest)
      el.remove()
    }
  })

  it('拖到关闭阈值时胶囊进入确认态', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement })
      const rest = getComputedStyle(getDragBar(el)).backgroundColor
      const restOpacity = barOpacity(el)

      await pressAndDragPastThreshold(el, placement)
      expect(getDialog(el).classList.contains('is-drag-close'), `${placement} 未进入确认态`).toBe(true)
      const confirmed = getComputedStyle(getDragBar(el)).backgroundColor

      // 静息 -> 确认 这一跳单独验：它证明确认态那条选择器真的匹配得到胶囊。
      // 早前它写成后代选择器，胶囊拆成兄弟后不报错、只是静默停在这一档。
      expect(confirmed, `${placement} 进入确认态但胶囊不变色（rest=${rest}）`).not.toBe(rest)
      expect(restOpacity, `${placement} 静息态背景不透明度解析失败`).not.toBeNaN()
      const confirmedOpacity = barOpacity(el)
      expect(confirmedOpacity, `${placement} 确认态不够实（rest=${restOpacity}）`).toBeGreaterThan(restOpacity)
      releaseDrag(el)
      el.remove()
    }
  })

  it('从端头热边起手拖过阈值，胶囊同样进入确认态（确认态规则只挂在热区，不区分谁起手）', async () => {
    /*
     * 既有确认态用例全部从**热区**起手（pressAndDragPastThreshold 直接往热区派发事件），
     * 这条覆盖的是**从端头热边起手的端到端路径**：胶囊坐标起手 → 真实命中测试确认落在
     * 哪条热层 → 手势跟手拖过阈值 → 胶囊实际变色。
     *
     * 这条路径是结构拆分之后才有的：胶囊从热区的后代变成 dialog 的直接子节点之前，
     * 从边缘起手不构成一条独立路径。所以它不是补覆盖率，是随新路径一起产生的义务。
     *
     * 之所以盯配色、而不只是看 `is-drag-close` 类在不在：确认态选择器挂在**热区**上，
     * 若哪天被改成只认另一条热层，从胶囊起手就会静默停在这一档——不报错、只是不显形，
     * 与 R6 那三条配色规则同型。
     */
    for (const placement of ['top', 'bottom'] as DrawerPlacement[]) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const rest = getComputedStyle(getDragBar(el)).backgroundColor

      await pressDragFromCapsule(el, placement)
      expect(getDialog(el).classList.contains('is-drag-close'), `${placement} 从端头热边起手未进入确认态`).toBe(true)
      const confirmed = getComputedStyle(getDragBar(el)).backgroundColor
      expect(confirmed, `${placement} 从端头热边起手进入确认态但胶囊不变色（rest=${rest}）`).not.toBe(rest)
      releaseDrag(el)
      el.remove()
    }
  })

  it('悬停与确认态同时成立时确认态胜出（靠特异性，不靠书写顺序）', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement })
      await userEvent.hover(getDragZone(el))
      expect(getDragZone(el).matches(':hover'), `${placement} 真实指针未落在热区上，级联判据无法成立`).toBe(true)

      const hovered = getComputedStyle(getDragBar(el)).backgroundColor
      const hoveredOpacity = barOpacity(el)

      /*
       * 这里直接置上确认态，而不是再走一次手势：拖拽期间面板跟手平移，热区会从静止的
       * 指针底下滑走，`:hover` 随之失效；反过来先悬停再合成拖拽，那条真实 pointermove
       * 会把合成手势收尾掉、确认态当场被摘掉。真实手势在 headless 里造不出「悬停 +
       * 确认态」同时成立的那一帧，于是把两个条件直接合成。
       *
       * 验的正是级联本身：两条规则此刻同时匹配，确认态必须压过 hover/active。
       * 若确认态选择器被缩写成 `dialog.is-drag-close .wui-drawer-drag-bar`（(0,2,1)），
       * 就会被 hover/active 的 (0,3,0) 压过，这一跳会退回同色而失败。
       */
      getDialog(el).classList.add('is-drag-close')
      const confirmed = getComputedStyle(getDragBar(el)).backgroundColor

      expect(confirmed, `${placement} 确认态未压过悬停态（两者同为 ${hovered}）`).not.toBe(hovered)
      expect(hoveredOpacity, `${placement} 悬停态背景不透明度解析失败`).not.toBeNaN()
      const confirmedOpacity = barOpacity(el)
      expect(confirmedOpacity, `${placement} 确认态不够实（hover=${hoveredOpacity}）`).toBeGreaterThan(hoveredOpacity)
      el.remove()
    }
  })
})

describe('WebUiDrawer 端头热边（浏览器）', () => {
  /*
   * R1（胶囊贴边）与 R3（热区让开 header/footer）在几何上本就不可同满足：胶囊带 [8,12]
   * 与热区带 [60,80] 恒不相交。结构解耦让两者不再互相位移，但**没有解决命中**——
   * 胶囊落到让开区里就成了按不下去、悬停不亮的死装饰，正是 Reviewer 判的 Block。
   * 端头热边补的就是这一段，判据全部从胶囊坐标出发、经真实命中测试。
   */

  it('四个 placement 下从胶囊坐标起手都能进入拖拽（Block 判据）', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const { enteredDragging, target } = await pressDragFromCapsule(el, placement)
      expect(enteredDragging, `${placement} 从胶囊坐标按下没有进入 is-dragging（命中 ${target?.className}）`).toBe(true)
      expect(getDialog(el).classList.contains('is-drag-close'), `${placement} 越过阈值未进入确认态`).toBe(true)
      releaseDrag(el)
      el.remove()
    }
  })

  it('胶囊中心命中的是热层，不是 header / footer（同时钉住 z-index 意图）', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const { x, y } = capsuleCenter(el)
      const hit = hitTestAt(el, x, y)
      /*
       * 这一条是 Reviewer 提的最省事守门人。**它是约定而非正确性依赖**：胶囊
       * `pointer-events: none` 会把它整个移出命中测试，所以 5 / 4 / 3 / auto 四种
       * z-index 取值下这里都恒为热层。钉它是为了让「胶囊盖住热层」这条意图不再无人看守，
       * 注释里写明它当前没有行为后果——将来若有人摘掉 pointer-events: none，
       * 它才会真的变成正确性判据。
       */
      expect(isDragSurface(el, hit), `${placement} 胶囊中心命中 ${hit?.className || hit?.tagName}`).toBe(true)
      el.remove()
    }
  })

  it('端头热边吃掉触摸手势（touch-action: none），否则胶囊上的竖向滑动会变成页面滚动', async () => {
    /*
     * 端头热边是上下 placement 下**胶囊所在那条带的唯一命中层**，也正是本 PR 把胶囊
     * 移进去的位置。少了 `touch-action: none`，触摸端从胶囊起手的竖向滑动会被浏览器
     * 判成页面滚动而不是拖抽屉——胶囊看得见、点得中，滑动却不跟手。
     *
     * 归这条带管而不是归胶囊管：胶囊 `pointer-events: none`，根本不在命中链路上。
     * 同一文件的 nested-lower 用例早就断言了它的 `pointerEvents`，唯独 `touchAction`
     * 一直是零覆盖——覆盖不对称的地方就是下一次静默回归的入口。
     */
    for (const placement of ['top', 'bottom'] as DrawerPlacement[]) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      expect(getComputedStyle(getDragEdge(el)!).touchAction, `${placement} 端头热边没有吃掉触摸手势`).toBe('none')
      el.remove()
    }
  })

  it('端头热边从面板边缘起算，且按构造覆盖胶囊所在的那条带', async () => {
    for (const placement of ['top', 'bottom'] as DrawerPlacement[]) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const dialog = getDialog(el).getBoundingClientRect()
      const edge = getDragEdge(el)!.getBoundingClientRect()
      const bar = getDragBar(el).getBoundingClientRect()

      // 从可抓取边缘起算，不留空隙。
      // 热边贴的是「可抓取那一侧」：bottom 贴上面，top 贴下面。
      const edgeStart = placement === 'bottom' ? edge.top : edge.bottom
      const panelStart = placement === 'bottom' ? dialog.top : dialog.bottom
      expect(Math.abs(edgeStart - panelStart), `${placement} 热边没有从面板边缘起算`).toBeLessThanOrEqual(EPS)

      // 覆盖关系由 token 定义推出（中线下限保证 `中线 - 半个厚度 ≥ 4 > 0`），
      // 这里把它钉住：胶囊带一旦跑到热边之外，就是死装饰。
      expect(Math.min(edge.top, edge.bottom), `${placement} 热边未覆盖胶囊近侧`).toBeLessThanOrEqual(
        Math.min(bar.top, bar.bottom) + EPS
      )
      expect(Math.max(edge.top, edge.bottom), `${placement} 热边未覆盖胶囊远侧`).toBeGreaterThanOrEqual(
        Math.max(bar.top, bar.bottom) - EPS
      )
      el.remove()
    }
  })

  it('端头热边的水平足迹等于胶囊的沿边长轴，且两端都不顶到面板边缘', async () => {
    /*
     * 本轮返工的核心不变量。端头热边早前是**满宽**的，于是横扫 header 整个宽度：
     * 实测 thickness 24 时内置关闭按钮与消费侧左右按钮各被吃 40%、40px 时各 100%。
     * 关闭按钮从来不是特例——**满宽才是病根**。收窄到胶囊那条跨度之后，安全性不再
     * 依赖任何单个控件的位置，而是「热边代表谁，就不许比谁大」。
     *
     * 上下 placement 的胶囊是横躺的（width = length、height = thickness），所以热边的
     * 宽度直接等于胶囊的宽度——两者取的是同一个 `--wui-drawer-drag-bar-length`，
     * 中心也必须重合。
     */
    for (const placement of ['top', 'bottom'] as DrawerPlacement[]) {
      for (const thickness of THICKNESS_MATRIX) {
        const el = await mountDrawer({ placement, header: true, footer: true, thickness })
        const dialog = getDialog(el).getBoundingClientRect()
        const edge = getDragEdge(el)!.getBoundingClientRect()
        const bar = getDragBar(el).getBoundingClientRect()

        expect(
          edge.width,
          `${placement}/thk=${thickness} 热边宽度 ${edge.width} 与胶囊沿边长轴 ${bar.width} 不等`
        ).toBeCloseTo(bar.width, 1)
        expect(
          Math.abs(edge.left + edge.width / 2 - (bar.left + bar.width / 2)),
          `${placement}/thk=${thickness} 热边与胶囊中心不重合`
        ).toBeLessThanOrEqual(EPS)
        // 真正咬住「回退成满宽」的那两条：满宽时这两个数都等于面板宽度。
        expect(edge.left, `${placement}/thk=${thickness} 热边顶到面板左边缘`).toBeGreaterThan(dialog.left + EPS)
        expect(edge.right, `${placement}/thk=${thickness} 热边顶到面板右边缘`).toBeLessThan(dialog.right - EPS)
        el.remove()
      }
    }
  })

  it('端头热边不吃 header 里的任何控件：token 矩阵 × 精确相交面积（Block 判据）', async () => {
    /*
     * 上一轮那条「热边 bottom ≤ 关闭按钮 top」是**默认 token 下的恒真断言**——
     * thickness 一调大就失效，而 `--wui-drawer-drag-bar-thickness` 就在 README 的
     * token 表里（粗把手是可访问性场景下的自然选择），缺陷存在时断言照样绿。
     * 这里改成两条 token 全排列 × **矩形相交面积**，并在面积之外再走一次真实命中测试：
     * 面积说「没被压到」，命中说「那条射线真的打在控件自己身上」。
     */
    for (const thickness of THICKNESS_MATRIX) {
      for (const space4 of SPACE_4_MATRIX) {
        const el = await mountDrawer({ placement: 'bottom', header: true, thickness, space4 })
        const edge = getDragEdge(el)!.getBoundingClientRect()
        const consumerActions = (['start', 'end'] as const).map(
          side =>
            [
              `消费侧${side}按钮`,
              el.querySelector(`[data-role="consumer-action"][data-side="${side}"]`) as HTMLElement
            ] as [string, HTMLElement]
        )
        const controls: Array<[string, HTMLElement]> = [
          ['内置关闭按钮', el.shadowRoot!.querySelector('.wui-drawer-close') as HTMLElement],
          ...consumerActions
        ]
        for (const [name, control] of controls) {
          const rect = control.getBoundingClientRect()
          const label = `thk=${thickness} sp4=${space4} ${name}`
          expect(rect.width * rect.height, `${label} 没有实际尺寸，测不到东西`).toBeGreaterThan(0)
          const eaten = eatenFraction(edge, rect)
          expect(
            eaten,
            `${label} 被热边吃掉 ${(eaten * 100).toFixed(1)}%（${Math.round(overlapArea(edge, rect))}px²）`
          ).toBe(0)
          const hit = hitTestAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
          expect(
            hit === control || control.contains(hit!),
            `${label} 中心命中的是 ${hit?.className || hit?.tagName}`
          ).toBe(true)
        }
        el.remove()
      }
    }
  })

  it('footer 侧对称成立（取矩阵里最极端的一格）', async () => {
    const el = await mountDrawer({ placement: 'top', footer: true, thickness: 40, space4: 4 })
    const edge = getDragEdge(el)!.getBoundingClientRect()
    const button = el.querySelector('div[slot="footer"] button') as HTMLElement
    const rect = button.getBoundingClientRect()
    expect(eatenFraction(edge, rect), `footer 按钮被热边吃掉 ${Math.round(overlapArea(edge, rect))}px²`).toBe(0)
    const hit = hitTestAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(hit === button || button.contains(hit!), `footer 按钮中心命中的是 ${hit?.className || hit?.tagName}`).toBe(
      true
    )
  })

  it('把手跨度正中的控件让不开，唯一的杠杆是缩短把手（把已知边界钉成事实）', async () => {
    /*
     * 收窄解决的是「控件在跨度之外」那一类。跨度**之内**（胶囊画着的那一段）让不开：
     * 热边必须覆盖胶囊，所以不能比胶囊窄；而胶囊就画在那里。
     *
     * 这不是新引入的冲突——thickness 40 时胶囊自身（面板边缘往下 4→44）已经压在 header
     * 内容上，热边只是把「胶囊盖住的地方」一并变成可拖。README 已写进已知边界。
     *
     * 这里钉两件事，缺一不可：
     *   1. 默认确实被盖住。不钉的话，这条边界会以「已经修好了」的形态留在代码里，
     *      下一个人看到满宽时代的注释会以为跨度内也是安全的。
     *   2. 唯一有效的杠杆是 `--wui-drawer-drag-bar-length`——它同时决定胶囊长度与热边宽度。
     *      写进 README 的建议必须可验证，否则就是一句没人验过的承诺。
     *
     * 顺带把两条**走不通**的路记在这里，省得下一个人再量一遍：
     *   · 给控件抬 z-index ≥ 5：无效。Chromium 里端头热边始终压在 slotted 节点之上，
     *     给 h2、给它外层的 `[slot="header"]` 容器都试过，命中结果一个字节没变。
     *     （组件自己画的 shadow 节点抬 z-index 是有效的，见上面那条兜底断言。）
     *   · 靠 space-4 / thickness 让开：只改高度，改不了「带必须覆盖胶囊」这件事。
     */
    const el = await mountDrawer({ placement: 'bottom', header: true, thickness: 40 })
    const title = el.querySelector('[slot="header"] h2') as HTMLElement
    const edgeOf = () => getDragEdge(el)!.getBoundingClientRect()

    let edge = edgeOf()
    let titleRect = title.getBoundingClientRect()
    // 取「热边 ∩ 标题」那一块的中心，两条断言共用同一个点。
    const overlapTop = Math.max(edge.top, titleRect.top)
    const overlapBottom = Math.min(edge.bottom, titleRect.bottom)
    expect(
      overlapBottom - overlapTop,
      `把手跨度内的标题与热边没有重叠，本用例失去前提（edge=${edge.top}-${edge.bottom} title=${titleRect.top}-${titleRect.bottom}）`
    ).toBeGreaterThan(0)
    const x = titleRect.left + titleRect.width / 2
    const y = (overlapTop + overlapBottom) / 2
    expect(hitTestAt(el, x, y), '跨度内的控件默认仍可点，说明本用例的前提不成立').toBe(getDragEdge(el))

    // 杠杆：同一个 token 同时缩短胶囊与热边，把中线让出来。
    el.style.setProperty('--wui-drawer-drag-bar-length', '0px')
    await settleGeometry(el)
    edge = edgeOf()
    titleRect = title.getBoundingClientRect()
    expect(edge.width, `缩短 length 之后热边仍有 ${edge.width} 宽`).toBe(0)
    expect(overlapArea(edge, titleRect), `缩短 length 之后热边仍与标题重叠`).toBe(0)
    const hit = hitTestAt(el, x, y)
    expect(hit === title || title.contains(hit!), `缩短 length 之后命中的是 ${hit?.className || hit?.tagName}`).toBe(
      true
    )
  })

  it('把手长到压住关闭按钮时，靠层序保住按钮（几何失效那一格）', async () => {
    /*
     * 收窄之后，默认与常规 token 下热边与关闭按钮的相交面积恒为 0，正常情形靠几何就够。
     * 这一条覆盖的是几何**失效**的那一格：`--wui-drawer-drag-bar-length` 也在公开
     * token 表里，调到把手伸到按钮所在的位置时相交面积不为 0（实测 320px 时 78px²）。
     * 那时唯一还能救的就是层序。
     *
     * 先断言相交面积 > 0，否则下面的命中断言是空转的——这条不是恒真断言：
     * 把 `.wui-drawer-close` 的 z-index 改回 3，同一个点立刻命中热边。
     */
    const el = await mountDrawer({ placement: 'bottom', header: true, thickness: 40, length: 320 })
    const edge = getDragEdge(el)!.getBoundingClientRect()
    const close = el.shadowRoot!.querySelector('.wui-drawer-close') as HTMLElement
    const closeRect = close.getBoundingClientRect()

    expect(overlapArea(edge, closeRect), '这一格没有相交，兜底断言测不到任何东西').toBeGreaterThan(0)
    const x = (Math.max(edge.left, closeRect.left) + Math.min(edge.right, closeRect.right)) / 2
    const y = closeRect.top + closeRect.height / 2
    const hit = hitTestAt(el, x, y)
    expect(hit === close || close.contains(hit!), `热边压住关闭按钮时命中的是 ${hit?.className || hit?.tagName}`).toBe(
      true
    )
  })

  it('端头热边不劫持 footer 的控件（「避开 footer」的可判定含义）', async () => {
    // 「几何上避开 footer」不可满足：footer 是 flex 列最后一项，盒子按构造顶到面板边缘，
    // 胶囊贴边必然落在它上面（同 R2 的论证）。可判定的是**控件仍可点**。
    const el = await mountDrawer({ placement: 'top', footer: true })
    const button = el.querySelector('div[slot="footer"] button') as HTMLElement
    const rect = button.getBoundingClientRect()
    const hit = hitTestAt(el, rect.left + rect.width / 2, rect.top + rect.height / 2)
    expect(hit === button || button.contains(hit!), `footer 按钮中心命中的是 ${hit?.className || hit?.tagName}`).toBe(
      true
    )
    expect(getDragBar(el).contains(hit!), 'footer 控件命中了胶囊').toBe(false)
  })

  it('左右 placement 不渲染端头热边（胶囊本就落在热区内）', async () => {
    for (const placement of ['right', 'left'] as DrawerPlacement[]) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      expect(getDragEdge(el), `${placement} 多渲染了端头热边`).toBeNull()
      // R5 的几何前提：左右两条的胶囊仍由热区本身覆盖。
      const { x, y } = capsuleCenter(el)
      expect(hitTestAt(el, x, y), `${placement} 胶囊中心没有命中层`).toBe(getDragZone(el))
      el.remove()
    }
  })

  it('嵌套下层时胶囊与端头热边一起退场', async () => {
    // 两条规则都是拆结构的必然产物：早前胶囊是热区的后代，被热区那条 opacity 顺带盖住；
    // 拆成兄弟后必须逐条显式列出。Reviewer 的变异 m6（删掉胶囊那条）一路存活，
    // 实测后果是下层抽屉剩一条悬空胶囊——热边同理，且悬空热边比悬空胶囊更费解。
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
    child.open = true
    await child.updateComplete
    await pollUntil(() => getDialog(parent).classList.contains('is-nested-lower'), 'lower layer not marked')
    await new Promise(resolve => setTimeout(resolve, 250))

    const bar = getDragBar(parent)
    const edge = getDragEdge(parent)!
    expect(getComputedStyle(bar).opacity, '下层抽屉的胶囊没有退场').toBe('0')
    expect(getComputedStyle(edge).opacity, '下层抽屉的端头热边没有退场').toBe('0')
    expect(getComputedStyle(edge).pointerEvents, '下层抽屉的端头热边仍吃事件').toBe('none')
  })
})

describe('WebUiDrawer 胶囊配色（从胶囊所在位置悬停）', () => {
  it('悬停胶囊所在的位置点亮胶囊，四个 placement 一致', async () => {
    for (const placement of PLACEMENTS) {
      const el = await mountDrawer({ placement, header: true, footer: true })
      const rest = getComputedStyle(getDragBar(el)).backgroundColor
      // 悬停目标取「那个坐标上真正的命中层」，并验它的中心落在胶囊的横向范围内——
      // 于是这条断言的语义就是「悬停胶囊被画出来的那个位置」。
      const surface = getDragEdge(el) ?? getDragZone(el)
      const rect = surface.getBoundingClientRect()
      const barRect = getDragBar(el).getBoundingClientRect()
      expect(rect.left, `${placement} 悬停点不在胶囊横向范围内`).toBeLessThanOrEqual(barRect.right)
      expect(rect.right, `${placement} 悬停点不在胶囊横向范围内`).toBeGreaterThanOrEqual(barRect.left)

      await userEvent.hover(surface)
      expect(surface.matches(':hover'), `${placement} 真实指针未落在 ${surface.className} 上`).toBe(true)
      const hovered = getComputedStyle(getDragBar(el)).backgroundColor
      /*
       * 这条断言**推翻了改造中途钉过的一个约定**：当时认定「有 header / footer 时悬停
       * 胶囊位置不点亮胶囊」更正确。Reviewer 指出那恰好是本 PR 的目标场景，在那里它是
       * 纯粹的功能倒退——用户看着胶囊，碰它却没反应。只钉前半边会把「永不点亮」写成
       * 正确行为，所以这里钉的是**四个 placement 一致点亮**。
       */
      expect(hovered, `${placement} 悬停胶囊位置胶囊不变色（rest=${rest}）`).not.toBe(rest)
      expect(barOpacity(el), `${placement} 悬停态背景不透明度解析失败`).not.toBeNaN()
      el.remove()
    }
  })
})
