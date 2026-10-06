// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

import AppNav from '../AppNav.vue'

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

describe('AppNav：主导航', () => {
  beforeEach(() => {
    route.value = { path: '/library' }
    router.push.mockClear()
    vi.stubGlobal('matchMedia', matchMediaStub)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  /*
   * 画线动画的重放机制（replay 的触发与时机）由 web-ui 的 svg-draw-lines 组件测试覆盖；
   * 这里不再 spy 组件原型方法复测一遍。导航自身的职责——aria-current、navigate 分支、
   * 设置入口——由其余用例守住。
   */
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
})
