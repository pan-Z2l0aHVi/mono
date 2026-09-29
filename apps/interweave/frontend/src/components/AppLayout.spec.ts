// @vitest-environment jsdom

import '@greypan/web-ui'
import type { WebUiDialog } from '@greypan/web-ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import AppLayout from './AppLayout.vue'

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

  it('AppNav 落在 sidebar slot，页面内容落在 main', async () => {
    await mountLayout()

    expect(assignedTo('sidebar')).toContain(navRoot())
    expect(assignedTo('default').map(element => element.getAttribute('data-testid'))).toEqual(['page-body'])
  })

  it('页面根节点的 slot="header" 投进 layout 的 header slot', async () => {
    await mountLayout()

    expect(assignedTo('header').map(element => element.getAttribute('data-testid'))).toEqual(['page-header'])
  })

  it('切到无 header 的页面时 header slot 清空，不残留上一页的工具条', async () => {
    await mountLayout()
    await navigate('/map')

    expect(assignedTo('header')).toEqual([])
    expect(assignedTo('default').map(element => element.textContent)).toEqual(['关系图谱'])
  })
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
