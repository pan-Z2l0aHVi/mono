import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideCheck } from '@greypan/web-ui/icons'
import { useRef } from 'react'

export default function Demo() {
  const lines = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-svg-draw-lines ref={lines} noAutoplay easing="ease-out">
        <web-ui-icon icon={lucideCheck} size={48}></web-ui-icon>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" onClick={() => lines.current?.replay()}>
        replay()
      </web-ui-button>
      <span className="text-xs text-(--wui-color-text-secondary)">挂载时静止在完整描边</span>
    </div>
  )
}
