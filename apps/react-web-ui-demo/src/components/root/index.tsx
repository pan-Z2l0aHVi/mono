import type { WebUiSelect } from '@greypan/web-ui'
import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { RootErrorFallback } from './root-error-fallback'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const STORAGE_KEY = 'theme-appearance'
const MOTION_STORAGE_KEY = 'theme-motion'
const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])
const THEME_MOTIONS = new Set<ThemeMotion>(['full', 'reduced', 'system'])

function isThemeAppearance(appearance: unknown): appearance is ThemeAppearance {
  return typeof appearance === 'string' && THEME_APPEARANCES.has(appearance as ThemeAppearance)
}

function isThemeMotion(motion: unknown): motion is ThemeMotion {
  return typeof motion === 'string' && THEME_MOTIONS.has(motion as ThemeMotion)
}

function getInitialThemeAppearance(): ThemeAppearance {
  const stored = localStorage.getItem(STORAGE_KEY)
  const appearance = stored ? JSON.parse(stored) : null
  return isThemeAppearance(appearance) ? appearance : 'light'
}

function getInitialThemeMotion(): ThemeMotion {
  const stored = localStorage.getItem(MOTION_STORAGE_KEY)
  const motion = stored ? JSON.parse(stored) : null
  return isThemeMotion(motion) ? motion : 'system'
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
  { path: '/components/dropdown', label: 'Dropdown 下拉菜单' },
  { path: '/components/dialog', label: 'Dialog 对话框' },
  { path: '/components/drawer', label: 'Drawer 抽屉' },
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
  const navSidebarRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })

  useEffect(() => {
    void router.load().then(() => {
      requestAnimationFrame(() => {
        const link = navSidebarRef.current?.querySelector('.router-link-exact-active')
        link?.scrollIntoView({ block: 'center' })
      })
    })
  }, [router])

  const routeTitle = useRouterState({
    select: s => s.matches.at(-1)?.staticData.title
  })

  const updateThemeAppearance = (event: React.ChangeEvent<WebUiSelect>) => {
    const appearance = event.currentTarget.value
    if (!isThemeAppearance(appearance)) return
    setThemeAppearance(appearance)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
  }

  const updateThemeMotion = (event: React.ChangeEvent<WebUiSelect>) => {
    const motion = event.currentTarget.value
    if (!isThemeMotion(motion)) return
    setThemeMotion(motion)
    localStorage.setItem(MOTION_STORAGE_KEY, JSON.stringify(motion))
  }

  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <web-ui-theme appearance={themeAppearance} motion={themeMotion}>
        <div className="min-h-screen bg-[var(--wui-color-page)] text-[var(--wui-color-text)]">
          {routeTitle ? <title>{routeTitle}</title> : null}
          <web-ui-layout>
            <div slot="header" className="flex h-full w-full items-center justify-end gap-4 px-4 max-[640px]:w-screen">
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
            <nav ref={navSidebarRef} slot="sidebar" className="h-full overflow-y-auto px-2 pt-3 pb-2">
              <div className="px-3 pb-2 text-xs font-semibold uppercase text-[var(--wui-color-text-muted)]">
                组件列表
              </div>
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    'block rounded-full px-3 py-2 text-sm leading-5 text-[var(--wui-color-text)] transition-[background-color] duration-150 hover:bg-[color-mix(in_srgb,var(--wui-color-surface-raised)_80%,var(--wui-color-text))]' +
                    (pathname === item.path ? ' !bg-[var(--wui-color-accent)] !text-[var(--wui-color-on-accent)]' : '')
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Outlet />

            <div className="h-100 w-full"></div>
          </web-ui-layout>
          <web-ui-back-top></web-ui-back-top>
        </div>
      </web-ui-theme>
    </ErrorBoundary>
  )
}
