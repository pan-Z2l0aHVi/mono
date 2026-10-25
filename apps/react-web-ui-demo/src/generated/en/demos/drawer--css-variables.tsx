import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open edge-to-edge white drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        heading="Edge-to-edge white drawer"
        closable
        className="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0]"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="text-neutral-800">
          The background, radius, and viewport inset are all controlled by CSS variables.
        </p>
      </web-ui-drawer>
    </>
  )
}
