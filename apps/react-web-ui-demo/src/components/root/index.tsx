import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  createShellState,
  isNavActive,
  NAV_ITEM_CLASS,
  NAV_SECTIONS,
  NAV_SECTION_TITLE_CLASS,
  type NavSectionId
} from '@greypan/doc-demo-kit'
import { toast, type WebUiSelect } from '@greypan/web-ui'
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
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { useLocale } from '@/i18n/locale'
import { useMobile } from '@/state/mobile'

import { Search } from '../search'

import { RootErrorFallback } from './root-error-fallback'

// 语种名按该语言自己的写法给出，两版都不译：误切到读不懂的界面语言时，靠「简体中文」四个字
// 就能找回母语，不必先读懂当前界面上的 "Simplified Chinese"。
const ZH_CN_LABEL = '简体中文'
const EN_LABEL = 'English'

/**
 * shell 状态（主题 / 动效 / 侧栏 collapsed / open / 宽度的持久化、校验、layout 事件过滤与
 * mobile 派生）由 kit 的 `createShellState` 拥有；这里只把快照接进 React 与 `useMobile`
 * 的断点判定（判定留在 app，ADR-0023）。layout effect 在首帧绘制前同步写回 mobile，
 * 移动端首帧的 drawer 宽度与展开态就是对的。
 */
function useShellState() {
  const [shell] = useState(createShellState)
  const snapshot = useSyncExternalStore(shell.subscribe, shell.getSnapshot)
  const isMobileSidebar = useMobile()
  useLayoutEffect(() => shell.setMobile(isMobileSidebar), [shell, isMobileSidebar])
  return { shell, snapshot, isMobileSidebar }
}

// 章节标题的中文文案留在本端：wuchale 只扫宿主 src，kit 只给结构。
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

// 折叠后侧栏内容宽 36px（60px 侧栏去掉 8px 外边距与两侧 8px 内边距）。tooltip 的 trigger
// 按内容收缩，链接不显式定宽会被文字撑开，active 底色与点击区域也会跟着缩水。
interface SidebarNavLinkProps {
  to: string
  label: string
  title?: string
  active: boolean
  collapsed: boolean
  onNavigate: () => void
}

function SidebarNavLink({ to, label, title, active, collapsed, onNavigate }: SidebarNavLinkProps) {
  const link = (
    <Link
      to={to}
      className={
        NAV_ITEM_CLASS +
        (active ? '' : ' hover:bg-[#1b1b20]/4 dark:hover:bg-white/6') +
        (collapsed ? ' w-9 justify-center' : ' w-full')
      }
      data-active={active}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={title}
      onClick={onNavigate}
    >
      <span className={collapsed ? 'w-full truncate text-center text-sm' : 'min-w-0 flex-1 truncate text-sm'}>
        {label}
      </span>
    </Link>
  )

  if (!collapsed) return link

  return (
    <web-ui-tooltip content={label} placement="right" portal>
      {link}
    </web-ui-tooltip>
  )
}

export function Root() {
  const { locale, setLocale, pending: localePending } = useLocale()
  const { shell, snapshot, isMobileSidebar } = useShellState()
  const { appearance: themeAppearance, motion: themeMotion } = snapshot
  const [bannerVisible, setBannerVisible] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const navSidebarRef = useRef<OverlayScrollbarsComponentRef<'div'> | null>(null)
  const { sidebarWidth, navCollapsed } = snapshot
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

  const updateThemeAppearance = (event: React.ChangeEvent<WebUiSelect>) => {
    shell.setAppearance(event.currentTarget.value)
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
    shell.setMotion(event.currentTarget.value)
  }

  // layout 的三个 sidebar 事件统一交给 shell 状态机：事件过滤（只采信自己层的冒泡）与提交都在 kit。
  const updateSidebarCollapsed = (event: CustomEvent<{ collapsed: boolean }>) => shell.applyLayoutEvent(event)

  const updateSidebarOpen = (event: CustomEvent<{ open: boolean }>) => shell.applyLayoutEvent(event)

  // 拖拽调宽的受控回写 + 持久化（仅桌面端生效）都由 shell 状态机处理。
  const updateSidebarWidth = (event: CustomEvent<{ width: string }>) => shell.applyLayoutEvent(event)

  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <web-ui-theme appearance={themeAppearance} motion={themeMotion}>
        <div className="min-h-screen bg-(--wui-color-page) text-(--wui-color-text)">
          {routeTitle ? <title>{routeTitle}</title> : null}
          <web-ui-layout
            mobile={isMobileSidebar}
            className="mobile:[--wui-layout-sidebar-radius:38px]"
            sidebarCollapsible
            header-glow
            sidebarCollapsed={snapshot.sidebarCollapsed}
            sidebarOpen={snapshot.sidebarOpen}
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
                className="relative grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
              >
                <web-ui-button
                  className="absolute top-1/2 right-4 -translate-y-1/2"
                  size="24"
                  icon
                  variant="ghost"
                  aria-label="关闭横幅"
                  onClick={() => setBannerVisible(false)}
                >
                  <web-ui-icon className="text-(--wui-color-on-accent)" icon={lucideX}></web-ui-icon>
                </web-ui-button>
                <span className="col-start-2 text-center">🎉 欢迎使用 web-ui 组件库！</span>
              </div>
            ) : null}
            {/* 移动端为前置导航区预留 60px，与 collapsed sidebar 使用同一基准。
                移动端纵向内边距与 layout 的 `.mobile-toggle` 上间距（8px）一致，右侧控件才与左上角切换按钮同高对齐。 */}
            <div
              slot="header"
              className="flex h-full w-full items-center justify-end gap-4 px-4 py-2 mobile:w-[calc(100vw-60px)] mobile:gap-1.5 mobile:px-2 mobile:py-2"
            >
              <div
                className={
                  searchOpen ? 'flex items-center gap-4 mobile:hidden' : 'flex items-center gap-4 mobile:gap-1.5'
                }
              >
                <web-ui-select variant="icon" value={themeMotion} aria-label="全局动效" onChange={updateThemeMotion}>
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
                  variant="icon"
                  value={themeAppearance}
                  placement="bottom"
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
                  variant="icon"
                  value={locale}
                  disabled={localePending}
                  aria-busy={localePending ? 'true' : 'false'}
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
              <Search open={searchOpen} onOpenChange={setSearchOpen} />
            </div>
            <OverlayScrollbarsComponent
              slot="sidebar"
              ref={navSidebarRef}
              options={appScrollbarsOptions}
              className="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:p-0"
              aria-label="应用导航"
            >
              <nav className="grid gap-1" aria-label="主导航">
                <SidebarNavLink
                  to="/home"
                  label="组件总览"
                  active={isNavActive(pathname, '/home')}
                  collapsed={navCollapsed}
                  title={navCollapsed ? undefined : '组件总览'}
                  onNavigate={() => shell.setSidebarOpen(false)}
                />
                <SidebarNavLink
                  to="/getting-started"
                  label="快速开始"
                  active={isNavActive(pathname, '/getting-started')}
                  collapsed={navCollapsed}
                  title={navCollapsed ? undefined : '快速开始'}
                  onNavigate={() => shell.setSidebarOpen(false)}
                />
                <SidebarNavLink
                  to="/changelog"
                  label="更新日志"
                  active={isNavActive(pathname, '/changelog')}
                  collapsed={navCollapsed}
                  title={navCollapsed ? undefined : '更新日志'}
                  onNavigate={() => shell.setSidebarOpen(false)}
                />
                {NAV_SECTIONS.map((section, index) => (
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
                      className={NAV_SECTION_TITLE_CLASS + (navCollapsed ? ' sr-only' : '')}
                    >
                      <NavSectionTitle id={section.id} />
                    </h2>
                    {section.items.map(item => (
                      <SidebarNavLink
                        key={item.path}
                        to={item.path}
                        label={item.label}
                        active={isNavActive(pathname, item.path)}
                        collapsed={navCollapsed}
                        onNavigate={() => shell.setSidebarOpen(false)}
                      />
                    ))}
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
