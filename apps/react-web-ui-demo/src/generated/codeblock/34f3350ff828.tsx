import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open (page steps aside)</web-ui-button>

      <web-ui-drawer
        open={open}
        pageShift
        heading="The page steps aside for the drawer"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>
          Opening slides the background page aside by a distance and it returns when the drawer closes; dragging this
          panel leaves the page in place.
        </p>
      </web-ui-drawer>
    </>
  )
}
