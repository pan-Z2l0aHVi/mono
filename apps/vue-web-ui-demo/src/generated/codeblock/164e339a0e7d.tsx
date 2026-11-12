import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="h-[240px] w-full overflow-hidden rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:240px]">
      <web-ui-layout
        mobile
        style={{ '--wui-layout-mobile-toggle-inset': '24px', '--wui-layout-mobile-toggle-top': '16px' }}
        sidebarOpen={open}
        onsidebar-open-change={event => setOpen(event.detail.open)}
      >
        <div slot="sidebar">Navigation</div>
        <div className="p-4 text-sm">Content</div>
      </web-ui-layout>
    </div>
  )
}
