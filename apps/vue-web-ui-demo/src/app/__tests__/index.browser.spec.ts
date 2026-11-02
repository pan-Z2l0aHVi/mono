import '@/assets/global.css'

import { toast, type WebUiIcon, type WebUiLayout, type WebUiTheme, type WebUiToast } from '@greypan/web-ui'
import {
  antDesignSyncOutlined,
  icOutlineMotionPhotosOn,
  lucideContrast,
  lucideLanguages,
  lucideSun
} from '@greypan/web-ui/icons'
import { createHead } from '@unhead/vue/client'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, onTestFailed, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { setViewport } from '@/__tests__/viewport'
import { loadDemoLocale } from '@/i18n/locale'

import AppShell from '../index.vue'

/*
 * 应用自己的全局样式必须真的进页面：这一档量的是渲染后的结果，样式没到就只剩一串不生效的
 * 类名，和 jsdom 层没有区别。走与 `main.ts` 相同的普通 `import`，browser mode 会把样式注入
 * 测试页；`import` 失败会看起来是「CSS 进不去」，实际是下面 vite.config 里那条
 * `optimizeDeps.include` 清单不全导致的 mid-run reload（连带把测试模块自己那次 fetch 打掉）。
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 900 }
const MOBILE_VIEWPORT = { width: 568, height: 900 }
const SHORT_TOAST_MESSAGE = 'Short toast'
const LONG_TOAST_MESSAGE =
  '这是一条必须换行的持续通知，用来验证顶部通知变高以后，全局动画和主题选择器的上缘仍然可以点击。'.repeat(3)

const PageStub = defineComponent({ template: '<div data-testid="page" />' })

function layoutRoot() {
  const element = document.querySelector('web-ui-layout') as
    | (HTMLElement & WebUiLayout & { updateComplete: Promise<unknown> })
    | null
  if (!element) throw new Error('web-ui-layout not found')
  return element
}

function bannerIsOpen() {
  return document.querySelector('[slot="banner"]') !== null
}

function bannerCloseButton() {
  const button = document.querySelector('[slot="banner"] web-ui-button')
  if (!button) throw new Error('banner close button not found')
  return button
}

/** 单次 Playwright click 的动作预算；超时由 Playwright 自己 reject，不占满整个测试预算。 */
const CLICK_ATTEMPT_TIMEOUT_MS = 2_000
/** 点击的有界重试轮数；每轮重新解析节点、重新量中心、重新做命中测试。 */
const CLICK_MAX_ATTEMPTS = 3

/**
 * 点 banner 关闭按钮中心，成功判据是 banner 已从 DOM 消失，而不是 click 没有抛错：banner 是
 * v-if 节点，关闭按钮是唯一把它摘掉的动作；Playwright 可能在 click 已经生效、节点被摘掉之后
 * 仍然报错，此时按「click 没抛错」判负，下一次重试只会去解析一个已经不存在的按钮，把已达成的
 * 目标状态变成 `banner close button not found`。所以调用前 banner 已不存在、或任一轮之后 banner
 * 消失，都按成功返回；banner 还在时才继续解析、命中测试与重试。
 *
 * banner 还在时，toast 挂载后 header bottom 会经 rAF 改 `--wui-toast-top-offset`，布局在点击前后
 * 都可能再位移；所以每一轮都重新取按钮、重新量中心、重新做命中测试，跨轮不缓存任何节点或坐标。
 *
 * 点击本身也按轮给 Playwright 一个有界预算：它默认的重试预算等于整个 Vitest 测试预算，一次 stall
 * 就吃掉 15s，失败只剩 “timed out while waiting for click”。每轮超时后把 Playwright 的原始报错
 * 收进聚合错误，全部失败且 banner 仍在时一次抛出；命中测试本身仍由 `vi.waitFor` 在自己的窗口里重试。
 */
async function clickBannerCloseButtonAtCenter() {
  const failures: string[] = []
  for (let attempt = 1; attempt <= CLICK_MAX_ATTEMPTS; attempt += 1) {
    if (!bannerIsOpen()) return

    let button: Element
    try {
      button = await vi.waitFor(
        () => {
          const button = bannerCloseButton()
          const bounds = button.getBoundingClientRect()
          const x = bounds.left + bounds.width / 2
          const y = bounds.top + bounds.height / 2

          const hitTarget = document.elementFromPoint(x, y)
          expect(
            hitTarget === button || (hitTarget !== null && button.contains(hitTarget)),
            `banner close button center (${x}, ${y}) should hit the button or its contents`
          ).toBe(true)

          return button
        },
        { timeout: 5_000 }
      )
    } catch (error) {
      // 解析窗口内 banner 被顶掉同样是关闭已完成；banner 还在才是真的找不到按钮。
      if (!bannerIsOpen()) return
      throw error
    }

    try {
      await userEvent.click(button, { timeout: CLICK_ATTEMPT_TIMEOUT_MS })
      return
    } catch (error) {
      failures.push(`attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 最后一轮 click 可能已经关掉了 banner，只是 Playwright 在节点被摘掉后才报错。
  if (!bannerIsOpen()) return

  throw new Error(
    `banner close button click failed after ${CLICK_MAX_ATTEMPTS} attempts of ` +
      `${CLICK_ATTEMPT_TIMEOUT_MS}ms each:\n\n${failures.join('\n\n')}`
  )
}

function globalSelectTrigger(label: string) {
  const trigger = document
    .querySelector(`web-ui-select[aria-label="${label}"]`)
    ?.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
  if (!trigger) throw new Error(`${label} select trigger not found`)
  return trigger
}

async function clickGlobalSelectsAtTopEdge(mark: (step: string) => void = () => {}) {
  for (const label of ['Global motion', 'Global theme']) {
    mark(`${label}: hit test`)
    const select = document.querySelector<HTMLElement>(`web-ui-select[aria-label="${label}"]`)
    if (!select) throw new Error(`${label} select not found`)
    await vi.waitFor(() => {
      const bounds = select.getBoundingClientRect()
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + 1)
      expect(hit === select, `${label} top edge at y=${bounds.top + 1} hit ${hit?.tagName}`).toBe(true)
    })

    const bounds = select.getBoundingClientRect()
    mark(`${label}: click`)
    await userEvent.click(select, { position: { x: bounds.width / 2, y: 1 } })
    const trigger = globalSelectTrigger(label)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    mark(`${label}: Escape`)
    await userEvent.keyboard('{Escape}')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    mark(`${label}: closed`)
  }
}

async function persistentTopToast(message: string) {
  const id = toast.info(message, { duration: 0 })
  let element: WebUiToast | undefined
  await vi.waitFor(() => {
    element = Array.from(themeOverlayRoot()?.querySelectorAll<WebUiToast>('web-ui-toast') ?? []).find(
      toastElement => toastElement.toastId === id
    )
    expect(element?.visible).toBe(true)
  })
  if (!element) throw new Error('persistent top toast not found')
  return element
}

function themeOverlayRoot(theme = document.querySelector('web-ui-theme')) {
  return (theme as WebUiTheme | null)?.getOverlayRoot()
}

function navRoot() {
  const element = document.querySelector('[aria-label="App navigation"]')
  if (!element) throw new Error('sidebar nav not found')
  return element
}

function isDrawerMode() {
  return !!layoutRoot().shadowRoot?.querySelector('web-ui-drawer')
}

/** collapsed state 居中显示完整导航名（放不下由 CSS 省略），expanded state 左对齐。 */
function navItemAlignment() {
  const link = navRoot().querySelector('a')
  if (!link) throw new Error('nav link not found')
  const label = link.querySelector('span')
  if (!label) throw new Error('nav label not found')

  return {
    rowJustify: getComputedStyle(link).justifyContent,
    labelAlign: getComputedStyle(label).textAlign
  }
}

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/home' },
      { path: '/home', component: PageStub },
      { path: '/:pathMatch(.*)*', component: PageStub }
    ]
  })
}

let wrapper: VueWrapper | null = null

async function mountAppShell() {
  const router = buildRouter()
  wrapper = mount(AppShell, {
    attachTo: document.body,
    global: { plugins: [router, createHead()] }
  })
  // memory history 的首次导航由 mount 触发，`isReady()` 只能在挂载之后等。
  await router.isReady()
  await nextTick()
  await layoutRoot().updateComplete
}

/** 复刻 layout 侧边栏 Toggle 的请求链路：layout 只派发请求，宿主回写受控属性。 */
async function requestCollapse(collapsed: boolean) {
  layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  await nextTick()
  await layoutRoot().updateComplete
}

/**
 * 换的是真实视口（`setViewport`），app 的 media query 与 layout 的 `innerWidth` 判定都
 * 由引擎自己给出结论；等的是 drawer 形态真的换了，而不是一段固定时长。
 */
async function settleViewport(drawerMode: boolean) {
  await vi.waitFor(() => {
    if (isDrawerMode() !== drawerMode) throw new Error(`drawer 形态没有变成 ${drawerMode}`)
  })
  await nextTick()
  await layoutRoot().updateComplete
}

/** 点 layout 自己的移动端入口 button 打开 drawer（真实点击，不是直接写 props）。 */
async function openDrawer() {
  const toggle = layoutRoot().shadowRoot?.querySelector<HTMLElement>('.mobile-toggle')
  if (!toggle) throw new Error('mobile toggle not found')

  await userEvent.click(toggle)
  await vi.waitFor(() => {
    if (navRoot().getBoundingClientRect().width === 0) throw new Error('drawer 没有打开')
  })
  await nextTick()
  await layoutRoot().updateComplete
}

describe('应用外壳（浏览器）：导航 collapsed state 不跨视口泄漏', () => {
  beforeEach(async () => {
    await loadDemoLocale('en', false)
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  })

  afterEach(async () => {
    toast.clear()
    wrapper?.unmount()
    wrapper = null
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  })

  const toastCases = [
    { width: 1280, message: SHORT_TOAST_MESSAGE, multiline: false },
    { width: 1280, message: LONG_TOAST_MESSAGE, multiline: true },
    { width: 390, message: SHORT_TOAST_MESSAGE, multiline: false },
    { width: 390, message: LONG_TOAST_MESSAGE, multiline: true }
  ]
  const toastStages = ['banner-visible', 'banner-closed', 'toast-cleared'] as const

  it.each(toastCases.flatMap(testCase => toastStages.map(stage => ({ ...testCase, stage }))))(
    '$width px 下 top toast multiline=$multiline、$stage 时两个全局 select 上缘可点击',
    async ({ width, message, multiline, stage }) => {
      const started = performance.now()
      const stages: string[] = []
      const mark = (step: string) => stages.push(`${step}: ${Math.round(performance.now() - started)}ms`)
      onTestFailed(() => console.error(`top toast test stages: ${stages.join(', ')}`))

      mark('set viewport')
      await setViewport(width, DESKTOP_VIEWPORT.height)
      mark('mount shell')
      await mountAppShell()
      mark('show toast')
      const toastElement = await persistentTopToast(message)
      const messageElement = toastElement.shadowRoot?.querySelector<HTMLElement>('.toast-message')
      if (!messageElement) throw new Error('toast message not found')
      const lineHeight = Number.parseFloat(getComputedStyle(messageElement).lineHeight)
      expect(messageElement.getBoundingClientRect().height > lineHeight * 1.5).toBe(multiline)

      if (stage !== 'banner-visible') {
        mark('close banner')
        await clickBannerCloseButtonAtCenter()
      }
      if (stage === 'toast-cleared') {
        mark('clear toast')
        toast.clear()
        await vi.waitFor(() => {
          if (document.querySelector('[slot="banner"]')) throw new Error('banner did not close')
        })
      }
      await clickGlobalSelectsAtTopEdge(mark)
    }
  )

  it('top toast 文案和字号变化不改变 header 位置', async () => {
    await mountAppShell()
    const toastElement = await persistentTopToast(SHORT_TOAST_MESSAGE)
    await clickBannerCloseButtonAtCenter()
    await clickGlobalSelectsAtTopEdge()
    const shortTop = globalSelectTrigger('Global theme').getBoundingClientRect().top
    const shortHeight = toastElement.getBoundingClientRect().height

    toast.info(LONG_TOAST_MESSAGE, { id: toastElement.toastId })
    await vi.waitFor(() => expect(toastElement.getBoundingClientRect().height).toBeGreaterThan(shortHeight))
    await clickGlobalSelectsAtTopEdge()
    const longTop = globalSelectTrigger('Global theme').getBoundingClientRect().top
    expect(longTop).toBeCloseTo(shortTop)
    const longHeight = toastElement.getBoundingClientRect().height

    toastElement.style.setProperty('--wui-font-size', '24px')
    await vi.waitFor(() => expect(toastElement.getBoundingClientRect().height).toBeGreaterThan(longHeight))
    await clickGlobalSelectsAtTopEdge()
    expect(globalSelectTrigger('Global theme').getBoundingClientRect().top).toBeCloseTo(shortTop)

    toastElement.style.removeProperty('--wui-font-size')
    toast.info(SHORT_TOAST_MESSAGE, { id: toastElement.toastId })
    await vi.waitFor(() => expect(globalSelectTrigger('Global theme').getBoundingClientRect().top).toBe(shortTop))
    await clickGlobalSelectsAtTopEdge()
  })

  it('top toast 堆栈增长时不改变 banner 和 header 高度，并从 header 下方开始', async () => {
    await mountAppShell()
    const banner = document.querySelector<HTMLElement>('[slot="banner"]')!
    const bannerHeight = banner.getBoundingClientRect().height
    const header = layoutRoot().querySelector<HTMLElement>('[slot="header"]')!
    const headerHeight = header.getBoundingClientRect().height
    const firstToast = await persistentTopToast(LONG_TOAST_MESSAGE)
    toast.info(LONG_TOAST_MESSAGE, { duration: 0 })
    const container = firstToast.parentElement!
    await vi.waitFor(() => expect(container.querySelectorAll('web-ui-toast[visible]').length).toBe(2))

    expect(banner.getBoundingClientRect().height).toBeCloseTo(bannerHeight)
    expect(header.getBoundingClientRect().height).toBeCloseTo(headerHeight)
    await vi.waitFor(() => {
      const toastTop = Math.min(
        ...Array.from(container.querySelectorAll('web-ui-toast'), element => element.getBoundingClientRect().top)
      )
      expect(toastTop).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom)
    })
  })

  it('banner 关闭后 toast 显示与隐藏都不会重新占位', async () => {
    await mountAppShell()
    await clickBannerCloseButtonAtCenter()
    await vi.waitFor(() => {
      if (document.querySelector('[slot="banner"]')) throw new Error('banner stayed open without a toast')
    })
    expect(document.querySelector('[slot="banner"]')).toBeNull()

    wrapper?.unmount()
    wrapper = null
    await mountAppShell()

    const toastId = toast.info('Persistent toast for the banner test', {
      id: 'vue-banner-close-regression',
      duration: 0
    })
    expect(toastId).toBe('vue-banner-close-regression')
    await vi.waitFor(() => {
      const toastElement = themeOverlayRoot()?.querySelector('web-ui-toast')
      if (!toastElement) throw new Error('persistent toast did not mount')
    })

    await clickBannerCloseButtonAtCenter()
    await vi.waitFor(() => {
      if (document.querySelector('[slot="banner"]')) throw new Error('banner stayed visible with a toast')
    })

    expect(themeOverlayRoot()?.querySelector('web-ui-toast')).not.toBeNull()
    await clickGlobalSelectsAtTopEdge()

    toast.clear()
    await vi.waitFor(() => {
      if (document.querySelector('[slot="banner"]')) throw new Error('empty banner space stayed after toast closed')
    })

    toast.info('Bottom toast should not reserve banner space', {
      id: 'vue-bottom-banner-close-regression',
      duration: 0,
      position: 'bottom-right'
    })
    await vi.waitFor(() => {
      if (!themeOverlayRoot()?.querySelector('web-ui-toast')) throw new Error('bottom toast did not mount')
      if (document.querySelector('[slot="banner"]')) throw new Error('bottom toast reserved banner space')
    })
    toast.clear()
    await vi.waitFor(() => {
      if (themeOverlayRoot()?.querySelector('web-ui-toast')) throw new Error('bottom toast stayed mounted')
    })

    const shadowHost = document.createElement('div')
    try {
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
      const nestedTheme = document.createElement('web-ui-theme') as WebUiTheme
      const target = document.createElement('button')
      nestedTheme.append(target)
      shadowRoot.append(nestedTheme)
      document.body.append(shadowHost)
      await nestedTheme.updateComplete
      await vi.waitFor(() => expect(document.querySelector('[slot="banner"]')).toBeNull())

      nestedTheme.setAttribute('appearance', 'dark')
      await nestedTheme.updateComplete
      await vi.waitFor(() => expect(document.querySelector('[slot="banner"]')).toBeNull())

      toast.info('Persistent scoped toast for the banner test', {
        id: 'vue-scoped-banner-close-regression',
        duration: 0,
        target
      })
      await vi.waitFor(() => {
        if (!nestedTheme.getOverlayRoot()?.querySelector('web-ui-toast')) {
          throw new Error('scoped toast did not mount in the nested theme')
        }
        if (document.querySelector('[slot="banner"]')) throw new Error('nested scoped toast reserved banner space')
      })

      toast.clear()
      await vi.waitFor(() => {
        if (nestedTheme.getOverlayRoot()?.querySelector('web-ui-toast')) throw new Error('scoped toast stayed mounted')
      })
    } finally {
      shadowHost.remove()
    }
  })

  it('banner 关闭按钮桌面端与移动端都靠右', async () => {
    await mountAppShell()
    const banner = document.querySelector<HTMLElement>('[slot="banner"]')
    if (!banner) throw new Error('banner not found')
    const button = bannerCloseButton()
    const label = banner.querySelector<HTMLElement>('span')
    if (!label) throw new Error('banner label not found')

    // 距中线的有符号距离：靠右取按钮左边减中线，应为正；同时校验按钮与文案的垂直居中和文案居中。
    const expectRightSide = () =>
      vi.waitFor(() => {
        const bannerBounds = banner.getBoundingClientRect()
        const buttonBounds = button.getBoundingClientRect()
        const labelBounds = label.getBoundingClientRect()
        const midpoint = bannerBounds.left + bannerBounds.width / 2
        expect(buttonBounds.left - midpoint).toBeGreaterThan(0)
        expect(labelBounds.left + labelBounds.width / 2).toBeCloseTo(midpoint, 0)
        expect(buttonBounds.top + buttonBounds.height / 2).toBeCloseTo(bannerBounds.top + bannerBounds.height / 2, 0)
      })

    await expectRightSide()

    await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
    await settleViewport(true)
    await expectRightSide()
  })

  it('全局选择器与导航暴露本地化的可访问名称和选项', async () => {
    await mountAppShell()
    const expectedOptions: Record<string, string[]> = {
      'Global motion': ['Full motion', 'Reduced motion', 'Follow system'],
      'Global theme': ['Light', 'Dark', 'Follow system']
    }

    for (const [label, options] of Object.entries(expectedOptions)) {
      const select = document.querySelector<HTMLElement>(`web-ui-select[aria-label="${label}"]`)
      if (!select) throw new Error(`${label} select not found`)
      expect(
        Array.from(select.querySelectorAll('web-ui-option')).map(option => option.textContent?.trim() ?? '')
      ).toEqual(options)
      globalSelectTrigger(label)
    }

    expect(navRoot().getAttribute('aria-label')).toBe('App navigation')
    expect(document.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull()
    expect(
      [...document.querySelectorAll('nav[aria-label="Main navigation"] h2')].map(heading => heading.textContent?.trim())
    ).toEqual(['General', 'Layout', 'Forms', 'Display', 'Feedback'])
    expect(
      [...document.querySelectorAll('nav[aria-label="Main navigation"] [role="group"]')].map(group => [
        group.querySelector('h2')?.textContent?.trim(),
        [...group.querySelectorAll('a')].map(link => link.getAttribute('aria-label'))
      ])
    ).toEqual([
      ['General', ['Button', 'Icon']],
      ['Layout', ['Layout', 'BackTop', 'Theme']],
      [
        'Forms',
        [
          'Input',
          'Textarea',
          'InputNumber',
          'Select',
          'Autocomplete',
          'Switch',
          'Slider',
          'Radio',
          'Checkbox',
          'Segmented'
        ]
      ],
      ['Display', ['Collapse', 'EditableText', 'Empty', 'MiddleEllipsis', 'SVGDrawLines', 'Avatar', 'Badge']],
      [
        'Feedback',
        [
          'Dialog',
          'Drawer',
          'Tooltip',
          'Popover',
          'Dropdown',
          'ContextMenu',
          'Toast',
          'ImagePreview',
          'Spinner',
          'Progress'
        ]
      ]
    ])
    await loadDemoLocale('zh-CN', false)
    await nextTick()
    expect(document.querySelector('nav[aria-label="主导航"]')).not.toBeNull()
    expect(
      [...document.querySelectorAll('nav[aria-label="主导航"] h2')].map(heading => heading.textContent?.trim())
    ).toEqual(['通用', '布局', '表单', '展示', '反馈'])
    expect(document.querySelector('web-ui-select[aria-label="全局动效"]')).not.toBeNull()
  })

  it('全局图标触发器与选中值同步', async () => {
    await mountAppShell()

    const selectOf = (label: string) => {
      const select = document.querySelector<HTMLElement & { value: string }>(`web-ui-select[aria-label="${label}"]`)
      if (!select) throw new Error(`${label} select not found`)
      return select
    }
    const iconOf = (label: string) => selectOf(label).querySelector<WebUiIcon>('[slot="trigger"]')
    const pick = async (label: string, value: string) => {
      const select = selectOf(label)
      select.value = value
      select.dispatchEvent(new Event('change', { bubbles: true }))
      await nextTick()
    }

    await pick('Global motion', 'full')
    expect(iconOf('Global motion')?.icon).toBe(icOutlineMotionPhotosOn)

    await pick('Global motion', 'system')
    expect(iconOf('Global motion')?.icon).toBe(antDesignSyncOutlined)

    await pick('Global theme', 'system')
    expect(iconOf('Global theme')?.icon).toBe(lucideContrast)
    expect(iconOf('Global language')?.icon).toBe(lucideLanguages)

    await pick('Global theme', 'light')
    expect(iconOf('Global theme')?.icon).toBe(lucideSun)
  })

  it('320px 下三个全局选择器全部留在视口内，page 不产生横向滚动', async () => {
    await setViewport(320, 700)
    await mountAppShell()

    const selects = [...document.querySelectorAll<HTMLElement>('web-ui-select')]
    expect(selects).toHaveLength(3)
    for (const select of selects) {
      const bounds = select.getBoundingClientRect()
      expect(bounds.width).toBeGreaterThan(0)
      expect(bounds.left).toBeGreaterThanOrEqual(0)
      expect(bounds.right).toBeLessThanOrEqual(document.documentElement.clientWidth + 0.5)
    }
    expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth)
    const header = layoutRoot().querySelector<HTMLElement>('[slot="header"]')!
    const headerPaddingRight = Number.parseFloat(getComputedStyle(header).paddingRight)
    const lastRight = Math.max(...selects.map(select => select.getBoundingClientRect().right))
    expect(lastRight).toBeCloseTo(header.getBoundingClientRect().right - headerPaddingRight)
  })

  it('桌面端 collapsed state 沿用完整导航名、超出部分省略，并通过 title 提供完整 label', async () => {
    await mountAppShell()
    const links = [...navRoot().querySelectorAll<HTMLAnchorElement>('a')]
    const expandedLabels = links.map(link => link.querySelector('span')?.textContent?.trim() ?? '')
    expect(links.length).toBeGreaterThan(0)

    await requestCollapse(true)

    const collapsedEntries = links.map(link => {
      const label = link.querySelector('span')

      return {
        accessibleName: link.getAttribute('aria-label'),
        visibleLabel: label?.textContent?.trim() ?? '',
        labelClientWidth: label?.clientWidth ?? 0,
        labelRight: label?.getBoundingClientRect().right ?? 0,
        linkRight: link.getBoundingClientRect().right,
        tooltip: link.getAttribute('title')
      }
    })

    // 折叠导轨不再另设两套短名：可见文字仍是完整导航名，放不下交给 CSS 省略，文字不越出导轨。
    expect(collapsedEntries.map(entry => entry.visibleLabel)).toEqual(expandedLabels)
    expect(collapsedEntries.every(entry => entry.labelClientWidth > 0)).toBe(true)
    expect(collapsedEntries.every(entry => entry.labelRight <= entry.linkRight + 0.5)).toBe(true)
    expect(
      collapsedEntries.every(
        entry =>
          entry.visibleLabel && entry.accessibleName === entry.visibleLabel && entry.tooltip === entry.accessibleName
      )
    ).toBe(true)

    await requestCollapse(false)

    expect(links.map(link => link.querySelector('span')?.textContent?.trim() ?? '')).toEqual(expandedLabels)
    expect(links.slice(2).every(link => !link.hasAttribute('title'))).toBe(true)
    expect(links.slice(0, 2).map(link => link.getAttribute('title'))).toEqual(['Components', 'Changelog'])
  })

  it('桌面端 collapse 后导航文字居中，expanded state 左对齐', async () => {
    await mountAppShell()
    const expanded = navItemAlignment()
    expect(expanded.rowJustify).not.toBe('center')
    expect(expanded.labelAlign).not.toBe('center')

    await requestCollapse(true)
    const collapsed = navItemAlignment()

    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    // collapse 换了一套渲染，且换成的就是「文字居中」那一套。
    expect(collapsed).not.toEqual(expanded)
    expect(collapsed.rowJustify).toBe('center')
    expect(collapsed.labelAlign).toBe('center')
  })

  it('移动端断点下 drawer 里的导航回到 expanded state，而不是桌面 collapsed state', async () => {
    await mountAppShell()
    const expanded = navItemAlignment()

    await requestCollapse(true)
    const collapsed = navItemAlignment()
    // 对照：collapse 确实换了一套渲染，否则下面那条「与 expanded state 一致」可能只是因为 collapse 从未生效。
    expect(collapsed).not.toEqual(expanded)

    await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
    await settleViewport(true)
    await openDrawer()

    // 前提：collapse preference 仍写在 layout 上，且 drawer 此刻真的是当前形态。
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemAlignment()).toEqual(expanded)
  })

  it('跨断点往返后桌面 collapsed state 恢复', async () => {
    await mountAppShell()
    const expanded = navItemAlignment()

    await requestCollapse(true)
    const collapsed = navItemAlignment()

    await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
    await settleViewport(true)
    await openDrawer()
    expect(navItemAlignment()).toEqual(expanded)

    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
    await settleViewport(false)

    expect(navItemAlignment()).toEqual(collapsed)
  })
})
