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
    await vi.advanceTimersByTimeAsync(240)
    // 250ms 阈值前不显示
    expect(progress.getSnapshot().visible).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    // 超过 250ms：仍停留旧页面，顶部条已显示。
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

  it('仅 hash 变化（页内锚点）不触发进度条', async () => {
    const { router, progress, off } = setup()
    await router.push('/home')
    await vi.advanceTimersByTimeAsync(500)
    await router.push('/home#section-1')
    await vi.advanceTimersByTimeAsync(500)
    expect(progress.getSnapshot().visible).toBe(false)
    expect(router.currentRoute.value.hash).toBe('#section-1')
    off()
  })

  it('组件文档路由在文档与示例预载完毕后才提交，失败留在当前页', async () => {
    const localeMod = await import('@/i18n/locale')
    const ensureSpy = vi.spyOn(localeMod, 'ensureExampleDocs')
    let resolveDocs!: () => void
    ensureSpy.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveDocs = resolve
        })
    )

    const { progress, failures, off } = setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/home', component: Page },
        { path: '/components/button', component: Page }
      ]
    })
    installRouteGuards(router, queryClient, progress)
    await router.push('/home')

    const pending = router.push('/components/button')
    await vi.advanceTimersByTimeAsync(300)
    expect(router.currentRoute.value.path).toBe('/home')
    expect(progress.getSnapshot().visible).toBe(true)

    resolveDocs()
    await pending
    expect(ensureSpy).toHaveBeenCalledWith(['button', 'button-group'])
    expect(router.currentRoute.value.path).toBe('/components/button')
    expect(['done', 'idle']).toContain(progress.getSnapshot().phase)
    expect(failures).toEqual([])

    ensureSpy.mockRejectedValueOnce(new Error('doc chunk error'))
    await router.push('/home')
    await vi.advanceTimersByTimeAsync(500)
    await router.push('/components/button')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(progress.getSnapshot().phase).toBe('error')
    expect(failures).toHaveLength(1)

    ensureSpy.mockRestore()
    off()
  })
})
