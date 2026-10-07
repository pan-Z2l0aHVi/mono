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
 * 下面两组数字**由类名链条按主题断点算出**，不是「我觉得应该是几列」：
 *   home 页   `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
 *   svg 示例页 `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
 * 断点取自 `src/assets/global.css` 的 `@theme`：sm 640 / md 768 / lg 1024 / xl 1280。
 * 两页都独立实测过（同一条类名链条），与这两个数组一致。
 *
 * 这组数字只取决于这两处网格上的 sm/md/lg 类名：**声明**一个新的自定义变体（例如另一条线程
 * 的 `@custom-variant mobile (…)`）不会改变它们——网格上没有该类就生成不出能胜出的规则；
 * 但往这两处网格**追加** `mobile:` 之类的列数类名就会改变渲染结果，那时必须按新的类名链条
 * 重算这两个数组并同步这条注释。本分支不含那条 `mobile:` 变体，所以这组断言的判据在合并
 * 前后相同。
 */
const BREAKPOINTS = [390, 640, 641, 768, 1024, 1280]
const VIEWPORT_HEIGHT = 900

const HOME_QUICK_LINKS_COLUMNS = [1, 2, 2, 3, 3, 3]
const SVG_ICON_COLUMNS = [2, 3, 3, 4, 5, 5]

/** 渲染出来的轨道数就是列数；`grid-template-columns` 的 computed 值即用后的轨道列表。 */
function columnCount(testId: string) {
  const element = document.querySelector(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`grid ${testId} not found`)
  return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
}

async function columnsAcrossBreakpoints(testId: string) {
  const measured: number[] = []
  for (const width of BREAKPOINTS) {
    await page.viewport(width, VIEWPORT_HEIGHT)
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

  it('home 页快速预览网格在六档视口下保持 1/2/2/3/3/3 列', async () => {
    await mountPage('/home', 'home-quick-links-grid')

    expect(await columnsAcrossBreakpoints('home-quick-links-grid')).toEqual(HOME_QUICK_LINKS_COLUMNS)
  })

  it('svg 示例页图标网格在六档视口下保持 2/3/3/4/5/5 列', async () => {
    await mountPage('/components/svg-draw-lines', 'svg-icon-grid')

    expect(await columnsAcrossBreakpoints('svg-icon-grid')).toEqual(SVG_ICON_COLUMNS)
  })
})
