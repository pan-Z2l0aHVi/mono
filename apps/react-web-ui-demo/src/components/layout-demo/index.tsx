import type { WebUiLayout } from '@greypan/web-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

const NAV_ITEMS = [
  { label: 'Overview', short: 'O' },
  { label: 'Components', short: 'Group' },
  { label: 'Theme', short: 'T' },
  { label: 'Settings', short: 'S' }
]

function LayoutDemo() {
  const layoutRef = useRef<WebUiLayout | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState('240px')
  const [mobile, setMobile] = useState(false)

  // 与根布局同一条读法：连接那一刻派发的 mobile-change 早于这里的监听，初值只能自己读；
  // 运行时跨断点用 flushSync 同步回写，否则 layout 已换树而这里还会慢一帧。
  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return

    setMobile(layout.mobile)
    const syncMobileViewport = (event: Event) => {
      const next = (event as CustomEvent<{ mobile: boolean }>).detail.mobile
      flushSync(() => setMobile(next))
    }
    layout.addEventListener('mobile-change', syncMobileViewport)
    return () => layout.removeEventListener('mobile-change', syncMobileViewport)
  }, [])

  // collapse 只收窄桌面端 aside；移动端 Drawer 承载同一份导航，套用 collapsed state 会把 label 挤成截断（issue #195）。
  const navCollapsed = collapsed && !mobile

  return (
    <div>
      <h1>Layout</h1>
      <p className="mb-3 text-sm text-gray-500">
        demo 把整屏布局装进一个固定高度的滚动框：Banner 随内容滚出，header 与 tabbar 各贴在框的上下缘，桌面端 sidebar
        右缘可拖拽调宽，collapse Toggle 由 layout 自己渲染。
      </p>

      <div className="h-[520px] overflow-auto rounded-lg border border-(--wui-color-border)">
        <web-ui-layout
          ref={layoutRef}
          header-glow
          sidebar-resizable
          sidebarCollapsed={collapsed}
          sidebarOpen={open}
          sidebarWidth={sidebarWidth}
          sidebar-min-width="160px"
          sidebar-max-width="360px"
          onsidebar-collapsed-change={event => setCollapsed(event.detail.collapsed)}
          onsidebar-open-change={event => setOpen(event.detail.open)}
          onsidebar-width-change={event => setSidebarWidth(event.detail.width)}
        >
          <div
            slot="banner"
            className="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
          >
            全宽 Banner
          </div>
          <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
            Header
          </div>
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            {NAV_ITEMS.map(item => (
              <span
                key={item.label}
                className={navCollapsed ? 'rounded-md p-2 text-center text-xs' : 'rounded-md p-2 text-sm'}
              >
                {navCollapsed ? item.short : item.label}
              </span>
            ))}
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              The content area scrolls with the inner scrollbar while the header and tabbar stay pinned to the frame
              edges.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              拖 sidebar 右缘的 handle 改宽度；用 Toggle collapsible sidebar；把窗口收窄到 640px
              及以下，布局会切到移动端分支，由 header 里的 Toggle 打开 Drawer。
            </p>
            <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
          </div>
          <div slot="tabbar" className="flex items-center justify-center px-4 py-2 text-xs">
            Tabbar
          </div>
        </web-ui-layout>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        collapse：{collapsed ? 'Yes' : 'No'} · 侧边栏宽度：{sidebarWidth} · 视口判定：{mobile ? 'Mobile' : 'Desktop'} ·
        Drawer：{open ? 'Open' : 'Close'}
      </p>
    </div>
  )
}
export default LayoutDemo
