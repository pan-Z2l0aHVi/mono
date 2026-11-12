import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open</web-ui-button>
      <web-ui-drawer
        closable
        open={open}
        heading="Example"
        style={{ '--wui-drawer-close-size': '34px' }}
        onopen-change={event => setOpen(event.detail.open)}
      >
        Example
      </web-ui-drawer>
    </>
  )
}
