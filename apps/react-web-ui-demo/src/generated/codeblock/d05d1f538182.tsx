import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Show details
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">The content slot accepts any node: text, forms, images, even another collapse.</p>
          </div>
        </div>
      </web-ui-collapse>
      <output className="text-sm text-(--wui-color-text-secondary)">open after write-back: {String(open)}</output>
    </div>
  )
}
