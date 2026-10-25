import type { WebUiCollapse } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiCollapse>(null)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('Nothing dispatched yet')

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.close()}>
          close()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.toggle()}>
          toggle()
        </web-ui-button>
      </div>

      <web-ui-collapse
        ref={panel}
        onopen-change={event => {
          setCount(current => current + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Click the trigger to toggle
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            The three buttons above open and close the panel without incrementing the count.
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
