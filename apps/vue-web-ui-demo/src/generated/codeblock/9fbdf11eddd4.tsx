import type { WebUiLayout } from '@greypan/web-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export default function Demo() {
  const layoutRef = useRef<WebUiLayout>(null)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return
    setMobile(layout.mobile)
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ mobile: boolean }>).detail.mobile
      flushSync(() => setMobile(next))
    }
    layout.addEventListener('mobile-change', onChange)
    return () => layout.removeEventListener('mobile-change', onChange)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout ref={layoutRef} sidebarOpen={open} onsidebar-open-change={event => setOpen(event.detail.open)}>
          <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
            Header
          </div>
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">导航</span>
            <span className="rounded-md p-2 text-sm">组件</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              把视口收窄到 640px 及以下，header 出现 Toggle；点它经 sidebar-open-change 请求打开 Drawer。
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">
        mobile：{mobile ? 'true' : 'false'} · sidebar-open：{open ? 'true' : 'false'}
      </p>
    </div>
  )
}
