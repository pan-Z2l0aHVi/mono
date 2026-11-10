import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <web-ui-layout
      mobile
      style={{ '--wui-layout-mobile-toggle-inset': '24px', '--wui-layout-mobile-toggle-top': '16px' }}
      sidebarOpen={open}
      onsidebar-open-change={event => setOpen(event.detail.open)}
    >
      <div slot="sidebar">Navigation</div>
      <div>Content</div>
    </web-ui-layout>
  )
}
