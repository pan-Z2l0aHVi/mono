import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-col items-center gap-3">
      <web-ui-svg-draw-lines ref={lines} duration={1200}>
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12 L10 18 L20 6"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        重播
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">挂载后自动画入一次</span>
    </div>
  )
}
