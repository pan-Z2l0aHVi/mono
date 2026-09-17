import type { WebUiSelect, WebUiTheme } from '@greypan/web-ui'
import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
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

const THEME_TRANSITION_VARS = ['--theme-transition-x', '--theme-transition-y', '--theme-transition-radius'] as const

function isThemeAppearance(appearance: unknown): appearance is ThemeAppearance {
  return typeof appearance === 'string' && THEME_APPEARANCES.has(appearance as ThemeAppearance)
}

function isThemeMotion(motion: unknown): motion is ThemeMotion {
  return typeof motion === 'string' && THEME_MOTIONS.has(motion as ThemeMotion)
}

function resolvedAppearance(appearance: ThemeAppearance): 'light' | 'dark' {
  if (appearance !== 'system') return appearance
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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

export function Root() {
  const [themeAppearance, setThemeAppearance] = useState<ThemeAppearance>(getInitialThemeAppearance)
  const [themeMotion, setThemeMotion] = useState<ThemeMotion>(getInitialThemeMotion)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState<string>(getInitialSidebarWidth)
  const navSidebarRef = useRef<HTMLElement>(null)
  const themeRootRef = useRef<WebUiTheme>(null)
  const themeSelectRef = useRef<WebUiSelect>(null)
  const themePointerRef = useRef<{ x: number; y: number } | undefined>(undefined)
  const activeTransitionRef = useRef<ViewTransition | undefined>(undefined)

  // 指针位置只记在主题控件上，键盘选择不会被页面其它地方的点击带偏
  const recordThemeSelectPointer = (event: React.PointerEvent) => {
    themePointerRef.current = { x: event.clientX, y: event.clientY }
  }

  const [isMobileSidebar, setIsMobileSidebar] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsMobileSidebar(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const sidebarWidth = isMobileSidebar ? 'min(320px, 80vw)' : desktopSidebarWidth
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })

  useEffect(() => {
    void router.load().then(() => {
      requestAnimationFrame(() => {
        const link = navSidebarRef.current?.querySelector('.active')
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

  // 无指针坐标时退回控件中心，再退回视口中心
  const themeTransitionOrigin = () => {
    const recorded = themePointerRef.current
    if (recorded) return recorded
    const box = themeSelectRef.current?.getBoundingClientRect()
    if (box?.width) return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  const transitionThemeAppearance = async (appearance: ThemeAppearance, next: 'light' | 'dark') => {
    const root = document.documentElement
    // 过渡未结束前的新请求直接落地：同方向 class 与圆心变量都是单 owner 资源，
    // 与其让后续动画互相 skip 并清理掉对方的 state，不如保证状态一步到位。
    if (activeTransitionRef.current) {
      commitThemeAppearance(appearance)
      return
    }

    const { x, y } = themeTransitionOrigin()
    // 半径取到最远角，圆心落在视口任意位置都能覆盖整屏
    const radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)))
    root.style.setProperty('--theme-transition-x', `${x}px`)
    root.style.setProperty('--theme-transition-y', `${y}px`)
    root.style.setProperty('--theme-transition-radius', `${radius}px`)
    const direction = next === 'dark' ? 'theme-transition-to-dark' : 'theme-transition-to-light'
    root.classList.add(direction)

    const transition = document.startViewTransition(async () => {
      flushSync(() => commitThemeAppearance(appearance))
      await themeRootRef.current?.updateComplete
    })
    activeTransitionRef.current = transition
    // finished 必须先接住：updateCallbackDone reject 时控制流离开 try，不能留 unhandled rejection
    const finished = transition.finished.catch(() => undefined)
    try {
      // 旧快照在 startViewTransition 调用瞬间采集，所以主题变更必须留在回调里；
      // React 的提交默认是异步的，flushSync 保证新快照采集时新主题已在 DOM 上。
      await transition.updateCallbackDone
      await finished
    } finally {
      if (activeTransitionRef.current === transition) activeTransitionRef.current = undefined
      root.classList.remove(direction)
      for (const name of THEME_TRANSITION_VARS) root.style.removeProperty(name)
    }
  }

  const updateThemeAppearance = async (event: React.ChangeEvent<WebUiSelect>) => {
    const appearance = event.currentTarget.value
    if (!isThemeAppearance(appearance)) return

    const previous = resolvedAppearance(themeAppearance)
    const next = resolvedAppearance(appearance)
    // 「全局动效」是显式覆盖项，动效语义以 web-ui-theme 的 isReducedMotion 为唯一来源
    if (
      previous === next ||
      !document.startViewTransition ||
      !themeRootRef.current ||
      themeRootRef.current.isReducedMotion()
    ) {
      commitThemeAppearance(appearance)
      return
    }
    await transitionThemeAppearance(appearance, next)
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
      <web-ui-theme ref={themeRootRef} appearance={themeAppearance} motion={themeMotion}>
        <div className="min-h-screen bg-[var(--wui-color-page)] text-[var(--wui-color-text)]">
          {routeTitle ? <title>{routeTitle}</title> : null}
          <web-ui-layout
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
                className="flex items-center justify-center gap-2 bg-[var(--wui-color-accent)] px-4 py-2 text-sm text-[var(--wui-color-on-accent)]"
              >
                <span>🎉 欢迎使用 web-ui 组件库！</span>
                <button
                  className="ml-auto text-current opacity-70 hover:opacity-100"
                  onClick={() => setBannerVisible(false)}
                >
                  ✕
                </button>
              </div>
            ) : null}
            <div
              slot="header"
              className="flex h-full w-full items-center justify-end gap-4 px-4 py-2 max-[640px]:w-screen"
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
                <web-ui-option value="reduced" label="减少动效">
                  减少动效
                </web-ui-option>
                <web-ui-option value="system" label="跟随系统">
                  跟随系统
                </web-ui-option>
              </web-ui-select>
              <web-ui-select
                ref={themeSelectRef}
                value={themeAppearance}
                className="[--wui-input-width:120px]"
                aria-label="全局主题"
                onPointerDownCapture={recordThemeSelectPointer}
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
            <div slot="sidebar" className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 px-5 pt-4 pb-2 text-xs font-semibold uppercase text-[var(--wui-color-text-secondary)] max-[640px]:px-0">
                组件列表
              </div>
              <nav ref={navSidebarRef} className="min-h-0 flex-1 p-2 max-[640px]:px-0 overflow-y-auto">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={
                      'flex items-center h-8 my-1 rounded-full px-3 py-2 text-sm leading-5 text-[var(--wui-color-text)] transition-[background-color] duration-150 hover:bg-[color-mix(in_srgb,var(--wui-color-surface-raised)_80%,var(--wui-color-text))]' +
                      (pathname === item.path
                        ? ' !bg-[var(--wui-color-accent)] !text-[var(--wui-color-on-accent)]'
                        : '')
                    }
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            <Outlet />

            <div className="h-100 w-full"></div>
          </web-ui-layout>
          <web-ui-back-top></web-ui-back-top>
        </div>
      </web-ui-theme>
    </ErrorBoundary>
  )
}
