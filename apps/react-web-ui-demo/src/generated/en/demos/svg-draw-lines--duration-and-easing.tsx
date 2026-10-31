import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fast = useRef<WebUiSvgDrawLines>(null)
  const slow = useRef<WebUiSvgDrawLines>(null)
  const bounce = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={fast} duration={400}>
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => fast.current?.replay()}>
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={slow} duration={1600} easing="ease-out">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => slow.current?.replay()}>
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={bounce} duration={1600} easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => bounce.current?.replay()}>
          Replay
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms · curve that overshoots the endpoints</span>
      </div>
    </div>
  )
}
