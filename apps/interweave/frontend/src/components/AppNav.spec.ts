// @vitest-environment jsdom

import { WebUiSvgDrawLines } from '@greypan/web-ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

import { consumeNavDraw } from '@/composables/useNavDrawHandoff'

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

async function mountNav(options: { collapsed?: boolean; onNavigate?: (key: string) => void } = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(AppNav, {
    collapsed: options.collapsed ?? false,
    onNavigate: options.onNavigate
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
    // 交接意图是模块级状态，跨用例清干净：key 不匹配时 consume 也会清空
    consumeNavDraw(undefined)
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

  it('跨路由点击把画线交接给接管路由的新实例，出发实例不播', async () => {
    const replay = vi.spyOn(WebUiSvgDrawLines.prototype, 'replay')
    const outgoing = await mountNav()
    const outgoingMap = drawHosts(outgoing.host)[1]!

    // /library 是 immersive、自带一套 layout：这次点击后整个 AppNav 会被销毁重建
    navItem(outgoing.host, '关系图谱').click()
    await nextTick()

    expect(router.push).toHaveBeenCalledWith('/map')
    expect(replay.mock.instances).not.toContain(outgoingMap)
    await outgoing.close()

    route.value = { path: '/map' }
    const incoming = await mountNav()
    const incomingMap = drawHosts(incoming.host)[1]!

    // 交接在挂载时消费，补上被掐断的那次画线
    await flush()
    expect(replay.mock.instances).toContain(incomingMap)

    await incoming.close()
  })

  it('没有点击意图时接管路由的新实例不播（直接访问 / 刷新不算点击）', async () => {
    const replay = vi.spyOn(WebUiSvgDrawLines.prototype, 'replay')
    route.value = { path: '/map' }
    const mounted = await mountNav()

    await flush()

    expect(replay).not.toHaveBeenCalled()

    await mounted.close()
  })

  it('折叠时不渲染文字标签，只保留 aria-label', async () => {
    const mounted = await mountNav({ collapsed: true })

    expect(mounted.host.textContent).not.toContain('资料库')
    expect(navItem(mounted.host, '资料库')).toBeTruthy()

    await mounted.close()
  })
})
