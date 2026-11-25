import { findComponentRoute, routeExampleDocs } from '@greypan/doc-demo-kit'
import { createRouteProgressStarter } from '@greypan/route-progress'
import { QueryClient } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound
} from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { changelogSummaryQuery, parseFakeFetchOptions } from '@/queries/changelog'

import { handleRouteLoadFailure, installRouterProgress } from '../guards'

interface TestRouterContext {
  queryClient: QueryClient
}

function setup(ensureDocs: (docs: readonly string[]) => Promise<void> = async () => {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const progress = createRouteProgressStarter()
  const rootRoute = createRootRouteWithContext<TestRouterContext>()({
    beforeLoad: async ({ location, preload }) => {
      const docs = routeExampleDocs(location.pathname)
      if (docs.length > 0) {
        try {
          await ensureDocs(docs)
        } catch (error) {
          if (preload) throw error
          handleRouteLoadFailure(error, router)
        }
      }
    },
    component: () => null
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/home',
    component: () => null
  })
  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/other',
    component: () => null
  })
  const buttonRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/components/$component',
    beforeLoad: ({ params }) => {
      const entry = findComponentRoute(params.component)
      if (!entry) throw notFound()
      return { entry }
    },
    component: () => null
  })
  const changelogRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/changelog',
    loaderDeps: ({ search }) => parseFakeFetchOptions(search as Record<string, unknown>),
    loader: async ({ context, deps, preload }) => {
      try {
        return await context.queryClient.ensureQueryData(changelogSummaryQuery(deps))
      } catch (error) {
        if (preload) throw error
        handleRouteLoadFailure(error, router)
      }
    },
    component: () => null
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, otherRoute, buttonRoute, changelogRoute]),
    context: { queryClient },
    defaultPendingMs: Infinity,
    history: createMemoryHistory({ initialEntries: ['/home'] })
  })

  // 在未挂载 RouterProvider 的单测环境里连接 history 与 router.load
  const stopHistory = router.history.subscribe(() => {
    void router.load()
  })
  const stopProgress = installRouterProgress(router, progress)
  const failures: unknown[] = []
  const offFailure = progress.onFailure(error => failures.push(error))

  return {
    router,
    progress,
    failures,
    cleanup() {
      offFailure()
      stopProgress()
      stopHistory()
    }
  }
}

describe('react router progress & guards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('数据就绪后才提交 resolvedLocation，并在成功后收口 progress', async () => {
    const { router, progress, failures, cleanup } = setup()
    await router.load()
    // 初始加载收口后进入 idle
    await vi.advanceTimersByTimeAsync(500)

    const pending = router.navigate({ to: '/changelog', search: { delay: '500' } })
    await vi.advanceTimersByTimeAsync(240)
    // 250ms 阈值前不显示
    expect(progress.getSnapshot().visible).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    // 超过 250ms：已解析位置仍停在 /home，顶部条可见
    expect(router.state.resolvedLocation?.pathname).toBe('/home')
    expect(progress.getSnapshot().visible).toBe(true)

    await vi.advanceTimersByTimeAsync(400)
    await pending
    expect(router.state.resolvedLocation?.pathname).toBe('/changelog')
    expect(['done', 'idle']).toContain(progress.getSnapshot().phase)
    expect(failures).toEqual([])
    cleanup()
  })

  it('loader 预取失败：回退并留在当前页，单次失败只通知一次且进度隐藏', async () => {
    const { router, progress, failures, cleanup } = setup()
    await router.load()
    await vi.advanceTimersByTimeAsync(500)

    await router.navigate({ to: '/changelog', search: { fail: '1' } })
    await vi.advanceTimersByTimeAsync(100)

    expect(router.state.location.pathname).toBe('/home')
    expect(router.state.resolvedLocation?.pathname).toBe('/home')
    expect(progress.getSnapshot().visible).toBe(false)
    expect(failures).toHaveLength(1)
    cleanup()
  })

  it('preloadRoute 意图预取不触发顶部 progress，失败也静默不报错', async () => {
    const { router, progress, failures, cleanup } = setup()
    await router.load()
    await vi.advanceTimersByTimeAsync(500)

    const preloadPromise = router.preloadRoute({ to: '/changelog', search: { delay: '300' } })
    await vi.advanceTimersByTimeAsync(200)
    expect(progress.getSnapshot().visible).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    await preloadPromise

    await router.preloadRoute({ to: '/changelog', search: { fail: '1' } })
    expect(failures).toEqual([])
    expect(progress.getSnapshot().visible).toBe(false)
    cleanup()
  })

  it('并发抢占：新导航覆盖旧导航，不误报失败', async () => {
    const { router, failures, cleanup } = setup()
    await router.load()
    await vi.advanceTimersByTimeAsync(500)

    const first = router.navigate({ to: '/changelog', search: { delay: '800' } })
    await vi.advanceTimersByTimeAsync(50)
    const second = router.navigate({ to: '/other' })
    await vi.advanceTimersByTimeAsync(1000)
    await Promise.allSettled([first, second])

    expect(router.state.resolvedLocation?.pathname).toBe('/other')
    expect(failures).toEqual([])
    cleanup()
  })

  it('组件文档路由在文档与示例预载完毕后才提交，失败留在当前页，preload 不触发进度', async () => {
    let resolveDocs!: () => void
    const ensureDocs = vi.fn<(docs: readonly string[]) => Promise<void>>(
      () =>
        new Promise<void>(resolve => {
          resolveDocs = resolve
        })
    )
    const { router, progress, failures, cleanup } = setup(ensureDocs)
    await router.load()
    await vi.advanceTimersByTimeAsync(500)

    const pending = router.navigate({ to: '/components/$component', params: { component: 'button' } })
    await vi.advanceTimersByTimeAsync(260)
    expect(ensureDocs).toHaveBeenCalledWith(['button', 'button-group'])
    expect(router.state.resolvedLocation?.pathname).toBe('/home')
    expect(progress.getSnapshot().visible).toBe(true)

    resolveDocs()
    await pending
    expect(router.state.resolvedLocation?.pathname).toBe('/components/button')
    expect(['done', 'idle']).toContain(progress.getSnapshot().phase)
    expect(failures).toEqual([])

    ensureDocs.mockRejectedValueOnce(new Error('doc chunk error'))
    await router.navigate({ to: '/home' })
    await vi.advanceTimersByTimeAsync(500)
    await router.navigate({ to: '/components/$component', params: { component: 'button' } })
    expect(router.state.location.pathname).toBe('/home')
    expect(router.state.resolvedLocation?.pathname).toBe('/home')
    expect(progress.getSnapshot().visible).toBe(false)
    expect(failures).toHaveLength(1)

    ensureDocs.mockRejectedValueOnce(new Error('preload doc error'))
    await router.preloadRoute({ to: '/components/$component', params: { component: 'button' } }).catch(() => {})
    expect(failures).toHaveLength(1)
    expect(progress.getSnapshot().visible).toBe(false)

    cleanup()
  })

  it('未知组件 slug 进入 notFound 且不触发文档预载', async () => {
    const ensureDocs = vi.fn<(docs: readonly string[]) => Promise<void>>(async () => {})
    const { router, failures, cleanup } = setup(ensureDocs)
    await router.load()
    await vi.advanceTimersByTimeAsync(500)

    await router.navigate({ to: '/components/$component', params: { component: 'non-existent' } })
    expect(ensureDocs).not.toHaveBeenCalled()
    expect(failures).toEqual([])
    expect(router.state.matches.some(match => match.status === 'notFound')).toBe(true)

    cleanup()
  })
})
