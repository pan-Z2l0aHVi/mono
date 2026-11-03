import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-popover trigger="focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            键盘聚焦
          </web-ui-button>
          <div className="max-w-xs text-sm">Tab 走到这个按钮时展开，焦点离开后收起；用鼠标点它不会开。</div>
        </web-ui-popover>
        <web-ui-popover trigger="click focus" placement="top">
          <web-ui-button slot="trigger" variant="secondary">
            点击或聚焦
          </web-ui-button>
          <div className="max-w-xs text-sm">点击切换开合，键盘聚焦直接展开。</div>
        </web-ui-popover>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">「键盘聚焦」最近一次 detail.open = {last}</output>
    </div>
  )
}
