import type { WebUiButton } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

function PopoverDemo() {
  const [controlledOpen, setControlledOpen] = useState(false)
  const closeBtnRef = useRef<WebUiButton>(null)

  useEffect(() => {
    const btn = closeBtnRef.current
    if (!btn) return
    const handler = () => setControlledOpen(false)
    btn.addEventListener('click', handler)
    return () => btn.removeEventListener('click', handler)
  }, [])

  return (
    <div>
      <h1>Popover 气泡卡片</h1>
      <h2>Click 触发</h2>
      <div className="mb-3">
        <web-ui-popover placement="bottom">
          <web-ui-button slot="trigger">Click me</web-ui-button>
          <div className="p-1">
            <p>这是一个 Popover 面板。</p>
            <p>可以放任意交互内容。</p>
          </div>
        </web-ui-popover>
      </div>
      <h2>Hover 触发</h2>
      <div className="mb-3">
        <web-ui-popover trigger="hover" placement="top">
          <web-ui-button slot="trigger">Hover me</web-ui-button>
          <div className="p-1">Hover 触发的 Popover</div>
        </web-ui-popover>
      </div>
      <h2>Portal</h2>
      <div className="mb-3">
        <web-ui-popover portal placement="bottom">
          <web-ui-button slot="trigger">Portal</web-ui-button>
          <div className="p-1">Portal 内容</div>
        </web-ui-popover>
      </div>
      <h2>Manual 触发（受控）</h2>
      <div className="mb-3">
        <web-ui-popover
          trigger="manual"
          open={controlledOpen}
          onopen-change={event => setControlledOpen(event.detail.open)}
        >
          <web-ui-button slot="trigger">Manual</web-ui-button>
          <div className="p-1">
            <p>受控模式，外部控制开关。</p>
            <web-ui-button ref={closeBtnRef} variant="secondary" full>
              关闭
            </web-ui-button>
          </div>
        </web-ui-popover>
      </div>
      <h2>不同位置</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-popover placement="top">
          <web-ui-button slot="trigger">Top</web-ui-button>
          <div className="p-1">Top</div>
        </web-ui-popover>
        <web-ui-popover placement="right">
          <web-ui-button slot="trigger">Right</web-ui-button>
          <div className="p-1">Right</div>
        </web-ui-popover>
        <web-ui-popover placement="bottom">
          <web-ui-button slot="trigger">Bottom</web-ui-button>
          <div className="p-1">Bottom</div>
        </web-ui-popover>
        <web-ui-popover placement="left">
          <web-ui-button slot="trigger">Left</web-ui-button>
          <div className="p-1">Left</div>
        </web-ui-popover>
      </div>
    </div>
  )
}
export default PopoverDemo
