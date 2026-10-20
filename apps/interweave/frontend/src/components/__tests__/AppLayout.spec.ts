// @vitest-environment jsdom

import '@greypan/web-ui'

import type { WebUiDialog } from '@greypan/web-ui'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import AppLayout from '../AppLayout.vue'

/**
 * 页面 stub 复刻生产页面的根节点形状：占 header slot 的节点 + 走默认 slot 的节点。
 * 库页是两者并存（LibraryPage 的多根 fragment），图谱页只有默认 slot。
 */
const LibraryPageStub = defineComponent({
  name: 'LibraryPageStub',
  template: '<header slot="header" data-testid="page-header">工具条</header><div data-testid="page-body">资源库</div>'
})

const MapPageStub = defineComponent({
  name: 'MapPageStub',
  template: '<div data-testid="page-body">关系图谱</div>'
})

/** jsdom 不实现 matchMedia；`web-ui-layout` 用它订阅移动端断点，没有桩就退成桌面分支。 */
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

let router: Router
let host: HTMLElement
let app: ReturnType<typeof createApp>

async function mountLayout() {
  host = document.createElement('div')
  document.body.append(host)
  app = createApp(AppLayout)
  app.use(router)
  // AppLayout 挂着设置 dialog，dialog 读 settings store；跟 main.ts 一样装 pinia。
  app.use(createPinia())
  await router.isReady()
  app.mount(host)
  await nextTick()
}

function layoutRoot() {
  const element = host.querySelector('web-ui-layout')
  if (!element) throw new Error('web-ui-layout not found')
  return element
}

function navRoot() {
  const element = host.querySelector('[aria-label="应用导航"]')
  if (!element) throw new Error('AppNav not found')
  return element
}

/**
 * jsdom 能算对 slot 分配，但不会把 slottables 渲染进 shadow DOM，
 * 所以只能读 assignedElements，不能在 <header>/<main> 内部 querySelector。
 */
function assignedTo(slotName: 'sidebar' | 'header' | 'default') {
  const selector = slotName === 'default' ? 'main > slot:not([name])' : `slot[name="${slotName}"]`
  const slot = layoutRoot().shadowRoot?.querySelector(selector)
  if (!slot) throw new Error(`slot ${slotName} not found`)
  return (slot as HTMLSlotElement).assignedElements({ flatten: true })
}

async function navigate(path: string) {
  await router.push(path)
  await nextTick()
  await nextTick()
}

describe('AppLayout：应用外壳', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub)
    // store 在 setup() 里被取（useSettingsStore），没有活动 pinia 会直接抛；每个用例一份干净的。
    setActivePinia(createPinia())
    localStorage.clear()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        // meta.immersive 是已删除的旧机制：库页曾据此绕开 AppLayout 的 layout，自带一套
        // layout + AppNav，切路由时整个 sidebar 被销毁重建。留着这个 meta 做回归哨兵——
        // 任何按 route meta 分叉 shell 的写法都会让上面两条用例失败。
        { path: '/library', component: LibraryPageStub, meta: { immersive: true } },
        { path: '/map', component: MapPageStub }
      ]
    })
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    vi.restoreAllMocks()
  })

  it('切路由不重建 layout 与 AppNav 实例', async () => {
    await mountLayout()
    const layout = layoutRoot()
    const nav = navRoot()

    await navigate('/map')

    expect(layoutRoot()).toBe(layout)
    expect(navRoot()).toBe(nav)
  })

  /*
   * slot 分配矩阵（sidebar/header/default 各落到哪）不再逐条在此复测：jsdom 只能读
   * assignedElements，断言的其实是 web-ui-layout 的 slot 机制本身，组件侧已覆盖；
   * 页面与壳的接合由 LibraryPage.spec 的「根节点带 slot="header"」一条守住。
   * 这里保留它，是因为设置 dialog 的挂载位置是本组件自有的接线（见下方用例）。
   */
})

/*
 * issue #195：`sidebar-collapsed` 是桌面端的密度偏好，而 slot 内容同时服务桌面 aside
 * 与移动端 drawer。若把 collapsed state 直接透传给 AppNav，移动端 drawer 里的导航会以 collapsed state 渲染
 * （collapsed 为真时不渲染文字 label）。闸门因此必须按 viewport 收窄。
 *
 * 如今只剩一个视口信号：`web-ui-layout` 自己订阅媒体查询，并通过 `mobile-change` 把判定
 * 交给壳。所以拨一次 matchMedia 就同时移动了 layout 的树与壳的 collapse gate——#195 那轮
 * 「两个来源各拨一边」的双信号写法已不再需要，也不再需要等 100ms 去抖。
 */
describe('AppLayout：collapse preference 不跨视口泄漏', () => {
  /**
   * 可控 matchMedia：所有订阅者共享一个 matches 值，翻转时统一派发 change。
   * layout 在 connected 时读一次 `matches` 并订阅，因此 setMatches 既能在挂载前设初值，
   * 也能在挂载后驱动一次真实翻转。
   */
  function installMatchMedia() {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    let matches = false

    vi.stubGlobal('matchMedia', () => {
      const list: MediaQueryList = {
        get matches() {
          return matches
        },
        media: '',
        onchange: null,
        addEventListener: ((type: string, callback: (event: MediaQueryListEvent) => void) => {
          if (type === 'change') listeners.add(callback)
        }) as MediaQueryList['addEventListener'],
        removeEventListener: ((type: string, callback: (event: MediaQueryListEvent) => void) => {
          if (type === 'change') listeners.delete(callback)
        }) as MediaQueryList['removeEventListener'],
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false
      } as unknown as MediaQueryList
      return list
    })

    return {
      setMatches(next: boolean) {
        matches = next
        for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
      }
    }
  }

  let viewport: ReturnType<typeof installMatchMedia>

  /** 复刻 Toggle 的请求链路：layout 只派发请求，宿主回写受控属性。 */
  function requestCollapse(collapsed: boolean) {
    layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  }

  function isDrawerMode() {
    return !!layoutRoot().shadowRoot?.querySelector('web-ui-drawer')
  }

  beforeEach(() => {
    viewport = installMatchMedia()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        { path: '/library', component: LibraryPageStub },
        { path: '/map', component: MapPageStub }
      ]
    })
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    vi.restoreAllMocks()
  })

  it('桌面端维持 collapsed state：导航只剩 icon', async () => {
    await mountLayout()
    requestCollapse(true)
    await nextTick()

    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navRoot().textContent).not.toContain('资料库')
    expect(navRoot().querySelector('button[aria-label="资料库"]')).toBeTruthy()
  })

  it('移动端断点下同一个 collapse preference 不把 drawer 导航压成 collapsed state', async () => {
    viewport.setMatches(true)
    await mountLayout()
    requestCollapse(true)
    await nextTick()

    expect(isDrawerMode()).toBe(true)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navRoot().textContent).toContain('资料库')
  })

  it('跨断点往返后 collapsed state 在桌面端恢复生效', async () => {
    await mountLayout()
    requestCollapse(true)
    await nextTick()
    expect(navRoot().textContent).not.toContain('资料库')

    // 换成移动端：layout 切到 drawer，壳的闸门跟着同一次 mobile-change 打开。
    viewport.setMatches(true)
    await nextTick()
    expect(isDrawerMode()).toBe(true)
    expect(layoutRoot().mobile).toBe(true)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navRoot().textContent).toContain('资料库')

    // 切回桌面：collapse preference 原样恢复，不因为一次移动端往返被改写。
    viewport.setMatches(false)
    await nextTick()
    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().mobile).toBe(false)
    expect(navRoot().textContent).not.toContain('资料库')
  })
})

describe('AppLayout：设置 dialog 接线', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        { path: '/library', component: LibraryPageStub },
        { path: '/map', component: MapPageStub }
      ]
    })
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    vi.restoreAllMocks()
  })

  /** dialog 受控于宿主的 ref，Lit 侧属性写入后再等一轮微任务让 shadow 跟上。 */
  async function flush() {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    await nextTick()
  }

  function settingsDialog() {
    const element = host.querySelector('web-ui-dialog')
    if (!element) throw new Error('web-ui-dialog not found')
    return element as WebUiDialog
  }

  it('dialog 是 web-ui-layout 的同级节点，不落在 sidebar slot 里', async () => {
    await mountLayout()

    expect(settingsDialog().parentElement).toBe(host)
    expect(assignedTo('sidebar')).not.toContain(settingsDialog())
  })

  it('点击侧边栏设置入口打开 dialog，关闭请求回落到宿主状态', async () => {
    await mountLayout()
    expect(settingsDialog().open).toBe(false)

    const trigger = host.querySelector<HTMLElement>('button[aria-label="设置"]')
    if (!trigger) throw new Error('settings trigger not found')
    trigger.click()
    await flush()
    expect(settingsDialog().open).toBe(true)

    // Escape 与 backdrop 点击都走这条 open-change；controlled 下组件不会自行改 open。
    settingsDialog().dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
    await flush()
    expect(settingsDialog().open).toBe(false)
  })
})
