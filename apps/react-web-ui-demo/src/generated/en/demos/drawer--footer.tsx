import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Edit profile</web-ui-button>

      <web-ui-drawer open={open} heading="Edit profile" onopen-change={event => setOpen(event.detail.open)}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="m-0">
              Line {index + 1}, used to demonstrate body scrolling.
            </p>
          ))}
        </div>

        <div slot="footer" className="flex gap-3">
          <web-ui-button variant="secondary" full onClick={() => setOpen(false)}>
            Cancel
          </web-ui-button>
          <web-ui-button full onClick={() => setOpen(false)}>
            Save
          </web-ui-button>
        </div>
      </web-ui-drawer>
    </>
  )
}
