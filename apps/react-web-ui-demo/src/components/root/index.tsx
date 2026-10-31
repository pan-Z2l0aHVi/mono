import appScrollbarsOptions from '@greypan/app-scrollbars'
import { toast, type WebUiLayout, type WebUiSelect } from '@greypan/web-ui'
import {
  antDesignSyncOutlined,
  icOutlineMotionPhotosOff,
  icOutlineMotionPhotosOn,
  lucideContrast,
  lucideLanguages,
  lucideMoon,
  lucideSun,
  lucideX
} from '@greypan/web-ui/icons'
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
}

type NavSectionId = 'general' | 'layout' | 'form' | 'display' | 'feedback'

interface NavSection {
  id: NavSectionId
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    id: 'general',
    items: [
      { path: '/components/button', label: 'Button' },
      { path: '/components/icon', label: 'Icon' }
    ]
  },
  {
    id: 'layout',
    items: [
      { path: '/components/layout', label: 'Layout' },
      { path: '/components/back-top', label: 'BackTop' },
      { path: '/components/theme', label: 'Theme' }
    ]
  },
  {
    id: 'form',
    items: [
      { path: '/components/input', label: 'Input' },
      { path: '/components/textarea', label: 'Textarea' },
      { path: '/components/input-number', label: 'InputNumber' },
      { path: '/components/select', label: 'Select' },
      { path: '/components/autocomplete', label: 'Autocomplete' },
      { path: '/components/dropdown', label: 'Dropdown' },
      { path: '/components/switch', label: 'Switch' },
      { path: '/components/slider', label: 'Slider' },
      { path: '/components/radio', label: 'Radio' },
      { path: '/components/checkbox', label: 'Checkbox' },
      { path: '/components/segmented', label: 'Segmented' }
    ]
  },
  {
    id: 'display',
    items: [
      { path: '/components/collapse', label: 'Collapse' },
      { path: '/components/editable-text', label: 'EditableText' },
      { path: '/components/empty', label: 'Empty' },
      { path: '/components/middle-ellipsis', label: 'MiddleEllipsis' },
      { path: '/components/svg-draw-lines', label: 'SVGDrawLines' },
      { path: '/components/avatar', label: 'Avatar' },
      { path: '/components/badge', label: 'Badge' }
    ]
  },
  {
    id: 'feedback',
    items: [
      { path: '/components/dialog', label: 'Dialog' },
      { path: '/components/drawer', label: 'Drawer' },
      { path: '/components/tooltip', label: 'Tooltip' },
      { path: '/components/popover', label: 'Popover' },
      { path: '/components/context-menu', label: 'ContextMenu' },
      { path: '/components/toast', label: 'Toast' },
      { path: '/components/image-preview', label: 'ImagePreview' },
      { path: '/components/spinner', label: 'Spinner' },
      { path: '/components/progress', label: 'Progress' }
    ]
  }
]

const navSectionTitleClass = 'px-2.5 pt-3 pb-1 text-[12px] font-medium tracking-wide text-(--wui-color-text-secondary)'

function NavSectionTitle({ id }: { id: NavSectionId }) {
  switch (id) {
    case 'general':
      return <>通用</>
    case 'layout':
      return <>布局</>
    case 'form':
      return <>表单</>
    case 'display':
      return <>展示</>
    case 'feedback':
      return <>反馈</>
  }
}

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
  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return

    let frame: number | undefined
    const update = () => {
      const header = layout.querySelector<HTMLElement>('[slot="header"]')
      document.documentElement.style.setProperty(
        '--wui-toast-top-offset',
        `${Math.max(0, Math.ceil(header?.getBoundingClientRect().bottom ?? 0))}px`
      )
    }
    const schedule = () => {
      if (frame !== undefined) return
      frame = requestAnimationFrame(() => {
        frame = undefined
        update()
      })
    }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
    resizeObserver?.observe(layout)
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    update()

    return () => {
      resizeObserver?.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
      document.documentElement.style.removeProperty('--wui-toast-top-offset')
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
    }
  }, [bannerVisible, isMobileSidebar])
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
  const [initPageScrollbars] = useOverlayScrollbars({ options: appScrollbarsOptions })
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
            sidebarCollapsible
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
                className="relative flex items-center justify-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
              >
                <span>🎉 欢迎使用 web-ui 组件库！</span>
                <web-ui-button
                  className="ml-auto mobile:absolute mobile:left-0 mobile:top-2 mobile:ml-0"
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
            {/* 移动端为前置导航区预留 60px，与 collapsed sidebar 使用同一基准。 */}
            <div
              slot="header"
              className="flex h-full w-full items-center justify-end gap-4 px-4 py-2 mobile:grid mobile:w-[calc(100vw-60px)] mobile:grid-cols-3 mobile:gap-1.5 mobile:px-2 mobile:py-1"
            >
              <web-ui-select
                trigger="icon"
                value={themeMotion}
                className="justify-self-center"
                aria-label="全局动效"
                onChange={updateThemeMotion}
              >
                <web-ui-icon
                  slot="trigger"
                  icon={
                    themeMotion === 'full'
                      ? icOutlineMotionPhotosOn
                      : themeMotion === 'reduced'
                        ? icOutlineMotionPhotosOff
                        : antDesignSyncOutlined
                  }
                  size={18}
                ></web-ui-icon>
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
                trigger="icon"
                value={themeAppearance}
                className="justify-self-center"
                aria-label="全局主题"
                onChange={updateThemeAppearance}
              >
                <web-ui-icon
                  slot="trigger"
                  icon={
                    themeAppearance === 'light' ? lucideSun : themeAppearance === 'dark' ? lucideMoon : lucideContrast
                  }
                  size={18}
                ></web-ui-icon>
                {/* 外观名称由 Wuchale 壳文案统一翻译成 Light / Dark。 */}
                <web-ui-option value="light" label="浅色模式">
                  浅色模式
                </web-ui-option>
                <web-ui-option value="dark" label="深色模式">
                  深色模式
                </web-ui-option>
                <web-ui-option value="system" label="跟随系统">
                  跟随系统
                </web-ui-option>
              </web-ui-select>
              <web-ui-select
                trigger="icon"
                value={locale}
                disabled={localePending}
                aria-busy={localePending ? 'true' : 'false'}
                className="justify-self-center"
                aria-label="全局语言"
                onChange={updateLocale}
              >
                <web-ui-icon slot="trigger" icon={lucideLanguages} size={18}></web-ui-icon>
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
              options={appScrollbarsOptions}
              className="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:px-0"
              aria-label="应用导航"
            >
              <nav className="grid gap-1" aria-label="主导航">
                <Link
                  to="/home"
                  className={
                    navItemClass +
                    (isNavActive(pathname, '/home') ? '' : ' hover:bg-black/4 dark:hover:bg-white/6') +
                    (navCollapsed ? ' justify-center' : '')
                  }
                  data-active={isNavActive(pathname, '/home')}
                  aria-current={isNavActive(pathname, '/home') ? 'page' : undefined}
                  aria-label="组件总览"
                  title="组件总览"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className={navCollapsed ? 'w-full truncate text-center text-sm' : 'min-w-0 flex-1 truncate text-sm'}
                  >
                    组件总览
                  </span>
                </Link>
                <Link
                  to="/changelog"
                  className={
                    navItemClass +
                    (isNavActive(pathname, '/changelog') ? '' : ' hover:bg-black/4 dark:hover:bg-white/6') +
                    (navCollapsed ? ' justify-center' : '')
                  }
                  data-active={isNavActive(pathname, '/changelog')}
                  aria-current={isNavActive(pathname, '/changelog') ? 'page' : undefined}
                  aria-label="更新日志"
                  title="更新日志"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className={navCollapsed ? 'w-full truncate text-center text-sm' : 'min-w-0 flex-1 truncate text-sm'}
                  >
                    更新日志
                  </span>
                </Link>
                {navSections.map((section, index) => (
                  <div
                    key={section.id}
                    role="group"
                    aria-labelledby={`nav-section-${section.id}`}
                    className="grid gap-1"
                  >
                    {navCollapsed && index > 0 ? (
                      <div className="mx-2 my-1 h-px bg-(--wui-color-border)" aria-hidden="true" />
                    ) : null}
                    <h2
                      id={`nav-section-${section.id}`}
                      className={navSectionTitleClass + (navCollapsed ? ' sr-only' : '')}
                    >
                      <NavSectionTitle id={section.id} />
                    </h2>
                    {section.items.map(item => {
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
                            {item.label}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </nav>
            </OverlayScrollbarsComponent>
            {/* 正文 gutter 归 shell 所有：`web-ui-layout` 的 main 不带 padding，逐页加会漏页。 */}
            <div className="p-3 sm:px-6 md:px-8 lg:px-10">
              <Outlet />
            </div>
          </web-ui-layout>
          <web-ui-back-top></web-ui-back-top>
        </div>
      </web-ui-theme>
    </ErrorBoundary>
  )
}
