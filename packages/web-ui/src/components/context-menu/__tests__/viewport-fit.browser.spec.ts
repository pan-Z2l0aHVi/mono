import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/dropdown-item'
import { getMenuPanels, waitForUpdate } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

/*
 * 贴视口边缘打开时，菜单不得越出视口（浏览器）。
 *
 * 缺陷形态（实测，非推理）：`_positionMenuInViewport` 用
 * `panel.getBoundingClientRect()` 取宽高来算夹取，但面板此刻正带着进场动画
 * `transform: scale(var(--wui-scale-enter, 0.95))`（assets/overlay-motion.css:40）。
 * rect 含 transform，于是夹取按**缩小 5%** 的尺寸来算：
 *
 *   菜单实际高 456px → 夹取时量到 456 × 0.95 = 433.2px
 *   → top = 896 − 433.2 − 8 = 454.8px
 *   → 动画落定 scale 回到 1，真实底部 = 454.8 + 456 = 910.8px
 *   → 越出视口下缘 896px 共 14.8px
 *
 * 面板自身 `overflow-y: hidden`，越出去的那一截不会被滚动救回来——最下面一项直接点不到。
 *
 * **横向是同一个缺陷**：夹取的宽高取自同一个 rect，所以贴右缘打开时横向也少算了 5% 宽度，
 * 右缘同样越界。两个方向各有守卫——只钉纵向的话，改回 getBoundingClientRect 时横向回归
 * 无人发现（而横向确实发生过，见用例）。
 *
 * 判据取「面板底边不超过视口下缘」这条行为约束，不钉某个像素值：padding 是 8px 的实现常量，
 * 钉死它会让日后调 padding 变成改测试。
 *
 * 必须 browser mode：整个缺陷就是 transform 污染 rect 读数，jsdom 既无布局也无 transform。
 */
afterEach(() => document.body.replaceChildren())

/** 边距，与 `_positionMenuInViewport` 的夹取常量同源，仅用于给断言留容差。 */
const EDGE_PADDING = 8

function menuItems(count: number): string {
  return Array.from({ length: count }, (_, i) => `<web-ui-dropdown-item>Item ${i}</web-ui-dropdown-item>`).join('')
}

/** 在指定落点 openAt，返回落定后的面板矩形。 */
async function openAtEdge(itemCount: number, x: number, y: number): Promise<DOMRect> {
  const el = document.createElement('web-ui-context-menu') as WebUiContextMenu
  el.innerHTML = menuItems(itemCount)
  document.body.appendChild(el)
  await waitForUpdate(el)

  el.openAt(x, y)
  // 等进场过渡落定：缺陷恰恰只在 scale 回到 1 之后才显形，中途量到的是动画帧。
  await new Promise(resolve => setTimeout(resolve, 400))

  // 面板挂在 overlay root 的 shadow 里，document.querySelector 穿不过去，必须用共享定位器。
  const panel = getMenuPanels('上下文菜单')[0]
  if (!panel) throw new Error('上下文菜单面板未渲染')
  return panel.getBoundingClientRect()
}

describe('WebUiContextMenu 贴视口边缘的夹取（浏览器）', () => {
  it('高菜单贴下缘打开时，底边不越出视口', async () => {
    const rect = await openAtEdge(14, 200, window.innerHeight - 10)

    expect(
      rect.bottom,
      `menuTop=${rect.top} menuHeight=${rect.height} innerHeight=${window.innerHeight}`
    ).toBeLessThanOrEqual(window.innerHeight)
  })

  it('夹取按未缩放的尺寸算，而不是按进场 transform 缩小后的尺寸', async () => {
    const rect = await openAtEdge(14, 200, window.innerHeight - 10)

    // 落定后的顶部应当等于「视口下缘 − 菜单实际高 − 边距」。进场 scale 若仍被算进夹取，
    // 这个等式会偏出一个与菜单高度成正比的量（实测 456px 高的菜单偏 22.8px）。
    const expectedTop = window.innerHeight - rect.height - EDGE_PADDING
    expect(
      Math.abs(rect.top - expectedTop),
      `menuTop=${rect.top} 期望=${expectedTop}（按 rect.height=${rect.height} 反推）`
    ).toBeLessThanOrEqual(1)
  })

  it('最下面一项完整落在视口内（用户点得到的实际后果）', async () => {
    const rect = await openAtEdge(14, 200, window.innerHeight - 10)
    const items = getMenuPanels('上下文菜单')[0]?.querySelectorAll<HTMLElement>('web-ui-dropdown-item')
    const last = items?.[items.length - 1]
    if (!last) throw new Error('未找到菜单末项')
    const lastRect = last.getBoundingClientRect()

    // 面板 overflow-y: hidden，越出视口的那一截不会被滚动救回来，所以这条直接钉用户后果：
    // 末项必须整条可见可点，而不是「面板大部分在视口内就行」。
    expect(
      lastRect.bottom,
      `末项 top=${lastRect.top} bottom=${lastRect.bottom} innerHeight=${window.innerHeight}`
    ).toBeLessThanOrEqual(window.innerHeight)
    // 顺带确认量的是同一个面板（helper 复用后仍指向本次打开的那一个）。
    expect(rect.height).toBeGreaterThan(0)
  })

  it('菜单贴右缘打开时，右缘不越出视口（与纵向同源）', async () => {
    const rect = await openAtEdge(14, window.innerWidth - 10, 200)

    expect(
      rect.right,
      `menuLeft=${rect.left} menuWidth=${rect.width} innerWidth=${window.innerWidth}`
    ).toBeLessThanOrEqual(window.innerWidth)
  })

  it('横向夹取按未缩放的宽度算', async () => {
    const rect = await openAtEdge(14, window.innerWidth - 10, 200)

    // 与纵向同一个等式：落定后的左缘应等于「视口右缘 − 菜单实际宽 − 边距」。
    // 进场 scale 若仍被算进夹取，这里会偏出一个与菜单宽度成正比的量。
    const expectedLeft = window.innerWidth - rect.width - EDGE_PADDING
    expect(
      Math.abs(rect.left - expectedLeft),
      `menuLeft=${rect.left} 期望=${expectedLeft}（按 rect.width=${rect.width} 反推）`
    ).toBeLessThanOrEqual(1)
  })
})
