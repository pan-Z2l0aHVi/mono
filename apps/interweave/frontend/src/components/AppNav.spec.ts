// @vitest-environment jsdom

import { WebUiSvgDrawLines } from '@greypan/web-ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

import AppNav from './AppNav.vue'

/** vue-router 的 useRoute/useRouter 需要注入；导航只读 path 与 push。 */
const route = ref({ path: '/library' })
const router = {
  push: vi.fn<() => Promise<void>>(async () => {})
}

vi.mock('vue-router', () => ({
  useRoute: () => route.value,
  useRouter: () => router
}))

/** jsdom 不实现 matchMedia；导航在 reduced-motion 未命中时读一次 matches。 */
function matchMediaStub() {
  return {
    matches: false,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false
  } as unknown as MediaQueryList
}

/** jsdom 不实现 Web Animations API；导航点击会对图标调用 Element.animate。 */
if (typeof Element.prototype.animate !== 'function') {
  Element.prototype.animate = vi.fn<() => { cancel: () => void }>(() => ({
    cancel: () => {}
  })) as unknown as Element['animate']
}

async function mountNav(
  options: {
    collapsed?: boolean
    onNavigate?: (key: string) => void
    onOpenSettings?: () => void
  } = {}
) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(AppNav, {
    collapsed: options.collapsed ?? false,
    onNavigate: options.onNavigate,
    onOpenSettings: options.onOpenSettings
  })
  app.mount(host)
  await nextTick()
  return {
    host,
    async close() {
      app.unmount()
      host.remove()
    }
  }
}

function navItem(host: HTMLElement, label: string) {
  const element = host.querySelector<HTMLElement>(`button[aria-label="${label}"]`)
  if (!element) throw new Error(`nav item ${label} not found`)
  return element
}

function drawHosts(host: HTMLElement) {
  return [...host.querySelectorAll<WebUiSvgDrawLines>('web-ui-svg-draw-lines')]
}

/** playDraw 会先 await web-ui-icon.updateComplete 再 replay，需要跨若干个微/宏任务。 */
async function flush() {
  for (let i = 0; i < 5; i++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('AppNav：主导航', () => {
  beforeEach(() => {
    route.value = { path: '/library' }
    router.push.mockClear()
    vi.stubGlobal('matchMedia', matchMediaStub)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('挂载时不自动播放画线动画，交给点击决定', async () => {
    const mounted = await mountNav()
    const hosts = drawHosts(mounted.host)

    expect(hosts).toHaveLength(2)
    expect(hosts.every(host => host.noAutoplay)).toBe(true)

    await mounted.close()
  })

  it('当前路由的导航项标记为 page，非当前项不带 aria-current', async () => {
    const mounted = await mountNav()

    expect(navItem(mounted.host, '资料库').getAttribute('aria-current')).toBe('page')
    expect(navItem(mounted.host, '关系图谱').hasAttribute('aria-current')).toBe(false)

    await mounted.close()
  })

  it('点击其他导航项时派发 navigate 并跳转对应路由', async () => {
    const onNavigate = vi.fn<(key: string) => void>()
    const mounted = await mountNav({ onNavigate })

    navItem(mounted.host, '关系图谱').click()
    await nextTick()

    expect(onNavigate).toHaveBeenCalledWith('map')
    expect(router.push).toHaveBeenCalledWith('/map')

    await mounted.close()
  })

  it('点击当前路由项不重复跳转，但仍派发 navigate 供宿主收起侧边栏', async () => {
    const onNavigate = vi.fn<(key: string) => void>()
    const mounted = await mountNav({ onNavigate })

    navItem(mounted.host, '资料库').click()
    await nextTick()

    expect(onNavigate).toHaveBeenCalledWith('library')
    expect(router.push).not.toHaveBeenCalled()

    await mounted.close()
  })

  it('点击当前路由项时实例存活，直接重放该图标的画线动画', async () => {
    const mounted = await mountNav()
    const [library, map] = drawHosts(mounted.host)
    const replay = vi.spyOn(WebUiSvgDrawLines.prototype, 'replay')

    navItem(mounted.host, '资料库').click()
    await flush()

    expect(replay.mock.instances).toEqual([library])

    await mounted.close()
  })

  it('跨路由点击同样重放目标图标的画线动画', async () => {
    const mounted = await mountNav()
    const map = drawHosts(mounted.host)[1]!
    const replay = vi.spyOn(WebUiSvgDrawLines.prototype, 'replay')

    navItem(mounted.host, '关系图谱').click()
    await flush()

    expect(router.push).toHaveBeenCalledWith('/map')
    expect(replay.mock.instances).toEqual([map])

    await mounted.close()
  })

  it('折叠时不渲染文字标签，只保留 aria-label', async () => {
    const mounted = await mountNav({ collapsed: true })

    expect(mounted.host.textContent).not.toContain('资料库')
    expect(navItem(mounted.host, '资料库')).toBeTruthy()

    await mounted.close()
  })
})

describe('AppNav：设置入口', () => {
  beforeEach(() => {
    route.value = { path: '/library' }
    router.push.mockClear()
    vi.stubGlobal('matchMedia', matchMediaStub)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('入口排在主导航之后，是根容器的最后一个子节点', async () => {
    const mounted = await mountNav()
    const root = mounted.host.querySelector('[aria-label="应用导航"]')
    if (!root) throw new Error('nav root not found')

    expect(root.lastElementChild).toBe(navItem(mounted.host, '设置'))
    expect(root.querySelector('[aria-label="主导航"]')?.contains(navItem(mounted.host, '设置'))).toBe(false)

    await mounted.close()
  })

  it('点击入口派发 openSettings，不当作导航', async () => {
    const onNavigate = vi.fn<(key: string) => void>()
    const onOpenSettings = vi.fn<() => void>()
    const mounted = await mountNav({ onNavigate, onOpenSettings })

    navItem(mounted.host, '设置').click()
    await nextTick()

    expect(onOpenSettings).toHaveBeenCalledOnce()
    expect(onNavigate).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()

    await mounted.close()
  })

  it('折叠时入口同样只剩图标，文字标签不渲染', async () => {
    const mounted = await mountNav({ collapsed: true })

    expect(mounted.host.textContent).not.toContain('设置')
    expect(navItem(mounted.host, '设置')).toBeTruthy()

    await mounted.close()
  })

  it('入口不套画线动画，与导航项的图标渲染路径不同', async () => {
    const mounted = await mountNav()

    expect(drawHosts(mounted.host)).toHaveLength(2)

    await mounted.close()
  })
})
