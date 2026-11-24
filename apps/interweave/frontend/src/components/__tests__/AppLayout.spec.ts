// @vitest-environment jsdom

import { toast, type WebUiDialog } from '@greypan/web-ui'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import {
  MENU_ADD_RESOURCE_EVENT,
  MENU_FOCUS_SEARCH_EVENT,
  MENU_TOGGLE_FILTER_BAR_EVENT
} from '@/composables/menuActions'
import { pendingWindowFileDrops } from '@/composables/windowFileDrop'
import type * as menuStateModule from '@/services/menu/state'
import { useSettingsStore } from '@/stores/settings'

const fileDrop = vi.hoisted(() => ({ listener: null as ((paths: string[]) => void) | null }))
/** 截获壳注册的菜单命令处理函数，让测试直接驱动「命令到达」这一侧。 */
const menuHandlers = vi.hoisted(() => ({
  handlers: null as Record<string, () => void> | null
}))
const openExternal = vi.hoisted(() => vi.fn<() => Promise<void>>(async () => {}))
const writeClipboardText = vi.hoisted(() => vi.fn<(text: string) => Promise<void>>(async () => {}))

/** 壳注册的 handlers；用例里直接拿到那一份，避免再造一套映射。 */
function menuHandlers_(): Record<string, () => void> {
  const handlers = menuHandlers.handlers
  if (!handlers) throw new Error('AppLayout did not register menu command handlers')
  return handlers
}

/** 等某个断言条件成立，避免用固定次数的 nextTick 猜渲染时机。 */
async function flushUntil(predicate: () => boolean, message: string) {
  for (let attempt = 0; attempt < 50 && !predicate(); attempt += 1) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  if (!predicate()) throw new Error(message)
}

vi.mock('@/services/library', () => ({
  createLibraryRuntime: () => ({
    events: {
      onFilesDropped: (listener: (paths: string[]) => void) => {
        fileDrop.listener = listener
        return () => {
          fileDrop.listener = null
        }
      },
      onURLsDropped: () => () => {}
    },
    system: { openExternal, writeClipboardText }
  })
}))

vi.mock('@/services/menu', () => ({
  onMenuCommand: (handlers: Record<string, () => void>) => {
    menuHandlers.handlers = handlers
    return () => {
      menuHandlers.handlers = null
    }
  }
}))

/**
 * 历史栈能力由 browser-kit 的 history-nav 提供，只有真浏览器里才会有栈；
 * jsdom 里两个 ref 恒为 false。壳与它之间的契约就是这两个 ref，这里把它们变成可控制的，
 * 才能验证「后退/前进是否可用」与菜单置灰、命令执行的关系。
 */
const history = vi.hoisted(() => ({
  canGoBack: null as null | { value: boolean },
  canGoForward: null as null | { value: boolean }
}))
vi.mock('@/composables/useHistoryNav', async () => {
  const { ref } = await import('vue')
  const canGoBack = ref(false)
  const canGoForward = ref(false)
  history.canGoBack = canGoBack
  history.canGoForward = canGoForward
  return { canGoBack, canGoForward, installHistoryNav: () => undefined }
})

/**
 * 菜单可用性上报在壳里是观测不到的外部副作用（它只影响 Go 侧菜单的置灰），
 * 这里截获它，让测试能断言「上报了什么」而不必起 Wails runtime。
 */
const reportDisabled = vi.hoisted(() => vi.fn<(commands: string[]) => Promise<void>>(async () => {}))
vi.mock('@/services/menu/state', async () => {
  const actual = await vi.importActual<typeof menuStateModule>('@/services/menu/state')
  return {
    ...actual,
    createMenuStateRuntime: () => ({ isAvailable: true, reportDisabled })
  }
})

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
        // meta.immersive 没有组件读它：留着这个 meta 做回归哨兵——按 route meta 分叉 shell 会让
        // 切路由时整个 sidebar 被销毁重建，上面两条用例因此会失败。
        { path: '/library', component: LibraryPageStub, meta: { immersive: true } },
        { path: '/map', component: MapPageStub }
      ]
    })
  })

  beforeEach(() => {
    if (history.canGoBack) history.canGoBack.value = false
    if (history.canGoForward) history.canGoForward.value = false
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    reportDisabled.mockClear()
  })

  it('macOS 侧边栏展开时贴顶容纳红绿灯，收起时才留出 40px 顶部间隙', async () => {
    vi.stubGlobal('_wails', { environment: { OS: 'darwin' } })
    await mountLayout()

    expect([...layoutRoot().classList].some(name => name.startsWith('[--wui-layout-sidebar-padding-top:'))).toBe(false)
    expect(navRoot().getAttribute('data-traffic-light-inset')).toBe('true')

    layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed: true } }))
    await nextTick()

    expect(layoutRoot().classList.contains('[--wui-layout-sidebar-padding-top:40px]')).toBe(true)
    expect(navRoot().hasAttribute('data-traffic-light-inset')).toBe(false)
  })

  it.each(['windows', 'linux'])('非 macOS 平台无论展开还是收起都不加红绿灯顶距（%s）', async os => {
    vi.stubGlobal('_wails', { environment: { OS: os } })
    await mountLayout()

    expect([...layoutRoot().classList].some(name => name.startsWith('[--wui-layout-sidebar-padding-top:'))).toBe(false)
    expect(navRoot().hasAttribute('data-traffic-light-inset')).toBe(false)

    layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed: true } }))
    await nextTick()

    expect([...layoutRoot().classList].some(name => name.startsWith('[--wui-layout-sidebar-padding-top:'))).toBe(false)
    expect(navRoot().hasAttribute('data-traffic-light-inset')).toBe(false)
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
   * slot 分配矩阵（sidebar/header/default 各落到哪）不在此复测：jsdom 只能读
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
 * 视口信号由应用订阅媒体查询，并将判定
 * 交给壳。所以拨一次 matchMedia 就同时移动了 layout 的树与壳的 collapse gate，无需等
 * 100ms 去抖。
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

  beforeEach(() => {
    if (history.canGoBack) history.canGoBack.value = false
    if (history.canGoForward) history.canGoForward.value = false
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

    // 换成移动端：layout 切到 drawer，壳的状态同步更新。
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

describe('AppLayout：窗口文件拖放', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub)
    pendingWindowFileDrops.value = []
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        { path: '/library', component: LibraryPageStub },
        { path: '/map', component: MapPageStub }
      ]
    })
  })
  beforeEach(() => {
    if (history.canGoBack) history.canGoBack.value = false
    if (history.canGoForward) history.canGoForward.value = false
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    pendingWindowFileDrops.value = []
    vi.restoreAllMocks()
  })
  it('在其他页面拖入文件时转到资源库并保留路径', async () => {
    await mountLayout()
    await navigate('/map')
    fileDrop.listener?.(['/tmp/photo.png'])
    await router.isReady()
    await nextTick()
    expect(pendingWindowFileDrops.value).toEqual([['/tmp/photo.png']])
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/library'))
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

  beforeEach(() => {
    if (history.canGoBack) history.canGoBack.value = false
    if (history.canGoForward) history.canGoForward.value = false
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    vi.restoreAllMocks()
  })

  /** dialog 受控于宿主的 ref：等它落到期待的状态，而不是假设「一个空 tick」够用。 */
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
    await flushUntil(() => settingsDialog().open, '点击设置入口后 dialog 没有打开')
    expect(settingsDialog().open).toBe(true)

    // 模拟 dialog 发出的受控关闭请求；组件不会自行改 open。
    settingsDialog().dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
    await flushUntil(() => !settingsDialog().open, '关闭请求没有回落到宿主状态')
    expect(settingsDialog().open).toBe(false)
  })
})

describe('AppLayout：设置启动提示', () => {
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
    vi.unstubAllGlobals()
  })

  it('启动警告在 settings.load 落定后提示一次', async () => {
    const warning = vi.spyOn(toast, 'warning').mockReturnValue('')
    await mountLayout()
    const store = useSettingsStore()

    // 模拟 GetSettings 返回：警告随首次快照到达，loaded 同时翻真。
    store.applySnapshot({ ...store.snapshot, warnings: ['设置文件损坏'] })
    await nextTick()

    expect(warning).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledWith('设置文件损坏')
    expect(store.warnings).toEqual([])
  })

  it('设置读写失败提示一次并清空 error', async () => {
    const error = vi.spyOn(toast, 'error').mockReturnValue('')
    await mountLayout()
    const store = useSettingsStore()

    store.error = '保存设置失败'
    await nextTick()

    expect(error).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith('保存设置失败')
    expect(store.error).toBe('')
  })
})

/*
 * 菜单命令分发。
 *
 * 壳订阅的是 backend/menu 的单一事件，但测试里不能起 Wails runtime，所以直接驱动
 * 已注册的处理函数：壳把「命令 → 动作」的对应关系建在 onMenuCommand 的 handlers 上，
 * 这里用模块 mock 截获那份 handlers。
 */
describe('AppLayout：菜单命令', () => {
  // 这个 describe 原本继承了上一组在文件名里共享的 beforeEach；它们声明在别的 describe 里，
  // 不作用于这里，所以 mount 之前必须自己装好 router 与 pinia——否则用例会拿到上一个文件
  // 残留的 router，后退/前进的历史因而不可预期。
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub)
    setActivePinia(createPinia())
    localStorage.clear()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        { path: '/library', component: LibraryPageStub, meta: { immersive: true } },
        { path: '/map', component: MapPageStub }
      ]
    })
    if (history.canGoBack) history.canGoBack.value = false
    if (history.canGoForward) history.canGoForward.value = false
    writeClipboardText.mockClear()
  })

  it('「设置…」打开设置 dialog', async () => {
    await mountLayout()
    const dialog = host.querySelector('web-ui-dialog') as WebUiDialog
    expect(dialog.open).toBe(false)

    menuHandlers_().openSettings()
    await flushUntil(() => dialog.open, '菜单命令没有打开设置 dialog')
    expect(dialog.open).toBe(true)
  })

  it('「切换侧边栏」在桌面端翻转 collapse', async () => {
    await mountLayout()
    expect(layoutRoot().sidebarCollapsed).toBe(false)

    menuHandlers_().toggleSidebar()
    await nextTick()

    expect(layoutRoot().sidebarCollapsed).toBe(true)
    menuHandlers_().toggleSidebar()
    await nextTick()
    expect(layoutRoot().sidebarCollapsed).toBe(false)
  })

  // 「添加资源」是页面域动作：壳负责切到资源库页，再把动作交给页面。
  it('「添加资源」先切到资源库页再派发页面动作', async () => {
    await mountLayout()
    await navigate('/map')

    const received: string[] = []
    const onAdd = () => received.push('add-resource')
    document.addEventListener(MENU_ADD_RESOURCE_EVENT, onAdd)
    try {
      menuHandlers_().addResource()
      await flushUntil(() => received.length > 0, '页面动作没有派发')
      expect(router.currentRoute.value.path).toBe('/library')
      expect(received).toEqual(['add-resource'])
    } finally {
      document.removeEventListener(MENU_ADD_RESOURCE_EVENT, onAdd)
    }
  })

  it('「Interweave 文档」交给系统打开外链', async () => {
    await mountLayout()

    menuHandlers_().openDocumentation()
    await flushUntil(() => openExternal.mock.calls.length > 0, '没有调用外链打开')

    expect(openExternal).toHaveBeenCalledWith('https://github.com/pan-Z2l0aHVi/mono/tree/main/apps/interweave')
  })

  // 菜单禁用集合由壳上报：资源库页命令只在资源库页可用，后退/前进取决于历史栈。
  it('挂载时上报初始禁用集合', async () => {
    await mountLayout()
    await flushUntil(() => reportDisabled.mock.calls.length > 0, '没有上报菜单可用性')

    // 内存路由刚建好，既不能后退也不能前进；起步在 /library。
    expect(reportDisabled).toHaveBeenCalledWith(['navigate-back', 'navigate-forward'])
  })

  it('切到非资源库页后把页面命令加入禁用集合', async () => {
    await mountLayout()
    await flushUntil(() => reportDisabled.mock.calls.length > 0, '没有上报菜单可用性')
    reportDisabled.mockClear()

    await navigate('/map')
    await flushUntil(() => reportDisabled.mock.calls.length > 0, '切页后没有更新菜单可用性')

    expect(reportDisabled).toHaveBeenLastCalledWith([
      'refresh-library',
      'toggle-filter-bar',
      'focus-search',
      'navigate-back',
      'navigate-forward'
    ])
  })

  // 后退/前进由壳直接执行，不落到页面上；能不能走由历史栈的 ref 决定。
  it('「后退」在可以后退时回到上一页', async () => {
    await mountLayout()
    await navigate('/map')
    if (!history.canGoBack) throw new Error('history-nav mock not wired')
    history.canGoBack.value = true
    await nextTick()

    menuHandlers_().navigateBack()
    await flushUntil(() => router.currentRoute.value.path === '/library', '菜单后退没有生效')
    expect(router.currentRoute.value.path).toBe('/library')
  })

  it('「前进」在可以前进时前进一页', async () => {
    await mountLayout()
    await navigate('/map')
    // 前进需要先退回去：只有后退过的历史才有 forward 项。
    router.back()
    await flushUntil(() => router.currentRoute.value.path === '/library', '准备前进历史失败')
    if (!history.canGoForward) throw new Error('history-nav mock not wired')
    history.canGoForward.value = true
    await nextTick()

    menuHandlers_().navigateForward()
    await flushUntil(() => router.currentRoute.value.path === '/map', '菜单前进没有生效')
    expect(router.currentRoute.value.path).toBe('/map')
  })

  it('「后退」在不能后退时不做任何导航', async () => {
    await mountLayout()
    // 起点没有历史，navigate-back 必须保持原地：否则会把用户踢出应用。
    menuHandlers_().navigateBack()
    await nextTick()
    expect(router.currentRoute.value.path).toBe('/library')
  })

  it('「切换筛选栏」「搜索」交给资源库页处理', async () => {
    await mountLayout()
    const received: string[] = []
    const onFilter = () => received.push('filter')
    const onSearch = () => received.push('search')
    document.addEventListener(MENU_TOGGLE_FILTER_BAR_EVENT, onFilter)
    document.addEventListener(MENU_FOCUS_SEARCH_EVENT, onSearch)
    try {
      menuHandlers_().toggleFilterBar()
      menuHandlers_().focusSearch()
      await flushUntil(() => received.length === 2, '页面动作没有派发')
      expect(received).toEqual(['filter', 'search'])
    } finally {
      document.removeEventListener(MENU_TOGGLE_FILTER_BAR_EVENT, onFilter)
      document.removeEventListener(MENU_FOCUS_SEARCH_EVENT, onSearch)
    }
  })

  // 「复制为纯文本」只去掉富文本格式，不改写文本：缩进与首尾空白都属于选区内容。
  it('「复制为纯文本」写入选区原文，保留首尾空白', async () => {
    await mountLayout()
    const paragraph = document.createElement('p')
    paragraph.textContent = '  缩进的片段\n'
    document.body.append(paragraph)
    const selection = window.getSelection()
    if (!selection) throw new Error('Selection API unavailable')
    const range = document.createRange()
    range.selectNodeContents(paragraph)
    selection.removeAllRanges()
    selection.addRange(range)
    try {
      menuHandlers_().copyAsPlainText()
      await flushUntil(() => writeClipboardText.mock.calls.length > 0, '没有写入剪贴板')
      expect(writeClipboardText).toHaveBeenLastCalledWith('  缩进的片段\n')
    } finally {
      selection.removeAllRanges()
      paragraph.remove()
    }
  })
})
