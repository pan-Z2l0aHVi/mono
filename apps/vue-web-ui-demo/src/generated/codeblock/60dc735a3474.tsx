import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-dropdown onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            点击菜单
          </web-ui-button>
          <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
          <web-ui-dropdown-item>复制</web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-dropdown trigger="hover focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            悬停或聚焦
          </web-ui-button>
          <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
          <web-ui-dropdown-item>复制</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {last}</output>
    </div>
  )
}
