import { toast, type WebUiLayout, type WebUiSelect, type WebUiToast } from '@greypan/web-ui'
import { lucideX } from '@greypan/web-ui/icons'
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import {
  OverlayScrollbarsComponent,
  useOverlayScrollbars,
  type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ErrorBoundary } from 'react-error-boundary'

import { useLocale } from '@/i18n/locale'

import { RootErrorFallback } from './root-error-fallback'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const STORAGE_KEY = 'theme-appearance'
const MOTION_STORAGE_KEY = 'theme-motion'
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width'
const DEFAULT_SIDEBAR_WIDTH = '240px'
const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])
const THEME_MOTIONS = new Set<ThemeMotion>(['full', 'reduced', 'system'])
// 外观档位名是技术术语，中英两版都保持英文，因此不进入 wuchale 语料。
const LIGHT_LABEL = 'Light'
const DARK_LABEL = 'Dark'
// 语种名按该语言自己的写法给出，两版都不译：误切到读不懂的界面语言时，靠「简体中文」四个字
// 就能找回母语，不必先读懂当前界面上的 "Simplified Chinese"。
const ZH_CN_LABEL = '简体中文'
const EN_LABEL = 'English'

function isThemeAppearance(appearance: unknown): appearance is ThemeAppearance {
  return typeof appearance === 'string' && THEME_APPEARANCES.has(appearance as ThemeAppearance)
}

function isThemeMotion(motion: unknown): motion is ThemeMotion {
  return typeof motion === 'string' && THEME_MOTIONS.has(motion as ThemeMotion)
}

// localStorage 在存储被禁的上下文（沙箱 iframe、隐私模式）访问会抛 SecurityError，
// 损坏的旧数据会让 JSON.parse 抛错；这两处都在 useState 初始化器里执行，错误发生在
// Root 自身 render 中，外层 ErrorBoundary 无法捕获，会导致整个应用白屏，因此必须防护。
function readStoredTheme(key: string): unknown {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function writeStoredTheme(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 写入失败（配额/被禁）时仅跳过持久化，不打断交互
  }
}

function getInitialThemeAppearance(): ThemeAppearance {
  const appearance = readStoredTheme(STORAGE_KEY)
  return isThemeAppearance(appearance) ? appearance : 'light'
}

function getInitialThemeMotion(): ThemeMotion {
  const motion = readStoredTheme(MOTION_STORAGE_KEY)
  return isThemeMotion(motion) ? motion : 'system'
}

function getInitialSidebarWidth(): string {
  const width = readStoredTheme(SIDEBAR_WIDTH_STORAGE_KEY)
  return typeof width === 'string' && /^\d+(\.\d+)?px$/.test(width) ? width : DEFAULT_SIDEBAR_WIDTH
}

/*
 * layout 的四个 `*-change` 都是 `bubbles: true, composed: true`，而文档页里示例的 `web-ui-layout` 就挂在
 * 本站侧栏的子树内，它一翻转事件就顺着冒到这里。只采信自己这一层：窄视口下点示例的 Toggle，本站 drawer
 * 会跟着打开（实测 `shellDrawerOpen: true`，命中的那条事件 `target` 是示例元素）；挂载那四次嵌套的
 * `mobile-change` 还会把 flushSync 送进 React 提交阶段，报 "flushSync was called from inside a lifecycle
 * method"。
 */
function isOwnLayoutEvent(event: Event): boolean {
  return event.target === event.currentTarget
}

interface NavItem {
  path: string
  label: string
  collapsedLabel: string
}

const navItems: NavItem[] = [
  { path: '/home', label: 'Home', collapsedLabel: 'Ho' },
  { path: '/components/avatar', label: 'Avatar', collapsedLabel: 'Av' },
  { path: '/components/badge', label: 'Badge', collapsedLabel: 'Ba' },
  { path: '/components/button', label: 'Button', collapsedLabel: 'Bu' },
  { path: '/components/icon', label: 'Icon', collapsedLabel: 'Ic' },
  { path: '/components/input', label: 'Input', collapsedLabel: 'Ip' },
  { path: '/components/textarea', label: 'Textarea', collapsedLabel: 'Ta' },
  { path: '/components/editable-text', label: 'EditableText', collapsedLabel: 'Et' },
  { path: '/components/theme', label: 'Theme', collapsedLabel: 'Th' },
  { path: '/components/input-number', label: 'InputNumber', collapsedLabel: 'In' },
  { path: '/components/select', label: 'Select', collapsedLabel: 'Se' },
  { path: '/components/autocomplete', label: 'Autocomplete', collapsedLabel: 'Au' },
  { path: '/components/dropdown', label: 'Dropdown', collapsedLabel: 'Do' },
  { path: '/components/collapse', label: 'Collapse', collapsedLabel: 'Co' },
  { path: '/components/dialog', label: 'Dialog', collapsedLabel: 'Di' },
  { path: '/components/drawer', label: 'Drawer', collapsedLabel: 'Dr' },
  { path: '/components/image-preview', label: 'ImagePreview', collapsedLabel: 'Im' },
  { path: '/components/empty', label: 'Empty', collapsedLabel: 'Em' },
  { path: '/components/middle-ellipsis', label: 'MiddleEllipsis', collapsedLabel: 'Me' },
  { path: '/components/tooltip', label: 'Tooltip', collapsedLabel: 'To' },
  { path: '/components/switch', label: 'Switch', collapsedLabel: 'Sw' },
  { path: '/components/slider', label: 'Slider', collapsedLabel: 'Sl' },
  { path: '/components/radio', label: 'Radio', collapsedLabel: 'Ra' },
  { path: '/components/checkbox', label: 'Checkbox', collapsedLabel: 'Ch' },
  { path: '/components/segmented', label: 'Segmented', collapsedLabel: 'Sg' },
  { path: '/components/spinner', label: 'Spinner', collapsedLabel: 'Sp' },
  { path: '/components/popover', label: 'Popover', collapsedLabel: 'Po' },
  { path: '/components/context-menu', label: 'ContextMenu', collapsedLabel: 'Cm' },
  { path: '/components/toast', label: 'Toast', collapsedLabel: 'Ts' },
  { path: '/components/svg-draw-lines', label: 'SVGDrawLines', collapsedLabel: 'Sv' },
  { path: '/components/back-top', label: 'BackTop', collapsedLabel: 'Bk' },
  { path: '/components/layout', label: 'Layout', collapsedLabel: 'La' }
]

// active 底色浅色取设计给定的 #d5d7d7；深色不跟——sidebar 在深色是 #2c2c2e，亮灰会读成一条高亮带，仍走 control 档。
const navItemClass =
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-all duration-150 text-(--wui-color-text) active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-[#d5d7d7] data-[active=true]:hover:bg-[#d5d7d7] data-[active=true]:active:bg-[color-mix(in_srgb,#d5d7d7_70%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

function isNavActive(pathname: string, path: string) {
  return pathname === path || pathname === `${path}/`
}

export function Root() {
  const { locale, setLocale, pending: localePending } = useLocale()
  const [themeAppearance, setThemeAppearance] = useState<ThemeAppearance>(getInitialThemeAppearance)
  const [themeMotion, setThemeMotion] = useState<ThemeMotion>(getInitialThemeMotion)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [topRightToastSafeBottom, setTopRightToastSafeBottom] = useState(0)
  const [topRightToastHeaderPaddingTop, setTopRightToastHeaderPaddingTop] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState<string>(getInitialSidebarWidth)
  const navSidebarRef = useRef<OverlayScrollbarsComponentRef<'div'> | null>(null)
  // 移动端判定由 web-ui-layout 给出（它同时决定渲染桌面树还是 drawer）：demo 不自己写断点。
  const layoutRef = useRef<WebUiLayout | null>(null)
  const [isMobileSidebar, setIsMobileSidebar] = useState(false)
  /*
   * 先读后订阅：连接那一刻 layout 就可能已经派发过 mobile-change，而 useLayoutEffect 的监听是在
   * 插入之后才挂上的，接不到那一次，所以初值必须自己读。运行时跨断点则要 flushSync 同步回写——
   * layout 在媒体查询变化的那一刻派发事件，React 从 DOM 事件里 setState 走的是 scheduler 的宏任务，
   * 会晚于 layout 自己的 microtask 渲染，实测留下 2/221 帧「drawer 已渲染、sidebar-width 仍是桌面值」。
   */
  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return

    setIsMobileSidebar(layout.mobile)
    const syncMobileSidebarViewport = (event: Event) => {
      if (!isOwnLayoutEvent(event)) return
      const next = (event as CustomEvent<{ mobile: boolean }>).detail.mobile
      flushSync(() => setIsMobileSidebar(next))
    }
    layout.addEventListener('mobile-change', syncMobileSidebarViewport)
    return () => layout.removeEventListener('mobile-change', syncMobileSidebarViewport)
  }, [])
  // toast 可落在主题、fallback 或自定义容器；只为视口上缘可见的堆栈给顶栏留安全区。
  useLayoutEffect(() => {
    const shadowRootObservers = new Map<ShadowRoot, MutationObserver>()
    let roots = new Set<Document | ShadowRoot>([document])
    let hostsWithoutShadowRoot = new Set<HTMLElement>()
    let observedToasts = new Set<WebUiToast>()
    let observedContainers = new Set<HTMLElement>()
    let syncTopRightToasts = () => {}
    let refreshObservedToasts = () => {}
    let discoverShadowRoots = () => {}
    let syncFrame: number | undefined
    let discoverBeforeSync = false
    let scheduleSync: (discover?: boolean) => void = () => {}
    const onViewportChange = () => {
      let needsRootDiscovery = false
      for (const host of hostsWithoutShadowRoot) {
        if (!host.isConnected || !host.shadowRoot) continue
        needsRootDiscovery = true
        break
      }
      scheduleSync(needsRootDiscovery)
    }
    const onScroll = onViewportChange
    const onResize = onViewportChange
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onResize)

    scheduleSync = discover => {
      discoverBeforeSync ||= discover === true
      if (syncFrame !== undefined) return
      if (typeof requestAnimationFrame === 'undefined') {
        if (discoverBeforeSync) {
          discoverBeforeSync = false
          discoverShadowRoots()
          refreshObservedToasts()
        }
        syncTopRightToasts()
        return
      }
      syncFrame = requestAnimationFrame(() => {
        syncFrame = undefined
        if (discoverBeforeSync) {
          discoverBeforeSync = false
          discoverShadowRoots()
          refreshObservedToasts()
        }
        syncTopRightToasts()
      })
    }

    discoverShadowRoots = () => {
      const nextRoots = new Set<Document | ShadowRoot>([document])
      const nextHostsWithoutShadowRoot = new Set<HTMLElement>()
      for (const root of nextRoots) {
        for (const element of root.querySelectorAll<Element>('*')) {
          const host = element as HTMLElement
          if (host.shadowRoot) {
            nextRoots.add(host.shadowRoot)
          } else if (host.localName.includes('-') || host.hasAttribute('is')) {
            nextHostsWithoutShadowRoot.add(host)
          }
        }
      }

      for (const [root, observer] of shadowRootObservers) {
        if (nextRoots.has(root)) continue
        observer.disconnect()
        shadowRootObservers.delete(root)
      }

      for (const root of nextRoots) {
        if (!(root instanceof ShadowRoot) || shadowRootObservers.has(root)) continue
        const observer = new MutationObserver(() => scheduleSync(true))
        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['position']
        })
        shadowRootObservers.set(root, observer)
      }
      roots = nextRoots
      hostsWithoutShadowRoot = nextHostsWithoutShadowRoot
    }

    refreshObservedToasts = () => {
      const toasts = [
        ...new Set([...roots].flatMap(root => [...root.querySelectorAll<WebUiToast>('web-ui-toast')]))
      ].filter(toast => toast.position === 'top-right')
      const nextObservedToasts = new Set(toasts)
      for (const toast of observedToasts) {
        if (nextObservedToasts.has(toast)) continue
        resizeObserver?.unobserve(toast)
      }
      for (const toast of toasts) {
        if (observedToasts.has(toast)) continue
        resizeObserver?.observe(toast)
      }
      observedToasts = nextObservedToasts

      const nextObservedContainers = new Set(
        toasts
          .map(toast => toast.parentElement)
          .filter((container): container is HTMLElement => container instanceof HTMLElement)
      )
      for (const container of observedContainers) {
        if (nextObservedContainers.has(container)) continue
        container.removeEventListener('scroll', onScroll)
      }
      for (const container of nextObservedContainers) {
        if (observedContainers.has(container)) continue
        container.addEventListener('scroll', onScroll, { passive: true })
      }
      observedContainers = nextObservedContainers
    }

    syncTopRightToasts = () => {
      const toasts = [...observedToasts]
      const getParentElement = (element: HTMLElement): HTMLElement | null => {
        if (element.parentElement instanceof HTMLElement) return element.parentElement
        const root = element.getRootNode()
        return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null
      }
      const visibleToasts = toasts.flatMap(toast => {
        const toastRect = toast.getBoundingClientRect()
        let top = Math.max(0, toastRect.top)
        let bottom = Math.min(window.innerHeight, toastRect.bottom)
        let ancestor = getParentElement(toast)
        while (ancestor) {
          if (['auto', 'clip', 'hidden', 'scroll'].includes(getComputedStyle(ancestor).overflowY)) {
            const ancestorRect = ancestor.getBoundingClientRect()
            const clipTop = ancestorRect.top + ancestor.clientTop
            top = Math.max(top, clipTop)
            bottom = Math.min(bottom, clipTop + ancestor.clientHeight)
          }
          ancestor = getParentElement(ancestor)
        }
        return bottom > top ? [{ top, bottom }] : []
      })
      const visibleStack = visibleToasts.sort((a, b) => a.top - b.top)
      let safeBottom = visibleStack.some(toast => toast.top < 60) ? 60 : 0
      for (const toast of visibleStack) {
        if (toast.top > safeBottom) break
        safeBottom = Math.max(safeBottom, Math.ceil(toast.bottom + 8))
      }
      const header = layoutRef.current?.querySelector<HTMLElement>('[slot="header"]')
      const headerTop = header?.getBoundingClientRect().top ?? window.innerHeight
      const requiredHeaderPaddingTop = safeBottom > 0 ? Math.max(8, safeBottom - headerTop) : 8
      setTopRightToastSafeBottom(safeBottom)
      setTopRightToastHeaderPaddingTop(requiredHeaderPaddingTop > 8 ? requiredHeaderPaddingTop : 0)
    }

    const documentObserver = new MutationObserver(() => scheduleSync(true))
    documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['position']
    })
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    discoverShadowRoots()
    refreshObservedToasts()
    syncTopRightToasts()

    return () => {
      documentObserver.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      if (syncFrame !== undefined) cancelAnimationFrame(syncFrame)
      for (const observer of shadowRootObservers.values()) observer.disconnect()
      for (const container of observedContainers) container.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
    }
  }, [])
  useLayoutEffect(() => {
    // Safe-area state changes the banner height; remeasure the sticky header after that layout commits.
    const header = layoutRef.current?.querySelector<HTMLElement>('[slot="header"]')
    const headerTop = header?.getBoundingClientRect().top ?? window.innerHeight
    const requiredHeaderPaddingTop = topRightToastSafeBottom > 0 ? Math.max(8, topRightToastSafeBottom - headerTop) : 8
    setTopRightToastHeaderPaddingTop(requiredHeaderPaddingTop > 8 ? requiredHeaderPaddingTop : 0)
  }, [bannerVisible, topRightToastSafeBottom])

  const hasTopRightToast = topRightToastSafeBottom > 0
  const toastSafeAreaStyle = hasTopRightToast
    ? ({ '--toast-safe-bottom': `${topRightToastSafeBottom}px` } as React.CSSProperties)
    : undefined
  const toastHeaderSafeAreaStyle =
    topRightToastHeaderPaddingTop > 0
      ? ({ '--toast-header-safe-top': `${topRightToastHeaderPaddingTop}px` } as React.CSSProperties)
      : undefined
  const sidebarWidth = isMobileSidebar ? 'min(320px, 80vw)' : desktopSidebarWidth
  /*
   * collapse 是桌面端的密度偏好，移动端 drawer 恒以展开态呈现同一份导航：drawer 宽
   * min(320px, 80vw)，套用 collapsed state 会把 label 挤成居中截断。web-ui-layout 的
   * `sidebar-collapsed` 契约同样写明它「不会影响移动端 Drawer」，它只是无从替
   * Consumer 决定 slot 内容怎么渲染，所以闸门留在这里。
   */
  const navCollapsed = sidebarCollapsed && !isMobileSidebar
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })

  // 整页 scrollbar 接管的是 document 的滚动元素，不是某个 DOM 容器，所以没有可渲染的宿主元素，
  // 只能直接初始化 body。
  const [initPageScrollbars] = useOverlayScrollbars({ options: webUiScrollbarsOptions })
  useEffect(() => {
    initPageScrollbars(document.body)
  }, [initPageScrollbars])

  useEffect(() => {
    void router.load().then(() => {
      requestAnimationFrame(() => {
        const link = navSidebarRef.current?.getElement()?.querySelector('[data-active="true"]')
        link?.scrollIntoView({ block: 'center' })
      })
    })
  }, [router])

  const routeTitle = useRouterState({
    select: s => s.matches.at(-1)?.staticData.title
  })

  const commitThemeAppearance = (appearance: ThemeAppearance) => {
    setThemeAppearance(appearance)
    writeStoredTheme(STORAGE_KEY, JSON.stringify(appearance))
  }

  const updateThemeAppearance = (event: React.ChangeEvent<WebUiSelect>) => {
    const appearance = event.currentTarget.value
    if (!isThemeAppearance(appearance)) return
    commitThemeAppearance(appearance)
  }

  const updateLocale = (event: React.ChangeEvent<WebUiSelect>) => {
    const next = event.currentTarget.value
    event.currentTarget.value = locale
    if (next === 'zh-CN' || next === 'en') {
      void setLocale(next).catch(error => {
        console.error('Language switch failed', error)
        toast.error('语言切换失败，请刷新页面后重试')
      })
    }
  }

  const updateThemeMotion = (event: React.ChangeEvent<WebUiSelect>) => {
    const motion = event.currentTarget.value
    if (!isThemeMotion(motion)) return
    setThemeMotion(motion)
    writeStoredTheme(MOTION_STORAGE_KEY, JSON.stringify(motion))
  }

  const updateSidebarCollapsed = (event: CustomEvent<{ collapsed: boolean }>) => {
    if (!isOwnLayoutEvent(event)) return
    setSidebarCollapsed(event.detail.collapsed)
  }

  const updateSidebarOpen = (event: CustomEvent<{ open: boolean }>) => {
    if (!isOwnLayoutEvent(event)) return
    setSidebarOpen(event.detail.open)
  }

  // 拖拽调宽的受控回写 + localStorage 持久化（仅桌面端生效）
  const updateSidebarWidth = (event: CustomEvent<{ width: string }>) => {
    if (!isOwnLayoutEvent(event)) return
    setDesktopSidebarWidth(event.detail.width)
    writeStoredTheme(SIDEBAR_WIDTH_STORAGE_KEY, JSON.stringify(event.detail.width))
  }

  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <web-ui-theme appearance={themeAppearance} motion={themeMotion}>
        <div className="min-h-screen bg-(--wui-color-page) text-(--wui-color-text)">
          {routeTitle ? <title>{routeTitle}</title> : null}
          <web-ui-layout
            ref={layoutRef}
            header-glow
            sidebarCollapsed={sidebarCollapsed}
            sidebarOpen={sidebarOpen}
            sidebarWidth={sidebarWidth}
            sidebar-resizable
            sidebar-min-width="120px"
            sidebar-max-width="400px"
            onsidebar-collapsed-change={updateSidebarCollapsed}
            onsidebar-open-change={updateSidebarOpen}
            onsidebar-width-change={updateSidebarWidth}
          >
            {bannerVisible ? (
              <div
                slot="banner"
                style={toastSafeAreaStyle}
                className={`relative flex items-center justify-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent) ${hasTopRightToast ? 'min-h-[var(--toast-safe-bottom)] max-[1024px]:pt-[var(--toast-safe-bottom)] mobile:pl-12' : ''}`}
              >
                <span>🎉 欢迎使用 web-ui 组件库！</span>
                <web-ui-button
                  className={`ml-auto ${hasTopRightToast ? 'mr-[337px] mobile:absolute mobile:left-0 mobile:top-2 mobile:ml-0 mobile:mr-0 mobile:max-[359px]:top-[var(--toast-safe-bottom)]' : ''}`}
                  size="24"
                  icon
                  variant="ghost"
                  aria-label="关闭横幅"
                  onClick={() => setBannerVisible(false)}
                >
                  <web-ui-icon className="text-(--wui-color-on-accent)" icon={lucideX} size={16}></web-ui-icon>
                </web-ui-button>
              </div>
            ) : null}
            {/* Toast 退场前至少保留安全区，避免 header 提前上移到 toast 后面。 */}
            {!bannerVisible && hasTopRightToast ? (
              <div
                aria-hidden="true"
                slot="banner"
                style={toastSafeAreaStyle}
                className="h-[var(--toast-safe-bottom)]"
              />
            ) : null}
            <div
              slot="header"
              style={toastHeaderSafeAreaStyle}
              className={`flex h-full w-full items-center justify-end gap-4 px-4 py-2 mobile:w-screen ${topRightToastHeaderPaddingTop > 0 ? 'pt-[var(--toast-header-safe-top)]' : ''}`}
            >
              <web-ui-select
                value={themeMotion}
                className="[--wui-input-width:120px]"
                aria-label="全局动效"
                onChange={updateThemeMotion}
              >
                <web-ui-option value="full" label="完整动效">
                  完整动效
                </web-ui-option>
                <web-ui-option value="reduced" label="减弱动效">
                  减弱动效
                </web-ui-option>
                <web-ui-option value="system" label="跟随系统">
                  跟随系统
                </web-ui-option>
              </web-ui-select>
              <web-ui-select
                value={themeAppearance}
                className="[--wui-input-width:120px]"
                aria-label="全局主题"
                onChange={updateThemeAppearance}
              >
                <web-ui-option value="light" label={LIGHT_LABEL}>
                  {LIGHT_LABEL}
                </web-ui-option>
                <web-ui-option value="dark" label={DARK_LABEL}>
                  {DARK_LABEL}
                </web-ui-option>
                <web-ui-option value="system" label="跟随系统">
                  跟随系统
                </web-ui-option>
              </web-ui-select>
              <web-ui-select
                value={locale}
                disabled={localePending}
                aria-busy={localePending ? 'true' : 'false'}
                className="[--wui-input-width:120px]"
                aria-label="全局语言"
                onChange={updateLocale}
              >
                <web-ui-option value="zh-CN" label={ZH_CN_LABEL}>
                  {ZH_CN_LABEL}
                </web-ui-option>
                <web-ui-option value="en" label={EN_LABEL}>
                  {EN_LABEL}
                </web-ui-option>
              </web-ui-select>
              <span className="sr-only" role="status">
                {localePending ? '正在切换语言' : ''}
              </span>
            </div>
            <OverlayScrollbarsComponent
              slot="sidebar"
              ref={navSidebarRef}
              options={webUiScrollbarsOptions}
              className="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:px-0"
              aria-label="应用导航"
            >
              <nav className="grid gap-1" aria-label="主导航">
                {navItems.map(item => {
                  const active = isNavActive(pathname, item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={
                        navItemClass +
                        (active ? '' : ' hover:bg-black/4 dark:hover:bg-white/6') +
                        (navCollapsed ? ' justify-center' : '')
                      }
                      data-active={active}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.label}
                      title={navCollapsed ? item.label : undefined}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span
                        className={
                          navCollapsed ? 'w-full truncate text-center text-sm' : 'min-w-0 flex-1 truncate text-sm'
                        }
                      >
                        {navCollapsed ? item.collapsedLabel : item.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>
            </OverlayScrollbarsComponent>
            {/* 正文 gutter 归 shell 所有：`web-ui-layout` 的 main 不带 padding，逐页加会漏页。 */}
            <div className="p-3">
              <Outlet />
            </div>
          </web-ui-layout>
          <web-ui-back-top></web-ui-back-top>
        </div>
      </web-ui-theme>
    </ErrorBoundary>
  )
}
