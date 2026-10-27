import '@/assets/global.css'

import { toast, type WebUiLayout, type WebUiTheme, type WebUiToast } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { setViewport } from '@/__tests__/viewport'

import AppShell from '../index.vue'

/*
 * 应用自己的全局样式必须真的进页面：这一档量的是渲染后的结果，样式没到就只剩一串不生效的
 * 类名，和 jsdom 层没有区别。走与 `main.ts` 相同的普通 `import`，browser mode 会把样式注入
 * 测试页；`import` 失败曾经看起来是「CSS 进不去」，实际是下面 vite.config 里那条
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

function bannerCloseButton() {
  const button = document.querySelector('[slot="banner"] web-ui-button')
  if (!button) throw new Error('banner close button not found')
  return button
}

/** userEvent targets directly, so first confirm the button wins hit-testing at its center. */
async function clickBannerCloseButtonAtCenter() {
  const button = bannerCloseButton()
  const bounds = button.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  const y = bounds.top + bounds.height / 2
  const hitTarget = document.elementFromPoint(x, y)

  expect(
    hitTarget === button || (hitTarget !== null && button.contains(hitTarget)),
    `banner close button center (${x}, ${y}) should hit the button or its contents`
  ).toBe(true)
  if (!hitTarget) throw new Error('banner close button center had no hit target')
  await userEvent.click(hitTarget as HTMLElement)
}

function globalSelectTrigger(label: string) {
  const trigger = document
    .querySelector(`web-ui-select[aria-label="${label}"]`)
    ?.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
  if (!trigger) throw new Error(`${label} select trigger not found`)
  return trigger
}

async function clickGlobalSelectsAtTopEdge() {
  for (const label of ['全局动效', '全局主题']) {
    const select = document.querySelector<HTMLElement>(`web-ui-select[aria-label="${label}"]`)
    if (!select) throw new Error(`${label} select not found`)
    await vi.waitFor(() => {
      const bounds = select.getBoundingClientRect()
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + 1)
      expect(hit === select, `${label} top edge at y=${bounds.top + 1} hit ${hit?.tagName}`).toBe(true)
    })

    const bounds = select.getBoundingClientRect()
    await userEvent.click(select, { position: { x: bounds.width / 2, y: 1 } })
    const trigger = globalSelectTrigger(label)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await userEvent.keyboard('{Escape}')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
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
  const element = document.querySelector('[aria-label="应用导航"]')
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
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  })

  afterEach(async () => {
    toast.clear()
    wrapper?.unmount()
    wrapper = null
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  })

  it.each([
    { width: 1280, message: SHORT_TOAST_MESSAGE, multiline: false },
    { width: 1280, message: LONG_TOAST_MESSAGE, multiline: true },
    { width: 390, message: SHORT_TOAST_MESSAGE, multiline: false },
    { width: 390, message: LONG_TOAST_MESSAGE, multiline: true }
  ])(
    '$width px 下 top toast multiline=$multiline 时两个全局 select 上缘可点击',
    async ({ width, message, multiline }) => {
      await setViewport(width, DESKTOP_VIEWPORT.height)
      await mountAppShell()
      const toastElement = await persistentTopToast(message)
      const messageElement = toastElement.shadowRoot?.querySelector<HTMLElement>('.toast-message')
      if (!messageElement) throw new Error('toast message not found')
      const lineHeight = Number.parseFloat(getComputedStyle(messageElement).lineHeight)
      expect(messageElement.getBoundingClientRect().height > lineHeight * 1.5).toBe(multiline)

      await clickGlobalSelectsAtTopEdge()
      await clickBannerCloseButtonAtCenter()
      await clickGlobalSelectsAtTopEdge()

      toast.clear()
      await vi.waitFor(() => expect(document.querySelector('[slot="banner"]')).toBeNull())
      await clickGlobalSelectsAtTopEdge()
    }
  )

  it('已显示的 top toast 文案和字号变化时预留空间跟随，缩短后复原', async () => {
    await mountAppShell()
    const toastElement = await persistentTopToast(SHORT_TOAST_MESSAGE)
    await clickBannerCloseButtonAtCenter()
    await clickGlobalSelectsAtTopEdge()
    const shortTop = globalSelectTrigger('全局主题').getBoundingClientRect().top
    const shortHeight = toastElement.getBoundingClientRect().height

    toast.info(LONG_TOAST_MESSAGE, { id: toastElement.toastId })
    await vi.waitFor(() => expect(toastElement.getBoundingClientRect().height).toBeGreaterThan(shortHeight))
    await clickGlobalSelectsAtTopEdge()
    const longTop = globalSelectTrigger('全局主题').getBoundingClientRect().top
    expect(longTop).toBeGreaterThan(shortTop)
    const longHeight = toastElement.getBoundingClientRect().height

    toastElement.style.setProperty('--wui-font-size', '24px')
    await vi.waitFor(() => expect(toastElement.getBoundingClientRect().height).toBeGreaterThan(longHeight))
    await clickGlobalSelectsAtTopEdge()
    expect(globalSelectTrigger('全局主题').getBoundingClientRect().top).toBeGreaterThan(longTop)

    toastElement.style.removeProperty('--wui-font-size')
    toast.info(SHORT_TOAST_MESSAGE, { id: toastElement.toastId })
    await vi.waitFor(() => expect(globalSelectTrigger('全局主题').getBoundingClientRect().top).toBe(shortTop))
    await clickGlobalSelectsAtTopEdge()
  })

  it('top toast 堆栈溢出时只预留可见区域，滚动后重新测量', async () => {
    await setViewport(DESKTOP_VIEWPORT.width, 400)
    await mountAppShell()
    const firstToast = await persistentTopToast(LONG_TOAST_MESSAGE)
    await userEvent.hover(firstToast)
    for (let index = 0; index < 8; index++) toast.info(LONG_TOAST_MESSAGE, { duration: 0 })
    const container = firstToast.parentElement!
    await vi.waitFor(() => expect(container.querySelectorAll('web-ui-toast[visible]').length).toBe(9))
    expect(container.scrollHeight).toBeGreaterThan(container.clientHeight)
    const banner = document.querySelector<HTMLElement>('[slot="banner"]')!
    await vi.waitFor(() => expect(banner.getBoundingClientRect().bottom).toBe(innerHeight))
    const beforeScroll = banner.getBoundingClientRect().bottom

    container.scrollTop = container.scrollHeight
    await vi.waitFor(() => expect(banner.getBoundingClientRect().bottom).toBeLessThan(beforeScroll))
    const bottom = Math.max(
      ...Array.from(container.querySelectorAll('web-ui-toast'), element => element.getBoundingClientRect().bottom)
    )
    expect(banner.getBoundingClientRect().bottom).toBeCloseTo(bottom)
  })

  it('右上角 toast 显示与隐藏时 banner 关闭按钮都可用', async () => {
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
      const banner = document.querySelector<HTMLElement>('[slot="banner"]')
      if (!banner || getComputedStyle(banner).visibility !== 'hidden') {
        throw new Error('banner stayed visible with a toast')
      }
    })

    expect(document.querySelector('[slot="banner"]')).not.toBeNull()
    expect(themeOverlayRoot()?.querySelector('web-ui-toast')).not.toBeNull()

    for (const label of ['全局动效', '全局主题']) {
      const trigger = globalSelectTrigger(label)
      await userEvent.click(trigger)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      await userEvent.keyboard('{Escape}')
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    }

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
      const banner = document.querySelector<HTMLElement>('[slot="banner"]')
      if (!banner || getComputedStyle(banner).visibility !== 'hidden') {
        throw new Error('nested scoped toast did not reserve banner space')
      }
    })

    toast.clear()
    await vi.waitFor(() => {
      if (nestedTheme.getOverlayRoot()?.querySelector('web-ui-toast')) throw new Error('scoped toast stayed mounted')
    })
    shadowHost.remove()
  })

  it('banner 关闭按钮桌面端靠右、移动端靠左', async () => {
    await mountAppShell()
    const banner = document.querySelector<HTMLElement>('[slot="banner"]')
    if (!banner) throw new Error('banner not found')
    const button = bannerCloseButton()

    // 距中线的有符号距离：靠右取按钮左边减中线，靠左取中线减按钮右边，都应为正。
    const expectSide = (side: 'left' | 'right') =>
      vi.waitFor(() => {
        const bannerBounds = banner.getBoundingClientRect()
        const buttonBounds = button.getBoundingClientRect()
        const midpoint = bannerBounds.left + bannerBounds.width / 2
        const distance = side === 'right' ? buttonBounds.left - midpoint : midpoint - buttonBounds.right
        expect(distance).toBeGreaterThan(0)
      })

    await expectSide('right')

    await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
    await settleViewport(true)
    await expectSide('left')
  })

  it('全局选择器与导航暴露本地化的可访问名称和选项', async () => {
    await mountAppShell()
    const expectedOptions: Record<string, string[]> = {
      全局动效: ['完整动效', '减弱动效', '跟随系统'],
      全局主题: ['浅色', '深色', '跟随系统']
    }

    for (const [label, options] of Object.entries(expectedOptions)) {
      const select = document.querySelector<HTMLElement>(`web-ui-select[aria-label="${label}"]`)
      if (!select) throw new Error(`${label} select not found`)
      expect(
        Array.from(select.querySelectorAll('web-ui-option')).map(option => option.textContent?.trim() ?? '')
      ).toEqual(options)
      globalSelectTrigger(label)
    }

    expect(navRoot().getAttribute('aria-label')).toBe('应用导航')
    expect(document.querySelector('nav[aria-label="主导航"]')).not.toBeNull()
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
    expect(links.every(link => !link.hasAttribute('title'))).toBe(true)
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
