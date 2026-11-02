import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const pathLine = useRef<WebUiSvgDrawLines>(null)
  const rectCircle = useRef<WebUiSvgDrawLines>(null)
  const poly = useRef<WebUiSvgDrawLines>(null)
  const closedPath = useRef<WebUiSvgDrawLines>(null)

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={pathLine}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 45 L35 10 L65 45"></path>
            <line x1="65" y1="45" x2="95" y2="10"></line>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => pathLine.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">路径 + 直线</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={rectCircle}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="12" width="38" height="38"></rect>
            <circle cx="75" cy="31" r="18"></circle>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => rectCircle.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">矩形 + 圆</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={poly}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,52 22,12 38,52"></polyline>
            <polygon points="60,52 78,12 96,52"></polygon>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => poly.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">折线 + 多边形</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref={closedPath}>
          <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
            <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
          </svg>
        </web-ui-svg-draw-lines>
        <web-ui-button variant="secondary" onClick={() => closedPath.current?.replay()}>
          重播
        </web-ui-button>
        <span className="text-xs text-(--wui-color-text-secondary)">闭合 path（以 Z 收尾）+ ellipse</span>
      </div>
    </div>
  )
}
