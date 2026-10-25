import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开贴边白色 drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        heading="贴边白色 drawer"
        closable
        className="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0]"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="text-neutral-800">背景、圆角与视口留边都由 CSS 变量控制。</p>
      </web-ui-drawer>
    </>
  )
}
