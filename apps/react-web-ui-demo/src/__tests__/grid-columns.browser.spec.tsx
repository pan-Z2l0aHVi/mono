import '@/assets/global.css'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { routeTree } from '@/routeTree.gen'

/*
 * 网格列数基线。守的是 Tailwind v4 的变体排序陷阱：`@custom-variant` 生成的规则排在主题断点
 * **之后**，而 `:where()` 不抬特异性——同属性同权、后出现者胜，于是一条本意只针对 ≥641 的
 * 自定义变体（例如 `desktop:grid-cols-4`）会在 ≥768 全段压掉 `md:` 与 `lg:`，而这类改动不会
 * 让任何 CSS 断言变红。
 *
 * 采样档位：用户指定的六档（390/640/641/768/1024/1280），另补 1440 / 1536 / 1920——只采到
 * 1280 时，起点大于 1280 的变体陷阱整段采不到，而 `@theme` 里还有 2xl 1536。
 *   1440 常见笔记本逻辑宽度，落在 xl 与 2xl 之间 → 覆盖起点在 1281–1440 的陷阱；
 *   1536 是 `2xl` 断点本身 → 给最后一个具名断点收口；
 *   1920 是全高清桌面宽度 → 覆盖起点在 1537–1920 的陷阱。
 * 起点比 1920 更靠右的仍然采不到，这是采样法的固有边界（报告里记着）。
 *
 * 下面两组数字**由类名链条按主题断点逐档算出**，不是「我觉得应该是几列」，也不是照抄 1280
 * 那一档：
 *   home 页   `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
 *   svg 示例页 `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
 * 断点取自 `src/assets/global.css` 的 `@theme`：sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536。
 * 某档宽度命中 `>= 断点` 的类就取它的列数；取不到更高断点的类时**沿用前一个胜者**（Tailwind
 * 不会在更高断点把列数「重置」）：
 *   home：390→1；640/641→sm 2；768/1024/1280/1440/1536/1920→md 3（没有 lg/xl/2xl 类）
 *   svg ：390→2；640/641→sm 3；768→md 4；1024/1280/1440/1536/1920→lg 5（没有 xl/2xl 类）
 * 所以两组数组在高位是平的——那是推导结果，不是抄来的。
 *
 * 这组数字只取决于这两处网格上的 sm/md/lg 类名：**声明**一个新的自定义变体（例如另一条线程
 * 的 `@custom-variant mobile (…)`）不会改变它们——网格上没有该类就生成不出能胜出的规则；
 * 但往这两处网格**追加** `mobile:` 之类的列数类名就会改变渲染结果，那时必须按新的类名链条
 * 重算这两个数组并同步这条注释。本分支不含那条 `mobile:` 变体，所以这组断言的判据在合并
 * 前后相同。
 */
const BREAKPOINTS = [390, 640, 641, 768, 1024, 1280, 1440, 1536, 1920]
const VIEWPORT_HEIGHT = 900

const HOME_QUICK_LINKS_COLUMNS = [1, 2, 2, 3, 3, 3, 3, 3, 3]
const SVG_ICON_COLUMNS = [2, 3, 3, 4, 5, 5, 5, 5, 5]

/** 渲染出来的轨道数就是列数；`grid-template-columns` 的 computed 值即用后的轨道列表。 */
function columnCount(testId: string) {
  const element = document.querySelector(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`grid ${testId} not found`)
  return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
}

async function columnsAcrossBreakpoints(testId: string) {
  const measured: number[] = []
  for (const width of BREAKPOINTS) {
    // 换视口会经 media query 监听回写 React 状态，所以把「换视口」这个触发动作本身放进 act
    // 边界，让那次回写落在 act 里；事后再补一个空 act 只是让 React 闭嘴，更新仍在边界外。
    await act(async () => {
      await page.viewport(width, VIEWPORT_HEIGHT)
    })
    measured.push(columnCount(testId))
  }
  return measured
}

async function mountPage(path: string, waitingForTestId: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    if (!document.querySelector(`[data-testid="${waitingForTestId}"]`)) throw new Error('page not mounted')
  })
  await act(async () => {
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  })
}

describe('网格列数基线（浏览器）', () => {
  afterEach(async () => {
    cleanup()
    await page.viewport(BREAKPOINTS[0]!, VIEWPORT_HEIGHT)
  })

  it('home 页快速预览网格在九档视口下保持 1/2/2/3/3/3/3/3/3 列', async () => {
    await mountPage('/home', 'home-quick-links-grid')

    expect(await columnsAcrossBreakpoints('home-quick-links-grid')).toEqual(HOME_QUICK_LINKS_COLUMNS)
  })

  it('svg 示例页图标网格在九档视口下保持 2/3/3/4/5/5/5/5/5 列', async () => {
    await mountPage('/components/svg-draw-lines', 'svg-icon-grid')

    expect(await columnsAcrossBreakpoints('svg-icon-grid')).toEqual(SVG_ICON_COLUMNS)
  })
})
