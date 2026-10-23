import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        trigger="hover"
        placement="top"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-button slot="trigger" variant="secondary">
          悬停我
        </web-ui-button>
        <div className="max-w-xs text-sm">悬停显示的 panel；移进 panel 内仍然开着，离开 100ms 后才收起。</div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {last}</output>
    </div>
  )
}
