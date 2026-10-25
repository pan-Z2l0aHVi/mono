import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="立即出现"
          show-delay={0}
          hide-delay={0}
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">即时提示</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="禁用后不会出现" disabled>
          <web-ui-button variant="secondary">禁用提示</web-ui-button>
        </web-ui-tooltip>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        即时提示最近一次 detail.open = {last} · 禁用提示不派发
      </output>
    </div>
  )
}
