import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open</web-ui-button>
      <web-ui-dialog
        closable
        open={open}
        heading="Example"
        style={{ '--wui-dialog-close-size': '34px' }}
        onopen-change={event => setOpen(event.detail.open)}
      >
        Example
      </web-ui-dialog>
    </>
  )
}
