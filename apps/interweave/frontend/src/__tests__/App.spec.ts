// @vitest-environment jsdom

import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick, type App as VueApp } from 'vue'

import type * as SettingsModule from '@/services/settings'
import type { SettingsRuntime, Snapshot } from '@/services/settings'
import { PLACEHOLDER_SNAPSHOT } from '@/services/settings'

import App from '../App.vue'

/*
 * App.vue 模板的 no-reveal 绑定守护。
 *
 * 判据落在 Vue 的属性序列化上：`suppressed || undefined` 为真时写存在、undefined 时
 * removeAttribute。若改成 `:no-reveal="suppressed"`，false 会被写成字符串 "false"，
 * Lit Boolean converter 视为存在，手动切换的外观揭示从此静默失效——组件侧 theme.spec
 * 的用例看不到模板，只有挂载整页能守住。
 *
 * 这里不断言 Lit 的取值：断言的是 Vue 落到 DOM 的 attribute 本身（hasAttribute /
 * getAttribute）。布尔语义另由 web-ui 的 theme.spec 承担。
 */

/** 可手动 flush 的 rAF：composable 把撤层与摘压制排在首帧，测试据此把两步切开。 */
function stubRaf() {
  const queue: Array<() => void> = []
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      queue.push(() => callback(0))
      return queue.length
    })
  )
  return {
    flush: () => {
      for (const run of queue.splice(0)) run()
    }
  }
}

/** 放掉微任务再等 Vue 提交：快照 promise 落定 → loaded 变 true → watch 排队。 */
async function settle(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve))
  await nextTick()
  await nextTick()
}

function mountLayer() {
  const layer = document.createElement('div')
  layer.id = 'startup-layer'
  document.body.append(layer)
  return layer
}

function themeElement(host: HTMLElement): Element | null {
  return host.querySelector('web-ui-theme')
}

const runtimeStub = vi.hoisted(() => ({ current: undefined as unknown }))
const mounted: VueApp[] = []

vi.mock('@/services/settings', async importOriginal => {
  const actual = await importOriginal<typeof SettingsModule>()
  return {
    ...actual,
    createSettingsRuntime: () => {
      if (!runtimeStub.current) throw new Error('测试必须先安装 SettingsRuntime')
      return runtimeStub.current as SettingsRuntime
    }
  }
})

// 壳的整页排版（layout / 导航 / router）不属于本用例的接线面。
vi.mock('@/components/AppLayout.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ name: 'AppLayout', setup: () => () => h('div') }) }
})

// 整页 scrollbar 接管要真实布局，jsdom 下无意义。
vi.mock('overlayscrollbars-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    useOverlayScrollbars: () => [() => {}, () => {}],
    OverlayScrollbarsComponent: defineComponent({
      inheritAttrs: false,
      props: ['options'],
      setup:
        (_, { attrs, slots }) =>
        () =>
          h('div', attrs, slots.default?.())
    })
  }
})

function mountApp(host: HTMLElement, snapshot: Snapshot) {
  runtimeStub.current = {
    isAvailable: true,
    get: async () => snapshot,
    update: async () => snapshot,
    onChanged: () => () => {}
  }
  const app = createApp(App)
  app.use(createPinia())
  mounted.push(app)
  app.mount(host)
}

beforeEach(() => {
  runtimeStub.current = undefined
  // 主题组件 / root-sync 会读系统偏好媒体查询。
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }))
})

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('App 模板：no-reveal 绑定', () => {
  it('启动层在时首帧带属性，快照就绪后的下一帧移除，且从不写成 "false"', async () => {
    mountLayer()
    const { flush } = stubRaf()
    const host = document.createElement('div')
    document.body.append(host)

    mountApp(host, { ...PLACEHOLDER_SNAPSHOT, appearance: 'dark' })

    const theme = themeElement(host)
    expect(theme).not.toBeNull()
    // 首帧：启动层还盖着，揭示必须被压制。属性以「存在」表达，不是字符串 "false"。
    expect(theme!.hasAttribute('no-reveal')).toBe(true)
    expect(theme!.getAttribute('no-reveal')).not.toBe('false')

    // 快照应用后、rAF 前：首次外观提交仍被压制——这正是「logo 收拢」发生的那一帧。
    await settle()
    expect(theme!.hasAttribute('no-reveal')).toBe(true)

    flush()
    await nextTick()
    await nextTick()
    expect(theme!.hasAttribute('no-reveal')).toBe(false)
  })

  it('挂载时启动层已不存在（HMR 重挂载）则不写属性', async () => {
    const { flush } = stubRaf()
    const host = document.createElement('div')
    document.body.append(host)

    mountApp(host, { ...PLACEHOLDER_SNAPSHOT, appearance: 'dark' })

    const theme = themeElement(host)
    expect(theme).not.toBeNull()
    expect(theme!.hasAttribute('no-reveal')).toBe(false)

    flush()
    await settle()
    expect(theme!.hasAttribute('no-reveal')).toBe(false)
  })
})
