import type { WebUiTooltip } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const hint = useRef<WebUiTooltip>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="点一下开，再点一下关"
          trigger="click"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">点击提示</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip
          ref={hint}
          content="只跟着 show() / hide() 走"
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
      <output className="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {last}</output>
    </div>
  )
}
