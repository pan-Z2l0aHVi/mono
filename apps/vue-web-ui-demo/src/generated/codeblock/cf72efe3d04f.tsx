import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-svg-draw-lines ref={lines} duration={1400}>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 54 L30 10 L54 54"></path>
          <path d="M14 38 L46 38"></path>
        </svg>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
          <g>
            <g>
              <circle cx="30" cy="30" r="18"></circle>
              <path d="M62 12 L92 48"></path>
            </g>
          </g>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        重播
      </web-ui-button>
    </div>
  )
}
