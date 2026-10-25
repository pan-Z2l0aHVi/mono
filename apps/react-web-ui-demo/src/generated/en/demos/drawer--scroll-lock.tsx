import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (no scroll lock)</web-ui-button>

      <web-ui-drawer
        open={open}
        noScrollLock
        heading="Background still scrolls"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>After opening, try scrolling the background page: no-scroll-lock does not rewrite page scrolling.</p>
      </web-ui-drawer>
    </>
  )
}
