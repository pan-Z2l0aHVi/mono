import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideStar } from '@greypan/web-ui/icons'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-svg-draw-lines ref={lines} duration={1400} easing="ease-in-out">
        <svg
          viewBox="0 0 24 24"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5 V19"></path>
          <path d="M5 12 H19"></path>
        </svg>
        <web-ui-icon icon={lucideStar} size={40}></web-ui-icon>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        Replay
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">
        Left is the light DOM, right is the shadow root of the icon
      </span>
    </div>
  )
}
