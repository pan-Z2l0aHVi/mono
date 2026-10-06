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

/** jsdom 不实现 matchMedia；AppLayout 的侧边栏宽度用它切移动端分支。 */
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
  // AppLayout 挂着设置对话框，对话框读 settings store；跟 main.ts 一样装 pinia。
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
   * 这里保留它，是因为设置对话框的挂载位置是本组件自有的接线（见下方用例）。
   */
})

describe('AppLayout：设置对话框接线', () => {
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

  /** 对话框受控于宿主的 ref，Lit 侧属性写入后再等一轮微任务让 shadow 跟上。 */
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

  it('对话框是 web-ui-layout 的同级节点，不落在 sidebar slot 里', async () => {
    await mountLayout()

    expect(settingsDialog().parentElement).toBe(host)
    expect(assignedTo('sidebar')).not.toContain(settingsDialog())
  })

  it('点击侧边栏设置入口打开对话框，关闭请求回落到宿主状态', async () => {
    await mountLayout()
    expect(settingsDialog().open).toBe(false)

    const trigger = host.querySelector<HTMLElement>('button[aria-label="设置"]')
    if (!trigger) throw new Error('settings trigger not found')
    trigger.click()
    await flush()
    expect(settingsDialog().open).toBe(true)

    // Escape 与遮罩点击都走这条 open-change；controlled 下组件不会自行改 open。
    settingsDialog().dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
    await flush()
    expect(settingsDialog().open).toBe(false)
  })
})
