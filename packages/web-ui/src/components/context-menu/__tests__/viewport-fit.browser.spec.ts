import '..'
import '@/components/dropdown-item'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getMenuPanels, waitForUpdate } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

/*
 * 贴视口边缘打开时，menu 不得越出视口（浏览器）。
 *
 * 缺陷形态（实测，非推理）：定位当时用 `panel.getBoundingClientRect()` 取宽高来算夹取，
 * 但 panel 此刻正带着进场动画 `transform: scale(var(--wui-scale-enter, 0.9))`
 * （assets/overlay-motion.css:40）。
 * rect 含 transform，于是夹取按**缩小 10%** 的尺寸来算：
 *
 *   menu 实际高 456px → 夹取时量到 456 × 0.9 = 410.4px
 *   → top = 896 − 410.4 − 8 = 477.6px
 *   → 动画落定 scale 回到 1，真实底部 = 477.6 + 456 = 933.6px
 *   → 越出视口下缘 896px 共 37.6px
 *
 * 上列数字按 `--wui-scale-enter: 0.9` 换算得出。实测的是同一组输入（456px menu、896px
 * 视口、8px 边距）与缺陷形态，算式也没变，只是缩放档位从 5% 变成 10%。
 *
 * panel 自身 `overflow-y: hidden`，越出去的那一截不会被滚动救回来——最下面一项直接点不到。
 *
 * **横向是同一个缺陷**：夹取的宽高取自同一个 rect，所以贴右缘打开时横向也少算了 10% 宽度，
 * 右缘同样越界。两个方向各有守卫——只钉纵向的话，改回 getBoundingClientRect 时横向回归
 * 无人发现（而横向确实发生过，见用例）。
 *
 * 判据取「panel 底边不超过视口下缘」这条行为约束，不钉某个像素值：padding 是 8px 的实现常量，
 * 钉死它会让日后调 padding 变成改测试。
 *
 * 必须 browser mode：整个缺陷就是 transform 污染 rect 读数，jsdom 既无布局也无 transform。
 *
 * 定位改成 Floating UI（`computePosition` + `flip` / `shift`）之后「夹取」不再由本组件
 * 手算，而是翻转到触发点上方、下缘精确对齐触发点。这批断言按**新契约**改写：竖直方向
 * 的等式从「贴视口下缘 − 边距」换成「下缘 == 触发点 y」，横向的等式不变（仍由 shift 夹取）。
 */
afterEach(() => document.body.replaceChildren())

/** 边距，与 `_positionMenuInViewport` 的夹取常量同源，仅用于给断言留容差。 */
const EDGE_PADDING = 8

function menuItems(count: number): string {
  return Array.from({ length: count }, (_, i) => `<web-ui-dropdown-item>Item ${i}</web-ui-dropdown-item>`).join('')
}

/** 在指定落点 openAt，返回落定后的 panel 矩形与触发点坐标。 */
async function openAtEdge(
  itemCount: number,
  x: number,
  y: number
): Promise<{ rect: DOMRect; anchor: { x: number; y: number } }> {
  const el = document.createElement('web-ui-context-menu') as WebUiContextMenu
  el.innerHTML = menuItems(itemCount)
  document.body.appendChild(el)
  await waitForUpdate(el)

  el.openAt(x, y)
  // 等进场过渡落定：缺陷恰恰只在 scale 回到 1 之后才显形，中途量到的是动画帧。
  await new Promise(resolve => setTimeout(resolve, 400))

  // panel 挂在 overlay root 的 shadow 里，document.querySelector 穿不过去，必须用共享定位器。
  const panel = getMenuPanels('Context menu')[0]
  if (!panel) throw new Error('上下文 menu panel 未渲染')
  return { rect: panel.getBoundingClientRect(), anchor: { x, y } }
}

describe('WebUiContextMenu 贴视口边缘的夹取（浏览器）', () => {
  it('高 menu 贴下缘打开时，底边不越出视口', async () => {
    const { rect } = await openAtEdge(14, 200, window.innerHeight - 10)

    expect(
      rect.bottom,
      `menuTop=${rect.top} menuHeight=${rect.height} innerHeight=${window.innerHeight}`
    ).toBeLessThanOrEqual(window.innerHeight)
  })

  it('放不下时翻转到触发点上方，下缘按未缩放的尺寸精确对齐触发点', async () => {
    const { rect, anchor } = await openAtEdge(14, 200, window.innerHeight - 10)

    // 新契约：panel 下缘 == 触发点 y（flip 到 top-start 的直接后果）。
    // 进场 scale 若被算进夹取，落定后的下缘会落到 `触发点 + 0.1 × menu 高`——
    // 实测 456px 高的 menu 按此偏低 0.1 × 456 = 45.6px，正好压在触发点上、盖住用户按的那一行。
    //
    // 余量只有 2px、容差 1px，但这 2px 是**用例自己写死的**，不是实现抖动：判别的两个解
    // 相差正好是「锚点 y」与「innerHeight − 边距」之差 =（innerHeight − 10）−（innerHeight − 8）
    // = 2px。翻转态的解是「下缘 == 锚点 y」（实测 0 偏差）；不翻转时 shift 会把下缘推到
    // innerHeight − 边距，于是差 2px。**别把落点从 `innerHeight − 10` 往上挪**：改成 −9
    // 会让余量塌到 1px、与容差相等，这条就失去判别力了。
    expect(
      Math.abs(rect.bottom - anchor.y),
      `menuBottom=${rect.bottom} 期望=${anchor.y}（按 menuHeight=${rect.height} 反推）`
    ).toBeLessThanOrEqual(1)
  })

  /*
   * 钉「flip 不许改对齐量」这一条防护。
   *
   * 为什么不能只靠「panel 在视口内」：那两条断言恒真 —— 无论 flip 把对齐量改成 `-end`、还是
   * 对齐量不变由 shift 推回来，panel 都在视口内。区分两者需要一个真正会变的可观测量。
   *
   * 落点退开 150px（取 `innerWidth − 150`）而不是贴着右缘，是因为**两种落点只在贴着右缘
   * 时才重合**。设 menu 宽为 W：
   *
   * - 对齐量被改成 `bottom-end` → 右缘恒等于锚点，shift 无事可做（不溢出）；
   * - 对齐量保持 `bottom-start` → `rect.right = min(锚点 + W, innerWidth − 边距)`。
   *
   * 两者相等当且仅当 `锚点 ≥ innerWidth − 边距`，即锚点本身已在（或越过）钳制边界上，
   * 此时 `bottom-start` 也被 shift 推到同一处，一个像素都分不开。
   *
   * 而紧贴右缘打开（helper 里用的是 `innerWidth − 10`，比边界近 2px）虽然还没到那个等号，
   * 也只剩 2px 差距 —— 拿 1px 容差去守一条 2px 的判别，等于把这条**实际承重的守卫**交给
   * 亚像素噪声决定成败。所以要往里退。
   *
   * 退开之后（实测：视口 414、锚点 264、边界 406、menu 约 200px）：
   * - 保持 `bottom-start` → 264 + 200 > 406，溢出 → 被推到 406；
   * - 改成 `bottom-end` → 右缘就是 264。
   *
   * 差 142px，**与 menu 宽无关**（只要 W > 可用空间 142px 就恒成立）—— 恰恰是「menu 比可用
   * 空间更宽」才把两者**拉开**，不是重合。
   *
   * 下面第一条给 5px 容差足够：它守的不是「恰好贴住边界」，不值得收到 0（试过收到 0，
   * 修复态确实正好等于 406；真正承重的是第二条那 142px 的差距）。
   */
  it('鼠标贴右缘打开时对齐量不被 flip 改成 -end，水平夹取仍归 shift', async () => {
    const { rect, anchor } = await openAtEdge(14, window.innerWidth - 150, 200)

    expect(
      Math.abs(rect.right - (window.innerWidth - EDGE_PADDING)),
      `menuRight=${rect.right}；若对齐量被改成 -end 则会是锚点 ${anchor.x}`
    ).toBeLessThanOrEqual(5)
    expect(
      Math.abs(rect.right - anchor.x),
      `menuRight=${rect.right} 锚点=${anchor.x}：两者靠得太近，这条用例就区分不出对齐量了`
    ).toBeGreaterThan(50)
  })

  it('最下面一项完整落在视口内（用户点得到的实际后果）', async () => {
    const { rect } = await openAtEdge(14, 200, window.innerHeight - 10)
    const items = getMenuPanels('Context menu')[0]?.querySelectorAll<HTMLElement>('web-ui-dropdown-item')
    const last = items?.[items.length - 1]
    if (!last) throw new Error('未找到 menu 末项')
    const lastRect = last.getBoundingClientRect()

    // panel overflow-y: hidden，越出视口的那一截不会被滚动救回来，所以这条直接钉用户后果：
    // 末项必须整条可见可点，而不是「panel 大部分在视口内就行」。
    expect(
      lastRect.bottom,
      `末项 top=${lastRect.top} bottom=${lastRect.bottom} innerHeight=${window.innerHeight}`
    ).toBeLessThanOrEqual(window.innerHeight)
    // 顺带确认量的是同一个 panel（helper 复用后仍指向本次打开的那一个）。
    expect(rect.height).toBeGreaterThan(0)
  })

  it('menu 贴右缘打开时，右缘不越出视口（与纵向同源）', async () => {
    const { rect } = await openAtEdge(14, window.innerWidth - 10, 200)

    expect(
      rect.right,
      `menuLeft=${rect.left} menuWidth=${rect.width} innerWidth=${window.innerWidth}`
    ).toBeLessThanOrEqual(window.innerWidth)
  })

  it('横向夹取按未缩放的宽度算，而不是按进场 transform 缩小后的宽度', async () => {
    const { rect } = await openAtEdge(14, window.innerWidth - 10, 200)

    // 判据改成「夹取结果**不是**按缩小尺寸算出来的那个」，不再钉死与视口边界的精确距离。
    //
    // 原来这里钉的是 `左缘 == 视口右缘 − 实际宽 − 边距`。它把边距常量也钉进了测试，而且对
    // 「测量时的宽度」与「落定后的宽度」之间的抖动零容忍：flip 会多跑一轮测量，实测那一刻
    // panel 宽 202px、落定后 200px，左缘因此差 2px。那 2px 与本条要守的性质无关。
    //
    // 按 0.9 倍进场宽度夹取会得到 `视口右缘 − 边距 − 0.9 × 实际宽`，与正确结果相差
    // `0.1 × 实际宽`（按实测宽约 200px 计，20px 量级）。下面两条按这个差额区分：
    // 1. 夹取结果确实不是那个缩减值；
    // 2. panel 完整落在视口内 —— 缩尺寸夹取的直接后果就是落定后右缘越界。
    const scaledLeft = window.innerWidth - EDGE_PADDING - 0.9 * rect.width
    expect(
      Math.abs(rect.left - scaledLeft),
      `menuLeft=${rect.left}；若按缩小尺寸夹取会是 ${scaledLeft}（menuWidth=${rect.width}）`
    ).toBeGreaterThan(1)
    expect(
      rect.right,
      `menuLeft=${rect.left} menuWidth=${rect.width} innerWidth=${window.innerWidth}`
    ).toBeLessThanOrEqual(window.innerWidth)
  })
})
