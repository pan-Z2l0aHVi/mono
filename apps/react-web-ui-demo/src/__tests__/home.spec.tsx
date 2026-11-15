import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { loadShellLocale } from '@/i18n/locale'
import Home from '@/routes/home/-component'

/** 卡片是 TanStack `<Link>`，必须在 router 里渲染；路径是否存在不影响本次断言。 */
function renderHome() {
  const rootRoute = createRootRoute({ component: Home })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={router} />)
}

/*
 * 首页的分组标题、能力项与快速预览卡片描述都经 wuchale 翻译，且都是函数值、在渲染期求值。
 * 语种切换必须让这批文案跟着变：module 级常量加 React Compiler 的纯调用缓存会让它们停在
 * 首帧语言，这条用例就是那个回归。
 */
describe('首页壳文案跟随语种', () => {
  afterEach(() => {
    cleanup()
    localStorage.removeItem('locale')
  })

  it('切换语种后分组、能力项与卡片描述一起更新', async () => {
    localStorage.setItem('locale', 'zh-CN')
    await loadShellLocale('zh-CN')
    renderHome()

    expect(await screen.findByText('变体、尺寸、图标、加载状态')).toBeTruthy()
    expect(screen.getByText('跨框架一致')).toBeTruthy()
    expect(screen.getByText('基础控件')).toBeTruthy()

    await act(async () => {
      await loadShellLocale('en')
    })

    await waitFor(() => {
      expect(screen.getByText('Variants, sizes, icons, loading states')).toBeTruthy()
      expect(screen.getByText('Cross-framework')).toBeTruthy()
      expect(screen.getByText('Core controls')).toBeTruthy()
    })
  })
})
