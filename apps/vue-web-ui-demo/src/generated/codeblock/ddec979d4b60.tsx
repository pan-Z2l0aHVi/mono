import { useState } from 'react'

export default function Demo() {
  const [width, setWidth] = useState('240px')
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout
          sidebar-resizable
          sidebarWidth={width}
          sidebar-min-width="160px"
          sidebar-max-width="360px"
          onsidebar-width-change={event => setWidth(event.detail.width)}
          sidebarOpen={open}
          onsidebar-open-change={event => setOpen(event.detail.open)}
        >
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">Overview</span>
            <span className="rounded-md p-2 text-sm">Components</span>
            <span className="rounded-md p-2 text-sm">Theme</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              拖桌面端侧边栏右缘的 handle 改宽；聚焦后用 ←/→ 步进、Enter 提交、Escape 撤回未提交的调整。
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">sidebar-width：{width}</p>
    </div>
  )
}
