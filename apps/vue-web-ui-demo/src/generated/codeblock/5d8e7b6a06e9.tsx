import type { WebUiTooltip } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const hint = useRef<WebUiTooltip>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="Click to open, click again to close"
          trigger="click"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">Click tooltip</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip
          ref={hint}
          content="Follows show() / hide() only"
          trigger="none"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary" onClick={() => hint.current?.show()}>
            show()
          </web-ui-button>
        </web-ui-tooltip>
        <web-ui-button size="28" variant="secondary" onClick={() => hint.current?.hide()}>
          hide()
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last detail.open = {last}</output>
    </div>
  )
}
