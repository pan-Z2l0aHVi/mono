import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (backdrop does not close)</web-ui-button>

      <web-ui-drawer
        open={open}
        noBackdropClose
        heading="Backdrop does not close"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>Clicking the backdrop does not close it; exit with the footer button or Escape.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setOpen(false)}>
          Close
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
