import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-svg-draw-lines ref={lines} duration={900} easing="ease-in-out">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M7.5 12.5 L10.5 15.5 L16.5 9"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        Draw in
      </web-ui-button>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay({ reverse: true })}>
        reverse retracts
      </web-ui-button>
    </div>
  )
}
