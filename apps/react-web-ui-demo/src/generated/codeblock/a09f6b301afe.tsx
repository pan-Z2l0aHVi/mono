import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [rejected, setRejected] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open controlled drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        controlled
        heading="Controlled closing"
        onopen-change={event => {
          if (event.detail.open) {
            setRejected(false)
            setOpen(true)
            return
          }
          // Not writing open back: the drawer springs back to the open position, so the consumer can reject this close.
          setRejected(true)
        }}
      >
        <p>Pressing Escape, clicking the backdrop, or using the close button only emits a close request.</p>
        {rejected ? <p className="text-(--wui-color-danger)">Close request rejected; confirm first.</p> : null}
        <web-ui-button
          slot="footer"
          variant="secondary"
          full
          onClick={() => {
            setRejected(false)
            setOpen(false)
          }}
        >
          Confirm close
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
