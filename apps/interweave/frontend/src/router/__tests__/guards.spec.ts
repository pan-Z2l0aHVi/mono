import { createRouteProgressStarter } from '@greypan/route-progress'
import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import { installRouteGuards } from '../guards'
import { onRouteFailure } from '../progress'

const Page = defineComponent({ template: '<div />' })

function setup(
  routes: RouteRecordRaw[] = [
    { path: '/library', component: Page },
    { path: '/map', component: Page },
    { path: '/tags', component: Page }
  ]
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const progress = createRouteProgressStarter()
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  installRouteGuards(router, queryClient, progress)
  const failures: unknown[] = []
  const off = onRouteFailure(error => failures.push(error))
  return { router, progress, failures, off }
}

describe('interweave route guards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('慢异步页面 chunk 就绪后才提交位置，250ms 后显示顶部进度并平滑收口', async () => {
    const slowComponent = () =>
      new Promise<typeof Page>(resolve => {
        setTimeout(() => resolve(Page), 500)
      })
    const { router, progress, failures, off } = setup([
      { path: '/library', component: Page },
      { path: '/map', component: slowComponent }
    ])
    await router.push('/library')
    const pending = router.push('/map')
    await vi.advanceTimersByTimeAsync(240)
    expect(progress.getSnapshot().visible).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    expect(router.currentRoute.value.path).toBe('/library')
    expect(progress.getSnapshot().visible).toBe(true)

    await vi.advanceTimersByTimeAsync(300)
    await pending
    expect(router.currentRoute.value.path).toBe('/map')
    expect(['done', 'idle']).toContain(progress.getSnapshot().phase)
    expect(failures).toEqual([])
    off()
  })

  it('异步页面 chunk 加载失败：留在当前页，通知一次失败且进度隐藏', async () => {
    const brokenComponent = () => Promise.reject(new Error('chunk failed'))
    const { router, progress, failures, off } = setup([
      { path: '/library', component: Page },
      { path: '/map', component: brokenComponent }
    ])
    await router.push('/library')
    await router.push('/map').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/library')
    expect(progress.getSnapshot().visible).toBe(false)
    expect(failures).toHaveLength(1)
    off()
  })

  it('同路由重复点击与仅 hash 变化不触发进度条与失败', async () => {
    const { router, progress, failures, off } = setup()
    await router.push('/library')
    await vi.advanceTimersByTimeAsync(500)
    await router.push('/library')
    await router.push('/library#top')
    await vi.advanceTimersByTimeAsync(500)
    expect(progress.getSnapshot().visible).toBe(false)
    expect(failures).toEqual([])
    off()
  })
})
