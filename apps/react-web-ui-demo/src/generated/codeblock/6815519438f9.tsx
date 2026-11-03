import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (page shifts)</web-ui-button>

      <web-ui-drawer
        open={open}
        pageShift
        heading="The page shifts for the drawer"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>
          Opening shifts the background page by a distance and it returns when the drawer closes; dragging this panel
          leaves the page in place.
        </p>
      </web-ui-drawer>
    </>
  )
}
