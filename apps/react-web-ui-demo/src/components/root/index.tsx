import type { WebUiLayout, WebUiSelect } from '@greypan/web-ui'
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

import { RootErrorFallback } from './root-error-fallback'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const STORAGE_KEY = 'theme-appearance'
const MOTION_STORAGE_KEY = 'theme-motion'
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width'
const DEFAULT_SIDEBAR_WIDTH = '240px'
const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])
const THEME_MOTIONS = new Set<ThemeMotion>(['full', 'reduced', 'system'])

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

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/components/avatar', label: 'Avatar 头像' },
  { path: '/components/badge', label: 'Badge 徽标' },
  { path: '/components/button', label: 'Button 按钮' },
  { path: '/components/icon', label: 'Icon 图标' },
  { path: '/components/input', label: 'Input 输入框' },
  { path: '/components/textarea', label: 'Textarea 文本域' },
  { path: '/components/editable-text', label: 'EditableText 可编辑文本' },
  { path: '/components/theme', label: 'Theme 主题' },
  { path: '/components/input-number', label: 'InputNumber 数字输入框' },
  { path: '/components/select', label: 'Select 下拉选择' },
  { path: '/components/autocomplete', label: 'Autocomplete 自动补全' },
  { path: '/components/dropdown', label: 'Dropdown 下拉菜单' },
  { path: '/components/collapse', label: 'Collapse 折叠面板' },
  { path: '/components/dialog', label: 'Dialog 对话框' },
  { path: '/components/drawer', label: 'Drawer 抽屉' },
  { path: '/components/image-preview', label: 'ImagePreview 图片预览' },
  { path: '/components/empty', label: 'Empty 空状态' },
  { path: '/components/tooltip', label: 'Tooltip 工具提示' },
  { path: '/components/switch', label: 'Switch 开关' },
  { path: '/components/slider', label: 'Slider 滑块' },
  { path: '/components/radio', label: 'Radio 单选框' },
  { path: '/components/checkbox', label: 'Checkbox 复选框' },
  { path: '/components/segmented', label: 'Segmented 分段控制器' },
  { path: '/components/spinner', label: 'Spinner 加载指示器' },
  { path: '/components/popover', label: 'Popover 气泡卡片' },
  { path: '/components/context-menu', label: 'ContextMenu 右键菜单' },
  { path: '/components/toast', label: 'Toast 通知' },
  { path: '/components/svg-draw-lines', label: 'SVGDrawLines 描边动画' },
  { path: '/components/back-top', label: 'BackTop 回到顶部' }
]

const navItemClass =
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-all duration-150 text-(--wui-color-text) active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

function isNavActive(pathname: string, path: string) {
  return pathname === path || pathname === `${path}/`
}

export function Root() {
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
   * 这里的监听只接运行时事件，不在 React 生命周期内，flushSync 的告警条件不成立。
   */
  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return

    setIsMobileSidebar(layout.mobile)
    const syncMobileSidebarViewport = (event: Event) => {
      const next = (event as CustomEvent<{ mobile: boolean }>).detail.mobile
      flushSync(() => setIsMobileSidebar(next))
    }
    layout.addEventListener('mobile-change', syncMobileSidebarViewport)
    return () => layout.removeEventListener('mobile-change', syncMobileSidebarViewport)
  }, [])
  const sidebarWidth = isMobileSidebar ? 'min(320px, 80vw)' : desktopSidebarWidth
  /*
   * 折叠是桌面端的密度偏好，移动端 drawer 恒以展开态呈现同一份导航：drawer 宽
   * min(320px, 80vw)，套用折叠态会把标签挤成居中截断。web-ui-layout 的
   * `sidebar-collapsed` 契约同样写明它「不会影响移动端 Drawer」，它只是无从替
   * Consumer 决定 slot 内容怎么渲染，所以闸门留在这里。
   */
  const navCollapsed = sidebarCollapsed && !isMobileSidebar
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })

  // 整页滚动条接管的是 document 的滚动元素，不是某个 DOM 容器，所以没有可渲染的宿主元素，
  // 只能直接初始化 body。
  const [initPageScrollbars] = useOverlayScrollbars({ options: webUiScrollbarsOptions })
  useEffect(() => {
    initPageScrollbars(document.body)
  }, [initPageScrollbars])

  useEffect(() => {
    void router.load().then(() => {
      requestAnimationFrame(() => {
        const link = navSidebarRef.current?.getElement()?.querySelector('.active')
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

  const updateThemeMotion = (event: React.ChangeEvent<WebUiSelect>) => {
    const motion = event.currentTarget.value
    if (!isThemeMotion(motion)) return
    setThemeMotion(motion)
    writeStoredTheme(MOTION_STORAGE_KEY, JSON.stringify(motion))
  }

  const updateSidebarCollapsed = (event: CustomEvent<{ collapsed: boolean }>) => {
    setSidebarCollapsed(event.detail.collapsed)
  }

  const updateSidebarOpen = (event: CustomEvent<{ open: boolean }>) => {
    setSidebarOpen(event.detail.open)
  }

  // 拖拽调宽的受控回写 + localStorage 持久化（仅桌面端生效）
  const updateSidebarWidth = (event: CustomEvent<{ width: string }>) => {
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
                className="flex items-center justify-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
              >
                <span>🎉 欢迎使用 web-ui 组件库！</span>
                <web-ui-button
                  className="ml-auto"
                  size="24"
                  icon
                  variant="ghost"
                  onClick={() => setBannerVisible(false)}
                >
                  <web-ui-icon className="text-white" icon={lucideX} size={16}></web-ui-icon>
                </web-ui-button>
              </div>
            ) : null}
            <div slot="header" className="flex h-full w-full items-center justify-end gap-4 px-4 py-2 mobile:w-screen">
              <web-ui-select
                value={themeMotion}
                className="[--wui-input-width:120px]"
                aria-label="全局动效"
                onChange={updateThemeMotion}
              >
                <web-ui-option value="full" label="完整动效">
                  完整动效
                </web-ui-option>
                <web-ui-option value="reduced" label="减少动效">
                  减少动效
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
                <web-ui-option value="light" label="浅色">
                  浅色
                </web-ui-option>
                <web-ui-option value="dark" label="深色">
                  深色
                </web-ui-option>
                <web-ui-option value="system" label="跟随系统">
                  跟随系统
                </web-ui-option>
              </web-ui-select>
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
              </nav>
            </OverlayScrollbarsComponent>
            {/* 正文 gutter 归 shell 所有：`web-ui-layout` 的 main 不带 padding，逐页加会漏页。 */}
            <div className="p-3">
              <Outlet />
            </div>

            <div className="h-100 w-full"></div>
          </web-ui-layout>
          <web-ui-back-top></web-ui-back-top>
        </div>
      </web-ui-theme>
    </ErrorBoundary>
  )
}
