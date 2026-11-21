import { createRouteProgressStarter } from '@greypan/route-progress'
import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { installRouteGuards } from '../guards'
import { onRouteFailure } from '../progress'

const Page = defineComponent({ template: '<div />' })

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const progress = createRouteProgressStarter()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Page },
      { path: '/changelog', component: Page },
      { path: '/other', component: Page }
    ]
  })
  installRouteGuards(router, queryClient, progress)
  const failures: unknown[] = []
  const off = onRouteFailure(error => failures.push(error))
  return { router, progress, failures, off }
}

describe('route guards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('数据就绪后才提交位置，并在成功后收口 progress', async () => {
    const { router, progress, failures, off } = setup()
    await router.push('/home')
    const pending = router.push('/changelog?delay=500')
    await vi.advanceTimersByTimeAsync(200)
    // 慢 query 期间：仍停留旧页面，顶部条已显示。
    expect(router.currentRoute.value.path).toBe('/home')
    expect(progress.getSnapshot().visible).toBe(true)
    await vi.advanceTimersByTimeAsync(400)
    await pending
    expect(router.currentRoute.value.path).toBe('/changelog')
    expect(['done', 'idle']).toContain(progress.getSnapshot().phase)
    expect(failures).toEqual([])
    off()
  })

  it('预取失败：留在当前页，单次失败只通知一次', async () => {
    const { router, progress, failures, off } = setup()
    await router.push('/home')
    const result = await router.push('/changelog?fail=1')
    expect(result).toBeTruthy()
    expect(router.currentRoute.value.path).toBe('/home')
    expect(progress.getSnapshot().phase).toBe('error')
    expect(failures).toHaveLength(1)
    off()
  })

  it('并发抢占（cancelled）与重复点击（duplicated）不通知失败', async () => {
    const { router, progress, failures, off } = setup()
    await router.push('/home')
    const first = router.push('/changelog?delay=1000')
    await vi.advanceTimersByTimeAsync(10)
    const second = router.push('/other')
    await vi.advanceTimersByTimeAsync(1500)
    await Promise.all([first, second])
    expect(router.currentRoute.value.path).toBe('/other')
    expect(['done', 'idle']).toContain(progress.getSnapshot().phase)
    await router.push('/other')
    expect(failures).toEqual([])
    off()
  })

  it('抢占后旧导航的慢请求失败不会误报', async () => {
    const { router, failures, off } = setup()
    await router.push('/home')
    const stale = router.push('/changelog?delay=500&fail=1')
    await vi.advanceTimersByTimeAsync(10)
    const fresh = router.push('/other')
    await vi.advanceTimersByTimeAsync(1000)
    await Promise.all([stale, fresh])
    expect(router.currentRoute.value.path).toBe('/other')
    expect(failures).toEqual([])
    off()
  })
})
