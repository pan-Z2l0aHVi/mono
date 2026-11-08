import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <web-ui-layout mobile sidebarOpen={open} onsidebar-open-change={event => setOpen(event.detail.open)}>
      <div slot="sidebar">导航</div>
      <div>内容</div>
    </web-ui-layout>
  )
}
