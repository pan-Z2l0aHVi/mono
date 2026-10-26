import type { WebUiCollapse } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiCollapse>(null)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('还没有派发')

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.close()}>
          close()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.toggle()}>
          toggle()
        </web-ui-button>
      </div>

      <web-ui-collapse
        ref={panel}
        onopen-change={event => {
          setCount(current => current + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          点击 trigger 开合
        </button>
        <div slot="content">
          <div className="p-3 text-sm">上面三个按钮能让面板开合，却不产生计数。</div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
