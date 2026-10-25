import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        trigger="hover"
        placement="top"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-button slot="trigger" variant="secondary">
          Hover me
        </web-ui-button>
        <div className="max-w-xs text-sm">
          A panel shown on hover; it stays open when the pointer moves into it and closes 100ms after leaving.
        </div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">last detail.open = {last}</output>
    </div>
  )
}
