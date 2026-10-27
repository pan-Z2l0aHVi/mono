import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>Open headless drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        placement="left"
        headless
        draggable
        aria-dialog-label="Custom panel"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)">
          <h2 className="m-0 mb-2 text-xl">Custom panel</h2>
          <p className="m-0 text-(--wui-color-text-secondary)">
            headless provides only overlay behavior; the content, background, and radius are all decided here.
          </p>
        </div>
      </web-ui-drawer>
    </>
  )
}
